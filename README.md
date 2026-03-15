# MedGuard — AI-Powered Medication Safety Assistant

MedGuard is a full-stack healthcare AI platform built for GenAI Genesis 2026. Patients can report symptoms and get real-time AI-powered triage, while doctors receive structured clinical reports and risk alerts. The system integrates with the Health Canada Drug Product Database (DPD) via a custom MCP server to provide verified medication context.

---

## Features

- **AI Symptom Chat** — patients describe symptoms and get severity-scored responses (rule-based + Google Gemini)
- **Risk Scoring** — severity is persisted per patient and displayed as Low / Moderate / High badges
- **Doctor Reports** — automatically generated when severity ≥ 7, viewable by the assigned doctor
- **Medication Safety** — cross-references patient medications against Health Canada's DPD via a PharmacyMCP tool server
- **Doctor Dashboard** — real patient list with live risk scores, report history, and care messaging
- **Chat History** — persisted across sessions; loads on component mount
- **Role-based Auth** — patients and doctors have separate dashboards and flows

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI 0.115+ (Python 3.11) |
| Database | SQLite (`mediaguard.db`) |
| AI / LLM | Google Gemini (`google-genai`) |
| MCP Server | FastMCP 3.1 — Health Canada DPD |
| Frontend | React 19 + Vite 8 + React Router 7 |
| Styling | Tailwind CSS 4 + Framer Motion |
| Auth | PBKDF2-SHA256 password hashing, session storage |

---

## Project Structure

```
GenAI_Genesis_2026/
├── backend/
│   ├── server.py               # FastAPI app, all REST endpoints
│   ├── agent.py                # AI chat stream, assessment orchestration
│   ├── tools.py                # Severity scoring, doctor report generation
│   ├── storage.py              # SQLite ORM (patients, users, messages, reports)
│   ├── pharmacy_mcp_adapter.py # Bridges FastAPI ↔ PharmacyMCP in-process
│   ├── mock_data.py            # Fallback medication database
│   ├── mediaguard.db           # SQLite database (auto-created)
│   ├── .env                    # API keys and feature flags (not committed)
│   ├── .env.example            # Template for environment config
│   ├── requirements.txt
│   └── PharmacyMCP/            # Standalone MCP server
│       └── src/dpd_server.py   # 15 tools for Health Canada DPD API
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── patient/        # PatientDashboardOverview, PatientCheckIn,
│   │   │   │                   # PatientRiskAssessment, PatientProfile, PatientDoctorReport
│   │   │   └── doctor/         # DoctorOverview, DoctorPatients, DoctorReports, DoctorAIInsights
│   │   ├── components/         # Shared UI components
│   │   ├── App.jsx             # Router setup
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google AI Studio API key (optional — app runs in rule-based mode without it)

---

### 1. Backend


```bash
please go to main_fix branch for best version
cd backend


# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# Start the server
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

The SQLite database and all tables are created automatically on first run. Demo accounts are seeded.

---

### 2. PharmacyMCP Server (optional, for live drug lookups)

The MCP server queries Health Canada's Drug Product Database to enrich medication context. The backend loads it **in-process** automatically via `pharmacy_mcp_adapter.py`, so you only need to run it separately if you want to inspect or test it standalone.

```bash
cd backend/PharmacyMCP
pip install -r requirements.txt
python src/dpd_server.py
# Runs on http://localhost:8001
```

To disable it entirely, set `PHARMACY_MCP_ENABLED=false` in your `.env`.

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

### Running All Three Together

| Terminal | Command | URL |
|---|---|---|
| 1 — Backend | `cd backend && uvicorn server:app --port 8000 --reload` | http://localhost:8000 |
| 2 — MCP (optional) | `cd backend/PharmacyMCP && python src/dpd_server.py` | http://localhost:8001 |
| 3 — Frontend | `cd frontend && npm run dev` | http://localhost:5173 |

---

## Environment Variables

Create `backend/.env` from `.env.example`:

```env
APP_ENV=local

# Set to true to skip Gemini and use rule-based responses only
MOCK_MODE=false

# AI provider — "gemini" or "mock"
LLM_PROVIDER=gemini

# Google AI Studio key (required when MOCK_MODE=false)
GOOGLE_API_KEY=your_key_here

# Gemini model names
GEMINI_MODEL=gemini-2.0-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.0-flash-lite

# Set to false to disable Health Canada DPD lookups
PHARMACY_MCP_ENABLED=true
PHARMACY_MCP_TIMEOUT_SECONDS=1.8
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Patient | maria.chen@demo.medguard.ca | demo123 |
| Doctor | dr.smith@demo.medguard.ca | demo123 |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register patient or doctor |
| POST | `/auth/login` | Authenticate, returns session data |

### Patient
| Method | Endpoint | Description |
|---|---|---|
| POST | `/setup` | Initialize patient profile (called on login) |
| GET | `/patient/{id}` | Get patient record |
| GET | `/patient/{id}/overview` | Full dashboard data (medications, risk score, metadata) |
| PATCH | `/patient/{id}/profile` | Update conditions and medications |
| POST | `/patient/{id}/medications` | Replace medication list |
| GET | `/patient/{id}/medication-validation` | Validate meds against PharmacyMCP |
| GET | `/patient/{id}/messages` | Inbox from doctor |
| POST | `/patient/{id}/messages` | Send message to doctor |

### Chat & Assessment
| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat` | Send symptom message — returns SSE stream with AI response |
| GET | `/chat/history/{id}` | Load persisted chat history |
| POST | `/proactive-checkin/{id}` | AI-initiated check-in stream |
| GET | `/report/{id}` | Latest generated doctor report |

### Doctor
| Method | Endpoint | Description |
|---|---|---|
| GET | `/doctor/{id}/patients` | All assigned patients with risk scores |
| GET | `/doctor/{id}/reports` | All generated reports |
| GET | `/doctor/{id}/patients/{pid}/messages` | Messages with a patient |
| POST | `/doctor/{id}/patients/{pid}/messages` | Send care message |

---

## How the AI Chat Works

1. Patient sends a symptom message from the Check-In tab
2. `assess_symptoms()` in `tools.py` runs a **rule-based severity scorer**:
   - Keyword floors (e.g. vomiting → min 8, chest pain → min 9)
   - Medication-symptom matching (e.g. dizziness + Lisinopril → 8)
   - Condition escalation (e.g. breathing difficulty + asthma → 10)
3. If a medication is mentioned, `pharmacy_mcp_adapter.py` looks it up in Health Canada's DPD
4. The severity score, pharmacy context, and patient profile are passed to **Google Gemini** to generate a supportive ≤70-word response
5. If severity ≥ 7, `generate_doctor_report()` creates a clinical summary saved to `report_events`
6. The doctor dashboard reflects the updated risk score immediately

The severity score **only increases** — a low-severity check-in will not overwrite a previously recorded high-risk score.

---

## Severity Scoring Reference

| Score | Label | Badge Color | Examples |
|---|---|---|---|
| 1–3 | Low Risk | Green | Mild headache, slight fatigue |
| 4–6 | Moderate | Yellow | Nausea + Metformin, palpitations |
| 7–8 | High Risk | Red | Vomiting, fainting, head injury |
| 9–10 | Critical | Red | Chest pain, seizure, can't breathe |

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | Auth credentials (email, hashed password, role) |
| `patients` | Patient profiles, medications, risk score, latest assessment |
| `patient_metadata` | DOB, blood type, allergies, medication plan, symptoms log |
| `chat_messages` | Persisted chat history per patient |
| `report_events` | Doctor-facing clinical reports with severity scores |
| `care_messages` | Doctor ↔ patient messaging |

---

## PharmacyMCP — Health Canada Drug Lookup

`PharmacyMCP/src/dpd_server.py` is a standalone [FastMCP](https://github.com/jlowin/fastmcp) server that wraps the [Health Canada DPD REST API](https://health-products.canada.ca/api/documentation/dpd-documentation-en.html).

**Available tools (15):**
- `search_drug_by_brand_name` — find drugs by brand name with optional status filter
- `search_drug_by_din` — look up by Drug Identification Number
- `search_active_ingredients` — search across all drugs by ingredient
- `get_all_drug_info` — fetch all details for a drug code in one call
- Plus: `get_active_ingredients`, `get_dosage_form`, `get_route_of_administration`, `get_schedule`, `get_product_status`, `get_therapeutic_class`, `get_packaging`, `get_pharmaceutical_standard`, `get_company`, `get_veterinary_species`, `get_drug_product`

**Guided prompts:** `drug_lookup`, `compare_drugs`, `find_alternatives`, `check_din`

---

## Frontend Pages

### Patient
| Route | Page | Description |
|---|---|---|
| `/dashboard` | Overview | Medications, risk badge, symptoms log, unread messages |
| `/dashboard/check-in` | AI Check-In | Real-time SSE chat with symptom assessment |
| `/dashboard/risk` | Risk Score | Current score, latest assessment details |
| `/dashboard/report` | Doctor Report | Latest AI-generated clinical report |
| `/dashboard/profile` | Profile | Edit name, age, conditions, medications, allergies |

### Doctor
| Route | Page | Description |
|---|---|---|
| `/doctor` | Overview | Patient counts, high-risk alerts, recent reports |
| `/doctor/patients` | Patients | Full list with risk badges, links to reports |
| `/doctor/reports` | Reports | Historical reports with severity filter |
| `/doctor/insights` | AI Insights | AI-generated cross-patient trends |

---

## License 

MIT — see [LICENSE](LICENSE)

