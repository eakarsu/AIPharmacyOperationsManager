# Audit Note — AIPharmacyOperationsManager

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_06.md` section #21.

## Original Recommendations

### Gaps — AI Counterparts
- `/interaction-check-ai` — enhanced drug-disease checking
- `/reorder-predict` — demand forecasting (already covered by `/api/ai/reorder-optimize`)
- `/claim-denial-predict`
- `/diversion-detect`
- `/adherence-predict`

### Gaps — Non-AI Features
- NCPDP/NCBI integration
- Insurance verification automation
- MTM workflow
- Patient counseling tools
- EHR/prescriber sync

### Custom Feature Suggestions
1. Agentic compliance monitoring
2. Drug diversion detection
3. Medication synchronization
4. Insurance pre-authorization automation
5. MTM

## Implemented (Mechanical)
- `POST /api/ai/diversion-detect` — added in `backend/routes/aiAdvanced.js`. Pulls 90-day controlled-substance/prescription history, asks the model for diversion patterns, prescriber/patient outliers; persists to `ai_results` and `audit_log`.
- `POST /api/ai/adherence-predict` — added in `backend/routes/aiAdvanced.js`. Pulls prescription/refill data (optionally filtered by patient_id) and returns at-risk patient list with intervention suggestions; persists to `ai_results`.

Both endpoints follow existing `callOpenRouter`/`parseAIJson`/`aiRateLimiter` style and integrate with existing `audit_log` and `ai_results` tables.

## Notes
- Audit text said `0 AI endpoints per TSV` but `aiAdvanced.js` already had 3 endpoints (drug-interactions, reorder-optimize, formulary-review). The TSV appears to have under-counted.
- `/claim-denial-predict` and `/interaction-check-ai` are reasonable next implementations but `claims` table schema is unverified.

## Backlog (deferred)

### NEEDS-CREDS / NEW-DEPS
- NCPDP/NCBI/SureScripts integration — credentials, certified messaging.
- Insurance pre-auth/verification (PBM APIs).
- EHR sync (FHIR connector).

### NEEDS-PRODUCT-DECISION
- MTM full workflow (intervention recording, billing).
- Patient counseling tools (messaging UX, multilingual).
- Agentic compliance monitor (background job framework).

### TOO-RISKY (regulatory)
- Auto-escalation to DEA — current diversion endpoint flags only; auto-reporting needs legal review.

## Apply pass 4 (mechanical backlog)

Closed the two "reasonable next implementations" called out in the previous pass note:

| # | Feature | BE | FE |
|---|---------|----|----|
| 1 | `/claim-denial-predict` — claim denial probability prediction with risk factors and pre-emptive corrections | `backend/routes/aiAdvanced.js` (appended) → `POST /api/ai/claim-denial-predict` | `frontend/src/pages/ClaimDenialPredict.js` (route `/claim-denial-predict`, Navbar "Denial AI") |
| 2 | `/interaction-check-ai` — comprehensive drug-disease/drug-allergy/drug-drug check with patient context lookup | `backend/routes/aiAdvanced.js` (appended) → `POST /api/ai/interaction-check-ai` | `frontend/src/pages/InteractionCheckAI.js` (route `/interaction-check-ai`, Navbar "Interaction AI+") |

Both reuse existing `callOpenRouter`/`parseAIJson`/`aiRateLimiter` style, persist to `ai_results`+`audit_log`, and return **503** when `OPENROUTER_API_KEY` is unset. Pages match the existing AdherencePredict / DiversionDetect token-prop / `data-table` style.

Smoke-tested on `BACKEND_PORT=4902` with seed user `admin@pharmacy.com` / `password123`: both endpoints returned **503** with the expected error body when `OPENROUTER_API_KEY=` was empty.

Remaining backlog (NEEDS-CREDS / NEEDS-PRODUCT-DECISION / TOO-RISKY items) unchanged.

## Apply pass 3 (frontend)

- **Stack:** Express backend + CRA React 18 frontend (`frontend/src`). Token validated on mount via `/api/auth/me`; stored in `localStorage.token` and passed as a `token` prop to each route, attached by pages as `Authorization: Bearer ${token}`.
- **Backend AI endpoints (verified):** `aiAdvanced.js` (drug-interactions, reorder-optimize, formulary-review, diversion-detect, adherence-predict), `interactions.js` lookup, `aiResults.js` history.
- **FE coverage:** `pages/DrugInteractionWidget.js`, `ReorderOptimizer.js`, `FormularyReview.js`, `DiversionDetect.js`, `AdherencePredict.js`, `AIHistory.js` cover every AI endpoint. `DiversionDetect.js` posts to `/api/ai/diversion-detect`; `AdherencePredict.js` posts to `/api/ai/adherence-predict`.
- **Action:** **FE already wired** — no changes.

