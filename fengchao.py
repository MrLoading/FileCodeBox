"""Register the Fengchao UI while retaining the upstream application and themes."""

from contextlib import asynccontextmanager


FENGCHAO_THEME = {
    "name": "Fengchao",
    "key": "themes/fengchao",
    "author": "FileCodeBox fork contributors",
    "version": "1.0",
}


def with_fengchao_theme(choices: list) -> list:
    if any(isinstance(choice, dict) and choice.get("key") == FENGCHAO_THEME["key"] for choice in choices):
        return choices
    return [*choices, dict(FENGCHAO_THEME)]


def create_app():
    # Set defaults before the upstream lifespan creates a fresh settings row.
    from core.settings import DEFAULT_CONFIG

    DEFAULT_CONFIG["themes_choices"] = with_fengchao_theme(DEFAULT_CONFIG["themes_choices"])
    DEFAULT_CONFIG["themes_select"] = FENGCHAO_THEME["key"]

    from apps.base.config import refresh_settings
    from apps.base.models import KeyValue
    from core.database import db_startup_lock
    from main import app

    upstream_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(application):
        async with upstream_lifespan(application):
            # Existing volumes retain their selected theme and all other settings.
            # Only append the new choice, so the admin can switch to it or roll back.
            async with db_startup_lock():
                record = await KeyValue.filter(key="settings").first()
                if record:
                    config = dict(record.value or {})
                    choices = config.get("themes_choices", DEFAULT_CONFIG["themes_choices"])
                    next_choices = with_fengchao_theme(choices)
                    if next_choices != choices:
                        config["themes_choices"] = next_choices
                        record.value = config
                        await record.save()
            await refresh_settings(force=True)
            yield

    app.router.lifespan_context = lifespan
    return app
