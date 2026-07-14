import pytest

from src import supermemory_client as sm


def test_is_enabled_false_when_no_key(monkeypatch):
    monkeypatch.setenv("SUPERMEMORY_API_KEY", "")
    from src.config import Settings

    settings = Settings()
    monkeypatch.setattr(sm, "settings", settings)
    assert sm.is_enabled() is False


def test_work_and_user_tags():
    assert sm._work_tag("abc") == "work_abc"
    assert sm._user_tag() == "user_00000000-0000-0000-0000-000000000001"


@pytest.mark.asyncio
async def test_store_memory_noops_without_client(monkeypatch):
    monkeypatch.setenv("SUPERMEMORY_API_KEY", "")
    from src.config import Settings

    monkeypatch.setattr(sm, "settings", Settings())
    await sm.store_memory("hello", "work-1")


@pytest.mark.asyncio
async def test_search_work_returns_empty_without_client(monkeypatch):
    monkeypatch.setenv("SUPERMEMORY_API_KEY", "")
    from src.config import Settings

    monkeypatch.setattr(sm, "settings", Settings())
    result = await sm.search_work("work-1", "query")
    assert result == ""

@pytest.mark.asyncio
async def test_health_status_disabled():
    from src.config import Settings
    import src.supermemory_client as sm_mod

    class FakeSettings:
        supermemory_api_key = ""
        supermemory_api_url = "http://localhost:6767"

    original = sm_mod.settings
    sm_mod.settings = FakeSettings()
    try:
        assert await sm_mod.health_status() == "disabled"
    finally:
        sm_mod.settings = original
