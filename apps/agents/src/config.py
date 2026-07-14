from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings


PROVIDER_DEFAULTS: dict[str, dict[str, str]] = {
    "k2think": {
        "base_url": "https://api.k2think.ai/v1",
        "model": "MBZUAI-IFM/K2-Think-v2",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
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

MODEL_OPTIONS: dict[str, list[str]] = {
    "k2think": ["MBZUAI-IFM/K2-Think-v2"],
    "groq": [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
    ],
    "openai": ["gpt-4o", "gpt-4o-mini", "o3-mini"],
    "anthropic": ["claude-sonnet-4-20250514", "claude-haiku-3-5"],
    "google": ["gemini-2.0-flash", "gemini-2.0-pro"],
    "openrouter": ["openai/gpt-4o", "anthropic/claude-sonnet-4"],
    "custom": [],
}

RECOMMENDED_PROVIDER = "k2think"

ENV_KEY_MAP: dict[str, str] = {
    "k2think": "K2THINK_API_KEY",
    "groq": "GROQ_API_KEY",
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}


class Settings(BaseSettings):
    llm_provider: str = "k2think"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""

    k2think_api_key: str = "mock-key-for-dev"
    k2think_base_url: str = "https://api.k2think.ai/v1/chat/completions"
    k2think_model: str = "MBZUAI-IFM/K2-Think-v2"

    groq_api_key: str = ""
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

    _llm_store: dict[str, Any] = {}

    class Config:
        env_file = ".env"
        extra = "ignore"

    def llm_config_path(self) -> Path:
        return Path(self.storage_path) / "llm_config.json"

    def app_config_path(self) -> Path:
        return Path(self.storage_path) / "app_config.json"

    def resolved_provider(self) -> str:
        active = self._llm_store.get("active_provider") or self.llm_provider or RECOMMENDED_PROVIDER
        return str(active).lower().strip()

    def _env_key_for_provider(self, provider: str) -> str:
        env_name = ENV_KEY_MAP.get(provider, "")
        if not env_name:
            return ""
        return os.environ.get(env_name, "") or getattr(self, env_name.lower(), "") or ""

    def _default_store(self) -> dict[str, Any]:
        keys: dict[str, str] = {}
        models: dict[str, str] = {}
        base_urls: dict[str, str] = {}
        for provider, defaults in PROVIDER_DEFAULTS.items():
            env_key = self._env_key_for_provider(provider)
            if env_key and env_key != "mock-key-for-dev":
                keys[provider] = env_key
            models[provider] = defaults["model"]
            base_urls[provider] = defaults["base_url"]
        if self.k2think_api_key and self.k2think_api_key != "mock-key-for-dev":
            keys.setdefault("k2think", self.k2think_api_key)
        return {
            "active_provider": RECOMMENDED_PROVIDER,
            "keys": keys,
            "models": models,
            "base_urls": base_urls,
        }

    def _read_store(self) -> dict[str, Any]:
        path = self.llm_config_path()
        if not path.exists():
            return self._default_store()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return self._default_store()
        if not isinstance(data, dict):
            return self._default_store()
        if "keys" in data:
            store = self._default_store()
            store.update({k: data[k] for k in ("active_provider", "keys", "models", "base_urls") if k in data})
            for provider in PROVIDER_DEFAULTS:
                env_key = self._env_key_for_provider(provider)
                if env_key and env_key != "mock-key-for-dev" and not store["keys"].get(provider):
                    store["keys"][provider] = env_key
            return store
        # Legacy flat format
        provider = str(data.get("provider", RECOMMENDED_PROVIDER)).lower()
        store = self._default_store()
        store["active_provider"] = provider
        if data.get("api_key"):
            store["keys"][provider] = str(data["api_key"])
        if data.get("model"):
            store["models"][provider] = str(data["model"])
        if data.get("base_url"):
            store["base_urls"][provider] = str(data["base_url"])
        return store

    def _sync_from_store(self) -> None:
        self._llm_store = self._read_store()
        provider = self.resolved_provider()
        self.llm_provider = provider
        keys = self._llm_store.get("keys", {})
        models = self._llm_store.get("models", {})
        base_urls = self._llm_store.get("base_urls", {})
        self.llm_api_key = keys.get(provider, "") or self._env_key_for_provider(provider)
        self.llm_model = models.get(provider, "") or PROVIDER_DEFAULTS.get(provider, {}).get("model", "")
        self.llm_base_url = base_urls.get(provider, "") or PROVIDER_DEFAULTS.get(provider, {}).get("base_url", "")
        self._refresh_mock_flag()

    def resolved_credentials(self) -> dict[str, Any]:
        provider = self.resolved_provider()
        defaults = PROVIDER_DEFAULTS.get(provider, PROVIDER_DEFAULTS["custom"])
        keys = self._llm_store.get("keys", {})

        key = keys.get(provider, "") or self.llm_api_key
        if not key:
            key = self._env_key_for_provider(provider)

        base_url = self._llm_store.get("base_urls", {}).get(provider, "") or self.llm_base_url
        if not base_url:
            if provider == "k2think":
                base_url = self.k2think_base_url
            else:
                base_url = defaults["base_url"]

        if "/chat/completions" in base_url:
            base_url = base_url.replace("/chat/completions", "")

        model = self._llm_store.get("models", {}).get(provider, "") or self.llm_model
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
        store = self._read_store()
        if "provider" in data and data["provider"]:
            store["active_provider"] = str(data["provider"]).lower()
        provider = store.get("active_provider", RECOMMENDED_PROVIDER)

        keys = store.setdefault("keys", {})
        models = store.setdefault("models", {})
        base_urls = store.setdefault("base_urls", {})

        if "keys" in data and isinstance(data["keys"], dict):
            for p, k in data["keys"].items():
                if k:
                    keys[str(p).lower()] = str(k)

        if "api_key" in data and data["api_key"]:
            keys[provider] = str(data["api_key"])

        if "model" in data and data["model"]:
            models[provider] = str(data["model"])
        if "base_url" in data and data["base_url"]:
            base_urls[provider] = str(data["base_url"])

        self._llm_store = store
        self._persist_store(store)
        self._sync_from_store()

    def _persist_store(self, store: dict[str, Any]) -> None:
        path = self.llm_config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(store, indent=2), encoding="utf-8")

    def persist_llm_override(self) -> None:
        store = self._read_store()
        provider = self.resolved_provider()
        if self.llm_api_key:
            store.setdefault("keys", {})[provider] = self.llm_api_key
        if self.llm_model:
            store.setdefault("models", {})[provider] = self.llm_model
        if self.llm_base_url:
            store.setdefault("base_urls", {})[provider] = self.llm_base_url
        store["active_provider"] = provider
        self._persist_store(store)

    def load_llm_override(self) -> None:
        self._sync_from_store()

    def _refresh_mock_flag(self) -> None:
        key = self.resolved_credentials()["api_key"]
        self.mock_llm = key in ("", "mock-key-for-dev")

    def _mask_key(self, key: str) -> str:
        if not key or key == "mock-key-for-dev":
            return "(mock)" if key == "mock-key-for-dev" else ""
        return ("*" * max(0, len(key) - 4)) + key[-4:]

    def public_llm_info(self) -> dict[str, Any]:
        creds = self.resolved_credentials()
        keys = self._llm_store.get("keys", {})
        keys_set = {
            p: bool(k) and k != "mock-key-for-dev"
            for p, k in keys.items()
        }
        keys_masked = {p: self._mask_key(k) for p, k in keys.items() if k}
        return {
            "provider": creds["provider"],
            "base_url": creds["base_url"],
            "model": creds["model"],
            "api_key_set": bool(creds["api_key"]) and creds["api_key"] != "mock-key-for-dev",
            "api_key_masked": self._mask_key(creds["api_key"]),
            "mock_llm": self.mock_llm,
            "providers": list(PROVIDER_DEFAULTS.keys()),
            "defaults": PROVIDER_DEFAULTS,
            "model_options": MODEL_OPTIONS,
            "recommended_provider": RECOMMENDED_PROVIDER,
            "keys_set": keys_set,
            "keys_masked": keys_masked,
            "models": self._llm_store.get("models", {}),
            "base_urls": self._llm_store.get("base_urls", {}),
        }


settings = Settings()
settings.load_llm_override()
