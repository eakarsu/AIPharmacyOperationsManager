// PRODUCT-DECISION: Medication Therapy Management (MTM) workflow.
// Storing only the minimum schema needed to record interventions; billing
// (CPT 99605/99606/99607) is intentionally NOT implemented because billing
// requires a credentialing decision (cash vs. insurance MTM contracts) that
// hasn't been made.
//
// Schema (CREATE TABLE IF NOT EXISTS):
//   mtm_sessions(id, patient_id, pharmacist_id, status, scheduled_at, summary, created_at)
//   mtm_interventions(id, session_id, type, drug, recommendation, accepted, created_at)
//
// `type` values: targeted_review, comprehensive_review, drug_therapy_problem,
//                 adherence_intervention, deprescribing, follow_up

const express = require('express');
const router = express.Router();
const pool = require('../db');

async function ensureMtmSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mtm_sessions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER,
      pharmacist_id INTEGER,
      status VARCHAR(32) DEFAULT 'scheduled',
      scheduled_at TIMESTAMP,
      summary TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mtm_interventions (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL,
      type VARCHAR(64) NOT NULL,
      drug VARCHAR(255),
      recommendation TEXT,
      accepted BOOLEAN,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureMtmSchema();

const VALID_TYPES = [
  'targeted_review', 'comprehensive_review', 'drug_therapy_problem',
  'adherence_intervention', 'deprescribing', 'follow_up'
];

router.get('/sessions', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM mtm_sessions ORDER BY created_at DESC LIMIT 200');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'list sessions failed', details: err.message }); }
});

router.post('/sessions', async (req, res) => {
  try {
    const { patient_id, pharmacist_id, scheduled_at, summary } = req.body || {};
    const r = await pool.query(
      `INSERT INTO mtm_sessions (patient_id, pharmacist_id, scheduled_at, summary)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [patient_id || null, pharmacist_id || null, scheduled_at || null, summary || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'create session failed', details: err.message }); }
});

router.patch('/sessions/:id', async (req, res) => {
  try {
    const { status, summary } = req.body || {};
    const r = await pool.query(
      `UPDATE mtm_sessions SET status = COALESCE($1, status), summary = COALESCE($2, summary)
       WHERE id = $3 RETURNING *`,
      [status || null, summary || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'update failed', details: err.message }); }
});

router.get('/sessions/:id/interventions', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM mtm_interventions WHERE session_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'list interventions failed', details: err.message }); }
});

router.post('/sessions/:id/interventions', async (req, res) => {
  try {
    const { type, drug, recommendation, accepted } = req.body || {};
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'invalid type', allowed: VALID_TYPES });
    }
    const r = await pool.query(
      `INSERT INTO mtm_interventions (session_id, type, drug, recommendation, accepted)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, type, drug || null, recommendation || null, typeof accepted === 'boolean' ? accepted : null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'create intervention failed', details: err.message }); }
});

module.exports = router;
