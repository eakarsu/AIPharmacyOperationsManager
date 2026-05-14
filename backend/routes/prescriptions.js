const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter, parseAIJson } = require('../ai');
const { aiRateLimiter } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function ensureAiResultsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(100), entity_id INTEGER, result JSONB, created_at TIMESTAMP DEFAULT NOW())`
  );
}

// Get all (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM prescriptions');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const { patient_name, medication, dosage, frequency, prescriber, refills, status } = req.body;
    const result = await pool.query(
      `INSERT INTO prescriptions (patient_name, medication, dosage, frequency, prescriber, refills, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [patient_name, medication, dosage, frequency, prescriber, refills || 0, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const { patient_name, medication, dosage, frequency, prescriber, refills, status } = req.body;
    const result = await pool.query(
      `UPDATE prescriptions SET patient_name=$1, medication=$2, dosage=$3, frequency=$4, prescriber=$5, refills=$6, status=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [patient_name, medication, dosage, frequency, prescriber, refills, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prescriptions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Verify Prescription - structured JSON
router.post('/:id/verify', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const rx = result.rows[0];
    const prompt = `Verify this prescription for safety and accuracy:
- Patient: ${rx.patient_name}
- Medication: ${rx.medication}
- Dosage: ${rx.dosage}
- Frequency: ${rx.frequency}
- Prescriber: ${rx.prescriber}
- Refills: ${rx.refills}

Return JSON only: {"valid":true,"issues":[],"recommendations":[],"confidence":0.95}`;

    const aiResponse = await callOpenRouter(prompt, 'You are an expert pharmacist AI. Return valid JSON only matching the schema: {valid: bool, issues: string[], recommendations: string[], confidence: number 0-1}');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'prescription_verify', rx.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;

      // Update prescription status if AI deems invalid
      if (parsed && parsed.valid === false) {
        await pool.query(`UPDATE prescriptions SET status='flagged', updated_at=NOW() WHERE id=$1`, [rx.id]);
      }
    } catch (_) {}

    res.json({ prescription: rx, verification: aiResponse, structured: parsed, ai_result_id: aiResultId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan Rx Image (vision AI)
router.post('/scan-image', upload.single('image'), aiRateLimiter, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required' });

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` }
          },
          {
            type: 'text',
            text: 'Extract prescription information from this image. Return JSON only: {"drug_name":"","dosage":"","quantity":"","refills":"","prescriber_name":"","patient_name":"","directions":"","date":""}'
          }
        ]
      }
    ];

    const aiResponse = await callOpenRouter(null, null, messages);
    const parsed = parseAIJson(aiResponse);

    res.json({
      extracted: parsed || {},
      raw_response: aiResponse,
      prefill: parsed ? {
        medication: parsed.drug_name || '',
        dosage: parsed.dosage || '',
        refills: parseInt(parsed.refills) || 0,
        prescriber: parsed.prescriber_name || '',
        patient_name: parsed.patient_name || '',
        frequency: parsed.directions || '',
        status: 'pending'
      } : {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescriptions/:id/ai-fraud-check
router.post('/:id/ai-fraud-check', aiRateLimiter, async (req, res) => {
  try {
    const rxResult = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [req.params.id]);
    if (rxResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const rx = rxResult.rows[0];

    // Fetch prescriber history for this prescriber
    const prescriberHistory = await pool.query(
      `SELECT COUNT(*) as total_rxs,
              SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged_count,
              COUNT(DISTINCT patient_name) as unique_patients
       FROM prescriptions WHERE prescriber = $1`,
      [rx.prescriber]
    ).catch(() => ({ rows: [{ total_rxs: 0, flagged_count: 0, unique_patients: 0 }] }));

    // Fetch patient fill history
    const patientHistory = await pool.query(
      `SELECT COUNT(*) as total_fills,
              SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged_fills,
              COUNT(DISTINCT medication) as unique_meds,
              COUNT(DISTINCT prescriber) as unique_prescribers
       FROM prescriptions WHERE patient_name = $1`,
      [rx.patient_name]
    ).catch(() => ({ rows: [{ total_fills: 0, flagged_fills: 0, unique_meds: 0, unique_prescribers: 0 }] }));

    const ph = prescriberHistory.rows[0];
    const pat = patientHistory.rows[0];

    const prompt = `You are a pharmacy fraud detection AI. Analyze this prescription for potential fraud or diversion.

PRESCRIPTION DETAILS:
- Patient: ${rx.patient_name}
- Medication: ${rx.medication}
- Dosage: ${rx.dosage}
- Frequency: ${rx.frequency}
- Prescriber: ${rx.prescriber}
- Refills: ${rx.refills}
- Current Status: ${rx.status}

PRESCRIBER HISTORY:
- Total Prescriptions Written: ${ph.total_rxs}
- Previously Flagged: ${ph.flagged_count}
- Unique Patients: ${ph.unique_patients}

PATIENT FILL HISTORY:
- Total Previous Fills: ${pat.total_fills}
- Previously Flagged Fills: ${pat.flagged_fills}
- Unique Medications: ${pat.unique_meds}
- Unique Prescribers Used: ${pat.unique_prescribers}

Return JSON only:
{
  "risk_score": 0,
  "risk_level": "low|moderate|high|critical",
  "red_flags": ["list of specific red flags identified"],
  "positive_indicators": ["factors that reduce suspicion"],
  "assessment": "string with detailed analysis",
  "recommended_action": "approve|hold_for_review|contact_prescriber|contact_patient|escalate_to_supervisor|reject",
  "documentation_notes": "string of what to document"
}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy fraud detection specialist AI. Return valid JSON only. Be accurate but not overly suspicious.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'prescription_fraud_check', rx.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;

      if (parsed && parsed.risk_level === 'critical') {
        await pool.query(`UPDATE prescriptions SET status='flagged', updated_at=NOW() WHERE id=$1`, [rx.id]);
      }
    } catch (_) {}

    // HIPAA audit log
    try {
      await pool.query(
        `INSERT INTO audit_log (action, user_id, entity_type, entity_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['ai_fraud_check', req.user.id, 'prescription', rx.id, req.ip || req.connection.remoteAddress, JSON.stringify({ medication: rx.medication, risk_level: parsed?.risk_level })]
      );
    } catch (_) {}

    res.json({
      prescription: rx,
      prescriber_history: ph,
      patient_history: pat,
      fraud_assessment: parsed,
      raw_response: aiResponse,
      ai_result_id: aiResultId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
