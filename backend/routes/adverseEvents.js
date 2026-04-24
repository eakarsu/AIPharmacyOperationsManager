const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM adverse_events ORDER BY event_date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM adverse_events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_name, medication, event_date, event_description, severity, outcome, reporter, report_type, meddra_code, causality, status } = req.body;
    const result = await pool.query(
      `INSERT INTO adverse_events (patient_name, medication, event_date, event_description, severity, outcome, reporter, report_type, meddra_code, causality, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [patient_name, medication, event_date || new Date(), event_description, severity || 'moderate', outcome, reporter, report_type || 'initial', meddra_code, causality, status || 'reported']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { patient_name, medication, event_date, event_description, severity, outcome, reporter, report_type, meddra_code, causality, status } = req.body;
    const result = await pool.query(
      `UPDATE adverse_events SET patient_name=$1, medication=$2, event_date=$3, event_description=$4, severity=$5, outcome=$6, reporter=$7, report_type=$8, meddra_code=$9, causality=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [patient_name, medication, event_date, event_description, severity, outcome, reporter, report_type, meddra_code, causality, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM adverse_events WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/assess', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM adverse_events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const e = result.rows[0];
    const prompt = `Assess this adverse drug event (MedWatch-style):
- Patient: ${e.patient_name}
- Medication: ${e.medication}
- Event Date: ${e.event_date}
- Description: ${e.event_description}
- Severity: ${e.severity}
- Outcome: ${e.outcome}
- Reporter: ${e.reporter}
- Report Type: ${e.report_type}
- MedDRA Code: ${e.meddra_code}
- Causality: ${e.causality}

Provide:
1. Causality assessment (Naranjo algorithm score estimate)
2. Signal detection analysis
3. FDA MedWatch reporting requirements
4. Patient safety recommendations
5. Similar reported events in literature
6. Risk mitigation strategies
7. Follow-up monitoring plan`;
    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacovigilance AI expert. Provide thorough adverse event assessment aligned with FDA MedWatch standards.');
    res.json({ event: e, assessment: aiResponse });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
