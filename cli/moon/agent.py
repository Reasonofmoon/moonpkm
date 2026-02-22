"""
YAML 기반 에이전트 실행기 — OpenClaw 스타일
agents/*.yaml 을 읽어 자율적으로 Vault 작업 수행
"""
import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from . import AGENTS_DIR, SKILLS_DIR
from .config import get_config
from .vault import Vault


@dataclass
class AgentStep:
    action: str
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentDef:
    name: str
    description: str
    steps: List[AgentStep]
    triggers: List[Dict] = field(default_factory=list)


@dataclass
class StepResult:
    action: str
    success: bool
    output: Any = None
    message: str = ""


class AgentRunner:
    """YAML 에이전트 실행기"""

    def __init__(self, vault: Optional[Vault] = None):
        self.vault = vault or Vault()
        self._agents: Dict[str, AgentDef] = {}
        self._load_agents()

    def _load_agents(self):
        """agents/ 디렉토리에서 모든 YAML 로드"""
        search_dirs = [
            AGENTS_DIR,
            Path.home() / ".config" / "moon" / "agents",
            get_config().vault_path / ".moon" / "agents",
        ]
        for agents_dir in search_dirs:
            if not agents_dir.exists():
                continue
            for yaml_file in agents_dir.glob("*.yaml"):
                try:
                    with open(yaml_file, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f)
                    steps = [
                        AgentStep(
                            action=s["action"],
                            params={k: v for k, v in s.items() if k != "action"},
                        )
                        for s in data.get("steps", [])
                    ]
                    agent = AgentDef(
                        name=data.get("name", yaml_file.stem),
                        description=data.get("description", ""),
                        steps=steps,
                        triggers=data.get("triggers", []),
                    )
                    self._agents[agent.name] = agent
                except Exception as e:
                    pass  # 파싱 실패 무시

    def list_agents(self) -> List[AgentDef]:
        return list(self._agents.values())

    def get_agent(self, name: str) -> Optional[AgentDef]:
        return self._agents.get(name)

    def run(self, agent_name: str, context: Optional[Dict] = None) -> List[StepResult]:
        """에이전트 동기 실행"""
        agent = self.get_agent(agent_name)
        if not agent:
            raise ValueError(f"에이전트를 찾을 수 없음: '{agent_name}'\n"
                             f"사용 가능: {', '.join(self._agents.keys())}")
        return asyncio.run(self._run_agent(agent, context or {}))

    async def _run_agent(self, agent: AgentDef, context: Dict) -> List[StepResult]:
        results = []
        for step in agent.steps:
            result = await self._execute_step(step, context)
            results.append(result)
            if not result.success:
                break
            # 이전 스텝 결과를 컨텍스트에 추가
            context[f"step_{step.action}"] = result.output
        return results

    async def _execute_step(self, step: AgentStep, context: Dict) -> StepResult:
        """개별 스텝 실행 — 액션 타입 라우터"""
        action = step.action
        params = self._resolve_params(step.params, context)

        try:
            if action == "read_inbox":
                return await self._action_read_inbox(params)
            elif action == "classify_dikm":
                return await self._action_classify_dikm(params, context)
            elif action == "suggest_brain":
                return await self._action_suggest_brain(params, context)
            elif action == "semantic_search":
                return await self._action_semantic_search(params, context)
            elif action == "build_context_pack":
                return await self._action_build_context_pack(params, context)
            elif action == "report":
                return await self._action_report(params, context)
            elif action == "move_note":
                return await self._action_move_note(params)
            elif action == "create_note":
                return await self._action_create_note(params)
            elif action == "srs_review":
                return StepResult(action, True, output=[], message="SRS 리뷰 (v0.4에서 구현)")
            else:
                return StepResult(action, False, message=f"알 수 없는 액션: {action}")
        except Exception as e:
            return StepResult(action, False, message=str(e))

    def _resolve_params(self, params: Dict, context: Dict) -> Dict:
        """{{변수}} 패턴을 컨텍스트로 치환"""
        import re
        resolved = {}
        for k, v in params.items():
            if isinstance(v, str):
                resolved[k] = re.sub(
                    r'\{\{(\w+)\}\}',
                    lambda m: str(context.get(m.group(1), m.group(0))),
                    v
                )
            else:
                resolved[k] = v
        return resolved

    # ── 액션 구현 ──────────────────────────────────────

    async def _action_read_inbox(self, params: Dict) -> StepResult:
        inbox = self.vault.list_inbox()
        return StepResult(
            "read_inbox", True,
            output=inbox,
            message=f"Inbox에 {len(inbox)}개의 노트"
        )

    async def _action_classify_dikm(self, params: Dict, context: Dict) -> StepResult:
        inbox = context.get("step_read_inbox", [])
        classified = []
        for note in inbox:
            current = note.dikm
            classified.append({"note": note.title, "dikm": current, "path": str(note.rel_path)})
        return StepResult("classify_dikm", True, output=classified,
                          message=f"{len(classified)}개 노트 DIKM 분류")

    async def _action_suggest_brain(self, params: Dict, context: Dict) -> StepResult:
        inbox = context.get("step_read_inbox", [])
        suggestions = [
            f"BRAIN 작성 추천: '{note.title}'" for note in inbox
            if note.note_type not in ("brain", "evergreen", "moc")
        ]
        return StepResult("suggest_brain", True, output=suggestions,
                          message=f"{len(suggestions)}개 BRAIN 작성 추천")

    async def _action_semantic_search(self, params: Dict, context: Dict) -> StepResult:
        from .search import search
        query = params.get("query", context.get("input", ""))
        top_k = int(params.get("top_k", 10))
        results = search(query, self.vault, max_results=top_k)
        return StepResult("semantic_search", True,
                          output=[r.note for r in results],
                          message=f"'{query}' 검색 결과 {len(results)}개")

    async def _action_build_context_pack(self, params: Dict, context: Dict) -> StepResult:
        notes = context.get("step_semantic_search", [])
        purpose = context.get("input", params.get("purpose", ""))
        pack = {
            "purpose": purpose,
            "notes": [{"title": n.title, "path": str(n.rel_path), "dikm": n.dikm}
                      for n in notes[:10]],
        }
        return StepResult("build_context_pack", True, output=pack,
                          message=f"Context Pack 생성 ({len(pack['notes'])}개 노트)")

    async def _action_report(self, params: Dict, context: Dict) -> StepResult:
        report_lines = ["=== 에이전트 결과 ==="]
        for k, v in context.items():
            if isinstance(v, list) and v:
                report_lines.append(f"\n[{k}] {len(v)}개 항목")
                for item in v[:5]:
                    report_lines.append(f"  • {item}")
            elif isinstance(v, dict):
                report_lines.append(f"\n[{k}] {v}")
        return StepResult("report", True, output="\n".join(report_lines),
                          message="리포트 완성")

    async def _action_move_note(self, params: Dict) -> StepResult:
        src = params.get("from", "")
        dst = params.get("to", "")
        if not src or not dst:
            return StepResult("move_note", False, message="from/to 경로 필요")
        from shutil import move as shutil_move
        src_path = self.vault.root / src
        dst_path = self.vault.root / dst
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        shutil_move(str(src_path), str(dst_path))
        return StepResult("move_note", True, message=f"{src} → {dst}")

    async def _action_create_note(self, params: Dict) -> StepResult:
        name = params.get("name", "Untitled")
        folder = params.get("folder", "00 Inbox")
        template = params.get("template", "note")
        note, created = self.vault.create_note(name=name, folder=folder, template_type=template)
        return StepResult("create_note", True, output=note,
                          message=f"{'생성' if created else '이미 존재'}: {note.rel_path}")
