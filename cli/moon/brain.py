"""BRAIN 템플릿 엔진 — Background Resonance Amplify Integrate Navigate"""
from datetime import datetime
from pathlib import Path
from typing import Optional

from .config import get_config
from .vault import Note, Vault


BRAIN_SECTIONS = {
    "Background": "배경/맥락 — 언제, 어디서, 어떤 상황에서 이 정보를 접했나?",
    "Resonance": "울림/감정 — 왜 이것이 흥미롭거나 중요하게 느껴지는가?",
    "Amplify": "증폭 — 왜 중요한가? 어떻게 활용할 수 있는가?",
    "Integrate": "통합 — 기존 지식/노트와 어떻게 연결되는가?",
    "Navigate": "다음 행동 — 이 노트를 통해 해야 할 일은 무엇인가?",
}


def build_brain_template(
    title: str,
    source: str = "",
    pre_content: str = "",
    dikm: str = "information",
    tags: Optional[list] = None,
) -> str:
    """BRAIN 마크다운 템플릿 생성"""
    cfg = get_config()
    today = datetime.now().strftime('%Y-%m-%d')
    tags = tags or []

    frontmatter_lines = [
        "---",
        f"type: brain",
        f"dikm: {dikm}",
        f"tags: [{', '.join(tags)}]",
        f"created: {today}",
    ]
    if source:
        frontmatter_lines.append(f"source: \"{source}\"")
    frontmatter_lines.append("---")
    frontmatter_lines.append("")

    lines = frontmatter_lines + [f"# {title}", ""]

    if pre_content:
        lines += [
            "## 원문/자료",
            "",
            f"> {pre_content}",
            "",
        ]

    for section, hint in BRAIN_SECTIONS.items():
        lines += [
            f"## {section}",
            "",
            f"<!-- {hint} -->",
            "",
        ]

    lines += [
        "---",
        "",
        "## 연결된 노트",
        "",
        "- [[]]",
        "- [[]]",
        "",
    ]

    return "\n".join(lines)


def apply_brain_to_note(note: Note) -> str:
    """기존 노트에 BRAIN 섹션을 추가"""
    content = note.content
    existing_sections = [s for s in BRAIN_SECTIONS if f"## {s}" in content]
    missing = {k: v for k, v in BRAIN_SECTIONS.items() if k not in existing_sections}

    if not missing:
        return content  # 이미 완성된 BRAIN 노트

    additions = ["\n\n---\n", "## BRAIN 섹션 추가됨\n"]
    for section, hint in missing.items():
        additions += [
            f"\n## {section}\n",
            f"\n<!-- {hint} -->\n",
            "\n",
        ]
    return content + "".join(additions)


def parse_brain_sections(note: Note) -> dict:
    """노트에서 BRAIN 섹션 내용 추출"""
    import re
    content = note.content
    result = {}
    for section in BRAIN_SECTIONS:
        pattern = rf'## {section}\s*\n(.*?)(?=\n## |\Z)'
        m = re.search(pattern, content, re.DOTALL)
        if m:
            text = m.group(1).strip()
            # 주석 제거
            text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL).strip()
            result[section] = text
    return result


def create_brain_note(
    vault: Vault,
    title: str,
    **kwargs,
) -> Note:
    """Inbox에 새 BRAIN 노트 생성"""
    cfg = get_config()
    folder = cfg.para.get("inbox", "00 Inbox")
    content = build_brain_template(title, **kwargs)
    note, _ = vault.create_note(
        name=title,
        folder=folder,
        template_type="brain",
        content=content.split("---", 2)[-1].lstrip() if content.count("---") >= 2 else content,
        metadata={"type": "brain", "dikm": "information"},
    )
    return note
