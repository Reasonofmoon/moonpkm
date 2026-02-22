"""
MoonPKM — Agentic PKM CLI
OpenClaw style: Agents + Skills + Context Engineering + Vim Native
"""
import os
import sys
from pathlib import Path

__version__ = "2.0.0"
__author__ = "달의이성 (Reason Moon)"

# 기본 Vault 경로 (WSL 자동 감지)
def _default_vault() -> Path:
    # WSL 환경 감지
    if Path("/mnt/c/Users/sound/Documents/MyZettelkasten").exists():
        return Path("/mnt/c/Users/sound/Documents/MyZettelkasten")
    # Windows 환경
    win_path = Path.home() / "Documents" / "MyZettelkasten"
    if win_path.exists():
        return win_path
    # 환경변수
    env = os.environ.get("MOON_VAULT")
    if env:
        return Path(env)
    return Path.home() / "vault"

DEFAULT_VAULT = _default_vault()
CONFIG_DIR = Path.home() / ".config" / "moon"
AGENTS_DIR = Path(__file__).parent.parent / "agents"
SKILLS_DIR = Path(__file__).parent.parent / "skills"
