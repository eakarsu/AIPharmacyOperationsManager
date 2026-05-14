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

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM controlled_substances');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM controlled_substances ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM controlled_substances WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, dea_schedule, quantity_on_hand, quantity_dispensed, prescriber_dea, patient_name, dispensed_date, log_entry, status } = req.body;
    const result = await pool.query(
      `INSERT INTO controlled_substances (name, dea_schedule, quantity_on_hand, quantity_dispensed, prescriber_dea, patient_name, dispensed_date, log_entry, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, dea_schedule, quantity_on_hand || 0, quantity_dispensed || 0, prescriber_dea, patient_name, dispensed_date || new Date(), log_entry, status || 'logged']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, dea_schedule, quantity_on_hand, quantity_dispensed, prescriber_dea, patient_name, dispensed_date, log_entry, status } = req.body;
    const result = await pool.query(
      `UPDATE controlled_substances SET name=$1, dea_schedule=$2, quantity_on_hand=$3, quantity_dispensed=$4, prescriber_dea=$5, patient_name=$6, dispensed_date=$7, log_entry=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, dea_schedule, quantity_on_hand, quantity_dispensed, prescriber_dea, patient_name, dispensed_date, log_entry, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM controlled_substances WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Compliance Check - structured JSON
router.post('/:id/compliance-check', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM controlled_substances WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const substance = result.rows[0];
    const prompt = `Perform a DEA compliance check:
- Substance: ${substance.name} (${substance.dea_schedule})
- Qty On Hand: ${substance.quantity_on_hand}
- Qty Dispensed: ${substance.quantity_dispensed}
- Prescriber DEA#: ${substance.prescriber_dea}
- Patient: ${substance.patient_name}
- Date: ${substance.dispensed_date}
- Log: ${substance.log_entry}

Return JSON only: {"concerns":[{"type":"compliance|documentation|quantity|prescriber","description":"","recommendation":"","severity":"low|moderate|high"}],"score":0,"requires_pharmacist_review":false}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a DEA compliance AI specialist. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'controlled_compliance_check', substance.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({ substance, compliance: aiResponse, structured: parsed, ai_result_id: aiResultId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Controlled Substance Reconciliation
router.post('/:id/reconcile', async (req, res) => {
  try {
    const { dispensed_qty, reason } = req.body;
    if (dispensed_qty === undefined || !reason) {
      return res.status(400).json({ error: 'dispensed_qty and reason are required' });
    }

    const result = await pool.query('SELECT * FROM controlled_substances WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const substance = result.rows[0];
    const expected = substance.quantity_dispensed;
    const discrepancy = dispensed_qty - expected;
    const hasDiscrepancy = discrepancy !== 0;

    // Update reconciliation info
    await pool.query(
      `UPDATE controlled_substances SET log_entry = COALESCE(log_entry, '') || $1, updated_at=NOW() WHERE id=$2`,
      [`\n[RECONCILIATION ${new Date().toISOString()}] Dispensed: ${dispensed_qty}, Expected: ${expected}, Discrepancy: ${discrepancy}, Reason: ${reason}`, req.params.id]
    );

    // Audit log for discrepancy
    if (hasDiscrepancy) {
      try {
        await pool.query(
          `INSERT INTO audit_log (action, user_id, entity_type, entity_id, ip_address, details)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['controlled_substance_discrepancy', req.user.id, 'controlled_substance', req.params.id, req.ip || req.connection.remoteAddress,
           JSON.stringify({ substance_name: substance.name, dispensed_qty, expected, discrepancy, reason })]
        );
      } catch (_) {}
    }

    res.json({
      substance_id: req.params.id,
      substance_name: substance.name,
      dispensed_qty,
      expected_qty: expected,
      discrepancy,
      has_discrepancy: hasDiscrepancy,
      reason,
      reconciled_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
