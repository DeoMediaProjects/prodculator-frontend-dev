# Prodculator Backend — FastAPI Implementation Plan

## Context

The Prodculator frontend (React/TypeScript) currently makes direct calls to managed database, OpenAI, and Stripe from the browser. This exposes API keys (especially the OpenAI key via `VITE_OPENAI_API_KEY`), makes admin permission enforcement frontend-only (bypassable), and prevents proper server-side processing for script analysis, PDF generation, and webhook handling.

This plan creates a dedicated Python FastAPI backend in a separate `backend/` folder. The frontend moves to `frontend/`. All auth, data access, and external API calls route through the backend. managed database remains as the Postgres database and file storage.

---

## Folder Restructure

```
Podculator 2.0/
├── backend/                    # NEW — Python FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app, CORS, router registration
│   │   ├── config.py           # Pydantic Settings (env vars)
│   │   ├── dependencies.py     # get_current_user, require_admin, get_database_client
│   │   ├── routers/
│   │   │   ├── auth.py         # /api/auth/*
│   │   │   ├── scripts.py      # /api/scripts/*
│   │   │   ├── reports.py      # /api/reports/*
│   │   │   ├── payments.py     # /api/payments/*
│   │   │   ├── webhooks.py     # /api/webhooks/stripe
│   │   │   ├── subscriptions.py
│   │   │   ├── grants.py
│   │   │   ├── festivals.py
│   │   │   ├── watchlist.py
│   │   │   ├── health.py
│   │   │   └── admin/
│   │   │       ├── users.py
│   │   │       ├── reports.py
│   │   │       ├── metrics.py
│   │   │       ├── incentives.py
│   │   │       ├── crew_costs.py
│   │   │       ├── comparables.py
│   │   │       ├── grants.py
│   │   │       ├── festivals.py
│   │   │       └── production_signals.py
│   │   ├── schemas/            # Pydantic request/response models
│   │   │   ├── auth.py
│   │   │   ├── reports.py
│   │   │   ├── scripts.py
│   │   │   ├── payments.py
│   │   │   ├── grants.py
│   │   │   ├── festivals.py
│   │   │   ├── watchlist.py
│   │   │   ├── admin.py
│   │   │   └── common.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── database_service.py
│   │   │   ├── script_analysis_service.py
│   │   │   ├── report_generation_service.py
│   │   │   ├── pdf_service.py
│   │   │   ├── stripe_service.py
│   │   │   ├── webhook_service.py
│   │   │   ├── email_service.py
│   │   │   └── storage_service.py
│   │   ├── models/
│   │   │   └── enums.py
│   │   ├── tasks/
│   │   │   ├── report_tasks.py       # Background: analyze → generate → PDF → email
│   │   │   └── notification_tasks.py
│   │   └── templates/
│   │       ├── emails/               # Jinja2 email templates
│   │       └── pdf/                  # Jinja2 PDF templates
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
│
├── frontend/                   # MOVED from current src/ + root configs
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
```

---

## Implementation Phases

### Phase 1: Project Setup + Health Check
**Files to create:**
- `backend/pyproject.toml` — project metadata, dependencies
- `backend/requirements.txt` — pinned dependencies
- `backend/app/__init__.py`
- `backend/app/config.py` — Pydantic `Settings` class for all env vars
- `backend/app/main.py` — FastAPI app with CORS, router registration
- `backend/app/dependencies.py` — managed database client init, `get_current_user`, `require_admin`
- `backend/app/routers/health.py` — `GET /api/health`
- `backend/.env.example`

**Key dependencies:** `fastapi`, `uvicorn`, `pydantic-settings`, `database-client`, `python-multipart`, `httpx`

**Verify:** `uvicorn app.main:app --reload` starts, `GET /api/health` returns 200

---

### Phase 2: Authentication
**Files to create:**
- `backend/app/schemas/auth.py` — `SignUpRequest`, `SignInRequest`, `TokenResponse`, `AuthUserResponse`
- `backend/app/schemas/common.py` — `ErrorResponse`, `SuccessResponse`, `PaginatedResponse`
- `backend/app/services/auth_service.py` — wraps managed database Admin Auth API
- `backend/app/routers/auth.py` — 8 endpoints
- `backend/app/models/enums.py` — `UserType`, `AdminRole`, `PlanType`

**Endpoints:**
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/signup` | No |
| POST | `/api/auth/signin` | No |
| POST | `/api/auth/signout` | Yes |
| GET | `/api/auth/me` | Yes |
| POST | `/api/auth/reset-password` | No |
| POST | `/api/auth/update-password` | Yes |
| POST | `/api/auth/admin/signin` | No |
| POST | `/api/auth/refresh` | Yes (refresh token) |

**Auth approach:** Backend calls `backend_auth.auth.sign_in_with_password()`, returns managed database JWT tokens to frontend. On subsequent requests, frontend sends `Authorization: Bearer <access_token>`. Backend verifies with `backend_auth.auth.get_user(token)` + fetches user profile from `users` table. Admin endpoints use `require_admin` dependency that checks `user_type == 'admin'`.

**Port from:** `src/services/auth.service.ts`, `src/app/contexts/AuthContext.tsx`

---

### Phase 3: Script Upload + Analysis
**Files to create:**
- `backend/app/schemas/scripts.py` — `ScriptAnalysisResult` and sub-models (Pydantic versions of TS interfaces)
- `backend/app/services/storage_service.py` — upload/download to managed database Storage buckets
- `backend/app/services/script_analysis_service.py` — OpenAI GPT-4o calls, file validation, text extraction
- `backend/app/routers/scripts.py` — 3 endpoints

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scripts/upload` | Upload script file (multipart form) |
| POST | `/api/scripts/validate` | Validate file type/size |
| POST | `/api/scripts/analyze` | Trigger analysis (returns task ID for polling) |

**Port from:** `src/services/script-analysis.service.ts` — copy the OpenAI prompt verbatim, add server-side PDF text extraction via `pdfplumber` (currently unimplemented on frontend)

**Key:** `OPENAI_API_KEY` lives only in backend `.env`, never exposed to client

---

### Phase 4: Report Generation + Background Tasks
**Files to create:**
- `backend/app/schemas/reports.py` — `B2CReport`, `B2BReport`, territory analysis models
- `backend/app/services/report_generation_service.py` — territory scoring algorithm, report assembly
- `backend/app/services/database_service.py` — report CRUD, subscription checks, admin queries
- `backend/app/tasks/report_tasks.py` — background orchestration (analyze → generate → PDF → email)
- `backend/app/routers/reports.py` — 6 endpoints

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reports` | Create report (triggers background task) |
| GET | `/api/reports` | List user's reports |
| GET | `/api/reports/{id}` | Get single report |
| GET | `/api/reports/shared/{token}` | Public shared report (no auth) |
| GET | `/api/reports/{id}/pdf` | Download PDF |
| GET | `/api/reports/{id}/status` | Poll generation status |

**Background task flow:**
1. Upload script → 2. OpenAI analysis → 3. Territory scoring → 4. Report assembly → 5. PDF generation → 6. Upload PDF → 7. Update DB → 8. Send email

**Port from:** `src/services/report-generation.service.ts` — territory scoring weights (incentive 40%, crew cost 40%, location match 20%), B2C/B2B report structure

**Approach:** Use FastAPI `BackgroundTasks` for MVP. Migrate to ARQ/Celery + Redis when scaling beyond single-process.

---

### Phase 5: Stripe Payments + Webhooks
**Files to create:**
- `backend/app/schemas/payments.py`
- `backend/app/services/stripe_service.py` — checkout sessions, subscriptions, portal
- `backend/app/services/webhook_service.py` — event dispatch + handlers
- `backend/app/routers/payments.py` — 5 endpoints
- `backend/app/routers/webhooks.py` — 1 endpoint (raw body, Stripe signature verification)

**Endpoints:**
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/payments/checkout` | Yes |
| POST | `/api/payments/subscription-checkout` | Yes |
| POST | `/api/payments/cancel-subscription` | Yes |
| POST | `/api/payments/update-payment-method` | Yes |
| POST | `/api/payments/customer-portal` | Yes |
| POST | `/api/webhooks/stripe` | No (signature verified) |

**Webhook events handled:** `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

**Port from:** `src/services/stripe.service.ts`, `src/services/stripe-webhook.service.ts`

---

### Phase 6: Email + PDF Services
**Files to create:**
- `backend/app/services/email_service.py` — Brevo integration with Jinja2 templates
- `backend/app/services/pdf_service.py` — WeasyPrint HTML→PDF rendering
- `backend/app/templates/emails/*.html` — 6 email templates
- `backend/app/templates/pdf/report_b2c.html`, `report_b2b.html`

**Emails:** report_ready, welcome, payment_confirmation, processing_started, grant_alert, festival_deadline

**Port from:** `src/services/email.service.ts`, `src/services/pdf.service.ts`

---

### Phase 7: Data Endpoints (Grants, Festivals, Watchlist, Subscriptions)
**Files to create:**
- `backend/app/schemas/grants.py`, `festivals.py`, `watchlist.py`, `subscriptions.py`
- `backend/app/routers/grants.py` — `GET /api/grants`, `GET /api/grants?territory=`
- `backend/app/routers/festivals.py` — `GET /api/festivals`
- `backend/app/routers/watchlist.py` — `GET/POST/DELETE /api/watchlist`
- `backend/app/routers/subscriptions.py` — `GET /api/subscriptions/active`, `GET /api/subscriptions/can-generate`

**Port from:** `src/services/database.service.ts` (grants, festivals, watchlist, subscription methods)

---

### Phase 8: Admin Endpoints
**Files to create:**
- `backend/app/schemas/admin.py` — incentive programs, crew costs, comparables, business metrics
- `backend/app/routers/admin/*.py` — 9 admin router files

**All admin routes require `require_admin` dependency — permission enforcement happens server-side.**

**Admin CRUD endpoints for:** users, reports, metrics, incentive_programs, crew_costs, comparable_productions, grant_opportunities, film_festivals, production_signals

**Port from:** `src/services/admin.service.ts` — all 6 sub-services (productionIntelligence, incentiveProgram, crewCosts, comparableProductions, grantOpportunities, filmFestivals)

---

### Phase 9: Frontend Migration
**Create:** `frontend/src/services/api.ts` — single API client class that replaces all direct managed database/OpenAI calls

**Delete from frontend:**
- `src/services/backend_auth.service.ts`
- `src/services/auth.service.ts`
- `src/services/database.service.ts`
- `src/services/script-analysis.service.ts`
- `src/services/report-generation.service.ts`
- `src/services/stripe-webhook.service.ts`
- `src/services/admin.service.ts`
- `src/services/email.service.ts`
- `src/services/report-pdf.service.ts`
- `src/services/integration.helper.ts`
- `src/services/test-utilities.ts`

**Keep (modified):**
- `src/services/stripe.service.ts` — only `loadStripe()` + price display helpers, remove all `fetch()` calls
- `src/config/api.config.ts` — simplify to `VITE_API_BASE_URL` + `VITE_STRIPE_PUBLISHABLE_KEY`

**Update all components/contexts** to use `api.signIn()`, `api.getReports()`, etc. instead of direct service calls

**Update `AuthContext.tsx`** to:
- Call `api.signIn()` / `api.signUp()` instead of `authService`
- Store tokens from backend response in localStorage
- Remove mock admin auth, use real `api.adminSignIn()`

**Update `ScriptContext.tsx`** to:
- Call `api.uploadScript()` + `api.createReport()` instead of backend function

---

### Phase 10: Testing + Deployment
- Write pytest tests for each router using `httpx.AsyncClient`
- Dockerize backend (`Dockerfile` + `docker-compose.yml`)
- Update `vercel.json` for frontend-only deployment
- Backend deploy target: Railway, Render, or Fly.io

---

## Key Python Dependencies

```
fastapi>=0.115.0
uvicorn[standard]>=0.27.0
pydantic>=2.6.0
pydantic-settings>=2.1.0
database-client>=2.3.0
python-multipart>=0.0.9
httpx>=0.27.0
openai>=1.12.0
stripe>=8.0.0
weasyprint>=61.0
Jinja2>=3.1.3
pdfplumber>=0.10.0
python-dotenv>=1.0.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

---

## Database Tables (13 — no changes)

`users`, `subscriptions`, `reports`, `payment_methods`, `email_gating_log`, `production_signals`, `incentive_programs`, `crew_costs`, `comparable_productions`, `grant_opportunities`, `film_festivals`, `territory_watchlist`, `b2b_clients`

Schema source: `src/types/backend_auth.ts`

---

## Verification

After each phase:
1. Run `uvicorn app.main:app --reload` from `backend/`
2. Hit endpoints via FastAPI Swagger UI at `http://localhost:8000/api/docs`
3. After Phase 9: run `npm run dev` from `frontend/` and verify full user flows (signup → login → upload → report → payment)
4. Run `pytest` from `backend/` for automated tests
