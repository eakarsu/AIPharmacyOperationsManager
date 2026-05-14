// External integration stubs (NCPDP / PBM / FHIR EHR).
//
// Required env vars (each gated; route returns 503 if missing):
//   NCPDP_API_KEY     — NCPDP / SureScripts e-prescribing
//   PBM_API_KEY       — Pharmacy Benefit Manager (insurance pre-auth)
//   FHIR_API_KEY      — FHIR EHR sync (prescriber/patient context)
//
// Outbound HTTP is intentionally NOT implemented yet — these endpoints
// validate the env-var gate and return clearly-labelled mock payloads so
// the UI can be wired without committing to a vendor.

const express = require('express');
const router = express.Router();
const pool = require('../db');

function gate(envVar, res) {
  if (!process.env[envVar]) {
    res.status(503).json({
      error: `${envVar} not configured`,
      missing: envVar,
      hint: `Set ${envVar} in .env to enable this integration.`,
    });
    return false;
  }
  return true;
}

async function ensureLogTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_log (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(64) NOT NULL,
      patient_id INTEGER,
      payload JSONB,
      response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureLogTable();

async function logCall(provider, patientId, payload, response) {
  try {
    await pool.query(
      'INSERT INTO integration_log (provider, patient_id, payload, response) VALUES ($1,$2,$3,$4)',
      [provider, patientId || null, payload || {}, response || {}]
    );
  } catch (_) { /* best-effort */ }
}

// NCPDP — e-prescribing send
router.post('/ncpdp/send', async (req, res) => {
  if (!gate('NCPDP_API_KEY', res)) return;
  const { patient_id, prescription_id, ndc } = req.body || {};
  const stub = {
    provider: 'NCPDP',
    accepted: true,
    transaction_id: `STUB-${Date.now()}`,
    prescription_id: prescription_id || null,
    ndc: ndc || null,
    note: 'STUB response — outbound NCPDP/SureScripts call not yet implemented.',
  };
  await logCall('ncpdp', patient_id, req.body, stub);
  res.json(stub);
});

// PBM — insurance pre-authorization
router.post('/pbm/preauth', async (req, res) => {
  if (!gate('PBM_API_KEY', res)) return;
  const { patient_id, drug, quantity, days_supply, member_id } = req.body || {};
  const stub = {
    provider: 'PBM',
    pa_required: true,
    pa_id: `PA-STUB-${Date.now()}`,
    decision: 'pending_review',
    drug: drug || null,
    quantity: quantity || null,
    days_supply: days_supply || null,
    member_id: member_id || null,
    note: 'STUB response — outbound PBM API call not yet implemented.',
  };
  await logCall('pbm', patient_id, req.body, stub);
  res.json(stub);
});

// FHIR — EHR sync (patient context fetch)
router.post('/fhir/sync', async (req, res) => {
  if (!gate('FHIR_API_KEY', res)) return;
  const { patient_id, mrn } = req.body || {};
  const stub = {
    provider: 'FHIR',
    synced: true,
    resources: ['Patient', 'MedicationRequest', 'Condition', 'AllergyIntolerance'],
    patient_id: patient_id || null,
    mrn: mrn || null,
    note: 'STUB response — outbound FHIR call not yet implemented.',
  };
  await logCall('fhir', patient_id, req.body, stub);
  res.json(stub);
});

router.get('/log', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, provider, patient_id, response, created_at FROM integration_log ORDER BY created_at DESC LIMIT 50');
    res.json(r.rows);
  } catch (_) { res.json([]); }
});

module.exports = router;
