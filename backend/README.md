# MedGuard Backend (Hackathon Scaffold)

## Run

1. Create and activate a virtual environment
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Start server:
   - `python server.py`
   - or `uvicorn server:app --reload --port 8000`

## PharmacyMCP in this repo

- PharmacyMCP is expected at `backend/PharmacyMCP`.
- During `POST /setup`, backend tries to enrich medication profiles using PharmacyMCP tools.
- If PharmacyMCP import or lookup fails, backend falls back to `mock_data.py` automatically.

## Gemini (optional, low-cost/free-tier friendly)

1. Get a key from Google AI Studio.
2. Create a local `.env` from `.env.example`.
3. Set:
   - `MOCK_MODE=false`
   - `LLM_PROVIDER=gemini`
   - `PHARMACY_MCP_ENABLED=true`
   - `GOOGLE_API_KEY=...`
   - `GEMINI_MODEL=gemini-3.1-flash-lite`

If key/model is missing or fails, backend automatically falls back to mock rule-based response.

## Endpoints

- `GET /health`
- `POST /setup`
- `POST /chat` (SSE)
- `POST /proactive-checkin/{patient_id}` (SSE)
- `GET /report/{patient_id}`

## Notes

- Current implementation uses mock medication data and rule-based tools.
- You can switch to Gemini by env config with automatic fallback to mock mode.
- Patient state is persisted to local SQLite at `backend/medguard.db`. (If you had an existing `mediaguard.db`, rename it to `medguard.db` to keep your data.)
