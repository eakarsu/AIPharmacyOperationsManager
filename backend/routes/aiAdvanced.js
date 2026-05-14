const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter, parseAIJson } = require('../ai');
const { aiRateLimiter } = require('../middleware/auth');

async function ensureAiResultsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(100), entity_id INTEGER, result JSONB, created_at TIMESTAMP DEFAULT NOW())`
  );
}

async function auditLog(userId, action, entityType, entityId, ip, details) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [userId, action, entityType, entityId, ip, JSON.stringify(details)]
    );
  } catch (_) {}
}

// POST /api/ai/drug-interactions
// Accepts array of medication names, returns interaction matrix
router.post('/drug-interactions', aiRateLimiter, async (req, res) => {
  try {
    const { medications } = req.body;
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return res.status(400).json({ error: 'medications array with at least 2 items required' });
    }

    const prompt = `You are a clinical pharmacist AI. Analyze the following list of medications for drug-drug interactions:

Medications: ${medications.join(', ')}

For every pair of medications, assess their interaction. Return JSON only matching this exact schema:
{
  "interaction_matrix": [
    {
      "drug_a": "string",
      "drug_b": "string",
      "severity": "major|moderate|minor|none",
      "mechanism": "string describing pharmacokinetic/pharmacodynamic basis",
      "clinical_effect": "string describing what happens clinically",
      "management": "string with specific management recommendation",
      "monitoring": "string with monitoring parameters",
      "alternative": "string with alternative drug if applicable or null"
    }
  ],
  "high_risk_pairs": ["drug_a + drug_b"],
  "overall_risk_summary": "string",
  "pharmacist_action_required": true
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacist AI specializing in drug interactions. Return valid JSON only. Be thorough and clinically accurate.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, result) VALUES ($1, $2, $3) RETURNING id`,
        [req.user.id, 'drug_interactions', JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    await auditLog(req.user.id, 'ai_drug_interaction_check', 'medications', null, req.ip, { medications, ai_result_id: aiResultId });

    res.json({
      medications,
      interaction_matrix: parsed?.interaction_matrix || [],
      high_risk_pairs: parsed?.high_risk_pairs || [],
      overall_risk_summary: parsed?.overall_risk_summary || aiResponse,
      pharmacist_action_required: parsed?.pharmacist_action_required ?? false,
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/reorder-optimize
// Fetches inventory levels + dispensing rates, AI returns reorder plan
router.post('/reorder-optimize', aiRateLimiter, async (req, res) => {
  try {
    const invResult = await pool.query('SELECT * FROM inventory ORDER BY quantity ASC LIMIT 50');
    const items = invResult.rows;

    // Also fetch recent prescription fills to estimate dispensing rate
    let dispensingData = [];
    try {
      const rxResult = await pool.query(
        `SELECT medication, COUNT(*) as fill_count
         FROM prescriptions
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY medication
         ORDER BY fill_count DESC
         LIMIT 50`
      );
      dispensingData = rxResult.rows;
    } catch (_) {}

    const inventorySummary = items.map(i =>
      `${i.name}: qty=${i.quantity}, reorder_at=${i.reorder_level}, cost=$${i.unit_cost}, supplier=${i.supplier || 'unknown'}, expiry=${i.expiry_date ? new Date(i.expiry_date).toLocaleDateString() : 'N/A'}`
    ).join('\n');

    const dispensingSummary = dispensingData.length > 0
      ? dispensingData.map(d => `${d.medication}: ${d.fill_count} fills/month`).join('\n')
      : 'No recent dispensing data available';

    const prompt = `You are a pharmacy inventory optimization AI. Analyze this pharmacy inventory and dispensing data to generate a reorder optimization plan.

CURRENT INVENTORY:
${inventorySummary}

DISPENSING RATES (last 30 days):
${dispensingSummary}

Return JSON only:
{
  "reorder_recommendations": [
    {
      "drug_name": "string",
      "current_quantity": 0,
      "reorder_level": 0,
      "recommended_order_quantity": 0,
      "urgency": "immediate|this_week|this_month|optional",
      "estimated_days_until_stockout": 0,
      "estimated_cost": 0,
      "reason": "string",
      "supplier_note": "string"
    }
  ],
  "low_stock_risk_drugs": ["drug names at risk"],
  "expiring_soon": ["drugs expiring within 90 days"],
  "total_reorder_cost_estimate": 0,
  "action_priority": "critical|urgent|routine",
  "strategic_notes": "string with overall inventory health assessment"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy inventory management AI. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, result) VALUES ($1, $2, $3) RETURNING id`,
        [req.user.id, 'reorder_optimize', JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({
      inventory_items_analyzed: items.length,
      dispensing_drugs_tracked: dispensingData.length,
      recommendations: parsed?.reorder_recommendations || [],
      low_stock_risk_drugs: parsed?.low_stock_risk_drugs || [],
      expiring_soon: parsed?.expiring_soon || [],
      total_reorder_cost_estimate: parsed?.total_reorder_cost_estimate || 0,
      action_priority: parsed?.action_priority || 'routine',
      strategic_notes: parsed?.strategic_notes || '',
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/formulary-review
// Fetches top 50 dispensed drugs + costs, AI suggests alternatives
router.post('/formulary-review', aiRateLimiter, async (req, res) => {
  try {
    // Get top dispensed drugs with costs
    let topDrugs = [];
    try {
      const result = await pool.query(
        `SELECT p.medication, COUNT(*) as fill_count, i.unit_cost, i.category
         FROM prescriptions p
         LEFT JOIN inventory i ON LOWER(i.name) LIKE LOWER('%' || p.medication || '%')
         GROUP BY p.medication, i.unit_cost, i.category
         ORDER BY fill_count DESC
         LIMIT 50`
      );
      topDrugs = result.rows;
    } catch (_) {
      // fallback: just get inventory
      const result = await pool.query('SELECT name as medication, unit_cost, category FROM inventory ORDER BY unit_cost DESC LIMIT 50');
      topDrugs = result.rows;
    }

    const drugsSummary = topDrugs.map(d =>
      `${d.medication}: ${d.fill_count || 0} fills, cost=$${d.unit_cost || 'unknown'}, category=${d.category || 'general'}`
    ).join('\n');

    const prompt = `You are a pharmacy formulary management AI. Analyze these top-dispensed medications and identify cost-saving opportunities.

TOP DISPENSED DRUGS:
${drugsSummary}

Provide a comprehensive formulary review. Return JSON only:
{
  "therapeutic_alternatives": [
    {
      "current_drug": "string",
      "alternative_drug": "string",
      "estimated_savings_per_fill": 0,
      "annual_savings_estimate": 0,
      "clinical_equivalence": "therapeutic|pharmacological|chemical",
      "notes": "string",
      "switching_considerations": "string"
    }
  ],
  "generic_opportunities": [
    {
      "brand_drug": "string",
      "generic_name": "string",
      "estimated_savings_percent": 0,
      "notes": "string"
    }
  ],
  "total_estimated_annual_savings": 0,
  "priority_switches": ["top 3 drug switches to implement first"],
  "formulary_health_score": 0,
  "executive_summary": "string"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy benefit management and formulary optimization AI. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, result) VALUES ($1, $2, $3) RETURNING id`,
        [req.user.id, 'formulary_review', JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({
      drugs_analyzed: topDrugs.length,
      therapeutic_alternatives: parsed?.therapeutic_alternatives || [],
      generic_opportunities: parsed?.generic_opportunities || [],
      total_estimated_annual_savings: parsed?.total_estimated_annual_savings || 0,
      priority_switches: parsed?.priority_switches || [],
      formulary_health_score: parsed?.formulary_health_score || 0,
      executive_summary: parsed?.executive_summary || aiResponse,
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/diversion-detect
// Flags suspicious controlled-substance prescribing patterns suggesting drug diversion
router.post('/diversion-detect', aiRateLimiter, async (req, res) => {
  try {
    let controlledRows = [];
    try {
      const result = await pool.query(
        `SELECT id, drug_name, schedule, quantity, prescriber, patient_id, created_at
         FROM controlled
         WHERE created_at >= NOW() - INTERVAL '90 days'
         ORDER BY created_at DESC
         LIMIT 200`
      );
      controlledRows = result.rows;
    } catch (_) {
      try {
        const result = await pool.query(
          `SELECT id, medication AS drug_name, NULL AS schedule, quantity, prescriber, patient_id, created_at
           FROM prescriptions
           WHERE created_at >= NOW() - INTERVAL '90 days'
           ORDER BY created_at DESC
           LIMIT 200`
        );
        controlledRows = result.rows;
      } catch (__) {}
    }

    const summary = controlledRows.map(r =>
      `id=${r.id} drug=${r.drug_name} sched=${r.schedule || 'n/a'} qty=${r.quantity || '?'} prescriber=${r.prescriber || 'unknown'} patient=${r.patient_id || 'unknown'} when=${r.created_at}`
    ).join('\n');

    const prompt = `You are a DEA-aware pharmacy compliance AI. Analyze these recent controlled-substance/prescription events for drug-diversion red flags.

EVENTS (90 days):
${summary || 'No events available.'}

Return JSON only:
{
  "high_risk_patterns": [
    {
      "pattern": "string",
      "drugs": ["string"],
      "patients_or_prescribers": ["string"],
      "reason": "string",
      "recommended_action": "string"
    }
  ],
  "patient_outliers": [{"patient_id": "string", "reason": "string"}],
  "prescriber_outliers": [{"prescriber": "string", "reason": "string"}],
  "overall_risk_level": "low|moderate|high|critical",
  "escalate_to_dea": true,
  "executive_summary": "string"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a controlled-substance diversion-detection AI. Be conservative and only flag genuine red flags. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, result) VALUES ($1, $2, $3) RETURNING id`,
        [req.user.id, 'diversion_detect', JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    await auditLog(req.user.id, 'ai_diversion_detect', 'controlled', null, req.ip, { events_analyzed: controlledRows.length, ai_result_id: aiResultId });

    res.json({
      events_analyzed: controlledRows.length,
      high_risk_patterns: parsed?.high_risk_patterns || [],
      patient_outliers: parsed?.patient_outliers || [],
      prescriber_outliers: parsed?.prescriber_outliers || [],
      overall_risk_level: parsed?.overall_risk_level || 'low',
      escalate_to_dea: parsed?.escalate_to_dea ?? false,
      executive_summary: parsed?.executive_summary || aiResponse,
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/adherence-predict
// Flags likely-non-adherent patients based on refill behavior and prescription history
router.post('/adherence-predict', aiRateLimiter, async (req, res) => {
  try {
    const { patient_id } = req.body;
    let rxRows = [];
    try {
      const params = patient_id ? [patient_id] : [];
      const where = patient_id ? 'WHERE patient_id = $1' : '';
      const result = await pool.query(
        `SELECT id, patient_id, medication, quantity, refills_remaining, days_supply, last_filled, created_at
         FROM prescriptions
         ${where}
         ORDER BY created_at DESC
         LIMIT 200`,
        params
      );
      rxRows = result.rows;
    } catch (_) {}

    const summary = rxRows.map(r =>
      `patient=${r.patient_id || 'n/a'} drug=${r.medication} qty=${r.quantity || '?'} days_supply=${r.days_supply || '?'} refills_left=${r.refills_remaining ?? '?'} last_fill=${r.last_filled || 'n/a'} created=${r.created_at}`
    ).join('\n');

    const prompt = `You are a medication-adherence prediction AI. Identify patients likely to be non-adherent based on refill timing vs days supply, gaps, and overdue refills.

PRESCRIPTIONS (recent):
${summary || 'No prescription data.'}

Return JSON only:
{
  "at_risk_patients": [
    {
      "patient_id": "string",
      "drugs_at_risk": ["string"],
      "adherence_score": 0,
      "evidence": ["string"],
      "intervention_suggestions": ["string"]
    }
  ],
  "population_summary": "string",
  "recommended_outreach_count": 0,
  "interventions_to_consider": ["string"]
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a medication therapy management AI focused on adherence. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'adherence_predict', patient_id || null, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({
      prescriptions_analyzed: rxRows.length,
      at_risk_patients: parsed?.at_risk_patients || [],
      population_summary: parsed?.population_summary || '',
      recommended_outreach_count: parsed?.recommended_outreach_count || 0,
      interventions_to_consider: parsed?.interventions_to_consider || [],
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/claim-denial-predict
// Predicts likelihood of claim denial for pending/recent claims
router.post('/claim-denial-predict', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { claim_id } = req.body || {};
    let claimRows = [];
    try {
      const params = claim_id ? [claim_id] : [];
      const where = claim_id ? 'WHERE id = $1' : '';
      const result = await pool.query(
        `SELECT id, patient_id, medication, ndc, payer, status, denial_reason, billed_amount, created_at
         FROM claims
         ${where}
         ORDER BY created_at DESC
         LIMIT 100`,
        params
      );
      claimRows = result.rows;
    } catch (_) {}

    const summary = claimRows.map(c =>
      `id=${c.id} patient=${c.patient_id || '?'} drug=${c.medication || '?'} ndc=${c.ndc || '?'} payer=${c.payer || '?'} amount=$${c.billed_amount || '?'} status=${c.status || '?'} denial=${c.denial_reason || 'n/a'} when=${c.created_at}`
    ).join('\n');

    const prompt = `You are a pharmacy claims and PBM AI. Predict denial likelihood for these claims and recommend pre-emptive corrections.

CLAIMS:
${summary || 'No claims available.'}

Return JSON only:
{
  "predictions": [
    {
      "claim_id": "string",
      "denial_probability": 0.0,
      "top_risk_factors": ["string"],
      "recommended_actions": ["string"],
      "expected_resolution": "string"
    }
  ],
  "aggregate_denial_rate_estimate": 0.0,
  "common_denial_drivers": ["string"],
  "process_improvements": ["string"],
  "executive_summary": "string"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy claims AI specializing in denial prediction. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'claim_denial_predict', claim_id || null, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    await auditLog(req.user.id, 'ai_claim_denial_predict', 'claim', claim_id || null, req.ip, { claims_analyzed: claimRows.length, ai_result_id: aiResultId });

    res.json({
      claims_analyzed: claimRows.length,
      predictions: parsed?.predictions || [],
      aggregate_denial_rate_estimate: parsed?.aggregate_denial_rate_estimate || 0,
      common_denial_drivers: parsed?.common_denial_drivers || [],
      process_improvements: parsed?.process_improvements || [],
      executive_summary: parsed?.executive_summary || aiResponse,
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    if (/OPENROUTER_API_KEY/i.test(String(err.message))) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/interaction-check-ai
// Enhanced drug-disease/drug-allergy/drug-condition checking
router.post('/interaction-check-ai', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { medications = [], conditions = [], allergies = [], patient_id } = req.body || {};

    if (!Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ error: 'medications array required' });
    }

    let patientCtx = '';
    if (patient_id) {
      try {
        const r = await pool.query('SELECT id, age, sex, allergies, conditions FROM patients WHERE id = $1', [patient_id]);
        if (r.rows[0]) {
          const p = r.rows[0];
          patientCtx = `Patient age=${p.age || '?'} sex=${p.sex || '?'} allergies=${p.allergies || 'none'} conditions=${p.conditions || 'none'}.`;
        }
      } catch (_) {}
    }

    const prompt = `You are a clinical pharmacist AI. Perform comprehensive drug-disease, drug-allergy, drug-drug, and drug-condition interaction checking.

${patientCtx}
Medications: ${medications.join(', ')}
Conditions: ${(conditions || []).join(', ') || 'none reported'}
Allergies: ${(allergies || []).join(', ') || 'none reported'}

Return JSON only:
{
  "drug_disease_interactions": [
    { "drug": "string", "disease_or_condition": "string", "severity": "major|moderate|minor", "mechanism": "string", "recommendation": "string" }
  ],
  "drug_allergy_alerts": [
    { "drug": "string", "allergy_match": "string", "severity": "string", "recommendation": "string" }
  ],
  "drug_drug_interactions": [
    { "drug_a": "string", "drug_b": "string", "severity": "major|moderate|minor", "clinical_effect": "string", "management": "string" }
  ],
  "overall_risk_level": "low|moderate|high|critical",
  "pharmacist_action_required": true,
  "executive_summary": "string"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacist AI. Return valid JSON only. Be thorough.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'interaction_check_ai', patient_id || null, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    await auditLog(req.user.id, 'ai_interaction_check_ai', 'patient', patient_id || null, req.ip, { medications_count: medications.length, ai_result_id: aiResultId });

    res.json({
      medications,
      conditions,
      allergies,
      drug_disease_interactions: parsed?.drug_disease_interactions || [],
      drug_allergy_alerts: parsed?.drug_allergy_alerts || [],
      drug_drug_interactions: parsed?.drug_drug_interactions || [],
      overall_risk_level: parsed?.overall_risk_level || 'low',
      pharmacist_action_required: parsed?.pharmacist_action_required ?? false,
      executive_summary: parsed?.executive_summary || aiResponse,
      structured: parsed,
      ai_result_id: aiResultId
    });
  } catch (err) {
    if (/OPENROUTER_API_KEY/i.test(String(err.message))) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
