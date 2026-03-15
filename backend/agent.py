from __future__ import annotations

import asyncio
import importlib
import json
import os
import uuid
import re
from datetime import UTC, datetime
from typing import Any, AsyncIterator

from dotenv import load_dotenv

from mock_data import MOCK_MEDICATION_DB, MedicationProfile, PatientRecord
from pharmacy_mcp_adapter import lookup_medication_profile
from storage import add_activity_event, add_report_event, get_patient, upsert_patient
from tools import assess_symptoms, generate_doctor_report


load_dotenv()


async def _emit(event_type: str, content: str | dict) -> str:
    payload = {"type": event_type, "content": content}
    return f"data: {json.dumps(payload)}\n\n"


def _normalize_medication_name(name: str) -> str:
    return name.strip().lower()


def _medication_name_variants(name: str) -> list[str]:
    raw = name.strip()
    if not raw:
        return []

    alpha_tokens = [t for t in re.split(r"[^A-Za-z]+", raw) if t]
    variants = [raw]
    if alpha_tokens:
        variants.append(alpha_tokens[0])
    if len(alpha_tokens) >= 2:
        variants.append(" ".join(alpha_tokens[:2]))

    seen: set[str] = set()
    ordered: list[str] = []
    for item in variants:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            ordered.append(item)
    return ordered


def _lookup_mcp_with_variants(name: str) -> tuple[dict[str, Any] | None, str | None]:
    for variant in _medication_name_variants(name):
        profile = lookup_medication_profile(variant)
        if profile:
            return profile, variant
    return None, None


def _lookup_mock_with_variants(name: str) -> dict[str, Any] | None:
    for variant in _medication_name_variants(name):
        key = _normalize_medication_name(variant)
        hit = MOCK_MEDICATION_DB.get(key)
        if hit:
            return hit
    return None


def _side_effect_matches(symptom_text: str, side_effects: list[str]) -> list[str]:
    text = symptom_text.lower()
    tokens = [t for t in re.split(r"[^a-z]+", text) if len(t) >= 4]
    if not tokens:
        return []

    matches: list[str] = []
    for effect in side_effects:
        effect_l = effect.lower()
        if any(tok in effect_l for tok in tokens):
            matches.append(effect)
    return matches


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
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    if not api_key:
        return None

    try:
        genai = importlib.import_module("google.genai")
    except Exception:
        return None

    prompt = (
        "You are MedGuard, a concise health concierge for demo use. "
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


def _gemini_should_generate_report(
    patient: PatientRecord,
    user_message: str,
    assessment: dict,
) -> bool:
    api_key = os.getenv("GOOGLE_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    if not api_key:
        return assessment.get("severity_score", 0) >= 7

    try:
        genai = importlib.import_module("google.genai")
    except Exception:
        return assessment.get("severity_score", 0) >= 7

    prompt = (
        "You are a triage decision system. Return ONLY YES or NO. "
        f"Patient age: {patient.age}. Conditions: {', '.join(patient.conditions)}. "
        f"Message: {user_message}. "
        f"Rule assessment urgency={assessment.get('urgency')} severity={assessment.get('severity_score')}/10. "
        "Should a doctor-facing report be generated now?"
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model, contents=prompt)
        text = (getattr(response, "text", "") or "").strip().upper()
        if re.search(r"\bYES\b", text):
            return True
        if re.search(r"\bNO\b", text):
            return False
    except Exception:
        pass

    return assessment.get("severity_score", 0) >= 7


async def _generate_agent_response(
    patient: PatientRecord,
    user_message: str,
    assessment: dict,
    pharmacy_context: str | None = None,
) -> str:
    mock_mode = _env_flag("MOCK_MODE", default=False)
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
    source, _ = _lookup_mcp_with_variants(medication_name)
    if not source:
        source = _lookup_mock_with_variants(medication_name) or {
            "dosage": "Unknown",
            "schedule": "Unknown",
            "side_effect_windows": {"unknown": "No data available"},
            "common_side_effects": [],
        }
    return MedicationProfile(
        name=medication_name,
        dosage=source["dosage"],
        schedule=source["schedule"],
        side_effect_windows=source["side_effect_windows"],
        common_side_effects=source.get("common_side_effects", []),
    )


def validate_patient_medications(patient_id: str) -> dict[str, Any]:
    patient = _get_patient(patient_id)
    if not patient:
        raise ValueError("Patient not found")

    items: list[dict[str, Any]] = []
    verified_count = 0

    for med in patient.medications:
        mcp_profile, matched_variant = _lookup_mcp_with_variants(med)
        fallback_profile = _lookup_mock_with_variants(med)

        verified = bool(mcp_profile)
        if verified:
            verified_count += 1

        source = mcp_profile or fallback_profile or {}
        items.append(
            {
                "medication": med,
                "matched_name": matched_variant,
                "verified_in_pharmacy_mcp": verified,
                "has_local_fallback": bool(fallback_profile),
                "dosage": source.get("dosage", "Unknown"),
                "schedule": source.get("schedule", "Unknown"),
                "side_effect_samples": source.get("common_side_effects", [])[:3],
            }
        )

    return {
        "patient_id": patient.id,
        "total_medications": len(patient.medications),
        "verified_count": verified_count,
        "items": items,
    }


def analyze_medication_case(
    patient_id: str,
    symptom_text: str,
    medication_name: str | None = None,
    *,
    generate_report_now: bool = False,
) -> dict[str, Any]:
    patient = _get_patient(patient_id)
    if not patient:
        raise ValueError("Patient not found")

    chosen_medication = (medication_name or "").strip()
    if not chosen_medication:
        extracted = _extract_medication_from_text(symptom_text, patient.medications)
        chosen_medication = extracted or (patient.medications[0] if patient.medications else "")

    assessment = assess_symptoms(user_text=symptom_text, medications=patient.medications)

    mcp_profile, matched_variant = _lookup_mcp_with_variants(chosen_medication) if chosen_medication else (None, None)
    fallback_profile = _lookup_mock_with_variants(chosen_medication) if chosen_medication else None
    source = mcp_profile or fallback_profile or {}

    side_effects = source.get("common_side_effects", [])
    matched_effects = _side_effect_matches(symptom_text, side_effects)

    if mcp_profile and matched_effects:
        compatibility = "high"
    elif mcp_profile or matched_effects:
        compatibility = "medium"
    else:
        compatibility = "low"

    if mcp_profile:
        assessment["rationale"].append(
            f"PharmacyMCP verified {chosen_medication} (matched as {matched_variant}); matched side effects: {', '.join(matched_effects) or 'none'}"
        )
    elif chosen_medication:
        assessment["rationale"].append(
            f"PharmacyMCP did not verify {chosen_medication}; treat medication name as unverified until clinician confirmation."
        )

    patient.latest_assessment = assessment
    upsert_patient(patient)

    pharmacy_context = None
    if chosen_medication and source:
        pharmacy_context = (
            f"{chosen_medication}: dosage={source.get('dosage', 'unknown')}, "
            f"schedule={source.get('schedule', 'unknown')}, "
            f"highlights={', '.join(side_effects[:3]) or 'none'}"
        )

    ai_summary = _gemini_response(patient, symptom_text, assessment, pharmacy_context) or _rule_based_response(patient, assessment)

    report_text: str | None = None
    should_generate = generate_report_now or compatibility == "high" or assessment.get("severity_score", 0) >= 7
    if should_generate:
        report_text = generate_doctor_report(
            patient_name=patient.name,
            age=patient.age,
            conditions=patient.conditions,
            medications=patient.medications,
            symptom_text=symptom_text,
            assessment=assessment,
        )
        patient.latest_report = report_text
        upsert_patient(patient)
        add_report_event(
            patient_id=patient.id,
            report_text=report_text,
            urgency=assessment.get("urgency"),
            severity_score=assessment.get("severity_score"),
        )
        doctor_id = patient.assigned_doctor_id or "DR-1001"
        add_activity_event(
            doctor_id=doctor_id,
            patient_id=patient.id,
            patient_name=patient.name,
            event_type="report_generated",
            message="AI doctor report generated from check-in",
            priority=assessment.get("urgency", "medium"),
        )

    return {
        "patient_id": patient.id,
        "medication": chosen_medication or None,
        "matched_name": matched_variant,
        "medication_verified_in_pharmacy_mcp": bool(mcp_profile),
        "used_fallback_profile": bool(fallback_profile) and not bool(mcp_profile),
        "possible_symptom_link": bool(matched_effects),
        "compatibility": compatibility,
        "matched_side_effects": matched_effects,
        "assessment": assessment,
        "ai_summary": ai_summary,
        "report_generated": bool(report_text),
        "report": report_text,
    }


def setup_patient(payload: dict) -> PatientRecord:
    patient_id = payload.get("user_id", str(uuid.uuid4()))
    medications = payload.get("medications", [])
    profiles = [_build_profile(m) for m in medications]

    record = PatientRecord(
        id=patient_id,
        name=payload["name"],
        age=payload["age"],
        assigned_doctor_id=payload.get("assigned_doctor_id", "DR-1001"),
        conditions=payload.get("conditions", []),
        medications=medications,
        profiles=profiles,
        created_at=datetime.now(UTC),
    )
    upsert_patient(record)
    return record


def _get_patient(patient_id: str) -> PatientRecord | None:
    return get_patient(patient_id)


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
        profile, matched_variant = await asyncio.to_thread(_lookup_mcp_with_variants, mentioned_medication)
        if profile:
            pharmacy_context = (
                f"{mentioned_medication} (matched as {matched_variant}): dosage={profile.get('dosage', 'unknown')}, "
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
        add_report_event(
            patient_id=patient.id,
            report_text=report,
            urgency=assessment.get("urgency"),
            severity_score=assessment.get("severity_score"),
        )
        doctor_id = patient.assigned_doctor_id or "DR-1001"
        add_activity_event(
            doctor_id=doctor_id,
            patient_id=patient.id,
            patient_name=patient.name,
            event_type="report_generated",
            message="AI doctor report generated from check-in",
            priority=assessment.get("urgency", "high"),
        )
        yield await _emit("report_ready", report)
    else:
        doctor_id = patient.assigned_doctor_id or "DR-1001"
        add_activity_event(
            doctor_id=doctor_id,
            patient_id=patient.id,
            patient_name=patient.name,
            event_type="checkin_completed",
            message="Completed symptom check-in",
            priority=None,
        )

    yield "data: [DONE]\n\n"
