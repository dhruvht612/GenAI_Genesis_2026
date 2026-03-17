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
from storage import add_chat_message, add_report_event, get_patient, update_latest_assessment, update_risk_score, upsert_patient
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


_SYMPTOM_KEYWORDS: dict[str, list[str]] = {
    "pain": [
        "pain",
        "ache",
        "back pain",
        "backpain",
        "headache",
        "migraine",
        "cramp",
        "sore",
        "arthritis",
        "inflammation",
        "swelling",
        "sprain",
        "strain",
        "joint",
        "muscle pain",
    ],
    "fever": ["fever", "temperature", "chills"],
    "allergy": ["allergy", "allergic", "hives", "rash", "itch", "itchy", "sneezing", "runny nose", "rhinitis"],
    "cough_cold": ["cough", "coughing", "cold", "congestion", "sinus", "flu", "sore throat", "phlegm"],
    "asthma": ["asthma", "wheeze", "wheezing", "shortness of breath", "bronch", "inhaler"],
    "infection": ["infection", "infected", "bacterial", "antibiotic", "uti", "pneumonia"],
    "nausea": ["nausea", "vomit", "vomiting", "emesis", "queasy"],
    "reflux": ["heartburn", "acid reflux", "gerd", "indigestion"],
    "diarrhea": ["diarrhea", "loose stool"],
    "hypertension": ["blood pressure", "hypertension", "bp"],
    "cholesterol": ["cholesterol", "lipid", "ldl", "statin"],
    "diabetes": ["diabetes", "blood sugar", "glucose"],
    "sleep": ["sleep", "insomnia"],
    "anxiety": ["anxiety", "panic", "stress"],
    "depression": ["depression", "depressed"],
    "spasm": ["spasm", "muscle spasm"],
}

_MED_CLASS_KEYWORDS: dict[str, list[str]] = {
    "pain": ["analgesic", "anti-inflammatory", "antiinflammatory", "nsaid", "non-steroidal", "antipyretic", "muscle relaxant"],
    "fever": ["antipyretic", "analgesic"],
    "allergy": ["antihistamine", "anti-histamine", "anti-allergic"],
    "cough_cold": ["antitussive", "expectorant", "decongestant", "antihistamine"],
    "asthma": ["bronchodilator", "beta-agonist", "corticosteroid", "respiratory", "asthma"],
    "infection": ["antibacterial", "antibiotic", "antimicrobial", "antiviral", "anti-infective"],
    "nausea": ["antiemetic"],
    "reflux": ["proton pump", "h2 blocker", "antacid", "antiulcer"],
    "diarrhea": ["antidiarrheal"],
    "hypertension": ["antihypertensive", "beta-blocker", "ace inhibitor", "angiotensin", "calcium channel", "diuretic"],
    "cholesterol": ["statin", "lipid-lowering", "hypolipidemic"],
    "diabetes": ["antidiabetic", "hypoglycemic", "insulin"],
    "sleep": ["hypnotic", "sedative"],
    "anxiety": ["anxiolytic", "benzodiazepine"],
    "depression": ["antidepressant"],
    "spasm": ["muscle relaxant"],
}

_INGREDIENT_CATEGORY_MAP: dict[str, list[str]] = {
    "ibuprofen": ["pain", "fever"],
    "acetaminophen": ["pain", "fever"],
    "paracetamol": ["pain", "fever"],
    "naproxen": ["pain", "fever"],
    "diclofenac": ["pain", "fever"],
    "ketorolac": ["pain", "fever"],
    "amoxicillin": ["infection"],
    "azithromycin": ["infection"],
    "doxycycline": ["infection"],
    "ciprofloxacin": ["infection"],
    "loratadine": ["allergy"],
    "cetirizine": ["allergy"],
    "fexofenadine": ["allergy"],
    "albuterol": ["asthma"],
    "salbutamol": ["asthma"],
    "omeprazole": ["reflux"],
    "pantoprazole": ["reflux"],
    "ondansetron": ["nausea"],
    "loperamide": ["diarrhea"],
    "metformin": ["diabetes"],
    "insulin": ["diabetes"],
    "atorvastatin": ["cholesterol"],
    "rosuvastatin": ["cholesterol"],
    "simvastatin": ["cholesterol"],
    "lisinopril": ["hypertension"],
    "amlodipine": ["hypertension"],
    "hydrochlorothiazide": ["hypertension"],
}


def _match_keywords(text: str, keywords: list[str]) -> list[str]:
    hits: list[str] = []
    for keyword in keywords:
        key = keyword.lower()
        if " " in key:
            if key in text:
                hits.append(keyword)
            continue
        if re.search(rf"\\b{re.escape(key)}\\b", text):
            hits.append(keyword)
    return hits


def _flatten_unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(item)
    return ordered


def _extract_medication_candidate(user_text: str) -> str | None:
    text = user_text.lower()
    tokens = [t for t in re.split(r"[^a-z0-9]+", text) if t]
    trigger_words = {"use", "take", "taking", "took", "using", "on", "start", "started"}
    stop_words = {"for", "because", "due", "with", "to", "of", "and", "or"}

    for idx, token in enumerate(tokens):
        if token not in trigger_words:
            continue
        for next_token in tokens[idx + 1 : idx + 4]:
            if next_token in stop_words:
                break
            if len(next_token) >= 3:
                return next_token
    return None


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_gemini_model() -> str:
    configured = (os.getenv("GEMINI_MODEL") or "").strip()
    fallback = (os.getenv("GEMINI_FALLBACK_MODEL") or "gemini-3.1-flash-lite").strip()
    if not configured:
        return fallback
    if configured.startswith("gemini-2.5"):
        return fallback
    return configured


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
    model = _resolve_gemini_model()
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
    model = _resolve_gemini_model()
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
        chosen_medication = extracted or _extract_medication_candidate(symptom_text) or ""

    if not chosen_medication:
        raise ValueError("Medication name is required for relevance check.")

    mcp_profile, matched_variant = _lookup_mcp_with_variants(chosen_medication)
    if not mcp_profile:
        return {
            "patient_id": patient.id,
            "medication": chosen_medication,
            "matched_name": matched_variant,
            "medication_verified_in_pharmacy_mcp": False,
            "relevance": "unknown",
            "compatibility": "unknown",
            "relevance_reason": "Medication not verified in PharmacyMCP.",
            "symptom_matches": [],
            "medication_matches": [],
            "symptom_categories": [],
            "medication_categories": [],
            "therapeutic_classes": [],
            "active_ingredients": [],
        }

    therapeutic_classes = mcp_profile.get("therapeutic_classes") or []
    active_ingredients = mcp_profile.get("active_ingredients") or []

    symptom_text_l = symptom_text.lower()
    symptom_matches: list[str] = []
    symptom_categories: set[str] = set()
    for category, keywords in _SYMPTOM_KEYWORDS.items():
        hits = _match_keywords(symptom_text_l, keywords)
        if hits:
            symptom_categories.add(category)
            symptom_matches.extend(hits)

    med_text = " ".join([*therapeutic_classes, *active_ingredients]).lower()
    medication_matches: list[str] = []
    medication_categories: set[str] = set()
    for category, keywords in _MED_CLASS_KEYWORDS.items():
        hits = _match_keywords(med_text, keywords)
        if hits:
            medication_categories.add(category)
            medication_matches.extend(hits)

    for ingredient in active_ingredients:
        ing_l = ingredient.lower()
        for ing_kw, categories in _INGREDIENT_CATEGORY_MAP.items():
            if ing_kw in ing_l:
                medication_matches.append(ingredient)
                for cat in categories:
                    medication_categories.add(cat)

    symptom_matches = _flatten_unique(symptom_matches)
    medication_matches = _flatten_unique(medication_matches)

    if not symptom_categories:
        relevance = "unknown"
        reason = "No recognizable symptom keywords were found."
    elif not medication_categories:
        relevance = "low"
        reason = "No therapeutic class or ingredient link matched those symptoms."
    elif symptom_categories & medication_categories:
        relevance = "high"
        reason = "Symptoms align with the medication's therapeutic class or ingredients."
    else:
        relevance = "low"
        reason = "Medication class did not match the symptom categories."

    return {
        "patient_id": patient.id,
        "medication": chosen_medication,
        "matched_name": matched_variant,
        "medication_verified_in_pharmacy_mcp": True,
        "relevance": relevance,
        "compatibility": relevance,
        "relevance_reason": reason,
        "symptom_matches": symptom_matches,
        "medication_matches": medication_matches,
        "symptom_categories": sorted(symptom_categories),
        "medication_categories": sorted(medication_categories),
        "therapeutic_classes": therapeutic_classes,
        "active_ingredients": active_ingredients,
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

    add_chat_message(patient.id, "user", user_message)

    yield await _emit("tool_call", "assess_symptoms")
    assessment = assess_symptoms(
        user_text=user_message,
        medications=patient.medications,
        conditions=patient.conditions,
    )
    patient.latest_assessment = assessment
    upsert_patient(patient)
    print(f"UPDATING ASSESSMENT: {assessment}")
    update_latest_assessment(patient.id, assessment)
    update_risk_score(patient.id, assessment["severity_score"])

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
    add_chat_message(patient.id, "assistant", agent_response)

    for token in agent_response.split(" "):
        yield await _emit("token", token + " ")
        await asyncio.sleep(0.02)

    should_report = await asyncio.to_thread(
        _gemini_should_generate_report,
        patient,
        user_message,
        assessment,
    )
    # Hard rule: always generate report when severity >= 7, regardless of AI decision
    if not should_report and assessment.get("severity_score", 0) >= 7:
        should_report = True

    if should_report:
        yield await _emit("tool_call", "generate_doctor_report")
        med_display = [f"{p.name} {p.dosage}".strip() for p in patient.profiles] if patient.profiles else patient.medications
        report = generate_doctor_report(
            patient_name=patient.name,
            age=patient.age,
            conditions=patient.conditions,
            medications=med_display,
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
        yield await _emit("report_ready", report)

    yield "data: [DONE]\n\n"
