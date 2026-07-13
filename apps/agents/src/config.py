from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings


PROVIDER_DEFAULTS: dict[str, dict[str, str]] = {
    "k2think": {
        "base_url": "https://www.k2think.ai/api",
        "model": "MBZUAI-IFM/K2-Think-v2",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o",
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com",
        "model": "claude-sonnet-4-20250514",
    },
    "google": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "model": "gemini-2.0-flash",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "model": "openai/gpt-4o",
    },
    "custom": {
        "base_url": "http://localhost:11434/v1",
        "model": "llama3.2",
    },
}


class Settings(BaseSettings):
    llm_provider: str = "k2think"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""

    # Back-compat K2 aliases
    k2think_api_key: str = "mock-key-for-dev"
    k2think_base_url: str = "https://www.k2think.ai/api/chat/completions"
    k2think_model: str = "MBZUAI-IFM/K2-Think-v2"

    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""
    openrouter_api_key: str = ""

    semantic_scholar_api_key: str = ""
    database_url: str = "postgresql://holocron:holocron@localhost:5432/holocron"
    storage_path: str = "./storage"
    templates_path: str = "./templates"
    latex_service_url: str = "http://localhost:8081"
    mock_llm: bool = False

    supermemory_api_url: str = "http://localhost:6767"
    supermemory_api_key: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    def llm_config_path(self) -> Path:
        return Path(self.storage_path) / "llm_config.json"

    def resolved_provider(self) -> str:
        return (self.llm_provider or "k2think").lower().strip()

    def resolved_credentials(self) -> dict[str, Any]:
        provider = self.resolved_provider()
        defaults = PROVIDER_DEFAULTS.get(provider, PROVIDER_DEFAULTS["custom"])

        key = self.llm_api_key
        if not key:
            if provider == "k2think":
                key = self.k2think_api_key
            elif provider == "openai":
                key = self.openai_api_key
            elif provider == "anthropic":
                key = self.anthropic_api_key
            elif provider == "google":
                key = self.google_api_key
            elif provider == "openrouter":
                key = self.openrouter_api_key

        base_url = self.llm_base_url
        if not base_url:
            if provider == "k2think":
                base_url = self.k2think_base_url
            else:
                base_url = defaults["base_url"]

        # Normalize K2 chat completions URL to OpenAI SDK root
        if "/chat/completions" in base_url:
            base_url = base_url.replace("/chat/completions", "")

        model = self.llm_model
        if not model:
            if provider == "k2think":
                model = self.k2think_model
            else:
                model = defaults["model"]

        return {
            "provider": provider,
            "api_key": key or "mock-key-for-dev",
            "base_url": base_url.rstrip("/"),
            "model": model,
        }

    def apply_llm_override(self, data: dict[str, Any]) -> None:
        if "provider" in data and data["provider"]:
            self.llm_provider = str(data["provider"])
        if "api_key" in data and data["api_key"] is not None:
            self.llm_api_key = str(data["api_key"])
        if "base_url" in data and data["base_url"] is not None:
            self.llm_base_url = str(data["base_url"])
        if "model" in data and data["model"] is not None:
            self.llm_model = str(data["model"])
        self._refresh_mock_flag()

    def persist_llm_override(self) -> None:
        path = self.llm_config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        creds = self.resolved_credentials()
        payload = {
            "provider": creds["provider"],
            "api_key": self.llm_api_key or creds["api_key"],
            "base_url": self.llm_base_url or creds["base_url"],
            "model": self.llm_model or creds["model"],
        }
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def load_llm_override(self) -> None:
        path = self.llm_config_path()
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self.apply_llm_override(data)
        except Exception:
            pass

    def _refresh_mock_flag(self) -> None:
        key = self.resolved_credentials()["api_key"]
        self.mock_llm = key in ("", "mock-key-for-dev")

    def public_llm_info(self) -> dict[str, Any]:
        creds = self.resolved_credentials()
        key = creds["api_key"]
        masked = ""
        if key and key != "mock-key-for-dev":
            masked = ("*" * max(0, len(key) - 4)) + key[-4:]
        elif key == "mock-key-for-dev":
            masked = "(mock)"
        return {
            "provider": creds["provider"],
            "base_url": creds["base_url"],
            "model": creds["model"],
            "api_key_set": bool(key) and key != "mock-key-for-dev",
            "api_key_masked": masked,
            "mock_llm": self.mock_llm,
            "providers": list(PROVIDER_DEFAULTS.keys()),
            "defaults": PROVIDER_DEFAULTS,
        }


settings = Settings()
settings.load_llm_override()
settings._refresh_mock_flag()
