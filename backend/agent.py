from __future__ import annotations

import asyncio
import importlib
import json
import os
import uuid
from datetime import UTC, datetime
from typing import AsyncIterator

from dotenv import load_dotenv

from mock_data import MOCK_MEDICATION_DB, PATIENTS, MedicationProfile, PatientRecord
from pharmacy_mcp_adapter import lookup_medication_profile
from storage import get_patient, upsert_patient
from tools import assess_symptoms, generate_doctor_report


load_dotenv()


async def _emit(event_type: str, content: str | dict) -> str:
    payload = {"type": event_type, "content": content}
    return f"data: {json.dumps(payload)}\n\n"


def _normalize_medication_name(name: str) -> str:
    return name.strip().lower()


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _rule_based_response(patient: PatientRecord, assessment: dict) -> str:
    return (
        f"Thanks {patient.name}. I assessed your symptoms as {assessment['urgency']} urgency "
        f"(severity {assessment['severity_score']}/10). "
        "If symptoms worsen, seek in-person medical care promptly."
    )


def _extract_medication_from_text(user_text: str, medications: list[str]) -> str | None:
    text = user_text.lower()
    for med in medications:
        if med.lower() in text:
            return med
    return None


def _gemini_response(
    patient: PatientRecord,
    user_message: str,
    assessment: dict,
    pharmacy_context: str | None = None,
) -> str | None:
    api_key = os.getenv("GOOGLE_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    if not api_key:
        return None

    try:
        genai = importlib.import_module("google.genai")
    except Exception:
        return None

    prompt = (
        "You are MediGuard, a concise health concierge for demo use. "
        "Do not diagnose. Keep response under 70 words. "
        f"Patient: {patient.name}, age {patient.age}. "
        f"Conditions: {', '.join(patient.conditions)}. "
        f"Meds: {', '.join(patient.medications)}. "
        f"User message: {user_message}. "
        f"Assessment: urgency={assessment.get('urgency')}, "
        f"severity={assessment.get('severity_score')}/10, "
        f"matched_medication={assessment.get('matched_medication')}. "
        f"Pharmacy context: {pharmacy_context or 'none'}. "
        "Provide supportive guidance and clear next step."
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model, contents=prompt)
        text = getattr(response, "text", None)
        if text and text.strip():
            return text.strip()
    except Exception:
        return None

    return None


async def _generate_agent_response(
    patient: PatientRecord,
    user_message: str,
    assessment: dict,
    pharmacy_context: str | None = None,
) -> str:
    mock_mode = _env_flag("MOCK_MODE", default=True)
    provider = os.getenv("LLM_PROVIDER", "mock").strip().lower()

    if mock_mode or provider != "gemini":
        return _rule_based_response(patient, assessment)

    gemini_text = await asyncio.to_thread(
        _gemini_response,
        patient,
        user_message,
        assessment,
        pharmacy_context,
    )
    if gemini_text:
        return gemini_text

    return _rule_based_response(patient, assessment)


def _build_profile(medication_name: str) -> MedicationProfile:
    source = lookup_medication_profile(medication_name)
    if not source:
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
    patient_id = payload.get("user_id", str(uuid.uuid4()))
    medications = payload.get("medications", [])
    profiles = [_build_profile(m) for m in medications]

    record = PatientRecord(
        id=patient_id,
        name=payload["name"],
        age=payload["age"],
        conditions=payload.get("conditions", []),
        medications=medications,
        profiles=profiles,
        created_at=datetime.now(UTC),
    )
    PATIENTS[patient_id] = record
    upsert_patient(record)
    return record


def _get_patient(patient_id: str) -> PatientRecord | None:
    patient = PATIENTS.get(patient_id)
    if patient:
        return patient

    stored = get_patient(patient_id)
    if stored:
        PATIENTS[patient_id] = stored
    return stored


async def proactive_checkin_stream(patient_id: str) -> AsyncIterator[str]:
    patient = _get_patient(patient_id)
    if not patient:
        yield await _emit("error", "Patient not found")
        yield "data: [DONE]\n\n"
        return

    yield await _emit("agent_initiated", "")
    message = (
        f"Hi {patient.name}, it's time for your proactive check-in. "
        "Since your medication window is active, are you feeling any dizziness, nausea, or muscle aches right now?"
    )

    for token in message.split(" "):
        yield await _emit("token", token + " ")
        await asyncio.sleep(0.02)

    yield "data: [DONE]\n\n"


async def chat_stream(patient_id: str, user_message: str) -> AsyncIterator[str]:
    patient = _get_patient(patient_id)
    if not patient:
        yield await _emit("error", "Patient not found")
        yield "data: [DONE]\n\n"
        return

    yield await _emit("tool_call", "assess_symptoms")
    assessment = assess_symptoms(user_text=user_message, medications=patient.medications)
    patient.latest_assessment = assessment
    upsert_patient(patient)

    pharmacy_context: str | None = None
    mentioned_medication = _extract_medication_from_text(user_message, patient.medications)
    if mentioned_medication:
        yield await _emit("tool_call", "pharmacy_mcp_lookup")
        profile = await asyncio.to_thread(lookup_medication_profile, mentioned_medication)
        if profile:
            pharmacy_context = (
                f"{mentioned_medication}: dosage={profile.get('dosage', 'unknown')}, "
                f"schedule={profile.get('schedule', 'unknown')}, "
                f"highlights={', '.join(profile.get('common_side_effects', [])[:3]) or 'none'}"
            )

    agent_response = await _generate_agent_response(
        patient,
        user_message,
        assessment,
        pharmacy_context,
    )

    for token in agent_response.split(" "):
        yield await _emit("token", token + " ")
        await asyncio.sleep(0.02)

    if assessment["severity_score"] >= 5:
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
        upsert_patient(patient)
        yield await _emit("report_ready", report)

    yield "data: [DONE]\n\n"
