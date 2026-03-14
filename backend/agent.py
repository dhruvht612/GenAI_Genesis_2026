from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime
from typing import AsyncIterator

from mock_data import MOCK_MEDICATION_DB, PATIENTS, MedicationProfile, PatientRecord
from tools import assess_symptoms, generate_doctor_report


async def _emit(event_type: str, content: str | dict) -> str:
    payload = {"type": event_type, "content": content}
    return f"data: {json.dumps(payload)}\\n\\n"


def _normalize_medication_name(name: str) -> str:
    return name.strip().lower()


def _build_profile(medication_name: str) -> MedicationProfile:
    key = _normalize_medication_name(medication_name)
    source = MOCK_MEDICATION_DB.get(
        key,
        {
            "dosage": "Unknown",
            "schedule": "Unknown",
            "side_effect_windows": {"unknown": "No data available"},
            "common_side_effects": [],
        },
    )
    return MedicationProfile(
        name=medication_name,
        dosage=source["dosage"],
        schedule=source["schedule"],
        side_effect_windows=source["side_effect_windows"],
        common_side_effects=source.get("common_side_effects", []),
    )


def setup_patient(payload: dict) -> PatientRecord:
    patient_id = str(uuid.uuid4())
    medications = payload.get("medications", [])
    profiles = [_build_profile(m) for m in medications]

    record = PatientRecord(
        id=patient_id,
        name=payload["name"],
        age=payload["age"],
        conditions=payload.get("conditions", []),
        medications=medications,
        profiles=profiles,
        created_at=datetime.utcnow(),
    )
    PATIENTS[patient_id] = record
    return record


async def proactive_checkin_stream(patient_id: str) -> AsyncIterator[str]:
    patient = PATIENTS.get(patient_id)
    if not patient:
        yield await _emit("error", "Patient not found")
        yield "data: [DONE]\\n\\n"
        return

    yield await _emit("agent_initiated", "")
    message = (
        f"Hi {patient.name}, it's time for your proactive check-in. "
        "Since your medication window is active, are you feeling any dizziness, nausea, or muscle aches right now?"
    )

    for token in message.split(" "):
        yield await _emit("token", token + " ")
        await asyncio.sleep(0.02)

    yield "data: [DONE]\\n\\n"


async def chat_stream(patient_id: str, user_message: str) -> AsyncIterator[str]:
    patient = PATIENTS.get(patient_id)
    if not patient:
        yield await _emit("error", "Patient not found")
        yield "data: [DONE]\\n\\n"
        return

    yield await _emit("tool_call", "assess_symptoms")
    assessment = assess_symptoms(user_text=user_message, medications=patient.medications)
    patient.latest_assessment = assessment

    agent_response = (
        f"Thanks {patient.name}. I assessed your symptoms as {assessment['urgency']} urgency "
        f"(severity {assessment['severity_score']}/10)."
    )

    for token in agent_response.split(" "):
        yield await _emit("token", token + " ")
        await asyncio.sleep(0.02)

    if assessment["severity_score"] >= 7:
        yield await _emit("tool_call", "generate_doctor_report")
        report = generate_doctor_report(
            patient_name=patient.name,
            age=patient.age,
            conditions=patient.conditions,
            medications=patient.medications,
            symptom_text=user_message,
            assessment=assessment,
        )
        patient.latest_report = report
        yield await _emit("report_ready", report)

    yield "data: [DONE]\\n\\n"
