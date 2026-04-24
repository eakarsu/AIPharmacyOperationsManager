const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM controlled_substances ORDER BY name ASC');
    res.json(result.rows);
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

// AI Compliance Check
router.post('/:id/compliance-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM controlled_substances WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const substance = result.rows[0];
    const prompt = `Perform a DEA compliance check for this controlled substance record:
- Substance: ${substance.name}
- DEA Schedule: ${substance.dea_schedule}
- Quantity On Hand: ${substance.quantity_on_hand}
- Quantity Dispensed: ${substance.quantity_dispensed}
- Prescriber DEA#: ${substance.prescriber_dea}
- Patient: ${substance.patient_name}
- Dispensed Date: ${substance.dispensed_date}
- Log Entry: ${substance.log_entry}

Evaluate:
1. DEA regulatory compliance status
2. Documentation completeness
3. Quantity reconciliation accuracy
4. Prescriber verification requirements
5. PDMP (Prescription Drug Monitoring Program) reporting
6. Red flags or suspicious patterns
7. Recommended corrective actions if any`;

    const aiResponse = await callOpenRouter(prompt, 'You are a DEA compliance AI specialist for pharmacy operations. Ensure thorough regulatory compliance assessment.');
    res.json({ substance, compliance: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
