from logging.config import fileConfig
import os
from pathlib import Path
from typing import Optional

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from models.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def _load_database_url_from_env_files() -> Optional[str]:
    """
    Resolve DATABASE_URL from common local env file locations.
    This keeps Alembic independent from shell-exported env vars.
    """
    backend_dir = Path(__file__).resolve().parents[1]
    candidates = [backend_dir / ".env", backend_dir.parent / ".env"]

    for env_file in candidates:
        if not env_file.exists():
            continue

        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            if key.strip() != "DATABASE_URL":
                continue

            cleaned = value.strip().strip("\"").strip("'")
            if cleaned:
                return cleaned

    return None


def _resolve_database_url() -> Optional[str]:
    # 1) explicit shell env
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")

    # 2) app settings (loads .env / ../.env)
    try:
        from config import settings

        if settings.database_url:
            return settings.database_url
    except Exception:
        pass

    # 3) manual .env fallback
    return _load_database_url_from_env_files()


database_url = _resolve_database_url()
if database_url:
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
else:
    configured = config.get_main_option("sqlalchemy.url")
    if configured.startswith("driver://"):
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in shell or .env before running Alembic."
        )

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
