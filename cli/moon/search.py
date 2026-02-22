"""검색 엔진 — ripgrep 우선, 파이썬 폴백"""
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from .config import get_config
from .vault import Note, Vault


@dataclass
class SearchResult:
    note: Note
    score: float
    matched_lines: List[str] = field(default_factory=list)
    match_type: str = "content"  # title | content | tag | link


def _has_ripgrep() -> bool:
    try:
        subprocess.run(["rg", "--version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def search_with_ripgrep(vault_root: Path, query: str, max_results: int = 20) -> List[SearchResult]:
    """ripgrep을 사용한 고속 풀텍스트 검색"""
    vault_obj = Vault(vault_root)

    try:
        result = subprocess.run(
            [
                "rg",
                "--type", "md",
                "--ignore-case",
                "--line-number",
                "--with-filename",
                "--max-count", "3",
                "--color", "never",
                query,
                str(vault_root),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        lines = result.stdout.strip().split("\n") if result.stdout.strip() else []

        # 파일별 매칭 라인 집계
        file_matches: dict = {}
        for line in lines:
            # rg 출력: /path/file.md:12:matched content
            parts = line.split(":", 2)
            if len(parts) >= 3:
                filepath = parts[0]
                matched = parts[2]
                if filepath not in file_matches:
                    file_matches[filepath] = []
                file_matches[filepath].append(matched.strip())

        results = []
        for filepath, matched_lines in list(file_matches.items())[:max_results]:
            p = Path(filepath)
            if p.exists():
                note = Note(p, vault_root)
                # 스코어: 제목 매치 > 내용 매치
                title_match = query.lower() in note.path.stem.lower()
                score = 2.0 if title_match else 1.0
                score += len(matched_lines) * 0.1  # 매칭 라인 수 보너스
                results.append(SearchResult(
                    note=note,
                    score=score,
                    matched_lines=matched_lines[:3],
                    match_type="title" if title_match else "content",
                ))

        results.sort(key=lambda r: r.score, reverse=True)
        return results

    except Exception as e:
        return []


def search_python_fallback(vault: Vault, query: str, max_results: int = 20) -> List[SearchResult]:
    """ripgrep 없을 때 파이썬 순수 구현"""
    query_lower = query.lower()
    results: List[SearchResult] = []

    for note in vault.iter_notes():
        score = 0.0
        matched = []

        # 제목 매치 (높은 가중치)
        if query_lower in note.path.stem.lower():
            score += 3.0
            matched.append(f"[제목] {note.title}")

        # 태그 매치
        if any(query_lower in t.lower() for t in note.tags if t):
            score += 2.0
            matched.append(f"[태그] {', '.join(note.tags)}")

        # 내용 매치 (줄 단위)
        try:
            for line in note.content.split("\n"):
                if query_lower in line.lower():
                    score += 0.5
                    matched.append(line.strip()[:100])
                    if len(matched) >= 4:
                        break
        except Exception:
            pass

        if score > 0:
            results.append(SearchResult(
                note=note,
                score=score,
                matched_lines=matched[:3],
                match_type="title" if score >= 3 else "content",
            ))

    results.sort(key=lambda r: r.score, reverse=True)
    return results[:max_results]


def search(query: str, vault: Optional[Vault] = None, max_results: int = 20) -> List[SearchResult]:
    """스마트 검색 — ripgrep 우선, 폴백"""
    if vault is None:
        vault = Vault()

    if _has_ripgrep():
        return search_with_ripgrep(vault.root, query, max_results)
    else:
        return search_python_fallback(vault, query, max_results)


def format_results_table(results: List[SearchResult]) -> str:
    """Rich 테이블용 문자열 (CLI 출력용)"""
    if not results:
        return "검색 결과 없음"

    lines = []
    dikm_icons = {
        "data": "🔴",
        "information": "🟠",
        "knowledge": "🟣",
        "meaning": "🟢",
    }
    for i, r in enumerate(results, 1):
        icon = dikm_icons.get(r.note.dikm, "⚪")
        lines.append(f"{i:2}. {icon} {r.note.title}")
        lines.append(f"    📁 {r.note.rel_path}")
        if r.matched_lines:
            for ml in r.matched_lines[:2]:
                lines.append(f"    ┆ {ml[:80]}")
        lines.append("")
    return "\n".join(lines)
