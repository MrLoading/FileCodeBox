"""Theme registration must preserve existing volumes and official theme choices."""

from contextlib import asynccontextmanager
from copy import deepcopy

import pytest

import main
from apps.base.config import ensure_settings_row
from apps.base.models import KeyValue
from core import database
from core.settings import DEFAULT_CONFIG, settings
from fengchao import create_app
from tests.helpers import close_db, init_memory_db


@pytest.mark.parametrize("selected", [None, "themes/2023", "themes/2024", "themes/fengchao"])
async def test_registers_theme_without_changing_existing_selection_or_secrets(monkeypatch, tmp_path, selected):
    choices = deepcopy(DEFAULT_CONFIG["themes_choices"])
    if selected == "themes/fengchao":
        choices.append({"key": selected, "name": "Fengchao", "version": "1.0"})
    existing = {
        "themes_choices": choices,
        "themes_select": selected,
        "name": "Existing installation",
        "s3_secret_access_key": "test-secret-must-survive",
    }
    monkeypatch.setitem(DEFAULT_CONFIG, "themes_choices", deepcopy(DEFAULT_CONFIG["themes_choices"]))
    monkeypatch.setitem(DEFAULT_CONFIG, "themes_select", DEFAULT_CONFIG["themes_select"])
    monkeypatch.setattr(settings, "user_config", {})
    monkeypatch.setattr(database, "data_root", tmp_path)
    monkeypatch.setattr(database, "_STARTUP_LOCK_FILE", str(tmp_path / "startup.lock"))

    @asynccontextmanager
    async def upstream_lifespan(application):
        await init_memory_db()
        try:
            if selected is None:
                await ensure_settings_row()
            else:
                await KeyValue.create(key="settings", value=deepcopy(existing))
            yield
        finally:
            await close_db()

    monkeypatch.setattr(main.app.router, "lifespan_context", upstream_lifespan)
    app = create_app()
    async with app.router.lifespan_context(app):
        record = await KeyValue.get(key="settings")
        config = record.value
        assert config["themes_select"] == (selected or "themes/fengchao")
        keys = [choice["key"] for choice in config["themes_choices"]]
        assert {"themes/2023", "themes/2024", "themes/fengchao"} <= set(keys)
        assert keys.count("themes/fengchao") == 1
        assert settings.themes_select == config["themes_select"]
        assert settings.themes_choices == config["themes_choices"]
        if selected is not None:
            assert {key: value for key, value in config.items() if key != "themes_choices"} == {
                key: value for key, value in existing.items() if key != "themes_choices"
            }
