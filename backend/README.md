# MediGuard Backend (Hackathon Scaffold)

## Run

1. Create and activate a virtual environment
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Start server:
   - `uvicorn server:app --reload --port 8000`

## Endpoints

- `GET /health`
- `POST /setup`
- `POST /chat` (SSE)
- `POST /proactive-checkin/{patient_id}` (SSE)
- `GET /report/{patient_id}`

## Notes

- Current implementation uses mock medication data and rule-based tools.
- You can later replace mock logic in `agent.py` with Strands + Bedrock.
