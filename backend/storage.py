from __future__ import annotations

import json
import hashlib
import secrets
import sqlite3
from datetime import datetime
from pathlib import Path

from mock_data import MedicationProfile, PatientRecord

DB_PATH = Path(__file__).resolve().parent / "mediaguard.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                conditions_json TEXT NOT NULL,
                medications_json TEXT NOT NULL,
                profiles_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                latest_report TEXT,
                latest_assessment_json TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        _seed_demo_user(
            conn,
            user_id="MJ-2024",
            role="patient",
            email="maria.chen@demo.mediguard.ca",
            password="demo123",
            display_name="Maria",
        )
        _seed_demo_user(
            conn,
            user_id="DR-1001",
            role="doctor",
            email="dr.smith@demo.mediguard.ca",
            password="demo123",
            display_name="Dr. Smith",
        )
        conn.commit()


def _hash_password(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return digest.hex()


def _build_password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    return f"{salt}${_hash_password(password, salt)}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split("$", 1)
    except ValueError:
        return False
    return _hash_password(password, salt) == digest


def _seed_demo_user(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    role: str,
    email: str,
    password: str,
    display_name: str,
) -> None:
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        return

    conn.execute(
        """
        INSERT INTO users (id, role, email, password_hash, display_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            role,
            email.lower(),
            _build_password_hash(password),
            display_name,
            datetime.now().isoformat(),
        ),
    )


def create_user(
    *,
    user_id: str,
    role: str,
    email: str,
    password: str,
    display_name: str,
) -> bool:
    with _connect() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email.lower(),)).fetchone()
        if existing:
            return False

        conn.execute(
            """
            INSERT INTO users (id, role, email, password_hash, display_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                role,
                email.lower(),
                _build_password_hash(password),
                display_name,
                datetime.now().isoformat(),
            ),
        )
        conn.commit()
    return True


def authenticate_user(*, role: str, email: str, password: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()

    if not row:
        return None
    if row["role"] != role:
        return None
    if not _verify_password(password, row["password_hash"]):
        return None

    return {
        "user_id": row["id"],
        "role": row["role"],
        "email": row["email"],
        "display_name": row["display_name"],
    }


def upsert_patient(record: PatientRecord) -> None:
    profiles_json = json.dumps(
        [
            {
                "name": p.name,
                "dosage": p.dosage,
                "schedule": p.schedule,
                "side_effect_windows": p.side_effect_windows,
                "common_side_effects": p.common_side_effects,
            }
            for p in record.profiles
        ]
    )

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO patients (
                id, name, age, conditions_json, medications_json, profiles_json,
                created_at, latest_report, latest_assessment_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                age=excluded.age,
                conditions_json=excluded.conditions_json,
                medications_json=excluded.medications_json,
                profiles_json=excluded.profiles_json,
                created_at=excluded.created_at,
                latest_report=excluded.latest_report,
                latest_assessment_json=excluded.latest_assessment_json
            """,
            (
                record.id,
                record.name,
                record.age,
                json.dumps(record.conditions),
                json.dumps(record.medications),
                profiles_json,
                record.created_at.isoformat(),
                record.latest_report,
                json.dumps(record.latest_assessment) if record.latest_assessment else None,
            ),
        )
        conn.commit()


def get_patient(patient_id: str) -> PatientRecord | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()

    if not row:
        return None

    profiles_raw = json.loads(row["profiles_json"])
    profiles = [
        MedicationProfile(
            name=p.get("name", "Unknown"),
            dosage=p.get("dosage", "Unknown"),
            schedule=p.get("schedule", "Unknown"),
            side_effect_windows=p.get("side_effect_windows", {}),
            common_side_effects=p.get("common_side_effects", []),
        )
        for p in profiles_raw
    ]

    created_at = datetime.fromisoformat(row["created_at"])

    return PatientRecord(
        id=row["id"],
        name=row["name"],
        age=int(row["age"]),
        conditions=json.loads(row["conditions_json"]),
        medications=json.loads(row["medications_json"]),
        profiles=profiles,
        created_at=created_at,
        latest_report=row["latest_report"],
        latest_assessment=json.loads(row["latest_assessment_json"]) if row["latest_assessment_json"] else None,
    )
