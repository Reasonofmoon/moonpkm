"""Vault 파일 시스템 작업 — 노트 읽기/쓰기/메타데이터"""
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple

import frontmatter  # python-frontmatter

from .config import get_config


WIKILINK_RE = re.compile(r'\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]')
HEADING_RE = re.compile(r'^#{1,6}\s+(.+)$', re.MULTILINE)


class Note:
    """단일 마크다운 노트"""
    def __init__(self, path: Path, vault_root: Path):
        self.path = path
        self.vault_root = vault_root
        self.rel_path = path.relative_to(vault_root)
        self._post: Optional[frontmatter.Post] = None

    def _load(self):
        if self._post is None:
            try:
                with open(self.path, 'r', encoding='utf-8') as f:
                    self._post = frontmatter.load(f)
            except Exception:
                # YAML 파싱 실패 시 원문으로 대체
                try:
                    with open(self.path, 'r', encoding='utf-8') as f:
                        raw = f.read()
                    self._post = frontmatter.Post(raw)
                except Exception:
                    self._post = frontmatter.Post("")

    @property
    def content(self) -> str:
        self._load()
        return self._post.content  # type: ignore

    @property
    def metadata(self) -> Dict[str, Any]:
        self._load()
        return dict(self._post.metadata)  # type: ignore

    @property
    def title(self) -> str:
        meta = self.metadata
        if 'title' in meta:
            return str(meta['title'])
        m = HEADING_RE.search(self.content)
        if m:
            return m.group(1)
        return self.path.stem

    @property
    def dikm(self) -> str:
        return self.metadata.get('dikm', 'data')

    @property
    def note_type(self) -> str:
        return self.metadata.get('type', 'note')

    @property
    def tags(self) -> List[str]:
        t = self.metadata.get('tags', [])
        return t if isinstance(t, list) else [t]

    @property
    def links(self) -> List[str]:
        return WIKILINK_RE.findall(self.content)

    def full_text(self) -> str:
        """전체 텍스트 (frontmatter 포함)"""
        with open(self.path, 'r', encoding='utf-8') as f:
            return f.read()

    def save(self, new_content: str, new_meta: Optional[Dict] = None):
        """노트 저장"""
        self._load()
        if new_meta:
            for k, v in new_meta.items():
                self._post[k] = v  # type: ignore
        self._post.content = new_content  # type: ignore
        with open(self.path, 'w', encoding='utf-8') as f:
            f.write(frontmatter.dumps(self._post))  # type: ignore

    def __repr__(self):
        return f"<Note {self.rel_path}>"


class Vault:
    """MyZettelkasten Vault 전체 관리"""

    def __init__(self, path: Optional[Path] = None):
        cfg = get_config()
        self.root = Path(path or cfg.vault_path)
        if not self.root.exists():
            raise FileNotFoundError(f"Vault not found: {self.root}")
        self._index: Optional[Dict[str, Note]] = None

    # ── 기본 탐색 ──────────────────────────────────────

    def iter_notes(self, subdir: str = '') -> Generator[Note, None, None]:
        """모든 .md 파일 순회"""
        base = self.root / subdir if subdir else self.root
        for p in base.rglob('*.md'):
            if not any(part.startswith('.') for part in p.parts):
                yield Note(p, self.root)

    def get_note(self, rel_path: str) -> Optional[Note]:
        """상대 경로로 노트 로드"""
        p = self.root / rel_path
        if p.exists():
            return Note(p, self.root)
        return None

    def find_by_name(self, name: str) -> Optional[Note]:
        """파일명으로 노트 찾기 (퍼지)"""
        name_lower = name.lower()
        for note in self.iter_notes():
            if note.path.stem.lower() == name_lower:
                return note
        # 퍼지 매치
        for note in self.iter_notes():
            if name_lower in note.path.stem.lower():
                return note
        return None

    # ── Inbox 처리 ─────────────────────────────────────

    def inbox_path(self) -> Path:
        cfg = get_config()
        return self.root / cfg.para['inbox']

    def list_inbox(self) -> List[Note]:
        inbox = self.inbox_path()
        if not inbox.exists():
            return []
        return [Note(p, self.root) for p in inbox.glob('*.md')]

    # ── 노트 생성 ──────────────────────────────────────

    def create_note(
        self,
        name: str,
        folder: str = '',
        template_type: str = 'note',
        content: str = '',
        metadata: Optional[Dict] = None,
    ) -> Tuple[Note, bool]:
        """새 노트 생성. (note, created) 반환"""
        cfg = get_config()

        # 폴더 결정
        if not folder:
            folder = cfg.para['inbox']

        target_dir = self.root / folder
        target_dir.mkdir(parents=True, exist_ok=True)

        # 파일명 정리
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', name)
        file_path = target_dir / f"{safe_name}.md"

        if file_path.exists():
            return Note(file_path, self.root), False

        # 기본 메타데이터
        meta: Dict[str, Any] = {
            'type': template_type,
            'dikm': 'data',
            'tags': [],
            'created': datetime.now().strftime('%Y-%m-%d'),
        }
        if metadata:
            meta.update(metadata)

        post = frontmatter.Post(content or f'# {name}\n\n', **meta)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(frontmatter.dumps(post))

        return Note(file_path, self.root), True

    # ── 링크 인덱스 ────────────────────────────────────

    def build_link_index(self) -> Dict[str, List[str]]:
        """
        note_path -> [linked_note_titles]
        역방향 인덱스: title -> [backlinkers]
        """
        forward: Dict[str, List[str]] = {}
        for note in self.iter_notes():
            forward[str(note.rel_path)] = note.links
        return forward

    def backlinks(self, target_title: str) -> List[Note]:
        """target_title을 링크하는 노트 목록"""
        results = []
        target_lower = target_title.lower()
        for note in self.iter_notes():
            if any(l.lower() == target_lower for l in note.links):
                results.append(note)
        return results

    # ── PARA 폴더 구조 ──────────────────────────────────

    def para_summary(self) -> Dict[str, int]:
        """PARA 폴더별 노트 수"""
        cfg = get_config()
        result = {}
        for label, folder in cfg.para.items():
            p = self.root / folder
            count = len(list(p.glob('**/*.md'))) if p.exists() else 0
            result[folder] = count
        return result
