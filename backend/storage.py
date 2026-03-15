from __future__ import annotations

import json
import hashlib
import secrets
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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
                assigned_doctor_id TEXT,
                conditions_json TEXT NOT NULL,
                medications_json TEXT NOT NULL,
                profiles_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                latest_report TEXT,
                latest_assessment_json TEXT
            )
            """
        )
        _ensure_column(conn, "patients", "assigned_doctor_id", "TEXT")
        _ensure_column(conn, "patients", "risk_score", "INTEGER")

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

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS report_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                doctor_id TEXT,
                report_text TEXT NOT NULL,
                urgency TEXT,
                severity_score INTEGER,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                role TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS care_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                doctor_id TEXT NOT NULL,
                sender_role TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                read_by_patient INTEGER NOT NULL DEFAULT 0,
                read_by_doctor INTEGER NOT NULL DEFAULT 0
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS patient_metadata (
                patient_id TEXT PRIMARY KEY,
                date_of_birth TEXT,
                blood_type TEXT,
                allergies_json TEXT,
                contact_json TEXT,
                location TEXT,
                medication_plan_json TEXT,
                symptoms_log_json TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )

        _seed_demo_user(
            conn,
            user_id="MJ-2024",
            role="patient",
            email="maria.chen@demo.mediguard.ca",
            password="demo123",
            display_name="Maria Chen",
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

    _seed_demo_patient_metadata()


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl_type: str) -> None:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    names = {c[1] for c in cols}
    if column not in names:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")


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


def _seed_demo_patient_metadata() -> None:
    demo_medication_plan = [
        {"name": "Lisinopril 10mg", "for": "High Blood Pressure", "time": "8:00 AM", "completed": True},
        {"name": "Metformin 500mg", "for": "Type 2 Diabetes", "time": "8:00 AM", "completed": True},
        {"name": "Atorvastatin 20mg", "for": "High Cholesterol", "time": "9:00 PM", "completed": False},
    ]
    symptoms = [
        {"name": "Mild Headache", "count": 2, "severity": "3/10"},
        {"name": "Dizziness", "count": 1, "severity": "2/10"},
        {"name": "Fatigue", "count": 1, "severity": "4/10"},
    ]

    set_patient_metadata(
        patient_id="MJ-2024",
        date_of_birth="1985-01-15",
        blood_type="O-",
        allergies=["Penicillin"],
        contact={"email": "maria.chen@demo.mediguard.ca", "phone": "+1 (555) 123-4567"},
        location="Toronto, ON",
        medication_plan=demo_medication_plan,
        symptoms_log=symptoms,
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


def get_user(user_id: str) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
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
                id, name, age, assigned_doctor_id, conditions_json, medications_json, profiles_json,
                created_at, latest_report, latest_assessment_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                age=excluded.age,
                assigned_doctor_id=excluded.assigned_doctor_id,
                conditions_json=excluded.conditions_json,
                medications_json=excluded.medications_json,
                profiles_json=excluded.profiles_json,
                created_at=excluded.created_at,
                latest_report=COALESCE(excluded.latest_report, patients.latest_report),
                latest_assessment_json=COALESCE(excluded.latest_assessment_json, patients.latest_assessment_json)
            """,
            (
                record.id,
                record.name,
                record.age,
                record.assigned_doctor_id,
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
        assigned_doctor_id=row["assigned_doctor_id"],
        conditions=json.loads(row["conditions_json"]),
        medications=json.loads(row["medications_json"]),
        profiles=profiles,
        created_at=created_at,
        latest_report=row["latest_report"],
        latest_assessment=json.loads(row["latest_assessment_json"]) if row["latest_assessment_json"] else None,
    )


def set_patient_metadata(
    *,
    patient_id: str,
    date_of_birth: str | None,
    blood_type: str | None,
    allergies: list[str],
    contact: dict[str, Any],
    location: str | None,
    medication_plan: list[dict[str, Any]],
    symptoms_log: list[dict[str, Any]],
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO patient_metadata (
                patient_id, date_of_birth, blood_type, allergies_json, contact_json, location,
                medication_plan_json, symptoms_log_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(patient_id) DO UPDATE SET
                date_of_birth=excluded.date_of_birth,
                blood_type=excluded.blood_type,
                allergies_json=excluded.allergies_json,
                contact_json=excluded.contact_json,
                location=excluded.location,
                medication_plan_json=excluded.medication_plan_json,
                symptoms_log_json=excluded.symptoms_log_json,
                updated_at=excluded.updated_at
            """,
            (
                patient_id,
                date_of_birth,
                blood_type,
                json.dumps(allergies),
                json.dumps(contact),
                location,
                json.dumps(medication_plan),
                json.dumps(symptoms_log),
                datetime.now(UTC).isoformat(),
            ),
        )
        conn.commit()


def get_patient_metadata(patient_id: str) -> dict[str, Any]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM patient_metadata WHERE patient_id = ?", (patient_id,)).fetchone()

    if not row:
        return {
            "date_of_birth": None,
            "blood_type": None,
            "allergies": [],
            "contact": {},
            "location": None,
            "medication_plan": [],
            "symptoms_log": [],
        }

    return {
        "date_of_birth": row["date_of_birth"],
        "blood_type": row["blood_type"],
        "allergies": json.loads(row["allergies_json"]) if row["allergies_json"] else [],
        "contact": json.loads(row["contact_json"]) if row["contact_json"] else {},
        "location": row["location"],
        "medication_plan": json.loads(row["medication_plan_json"]) if row["medication_plan_json"] else [],
        "symptoms_log": json.loads(row["symptoms_log_json"]) if row["symptoms_log_json"] else [],
    }


def update_patient_medications(patient_id: str, medications: list[str]) -> bool:
    with _connect() as conn:
        row = conn.execute("SELECT id FROM patients WHERE id = ?", (patient_id,)).fetchone()
        if not row:
            return False

        conn.execute(
            "UPDATE patients SET medications_json = ? WHERE id = ?",
            (json.dumps(medications), patient_id),
        )

        existing_meta = conn.execute(
            "SELECT * FROM patient_metadata WHERE patient_id = ?", (patient_id,)
        ).fetchone()

        default_plan = [
            {
                "name": med,
                "for": "Condition management",
                "time": "8:00 AM",
                "completed": False,
            }
            for med in medications
        ]

        if existing_meta:
            conn.execute(
                """
                UPDATE patient_metadata
                SET medication_plan_json = ?, updated_at = ?
                WHERE patient_id = ?
                """,
                (json.dumps(default_plan), datetime.now(UTC).isoformat(), patient_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO patient_metadata (
                    patient_id, date_of_birth, blood_type, allergies_json, contact_json, location,
                    medication_plan_json, symptoms_log_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    patient_id,
                    None,
                    None,
                    json.dumps([]),
                    json.dumps({}),
                    None,
                    json.dumps(default_plan),
                    json.dumps([]),
                    datetime.now(UTC).isoformat(),
                ),
            )

        conn.commit()
    return True


def update_patient_profile(patient_id: str, conditions: list[str], medications: list[str]) -> bool:
    cleaned_conditions = sorted({c.strip() for c in conditions if c and c.strip()})
    cleaned_medications = sorted({m.strip() for m in medications if m and m.strip()})

    with _connect() as conn:
        row = conn.execute("SELECT id FROM patients WHERE id = ?", (patient_id,)).fetchone()
        if not row:
            return False

        conn.execute(
            """
            UPDATE patients
            SET conditions_json = ?, medications_json = ?
            WHERE id = ?
            """,
            (json.dumps(cleaned_conditions), json.dumps(cleaned_medications), patient_id),
        )

        existing_meta = conn.execute(
            "SELECT * FROM patient_metadata WHERE patient_id = ?", (patient_id,)
        ).fetchone()

        default_plan = [
            {
                "name": med,
                "for": "Condition management",
                "time": "8:00 AM",
                "completed": False,
            }
            for med in cleaned_medications
        ]

        if existing_meta:
            conn.execute(
                """
                UPDATE patient_metadata
                SET medication_plan_json = ?, updated_at = ?
                WHERE patient_id = ?
                """,
                (json.dumps(default_plan), datetime.now(UTC).isoformat(), patient_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO patient_metadata (
                    patient_id, date_of_birth, blood_type, allergies_json, contact_json, location,
                    medication_plan_json, symptoms_log_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    patient_id,
                    None,
                    None,
                    json.dumps([]),
                    json.dumps({}),
                    None,
                    json.dumps(default_plan),
                    json.dumps([]),
                    datetime.now(UTC).isoformat(),
                ),
            )

        conn.commit()

    return True


def add_chat_message(patient_id: str, role: str, message: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO chat_messages (patient_id, role, message, created_at) VALUES (?, ?, ?, ?)",
            (patient_id, role, message, datetime.now(UTC).isoformat()),
        )
        conn.commit()


def add_care_message(
    *,
    patient_id: str,
    doctor_id: str,
    sender_role: str,
    message: str,
) -> int:
    now_iso = datetime.now(UTC).isoformat()
    read_by_patient = 1 if sender_role == "patient" else 0
    read_by_doctor = 1 if sender_role == "doctor" else 0

    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO care_messages (
                patient_id, doctor_id, sender_role, message, created_at, read_by_patient, read_by_doctor
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (patient_id, doctor_id, sender_role, message, now_iso, read_by_patient, read_by_doctor),
        )
        conn.commit()
        return int(cur.lastrowid)


def list_care_messages(patient_id: str, doctor_id: str) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, patient_id, doctor_id, sender_role, message, created_at, read_by_patient, read_by_doctor
            FROM care_messages
            WHERE patient_id = ? AND doctor_id = ?
            ORDER BY id ASC
            """,
            (patient_id, doctor_id),
        ).fetchall()

    return [
        {
            "message_id": int(row["id"]),
            "patient_id": row["patient_id"],
            "doctor_id": row["doctor_id"],
            "sender_role": row["sender_role"],
            "message": row["message"],
            "created_at": row["created_at"],
            "read_by_patient": bool(row["read_by_patient"]),
            "read_by_doctor": bool(row["read_by_doctor"]),
        }
        for row in rows
    ]


def mark_messages_read_for_patient(patient_id: str, doctor_id: str) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE care_messages
            SET read_by_patient = 1
            WHERE patient_id = ? AND doctor_id = ?
            """,
            (patient_id, doctor_id),
        )
        conn.commit()


def get_unread_messages_for_patient(patient_id: str) -> int:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS unread_count
            FROM care_messages
            WHERE patient_id = ? AND sender_role = 'doctor' AND read_by_patient = 0
            """,
            (patient_id,),
        ).fetchone()

    if not row:
        return 0
    return int(row["unread_count"] or 0)


def get_chat_history(patient_id: str, limit: int = 60) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT role, message, created_at FROM chat_messages WHERE patient_id = ? ORDER BY id ASC LIMIT ?",
            (patient_id, limit),
        ).fetchall()
    return [{"role": row["role"], "message": row["message"], "created_at": row["created_at"]} for row in rows]


def update_latest_assessment(patient_id: str, assessment: dict) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE patients SET latest_assessment_json = ? WHERE id = ?",
            (json.dumps(assessment), patient_id),
        )
        conn.commit()


def get_patient_risk_score(patient_id: str) -> int | None:
    with _connect() as conn:
        row = conn.execute("SELECT risk_score FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if row and row["risk_score"] is not None:
        return int(row["risk_score"])
    return None


def update_risk_score(patient_id: str, score: int) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE patients SET risk_score = ? WHERE id = ?",
            (score, patient_id),
        )
        conn.commit()


def add_report_event(
    *,
    patient_id: str,
    report_text: str,
    urgency: str | None,
    severity_score: int | None,
) -> None:
    patient = get_patient(patient_id)
    doctor_id = patient.assigned_doctor_id if patient else None

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO report_events (patient_id, doctor_id, report_text, urgency, severity_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                doctor_id,
                report_text,
                urgency,
                severity_score,
                datetime.now(UTC).isoformat(),
            ),
        )
        conn.commit()


def list_patients_by_doctor(doctor_id: str) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, name, age, conditions_json, medications_json, latest_assessment_json, latest_report, risk_score
            FROM patients
            WHERE assigned_doctor_id = ?
            ORDER BY name ASC
            """,
            (doctor_id,),
        ).fetchall()

    output: list[dict[str, Any]] = []
    for row in rows:
        assessment = json.loads(row["latest_assessment_json"]) if row["latest_assessment_json"] else None
        conditions = json.loads(row["conditions_json"])
        medications = json.loads(row["medications_json"])
        severity = (assessment or {}).get("severity_score") or (row["risk_score"] or 0)
        if severity >= 7:
            risk = "high"
        elif severity >= 4:
            risk = "medium"
        else:
            risk = "low"
        output.append(
            {
                "patient_id": row["id"],
                "name": row["name"],
                "age": int(row["age"]),
                "conditions": conditions,
                "medications": medications,
                "risk": risk,
                "risk_score": int(severity),
                "latest_assessment": assessment,
                "has_report": bool(row["latest_report"]),
            }
        )
    return output


def list_reports_for_doctor(doctor_id: str) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT r.id, r.patient_id, p.name AS patient_name, r.report_text, r.urgency, r.severity_score, r.created_at
            FROM report_events r
            JOIN patients p ON p.id = r.patient_id
            WHERE r.doctor_id = ?
            ORDER BY r.created_at DESC
            """,
            (doctor_id,),
        ).fetchall()

    return [
        {
            "report_id": int(row["id"]),
            "patient_id": row["patient_id"],
            "patient_name": row["patient_name"],
            "report": row["report_text"],
            "urgency": row["urgency"],
            "severity_score": row["severity_score"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
