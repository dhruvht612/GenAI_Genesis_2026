from __future__ import annotations

import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import chat_stream, proactive_checkin_stream, setup_patient
from mock_data import PATIENTS
from storage import authenticate_user, create_user, get_all_patients, get_chat_messages, get_patient, initialize_db

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
    name: str = Field(..., examples=["Maria Chen"])
    age: int = Field(..., ge=0, le=120)
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


@app.post("/proactive-checkin/{patient_id}")
async def proactive_checkin(patient_id: str) -> StreamingResponse:
    stream = proactive_checkin_stream(patient_id)
    return StreamingResponse(stream, media_type="text/event-stream")


@app.get("/doctor/patients")
def doctor_patients() -> list[dict]:
    patients = get_all_patients()
    return [
        {
            "patient_id": p.id,
            "name": p.name,
            "age": p.age,
            "conditions": p.conditions,
            "medications": p.medications,
            "has_report": p.latest_report is not None,
            "assessment": p.latest_assessment,
        }
        for p in patients
    ]


@app.get("/doctor/patient/{patient_id}")
def doctor_patient_detail(patient_id: str) -> dict:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "patient_id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "conditions": patient.conditions,
        "medications": patient.medications,
        "profiles": [
            {
                "name": p.name,
                "dosage": p.dosage,
                "schedule": p.schedule,
                "side_effect_windows": p.side_effect_windows,
                "common_side_effects": p.common_side_effects,
            }
            for p in patient.profiles
        ],
        "latest_report": patient.latest_report,
        "assessment": patient.latest_assessment,
        "created_at": patient.created_at.isoformat(),
    }


@app.get("/chat/history/{patient_id}")
def chat_history(patient_id: str) -> list[dict]:
    return get_chat_messages(patient_id)


@app.get("/report/{patient_id}")
def report(patient_id: str) -> dict:
    patient = PATIENTS.get(patient_id) or get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not patient.latest_report:
        raise HTTPException(status_code=404, detail="No report generated yet")
    return {"patient_id": patient_id, "report": patient.latest_report}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
