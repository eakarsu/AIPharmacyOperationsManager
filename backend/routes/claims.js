const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_claims ORDER BY submitted_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_claims WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_name, insurance_provider, policy_number, medication, quantity, amount, diagnosis_code, ndc_code, status } = req.body;
    const result = await pool.query(
      `INSERT INTO insurance_claims (patient_name, insurance_provider, policy_number, medication, quantity, amount, diagnosis_code, ndc_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [patient_name, insurance_provider, policy_number, medication, quantity || 0, amount || 0, diagnosis_code, ndc_code, status || 'submitted']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { patient_name, insurance_provider, policy_number, medication, quantity, amount, diagnosis_code, ndc_code, status } = req.body;
    const result = await pool.query(
      `UPDATE insurance_claims SET patient_name=$1, insurance_provider=$2, policy_number=$3, medication=$4, quantity=$5, amount=$6, diagnosis_code=$7, ndc_code=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [patient_name, insurance_provider, policy_number, medication, quantity, amount, diagnosis_code, ndc_code, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM insurance_claims WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Claim Processing
router.post('/:id/process', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_claims WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const claim = result.rows[0];
    const prompt = `Process and analyze this pharmacy insurance claim:
- Patient: ${claim.patient_name}
- Insurance: ${claim.insurance_provider}
- Policy: ${claim.policy_number}
- Medication: ${claim.medication}
- Quantity: ${claim.quantity}
- Amount: $${claim.amount}
- Diagnosis Code: ${claim.diagnosis_code}
- NDC Code: ${claim.ndc_code}
- Status: ${claim.status}

Provide:
1. Claim validation assessment
2. Coding accuracy check (ICD/NDC)
3. Prior authorization requirements
4. Formulary coverage likelihood
5. Rejection risk factors
6. Recommended actions for claim approval
7. Estimated reimbursement timeline`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy insurance claims processing AI. Provide thorough claim analysis and processing recommendations.');
    res.json({ claim, processing: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
