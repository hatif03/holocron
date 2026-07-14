"""Persist generation events to Postgres for durable process logs."""

from __future__ import annotations

import json
import logging

import psycopg2

from .config import settings

logger = logging.getLogger(__name__)


def persist_generation_event(
    generation_id: str,
    agent: str,
    event_type: str,
    message: str,
    metadata: dict | None = None,
) -> None:
    if not settings.database_url:
        return
    try:
        conn = psycopg2.connect(settings.database_url)
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO generation_events
                          (generation_id, agent, event_type, message, metadata)
                        VALUES (%s::uuid, %s, %s, %s, %s::jsonb)
                        """,
                        (
                            generation_id,
                            agent,
                            event_type,
                            message,
                            json.dumps(metadata or {}),
                        ),
                    )
        finally:
            conn.close()
    except Exception as e:
        logger.debug("Failed to persist generation event: %s", e)
