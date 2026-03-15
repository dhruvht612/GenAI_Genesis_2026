# MediGuard Backend (Hackathon Scaffold)

## Run

1. Create and activate a virtual environment
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Start server:
   - `uvicorn server:app --reload --port 8000`

## Gemini (optional, low-cost/free-tier friendly)

1. Get a key from Google AI Studio.
2. Create a local `.env` from `.env.example`.
3. Set:
   - `MOCK_MODE=false`
   - `LLM_PROVIDER=gemini`
   - `GOOGLE_API_KEY=...`
   - `GEMINI_MODEL=gemini-1.5-flash`

If key/model is missing or fails, backend automatically falls back to mock rule-based response.

## Endpoints

- `GET /health`
- `POST /setup`
- `POST /chat` (SSE)
- `POST /proactive-checkin/{patient_id}` (SSE)
- `GET /report/{patient_id}`

## Notes

- Current implementation uses mock medication data and rule-based tools.
- You can switch to Gemini by env config, or later replace with Strands + Bedrock.
