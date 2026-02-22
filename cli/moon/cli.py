"""MoonPKM CLI — 메인 진입점 (Click + Rich)"""
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

import click
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.markdown import Markdown

from . import __version__
from .config import get_config
from .vault import Vault

console = Console()


# ─────────────────────── 그룹 ───────────────────────
@click.group()
@click.version_option(__version__, prog_name="moon")
@click.option("--vault", "-v", envvar="MOON_VAULT", help="Vault 경로 오버라이드")
@click.pass_context
def cli(ctx, vault):
    """🌙 MoonPKM — Vim 기반 에이전틱 지식관리 시스템"""
    ctx.ensure_object(dict)
    cfg = get_config()
    if vault:
        cfg.set("vault_path", vault)
    ctx.obj["config"] = cfg


# ─────────────────────── capture ────────────────────
@cli.command("capture")
@click.argument("text", nargs=-1)
@click.option("--title", "-t", default="", help="노트 제목")
@click.option("--folder", "-f", default="", help="저장 폴더 (기본: 00 Inbox)")
@click.option("--open", "-o", "open_editor", is_flag=True, help="에디터에서 열기")
@click.pass_context
def cmd_capture(ctx, text, title, folder, open_editor):
    """📥 빠른 캡처 → Inbox 저장"""
    cfg = ctx.obj["config"]
    vault = Vault()
    content_text = " ".join(text) if text else ""

    # stdin에서 읽기 (파이프 입력)
    if not content_text and not sys.stdin.isatty():
        content_text = sys.stdin.read().strip()

    # 제목 없으면 첫 줄 또는 입력 요청
    if not title:
        if content_text:
            title = content_text.split("\n")[0][:50]
        else:
            title = click.prompt("노트 제목")

    if not content_text:
        content_text = click.edit("") or ""

    note, created = vault.create_note(
        name=title,
        folder=folder or cfg.para.get("inbox", "00 Inbox"),
        template_type="capture",
        content=f"# {title}\n\n{content_text}\n",
    )

    status = "[green]✓ 생성됨[/]" if created else "[yellow]이미 존재[/]"
    rprint(f"{status} {note.rel_path}")

    if open_editor:
        subprocess.run([cfg.editor, str(note.path)])


# ─────────────────────── brain ──────────────────────
@cli.command("brain")
@click.argument("note_path", default="")
@click.option("--new", "-n", "new_title", default="", help="새 BRAIN 노트 생성")
@click.option("--ai", is_flag=True, help="AI로 BRAIN 섹션 자동완성")
@click.option("--source", "-s", default="", help="출처 URL/책/영상")
@click.pass_context
def cmd_brain(ctx, note_path, new_title, ai, source):
    """🧠 BRAIN 템플릿 — 노트에 BRAIN 섹션 추가/생성"""
    from .brain import build_brain_template, apply_brain_to_note, create_brain_note
    cfg = ctx.obj["config"]
    vault = Vault()

    if new_title:
        note = create_brain_note(vault, new_title, source=source)
        rprint(f"[green]✓ BRAIN 노트 생성[/]: {note.rel_path}")
        subprocess.run([cfg.editor, str(note.path)])
        return

    if note_path:
        note = vault.get_note(note_path)
        if not note:
            note = vault.find_by_name(note_path)
        if not note:
            rprint(f"[red]노트를 찾을 수 없음[/]: {note_path}")
            raise SystemExit(1)

        if ai:
            with console.status("AI가 BRAIN 섹션을 분석 중..."):
                from .ai import generate_brain_sections
                sections = generate_brain_sections(note.title, note.content)
            rprint(Panel(str(sections), title="AI BRAIN 분석 결과"))
        else:
            updated = apply_brain_to_note(note)
            note.save(updated)
            rprint(f"[green]✓ BRAIN 섹션 추가됨[/]: {note.rel_path}")
        subprocess.run([cfg.editor, str(note.path)])
    else:
        rprint("[yellow]사용법:[/]")
        rprint("  moon brain --new '노트 제목'       # 새 BRAIN 노트")
        rprint("  moon brain 03\\ Permanent/note.md  # 기존 노트에 추가")
        rprint("  moon brain 'note title' --ai       # AI로 자동완성")


# ─────────────────────── search ─────────────────────
@cli.command("search")
@click.argument("query")
@click.option("--max", "-n", "max_results", default=20, help="최대 결과 수")
@click.option("--ai", is_flag=True, help="AI로 결과 재순위화")
@click.option("--open", "-o", "open_result", is_flag=True, help="첫 결과 에디터로 열기")
@click.pass_context
def cmd_search(ctx, query, max_results, ai, open_result):
    """🔍 Vault 전체 검색 (ripgrep 기반)"""
    from .search import search, format_results_table
    cfg = ctx.obj["config"]
    vault = Vault()

    with console.status(f"'[cyan]{query}[/]' 검색 중..."):
        results = search(query, vault, max_results=max_results)

    if not results:
        rprint(f"[yellow]결과 없음:[/] '{query}'")
        return

    if ai and len(results) > 1:
        with console.status("AI가 결과 재정렬 중..."):
            from .ai import rank_notes_by_relevance
            notes = [r.note for r in results]
            ranked = rank_notes_by_relevance(query, notes)
            results = [next(r for r in results if r.note == n) for n in ranked if n in [r.note for r in results]]

    # 결과 테이블 출력
    table = Table(title=f"🔍 '{query}' 검색 결과 ({len(results)}개)", show_lines=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("DIKM", width=5)
    table.add_column("제목", style="bold")
    table.add_column("경로", style="dim")
    table.add_column("매치", style="dim")

    dikm_colors = {"data": "red", "information": "orange3", "knowledge": "purple", "meaning": "green"}
    dikm_icons = {"data": "🔴", "information": "🟠", "knowledge": "🟣", "meaning": "🟢"}

    for i, r in enumerate(results, 1):
        d = r.note.dikm
        icon = dikm_icons.get(d, "⚪")
        matched = r.matched_lines[0][:60] if r.matched_lines else ""
        table.add_row(
            str(i),
            icon,
            r.note.title,
            str(r.note.rel_path),
            matched,
        )
    console.print(table)

    if open_result and results:
        subprocess.run([cfg.editor, str(results[0].note.path)])


# ─────────────────────── agent ──────────────────────
@cli.group("agent")
def cmd_agent():
    """🤖 에이전트 시스템 (OpenClaw 스타일)"""
    pass


@cmd_agent.command("list")
def agent_list():
    """사용 가능한 에이전트 목록"""
    from .agent import AgentRunner
    runner = AgentRunner()
    agents = runner.list_agents()
    if not agents:
        rprint("[yellow]등록된 에이전트 없음[/]")
        return
    for a in agents:
        rprint(f"  [cyan]• {a.name}[/] — {a.description}")


@cmd_agent.command("run")
@click.argument("agent_name")
@click.option("--input", "-i", "user_input", default="", help="에이전트에 넘길 입력값")
@click.pass_context
def agent_run(ctx, agent_name, user_input):
    """에이전트 실행"""
    from .agent import AgentRunner
    vault = Vault()
    runner = AgentRunner(vault)

    context = {"input": user_input} if user_input else {}
    rprint(f"[green]▶ 에이전트 실행:[/] {agent_name}")

    try:
        results = runner.run(agent_name, context)
    except ValueError as e:
        rprint(f"[red]오류:[/] {e}")
        raise SystemExit(1)

    for r in results:
        icon = "✓" if r.success else "✗"
        color = "green" if r.success else "red"
        rprint(f"  [{color}]{icon}[/] [{r.action}] {r.message}")
        if r.output and isinstance(r.output, str):
            rprint(Panel(r.output, border_style="dim"))


# ─────────────────────── context ────────────────────
@cli.command("context")
@click.argument("purpose")
@click.option("--search", "-s", "search_query", default="", help="검색어")
@click.option("--ai", is_flag=True, default=True, help="AI로 Pack 생성")
@click.option("--output", "-o", default="", help="출력 파일 경로")
@click.pass_context
def cmd_context(ctx, purpose, search_query, ai, output):
    """📦 Context Pack 생성 (AI 글쓰기 재료)"""
    from .search import search
    import json

    vault = Vault()
    query = search_query or purpose

    with console.status(f"'{query}' 관련 노트 검색 중..."):
        results = search(query, vault, max_results=10)

    if not results:
        rprint("[yellow]관련 노트를 찾을 수 없음[/]")
        return

    if ai:
        notes_data = [
            {"title": r.note.title, "content": r.note.content[:500]}
            for r in results
        ]
        with console.status("AI가 Context Pack 생성 중..."):
            from .ai import build_context_pack_ai
            pack = build_context_pack_ai(purpose, notes_data)
    else:
        pack = {
            "purpose": purpose,
            "notes": [{"title": r.note.title, "path": str(r.note.rel_path)} for r in results],
        }

    pack_json = json.dumps(pack, ensure_ascii=False, indent=2)

    if output:
        Path(output).write_text(pack_json, encoding="utf-8")
        rprint(f"[green]✓ Context Pack 저장[/]: {output}")
    else:
        console.print(Panel(pack_json, title=f"📦 Context Pack: {purpose}", border_style="cyan"))


# ─────────────────────── config ─────────────────────
@cli.group("config")
def cmd_config():
    """⚙️ 설정 관리"""
    pass


@cmd_config.command("show")
def config_show():
    """현재 설정 표시"""
    cfg = get_config()
    table = Table(title="MoonPKM 설정")
    table.add_column("키", style="cyan")
    table.add_column("값")
    table.add_row("vault_path", str(cfg.vault_path))
    table.add_row("editor", cfg.editor)
    table.add_row("ai_model", cfg.ai_model)
    table.add_row("ai_api_key", "설정됨" if cfg.ai_api_key else "[red]미설정[/]")
    console.print(table)


@cmd_config.command("set")
@click.argument("key")
@click.argument("value")
def config_set(key, value):
    """설정값 변경 (예: moon config set editor nvim)"""
    cfg = get_config()
    cfg.set(key, value)
    cfg.save()
    rprint(f"[green]✓[/] {key} = {value}")


# ─────────────────────── info / status ──────────────
@cli.command("status")
@click.pass_context
def cmd_status(ctx):
    """📊 Vault 현황"""
    vault = Vault()
    cfg = get_config()

    summary = vault.para_summary()
    inbox = vault.list_inbox()
    total = sum(summary.values())

    rprint(Panel(
        f"[bold cyan]🌙 MoonPKM v{__version__}[/]\n"
        f"Vault: [dim]{vault.root}[/]\n"
        f"총 노트: [bold]{total}[/]개 | Inbox: [yellow]{len(inbox)}[/]개 처리 대기",
        title="상태", border_style="cyan"
    ))

    table = Table(show_header=True)
    table.add_column("폴더", style="cyan")
    table.add_column("노트 수", justify="right")
    for folder, count in summary.items():
        if count > 0:
            table.add_row(folder, str(count))
    console.print(table)


# ─────────────────────── web ────────────────────────
@cli.command("web")
@click.option("--port", "-p", default=3031, help="포트 번호")
def cmd_web(port):
    """🌐 웹 그래프 뷰 실행 (Next.js)"""
    web_dir = Path(__file__).parent.parent.parent
    rprint(f"[green]▶ 그래프 뷰: http://localhost:{port}[/]")
    subprocess.run(["npx", "next", "dev", "-p", str(port)], cwd=str(web_dir))


# ─────────────────────── 진입점 ─────────────────────
def main():
    cli()


if __name__ == "__main__":
    main()
