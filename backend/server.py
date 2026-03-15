from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import chat_stream, proactive_checkin_stream, setup_patient
from mock_data import PATIENTS

app = FastAPI(title="MediGuard Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SetupRequest(BaseModel):
    name: str = Field(..., examples=["Maria Chen"])
    age: int = Field(..., ge=0, le=120)
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    patient_id: str
    message: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


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


@app.get("/report/{patient_id}")
def report(patient_id: str) -> dict:
    patient = PATIENTS.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not patient.latest_report:
        raise HTTPException(status_code=404, detail="No report generated yet")
    return {"patient_id": patient_id, "report": patient.latest_report}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
