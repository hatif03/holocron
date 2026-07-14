import os

import pytest


@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    monkeypatch.setenv("K2THINK_API_KEY", "mock-key-for-dev")
    monkeypatch.setenv("DATABASE_URL", "postgresql://holocron:holocron@localhost:5432/holocron")
    monkeypatch.setenv("STORAGE_PATH", "./storage")
    monkeypatch.delenv("SUPERMEMORY_API_KEY", raising=False)
