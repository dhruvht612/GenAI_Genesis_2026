from __future__ import annotations

import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import (
    analyze_medication_case,
    chat_stream,
    proactive_checkin_stream,
    setup_patient,
    validate_patient_medications,
)
from storage import (
    add_care_message,
    authenticate_user,
    create_user,
    get_unread_messages_for_patient,
    get_chat_history,
    get_patient_metadata,
    get_patient,
    get_patient_risk_score,
    get_user,
    initialize_db,
    list_patients_by_doctor,
    list_reports_for_doctor,
    list_care_messages,
    mark_messages_read_for_patient,
    update_patient_medications,
    update_patient_profile,
)

initialize_db()

app = FastAPI(title="MediGuard Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SetupRequest(BaseModel):
    user_id: str | None = Field(default=None, examples=["MJ-2024"])
    assigned_doctor_id: str | None = Field(default="DR-1001", examples=["DR-1001"])
    name: str = Field(..., examples=["Maria Chen"])
    age: int = Field(default=35, ge=0, le=120)
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    patient_id: str
    message: str


class SignupRequest(BaseModel):
    role: str = Field(..., examples=["patient", "doctor"])
    email: str
    password: str = Field(..., min_length=6)
    first_name: str
    last_name: str


class LoginRequest(BaseModel):
    role: str = Field(..., examples=["patient", "doctor"])
    email: str
    password: str


class PatientMedicationsRequest(BaseModel):
    medications: list[str] = Field(default_factory=list)


class MedicationAnalysisRequest(BaseModel):
    symptom_text: str = Field(..., min_length=2)
    medication_name: str | None = None
    generate_report: bool = True


class PatientProfileUpdateRequest(BaseModel):
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)


class CareMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post("/auth/signup")
def signup(payload: SignupRequest) -> dict:
    role = payload.role.lower().strip()
    if role not in {"patient", "doctor"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    prefix = "PT" if role == "patient" else "DR"
    user_id = f"{prefix}-{str(uuid.uuid4())[:8]}"
    display_name = f"{payload.first_name.strip()} {payload.last_name.strip()}".strip()

    ok = create_user(
        user_id=user_id,
        role=role,
        email=payload.email,
        password=payload.password,
        display_name=display_name,
    )
    if not ok:
        raise HTTPException(status_code=409, detail="Email already registered")

    return {
        "user_id": user_id,
        "role": role,
        "email": payload.email.lower(),
        "display_name": display_name,
    }


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict:
    role = payload.role.lower().strip()
    result = authenticate_user(role=role, email=payload.email, password=payload.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return result


@app.post("/setup")
def setup(payload: SetupRequest) -> dict:
    record = setup_patient(payload.model_dump())
    return {
        "patient_id": record.id,
        "name": record.name,
        "profiles": [
            {
                "name": p.name,
                "dosage": p.dosage,
                "schedule": p.schedule,
                "side_effect_windows": p.side_effect_windows,
                "common_side_effects": p.common_side_effects,
            }
            for p in record.profiles
        ],
    }


@app.post("/chat")
async def chat(payload: ChatRequest) -> StreamingResponse:
    stream = chat_stream(payload.patient_id, payload.message)
    return StreamingResponse(stream, media_type="text/event-stream")


@app.get("/chat/history/{patient_id}")
def chat_history(patient_id: str) -> dict:
    return {"patient_id": patient_id, "messages": get_chat_history(patient_id)}


@app.post("/proactive-checkin/{patient_id}")
async def proactive_checkin(patient_id: str) -> StreamingResponse:
    stream = proactive_checkin_stream(patient_id)
    return StreamingResponse(stream, media_type="text/event-stream")


@app.get("/report/{patient_id}")
def report(patient_id: str) -> dict:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not patient.latest_report:
        raise HTTPException(status_code=404, detail="No report generated yet")
    return {"patient_id": patient_id, "report": patient.latest_report}


@app.get("/patient/{patient_id}")
def patient_profile(patient_id: str) -> dict:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    metadata = get_patient_metadata(patient_id)
    return {
        "patient_id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "conditions": patient.conditions,
        "medications": patient.medications,
        "assigned_doctor_id": patient.assigned_doctor_id,
        "latest_assessment": patient.latest_assessment,
        "has_report": bool(patient.latest_report),
        "metadata": metadata,
    }


@app.get("/patient/{patient_id}/overview")
def patient_overview(patient_id: str) -> dict:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    metadata = get_patient_metadata(patient_id)
    medication_plan = metadata.get("medication_plan", [])
    if not medication_plan and patient.medications:
        medication_plan = [
            {
                "name": med,
                "for": "Condition management",
                "time": "8:00 AM",
                "completed": False,
            }
            for med in patient.medications
        ]

    risk_score = get_patient_risk_score(patient_id)
    if risk_score is None:
        risk_score = (patient.latest_assessment or {}).get("severity_score")
    return {
        "patient_id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "conditions": patient.conditions,
        "medications": patient.medications,
        "latest_assessment": patient.latest_assessment,
        "risk_score": risk_score,
        "medication_plan": medication_plan,
        "symptoms_log": metadata.get("symptoms_log", []),
        "blood_type": metadata.get("blood_type"),
        "allergies": metadata.get("allergies", []),
        "date_of_birth": metadata.get("date_of_birth"),
        "contact": metadata.get("contact", {}),
        "location": metadata.get("location"),
        "unread_doctor_messages": get_unread_messages_for_patient(patient_id),
    }


@app.post("/patient/{patient_id}/medications")
def update_medications(patient_id: str, payload: PatientMedicationsRequest) -> dict:
    meds = [m.strip() for m in payload.medications if m.strip()]
    ok = update_patient_medications(patient_id, meds)
    if not ok:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"patient_id": patient_id, "medications": meds}


@app.patch("/patient/{patient_id}/profile")
def update_patient_profile_endpoint(patient_id: str, payload: PatientProfileUpdateRequest) -> dict:
    ok = update_patient_profile(patient_id, payload.conditions, payload.medications)
    if not ok:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "patient_id": patient_id,
        "conditions": payload.conditions,
        "medications": payload.medications,
    }


@app.get("/patient/{patient_id}/medication-validation")
def medication_validation(patient_id: str) -> dict:
    try:
        return validate_patient_medications(patient_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/patient/{patient_id}/medication-analysis")
def medication_analysis(patient_id: str, payload: MedicationAnalysisRequest) -> dict:
    try:
        return analyze_medication_case(
            patient_id,
            payload.symptom_text,
            payload.medication_name,
            generate_report_now=payload.generate_report,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/doctor/{doctor_id}/patients")
def doctor_patients(doctor_id: str) -> dict:
    user = get_user(doctor_id)
    if not user or user["role"] != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"doctor_id": doctor_id, "patients": list_patients_by_doctor(doctor_id)}


@app.get("/doctor/{doctor_id}/reports")
def doctor_reports(doctor_id: str) -> dict:
    user = get_user(doctor_id)
    if not user or user["role"] != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"doctor_id": doctor_id, "reports": list_reports_for_doctor(doctor_id)}


@app.get("/doctor/{doctor_id}/patients/{patient_id}/messages")
def doctor_patient_messages(doctor_id: str, patient_id: str) -> dict:
    user = get_user(doctor_id)
    if not user or user["role"] != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found")
    patient = get_patient(patient_id)
    if not patient or patient.assigned_doctor_id != doctor_id:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "messages": list_care_messages(patient_id, doctor_id),
    }


@app.post("/doctor/{doctor_id}/patients/{patient_id}/messages")
def doctor_send_message(doctor_id: str, patient_id: str, payload: CareMessageRequest) -> dict:
    user = get_user(doctor_id)
    if not user or user["role"] != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found")
    patient = get_patient(patient_id)
    if not patient or patient.assigned_doctor_id != doctor_id:
        raise HTTPException(status_code=404, detail="Patient not found")

    message_id = add_care_message(
        patient_id=patient_id,
        doctor_id=doctor_id,
        sender_role="doctor",
        message=payload.message.strip(),
    )
    return {"message_id": message_id, "status": "sent"}


@app.get("/patient/{patient_id}/messages")
def patient_messages(patient_id: str) -> dict:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    doctor_id = patient.assigned_doctor_id or ""
    messages = list_care_messages(patient_id, doctor_id) if doctor_id else []
    if doctor_id:
        mark_messages_read_for_patient(patient_id, doctor_id)
    return {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "messages": messages,
    }


@app.post("/patient/{patient_id}/messages")
def patient_send_message(patient_id: str, payload: CareMessageRequest) -> dict:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    doctor_id = patient.assigned_doctor_id
    if not doctor_id:
        raise HTTPException(status_code=400, detail="Patient has no assigned doctor")

    message_id = add_care_message(
        patient_id=patient_id,
        doctor_id=doctor_id,
        sender_role="patient",
        message=payload.message.strip(),
    )
    return {"message_id": message_id, "status": "sent"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
