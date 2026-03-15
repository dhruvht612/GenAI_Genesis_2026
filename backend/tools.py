from __future__ import annotations

from datetime import UTC, datetime


def _has_medication(medications: list[str], target: str) -> bool:
    target_l = target.lower()
    for med in medications:
        med_l = med.lower()
        if med_l == target_l or med_l.startswith(f"{target_l} "):
            return True
    return False


def assess_symptoms(
    *,
    user_text: str,
    medications: list[str],
) -> dict:
    """Simple rule-based symptom assessor for demo use."""
    text = user_text.lower()

    matched_medication = None
    urgency = "low"
    score = 2
    rationale: list[str] = []

    if any(word in text for word in ("severe", "terrible", "really bad", "very bad", "emergency", "critical", "worst")):
        score = max(score, 7)
        urgency = "high" if score >= 7 else urgency
        rationale.append("High-severity wording detected in symptom description.")

    if "dizzy" in text or "stand up" in text or "dizziness" in text:
        if any(m.lower() == "lisinopril" for m in medications):
            matched_medication = "Lisinopril"
            urgency = "high"
            score = 8
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
        "MedGuard Clinical Symptom Summary",
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
