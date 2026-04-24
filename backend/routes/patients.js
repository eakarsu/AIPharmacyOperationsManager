const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY last_name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
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
router.post('/:id/medication-review', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const patient = result.rows[0];
    const prompt = `Perform a comprehensive medication review for this patient:
- Patient: ${patient.first_name} ${patient.last_name}
- DOB: ${patient.date_of_birth}
- Known Allergies: ${patient.allergies || 'None reported'}
- Current Medications: ${patient.current_medications || 'None listed'}

Provide:
1. Drug interaction screening
2. Allergy cross-reactivity check
3. Therapeutic duplication review
4. Age-appropriate dosing assessment
5. Adherence risk factors
6. Medication optimization recommendations`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacy AI specializing in patient medication therapy management.');
    res.json({ patient, review: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
