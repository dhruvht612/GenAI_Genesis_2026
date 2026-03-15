from __future__ import annotations

from datetime import UTC, datetime


# Keyword floors: (phrases_to_match, minimum_severity_score, rationale_message)
# These are checked BEFORE medication logic and act as a hard floor.
_SEVERITY_FLOORS: list[tuple[list[str], int, str]] = [
    (["seizure", "seizures"], 9, "Seizure reported — critical neurological emergency."),
    (["chest pain", "chest tightness", "chest pressure"], 9, "Chest pain/tightness reported — potential cardiac emergency."),
    (["difficulty breathing", "can't breathe", "cannot breathe", "trouble breathing", "short of breath"], 9, "Breathing difficulty reported — potential respiratory emergency."),
    (["vomit", "threw up", "throwing up", "vomiting"], 8, "Vomiting reported — significant GI distress."),
    (["fainting", "fainted", "blacked out", "passed out", "lost consciousness"], 8, "Loss of consciousness/fainting reported — requires urgent evaluation."),
    (["blood in stool", "blood in urine", "bloody stool", "bloody urine", "rectal bleeding"], 8, "Blood in stool/urine reported — requires urgent evaluation."),
    (["hit my head", "head injury", "head trauma", "concussion"], 7, "Head injury/trauma reported — requires evaluation."),
    (["severe headache", "worst headache"], 7, "Severe headache reported — requires evaluation."),
    (["blurry vision", "blurred vision", "can't see", "cannot see", "vision blurry"], 7, "Vision disturbance reported — requires evaluation."),
    (["confusion", "disoriented", "confused", "not sure where i am"], 7, "Confusion/disorientation reported — requires evaluation."),
    (["heart racing", "palpitations", "heart pounding", "racing heart", "irregular heartbeat"], 6, "Heart palpitations/racing reported — warrants monitoring."),
    (["numbness", "can't feel", "cannot feel", "tingling", "pins and needles"], 5, "Numbness/tingling reported — warrants monitoring."),
    (["fell ", "fall ", "slipped", "i fell", "i slipped"], 5, "Fall reported — assess for injury."),
]

# Secondary symptom keywords used to detect dizziness + other symptom combinations
_OTHER_SYMPTOM_KEYWORDS = [
    "pain", "nausea", "vomit", "headache", "fatigue", "tired", "weak", "swollen",
    "swelling", "breathing", "chest", "fever", "cough", "blood", "stomach", "cramp",
    "numbness", "tingling", "ache", "blurry", "vision",
]


def _has_medication(medications: list[str], target: str) -> bool:
    target_l = target.lower()
    for med in medications:
        med_l = med.lower()
        if med_l == target_l or med_l.startswith(f"{target_l} "):
            return True
    return False


def _keyword_floor(text: str) -> tuple[int, list[str]]:
    """Return (floor_score, rationale_messages) based on safety-critical keyword detection."""
    floor = 0
    rationale: list[str] = []

    for phrases, min_score, msg in _SEVERITY_FLOORS:
        for phrase in phrases:
            if phrase in text:
                if min_score > floor:
                    floor = min_score
                rationale.append(msg)
                break  # only add each rule's rationale once

    # Dizziness + any other symptom → minimum 6
    has_dizziness = "dizzy" in text or "dizziness" in text or "lightheaded" in text or "light-headed" in text
    if has_dizziness and floor < 6:
        has_other = any(kw in text for kw in _OTHER_SYMPTOM_KEYWORDS)
        if has_other:
            floor = max(floor, 6)
            rationale.append("Dizziness combined with additional symptoms — elevated concern.")

    # Fell/fall + hit head combo → minimum 8
    _fall_kws = ["fell", "fall", "slipped", "i fell", "i slipped"]
    _head_kws = ["hit my head", "head", "head injury", "head trauma", "concussion"]
    has_fall = any(kw in text for kw in _fall_kws)
    has_head_hit = any(kw in text for kw in _head_kws)
    if has_fall and has_head_hit and floor < 8:
        floor = max(floor, 8)
        rationale.append("Fall with head impact reported — urgent evaluation required.")

    return floor, rationale


def assess_symptoms(
    *,
    user_text: str,
    medications: list[str],
) -> dict:
    """Rule-based symptom assessor with safety-critical keyword floors."""
    text = user_text.lower()

    # --- Step 1: keyword floor (runs BEFORE medication logic) ---
    floor_score, floor_rationale = _keyword_floor(text)

    matched_medication = None
    urgency = "low"
    score = 2
    rationale: list[str] = list(floor_rationale)

    # --- Step 2: medication-linked scoring ---
    if "dizzy" in text or "dizziness" in text or "stand up" in text:
        if _has_medication(medications, "lisinopril"):
            matched_medication = "Lisinopril"
            urgency = "high"
            score = max(score, 8)
            rationale.append("Orthostatic dizziness reported with Lisinopril in profile.")

    if "muscle" in text or "ache" in text:
        if _has_medication(medications, "atorvastatin"):
            matched_medication = "Atorvastatin"
            urgency = "high"
            score = max(score, 8)
            rationale.append("Muscle symptoms reported with Atorvastatin in profile.")

    if "nausea" in text or "stomach" in text:
        if _has_medication(medications, "metformin"):
            matched_medication = matched_medication or "Metformin"
            urgency = "medium" if urgency == "low" else urgency
            score = max(score, 5)
            rationale.append("GI symptoms reported with Metformin in profile.")

    # --- Step 3: apply keyword floor as hard minimum ---
    score = max(score, floor_score)

    # --- Step 4: derive urgency from final score ---
    if score >= 7:
        urgency = "high"
    elif score >= 4:
        urgency = urgency if urgency == "high" else "medium"

    if not rationale:
        rationale.append("No strong medication-linked red flags found from rule set.")

    return {
        "urgency": urgency,
        "severity_score": score,
        "matched_medication": matched_medication,
        "rationale": rationale,
        "timestamp": datetime.now(UTC).isoformat(),
    }


def generate_doctor_report(
    *,
    patient_name: str,
    age: int,
    conditions: list[str],
    medications: list[str],
    symptom_text: str,
    assessment: dict,
) -> str:
    """Generate a concise clinician-friendly summary."""
    lines = [
        "MediGuard Clinical Symptom Summary",
        "=" * 36,
        f"Patient: {patient_name}",
        f"Age: {age}",
        f"Conditions: {', '.join(conditions)}",
        f"Current medications: {', '.join(medications)}",
        "",
        "Reported symptom:",
        f"- {symptom_text}",
        "",
        "Automated triage output:",
        f"- Urgency: {assessment.get('urgency', 'unknown')}",
        f"- Severity score: {assessment.get('severity_score', 'n/a')}/10",
        f"- Likely linked medication: {assessment.get('matched_medication', 'unknown')}",
        "- Rationale:",
    ]

    for item in assessment.get("rationale", []):
        lines.append(f"  • {item}")

    lines.extend(
        [
            "",
            "Suggested follow-up:",
            "- Review timing of symptoms vs dose administration.",
            "- Assess for orthostatic hypotension and medication tolerance.",
            "- Consider dose adjustment or alternative if symptoms persist.",
            "",
            f"Generated at: {datetime.now(UTC).isoformat()}",
        ]
    )

    return "\n".join(lines)
