const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

// Get all
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescriptions ORDER BY created_at DESC');
    res.json(result.rows);
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

// AI Verify Prescription
router.post('/:id/verify', async (req, res) => {
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

Check for:
1. Dosage appropriateness
2. Frequency correctness
3. Potential safety concerns
4. Common drug interactions to watch for
5. Verification recommendation (APPROVE / REVIEW NEEDED / REJECT)

Provide a professional pharmacy verification report.`;

    const aiResponse = await callOpenRouter(prompt, 'You are an expert pharmacist AI assistant specializing in prescription verification. Provide thorough, professional verification reports.');
    res.json({ prescription: rx, verification: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
