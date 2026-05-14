const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter, parseAIJson } = require('../ai');
const { aiRateLimiter } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM patients');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM patients ORDER BY last_name ASC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // HIPAA audit log
    try {
      await pool.query(
        `INSERT INTO audit_log (action, user_id, entity_type, entity_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['view_patient', req.user.id, 'patient', req.params.id, req.ip || req.connection.remoteAddress, JSON.stringify({ patient_id: req.params.id })]
      );
    } catch (_) { /* audit log errors should not block response */ }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, phone, email, insurance_provider, policy_number, allergies, current_medications } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, insurance_provider, policy_number, allergies, current_medications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [first_name, last_name, date_of_birth, phone, email, insurance_provider, policy_number, allergies, current_medications]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, phone, email, insurance_provider, policy_number, allergies, current_medications } = req.body;
    const result = await pool.query(
      `UPDATE patients SET first_name=$1, last_name=$2, date_of_birth=$3, phone=$4, email=$5, insurance_provider=$6, policy_number=$7, allergies=$8, current_medications=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [first_name, last_name, date_of_birth, phone, email, insurance_provider, policy_number, allergies, current_medications, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Patient Medication Review
router.post('/:id/medication-review', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const patient = result.rows[0];
    const prompt = `Perform a comprehensive medication review for this patient:
- Patient: ${patient.first_name} ${patient.last_name}
- DOB: ${patient.date_of_birth}
- Known Allergies: ${patient.allergies || 'None reported'}
- Current Medications: ${patient.current_medications || 'None listed'}

Return structured JSON only: {"concerns":[{"type":"string","description":"string","recommendation":"string","severity":"low|moderate|high"}],"score":0,"requires_pharmacist_review":false}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacy AI specializing in patient medication therapy management. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    // Persist to ai_results
    let savedResult = null;
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(100), entity_id INTEGER, result JSONB, created_at TIMESTAMP DEFAULT NOW())`
      );
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'patient_medication_review', patient.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      savedResult = saved.rows[0].id;
    } catch (_) {}

    res.json({ patient, review: aiResponse, structured: parsed, ai_result_id: savedResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients/:id/ai-counseling-notes
// Generates medication counseling talking points for pharmacist
router.post('/:id/ai-counseling-notes', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const patient = result.rows[0];

    // Fetch recent prescriptions for this patient
    const rxResult = await pool.query(
      `SELECT medication, dosage, frequency, refills FROM prescriptions
       WHERE LOWER(patient_name) LIKE LOWER($1) AND status != 'rejected'
       ORDER BY created_at DESC LIMIT 20`,
      [`%${patient.last_name}%`]
    ).catch(() => ({ rows: [] }));

    const meds = rxResult.rows;

    // HIPAA audit
    try {
      await pool.query(
        `INSERT INTO audit_log (action, user_id, entity_type, entity_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['ai_counseling_notes', req.user.id, 'patient', patient.id, req.ip, JSON.stringify({ patient_id: patient.id })]
      );
    } catch (_) {}

    const prompt = `You are a clinical pharmacist AI generating patient counseling talking points. Create comprehensive, patient-friendly counseling notes.

PATIENT PROFILE:
- Name: ${patient.first_name} ${patient.last_name}
- Date of Birth: ${patient.date_of_birth || 'Unknown'}
- Known Allergies: ${patient.allergies || 'NKDA'}
- Conditions/Current Medications on File: ${patient.current_medications || 'Not listed'}

ACTIVE PRESCRIPTIONS:
${meds.length > 0 ? meds.map(m => `- ${m.medication} ${m.dosage} ${m.frequency}`).join('\n') : 'No prescriptions on file'}

Generate pharmacist counseling talking points. Return JSON only:
{
  "counseling_points": [
    {
      "medication": "string",
      "dosage_instructions": "patient-friendly dosing instructions",
      "key_side_effects": ["common side effects to mention"],
      "warning_signs": ["symptoms patient should watch for and report"],
      "food_drug_interactions": ["dietary considerations"],
      "storage_instructions": "string",
      "missed_dose_guidance": "string",
      "adherence_tips": ["practical tips for remembering doses"]
    }
  ],
  "general_counseling": {
    "refill_reminders": "string",
    "when_to_call_pharmacy": ["situations that require calling"],
    "emergency_guidance": "string"
  },
  "allergy_reminders": ["allergy-related counseling points"],
  "interaction_warnings": ["cross-medication warnings to discuss"],
  "session_duration_estimate": "string"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacist AI generating patient counseling content. Return valid JSON only. Be thorough and patient-friendly.');
    const parsed = parseAIJson(aiResponse);

    // Persist
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(100), entity_id INTEGER, result JSONB, created_at TIMESTAMP DEFAULT NOW())`
    );
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'patient_counseling_notes', patient.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({
      patient: { id: patient.id, name: `${patient.first_name} ${patient.last_name}`, allergies: patient.allergies },
      active_prescriptions: meds,
      counseling_notes: parsed,
      raw_response: aiResponse,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients/:id/ai-adherence
// Returns adherence score + risk factors + intervention recommendations
router.post('/:id/ai-adherence', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const patient = result.rows[0];

    // Fetch refill history
    const refillResult = await pool.query(
      `SELECT medication, status, created_at, updated_at, refills
       FROM prescriptions
       WHERE LOWER(patient_name) LIKE LOWER($1)
       ORDER BY created_at DESC LIMIT 30`,
      [`%${patient.last_name}%`]
    ).catch(() => ({ rows: [] }));

    const refills = refillResult.rows;

    // HIPAA audit
    try {
      await pool.query(
        `INSERT INTO audit_log (action, user_id, entity_type, entity_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['ai_adherence_check', req.user.id, 'patient', patient.id, req.ip, JSON.stringify({ patient_id: patient.id })]
      );
    } catch (_) {}

    const onTimeCount = refills.filter(r => r.status === 'filled' || r.status === 'verified').length;
    const lateCount = refills.filter(r => r.status === 'pending').length;
    const totalCount = refills.length;

    const prompt = `You are a pharmacy adherence specialist AI. Analyze this patient's medication refill history to predict adherence risk and recommend interventions.

PATIENT: ${patient.first_name} ${patient.last_name}
Age approximation from DOB: ${patient.date_of_birth || 'Unknown'}
Known conditions/meds on profile: ${patient.current_medications || 'Not listed'}
Allergies: ${patient.allergies || 'NKDA'}

REFILL HISTORY ANALYSIS:
- Total prescription records: ${totalCount}
- On-time/Completed fills: ${onTimeCount}
- Late/Pending: ${lateCount}
- Adherence rate: ${totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0}%

RECENT PRESCRIPTIONS:
${refills.slice(0, 10).map(r => `${r.medication}: status=${r.status}, refills_remaining=${r.refills}`).join('\n') || 'No data'}

Return JSON only:
{
  "adherence_score": 0,
  "adherence_category": "excellent|good|fair|poor|unknown",
  "risk_factors": ["identified risk factors for non-adherence"],
  "protective_factors": ["factors that support adherence"],
  "intervention_recommendations": [
    {
      "intervention": "string",
      "priority": "immediate|short-term|long-term",
      "rationale": "string"
    }
  ],
  "monitoring_plan": "string",
  "refill_synchronization_candidate": true,
  "counseling_focus_areas": ["areas to address in counseling"],
  "estimated_30day_refill_probability": 0
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a medication adherence specialist AI. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    // Persist
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(100), entity_id INTEGER, result JSONB, created_at TIMESTAMP DEFAULT NOW())`
    );
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'patient_adherence', patient.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({
      patient: { id: patient.id, name: `${patient.first_name} ${patient.last_name}` },
      refill_stats: { total: totalCount, on_time: onTimeCount, late: lateCount, rate: totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0 },
      adherence_analysis: parsed,
      raw_response: aiResponse,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
