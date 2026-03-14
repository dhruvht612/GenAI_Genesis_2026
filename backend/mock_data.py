from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class MedicationProfile:
    name: str
    dosage: str
    schedule: str
    side_effect_windows: dict[str, str]
    common_side_effects: list[str] = field(default_factory=list)


@dataclass
class PatientRecord:
    id: str
    name: str
    age: int
    conditions: list[str]
    medications: list[str]
    profiles: list[MedicationProfile]
    created_at: datetime
    latest_report: str | None = None
    latest_assessment: dict[str, Any] | None = None


MOCK_MEDICATION_DB: dict[str, dict[str, Any]] = {
    "metformin": {
        "dosage": "500mg",
        "schedule": "BID with meals",
        "side_effect_windows": {
            "2-6h": "Nausea/stomach upset peak window"
        },
        "common_side_effects": ["nausea", "stomach upset", "diarrhea"],
    },
    "lisinopril": {
        "dosage": "10mg",
        "schedule": "daily",
        "side_effect_windows": {
            "1-4h": "Dizziness/orthostatic symptoms can appear"
        },
        "common_side_effects": ["dizziness", "dry cough", "headache"],
    },
    "atorvastatin": {
        "dosage": "20mg",
        "schedule": "nightly",
        "side_effect_windows": {
            "24-72h": "Muscle ache monitoring window"
        },
        "common_side_effects": ["muscle pain", "fatigue", "joint pain"],
    },
}

DEMO_PATIENT = {
    "name": "Maria Chen",
    "age": 58,
    "conditions": ["Type 2 Diabetes", "Hypertension", "High Cholesterol"],
    "medications": ["Metformin", "Lisinopril", "Atorvastatin"],
}

PATIENTS: dict[str, PatientRecord] = {}
