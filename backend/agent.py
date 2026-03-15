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
from storage import get_patient, save_chat_message, upsert_patient
from tools import assess_symptoms, generate_doctor_report


load_dotenv()


async def _emit(event_type: str, content: str | dict) -> str:
    payload = {"type": event_type, "content": content}
    return f"data: {json.dumps(payload)}\n\n"


def _normalize_medication_name(name: str) -> str:
    return name.strip().lower()



_MED_ADVICE: dict[str, dict] = {
    "lisinopril": {
        "what": ["Orthostatic hypotension (blood pressure drops on standing)", "Dehydration amplifying the effect"],
        "actions": ["🧘 Rise slowly from sitting or lying down", "💧 Drink at least 8 glasses of water today", "🚶 Avoid standing for long periods", "🍽️ Take your medication with food"],
        "intro": "Dizziness when standing is a known side effect of your Lisinopril — it can lower blood pressure too quickly when you change positions.",
    },
    "metformin": {
        "what": ["GI irritation from Metformin (common at start)", "Medication timing relative to meals"],
        "actions": ["🍽️ Always take Metformin with a full meal", "💧 Stay well hydrated throughout the day", "🕒 Split doses if prescribed twice daily", "📋 Note the timing and severity for your doctor"],
        "intro": "Nausea and stomach upset are the most common side effects of Metformin, especially early on.",
    },
    "atorvastatin": {
        "what": ["Statin-related myopathy (muscle breakdown)", "Exercise-induced soreness amplified by Atorvastatin"],
        "actions": ["🛌 Rest the affected muscle group today", "💧 Stay hydrated to help flush metabolites", "🚫 Avoid strenuous exercise until symptoms ease", "📋 Log the severity — report if it worsens"],
        "intro": "Muscle aches are a known side effect of your Atorvastatin — statins can occasionally affect muscle tissue.",
    },
}

_DEFAULT_ADVICE = {
    "what": ["A reaction related to one of your current medications", "An underlying condition that may need monitoring"],
    "actions": ["📋 Note when symptoms started and how severe they are", "💧 Stay hydrated and rest", "🩺 Contact your care team if symptoms persist or worsen"],
    "intro": "I've noted your symptoms and cross-referenced them with your current medications.",
}


def _rule_based_response(patient: PatientRecord, assessment: dict) -> str:
    severity = assessment["severity_score"]
    urgency = assessment["urgency"]
    matched = (assessment.get("matched_medication") or "").lower()

    advice = _MED_ADVICE.get(matched, _DEFAULT_ADVICE)
    what_bullets = "\n".join(f"- {w}" for w in advice["what"])
    action_bullets = "\n".join(f"- {a}" for a in advice["actions"])

    if severity >= 7:
        status = f"Status: ⚠️ Severity {severity}/10 — I've flagged this for your doctor. A full report has been generated for their review."
    else:
        status = f"Status: Severity {severity}/10 — {urgency.capitalize()} urgency. Monitor and let me know if anything changes."

    return (
        f"Hi {patient.name}! 👋 {advice['intro']}\n\n"
        f"**What this could be:**\n{what_bullets}\n\n"
        f"**What to do right now:**\n{action_bullets}\n\n"
        f"{status}\n\n"
        "Let me know if anything gets worse! 🩺"
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

    severity = assessment.get("severity_score", 0)
    urgency = assessment.get("urgency", "low")
    matched_med = assessment.get("matched_medication") or "your medication"
    flagged_note = (
        f"Status: ⚠️ Severity {severity}/10 — I've flagged this for your doctor. A full report has been generated for their review."
        if severity >= 7
        else f"Status: Severity {severity}/10 — {urgency.capitalize()} urgency. Monitor and let me know if anything changes."
    )

    prompt = (
        f"You are MediGuard, a warm and knowledgeable health concierge. "
        f"Patient: {patient.name}, age {patient.age}. "
        f"Conditions: {', '.join(patient.conditions)}. "
        f"Medications: {', '.join(patient.medications)}. "
        f"Pharmacy context: {pharmacy_context or 'none'}. "
        f"The patient said: \"{user_message}\". "
        f"Triage result: urgency={urgency}, severity={severity}/10, matched medication={matched_med}. "
        "Reply in this exact format with markdown:\n"
        f"Hi {patient.name}! 👋 [One warm sentence acknowledging their symptom and linking it to {matched_med} if relevant.]\n\n"
        "**What this could be:**\n"
        "- [Condition 1]\n"
        "- [Condition 2]\n\n"
        "**What to do right now:**\n"
        "- [Emoji] [Action 1]\n"
        "- [Emoji] [Action 2]\n"
        "- [Emoji] [Action 3]\n\n"
        f"{flagged_note}\n\n"
        "Let me know if anything gets worse! 🩺\n\n"
        "Rules: Do not diagnose. Keep each bullet under 12 words. Use relevant emojis on action items. "
        "Cross-reference the matched medication with its known side effects."
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model, contents=prompt)
        text = getattr(response, "text", None)
        if text and text.strip():
            return text.strip()
    except Exception as exc:
        print(f"[MediGuard] Gemini call failed: {exc!r}")
        return None

    return None


async def _generate_agent_response(
    patient: PatientRecord,
    user_message: str,
    assessment: dict,
    pharmacy_context: str | None = None,
) -> str:
    provider = os.getenv("LLM_PROVIDER", "mock").strip().lower()

    if provider == "gemini":
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

    save_chat_message(patient_id, "user", user_message)

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

    save_chat_message(patient_id, "assistant", agent_response)

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
        upsert_patient(patient)
        yield await _emit("report_ready", report)

    yield "data: [DONE]\n\n"
