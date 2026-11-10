"""Добавляет новые колонки в уже существующие таблицы (create_all колонки не добавляет)."""
from sqlalchemy import inspect, text
from .db import engine

COLUMNS = {
    "masters": {"user_id": "INTEGER", "phone": "VARCHAR(60) DEFAULT ''", "hidden": "BOOLEAN DEFAULT FALSE",
                "last_seen": "TIMESTAMP", "source_url": "VARCHAR(255) DEFAULT ''", "tg_username": "VARCHAR(80) DEFAULT ''",
                "claim_token": "VARCHAR(40) DEFAULT ''", "invite_state": "VARCHAR(20) DEFAULT ''",
                "kyc_session": "VARCHAR(80) DEFAULT ''", "kyc_status": "VARCHAR(30) DEFAULT ''"},
    "requests": {"user_id": "INTEGER", "masters": "VARCHAR(400) DEFAULT ''"},
    "reviews": {"order_id": "INTEGER", "user_id": "INTEGER"},
    "users": {"google_sub": "VARCHAR(64)"},
}


def run():
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    with engine.begin() as con:
        for table, cols in COLUMNS.items():
            if table not in tables:
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols.items():
                if name not in have:
                    con.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
