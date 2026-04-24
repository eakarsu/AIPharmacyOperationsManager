const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records ORDER BY audit_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { regulation_type, description, audit_date, auditor, findings, risk_level, corrective_action, status } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_records (regulation_type, description, audit_date, auditor, findings, risk_level, corrective_action, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [regulation_type, description, audit_date || new Date(), auditor, findings, risk_level || 'medium', corrective_action, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { regulation_type, description, audit_date, auditor, findings, risk_level, corrective_action, status } = req.body;
    const result = await pool.query(
      `UPDATE compliance_records SET regulation_type=$1, description=$2, audit_date=$3, auditor=$4, findings=$5, risk_level=$6, corrective_action=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [regulation_type, description, audit_date, auditor, findings, risk_level, corrective_action, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM compliance_records WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Compliance Audit
router.post('/:id/audit', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const record = result.rows[0];
    const prompt = `Perform an AI compliance audit analysis for:
- Regulation Type: ${record.regulation_type}
- Description: ${record.description}
- Audit Date: ${record.audit_date}
- Auditor: ${record.auditor}
- Findings: ${record.findings}
- Risk Level: ${record.risk_level}
- Corrective Action: ${record.corrective_action}
- Status: ${record.status}

Provide:
1. Regulatory compliance assessment
2. Risk severity analysis
3. Corrective action adequacy review
4. Timeline recommendations
5. Prevention strategies
6. Documentation requirements
7. Follow-up audit recommendations`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy regulatory compliance AI. Provide thorough compliance audit analysis aligned with FDA, DEA, and state pharmacy board regulations.');
    res.json({ record, audit: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
