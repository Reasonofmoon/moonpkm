"""설정 관리 — ~/.config/moon/config.yaml"""
import os
from pathlib import Path
from typing import Any, Dict, Optional
import yaml

from . import DEFAULT_VAULT, CONFIG_DIR


DEFAULT_CONFIG: Dict[str, Any] = {
    "vault_path": str(DEFAULT_VAULT),
    "editor": os.environ.get("EDITOR", "nvim"),
    "ai_model": "gemini-2.0-flash",
    "ai_api_key": "",
    "language": "ko",
    "para_folders": {
        "inbox": "00 Inbox",
        "fleeting": "01 Fleeting",
        "literature": "02 Literature",
        "permanent": "03 Permanent",
        "mocs": "04 MOCs",
        "projects": "05 Projects",
        "areas": "06 Areas",
        "resources": "07 Resources",
        "archive": "08 Archive",
        "templates": "99 Templates",
    },
    "brain_template": {
        "sections": ["Background", "Resonance", "Amplify", "Integrate", "Navigate"]
    },
    "srs": {
        "daily_limit": 20,
        "new_cards_per_day": 5,
    },
}


class Config:
    """MoonPKM 설정 관리자"""

    def __init__(self):
        self._config: Dict[str, Any] = {}
        self._path = CONFIG_DIR / "config.yaml"
        self._load()

    def _load(self):
        """설정 파일 로드 (없으면 기본값)"""
        self._config = DEFAULT_CONFIG.copy()
        # (1) .env 파일 로드 — 여러 위치 탐색
        self._load_dotenv()
        # (2) YAML 사용자 설정
        if self._path.exists():
            with open(self._path, "r", encoding="utf-8") as f:
                user_config = yaml.safe_load(f) or {}
                self._deep_merge(self._config, user_config)
        # (3) 환경변수 오버라이드 (가장 높은 우선순위)
        if os.environ.get("MOON_VAULT"):
            self._config["vault_path"] = os.environ["MOON_VAULT"]
        if os.environ.get("GEMINI_API_KEY"):
            self._config["ai_api_key"] = os.environ["GEMINI_API_KEY"]
        if os.environ.get("MOON_MODEL"):
            self._config["ai_model"] = os.environ["MOON_MODEL"]

    def _load_dotenv(self):
        """
        .env 파일 파싱 — python-dotenv 의존 없이 직접 구현.
        탐색 순서: 현재 디렉토리 → 프로젝트 루트 → ~
        환경변수는 이미 설정된 것은 덮어쓰지 않음.
        """
        candidates = [
            Path.cwd() / ".env",
            Path(__file__).parent.parent.parent / ".env",  # 프로젝트 루트
            Path.home() / ".config" / "moon" / ".env",
        ]
        for env_file in candidates:
            if env_file.exists() and env_file.is_file():
                try:
                    with open(env_file, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line or line.startswith("#"):
                                continue
                            if "=" in line:
                                key, _, val = line.partition("=")
                                key = key.strip()
                                val = val.strip().strip('"').strip("'")
                                # 기존 환경변수 우선 (덮어쓰지 않음)
                                if key and key not in os.environ:
                                    os.environ[key] = val
                except Exception:
                    pass


    def _deep_merge(self, base: dict, override: dict):
        for k, v in override.items():
            if isinstance(v, dict) and isinstance(base.get(k), dict):
                self._deep_merge(base[k], v)
            else:
                base[k] = v

    def save(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        with open(self._path, "w", encoding="utf-8") as f:
            yaml.dump(self._config, f, allow_unicode=True, default_flow_style=False)

    def get(self, key: str, default: Any = None) -> Any:
        keys = key.split(".")
        val = self._config
        for k in keys:
            if isinstance(val, dict):
                val = val.get(k, default)
            else:
                return default
        return val

    def set(self, key: str, value: Any):
        keys = key.split(".")
        d = self._config
        for k in keys[:-1]:
            d = d.setdefault(k, {})
        d[keys[-1]] = value

    @property
    def vault_path(self) -> Path:
        return Path(self._config["vault_path"])

    @property
    def editor(self) -> str:
        return self._config.get("editor", "nvim")

    @property
    def ai_model(self) -> str:
        return self._config.get("ai_model", "gemini-2.0-flash")

    @property
    def ai_api_key(self) -> str:
        return self._config.get("ai_api_key", "")

    @property
    def para(self) -> Dict[str, str]:
        return self._config.get("para_folders", DEFAULT_CONFIG["para_folders"])


# 싱글톤
_config: Optional[Config] = None


def get_config() -> Config:
    global _config
    if _config is None:
        _config = Config()
    return _config
