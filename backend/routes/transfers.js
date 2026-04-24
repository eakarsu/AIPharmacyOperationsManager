const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescription_transfers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescription_transfers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_name, medication, rx_number, from_pharmacy, from_phone, to_pharmacy, to_phone, transfer_type, pharmacist_name, refills_remaining, original_fill_date, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO prescription_transfers (patient_name, medication, rx_number, from_pharmacy, from_phone, to_pharmacy, to_phone, transfer_type, pharmacist_name, refills_remaining, original_fill_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [patient_name, medication, rx_number, from_pharmacy, from_phone, to_pharmacy, to_phone, transfer_type || 'outgoing', pharmacist_name, refills_remaining || 0, original_fill_date || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { patient_name, medication, rx_number, from_pharmacy, from_phone, to_pharmacy, to_phone, transfer_type, pharmacist_name, refills_remaining, original_fill_date, notes, status } = req.body;
    const result = await pool.query(
      `UPDATE prescription_transfers SET patient_name=$1, medication=$2, rx_number=$3, from_pharmacy=$4, from_phone=$5, to_pharmacy=$6, to_phone=$7, transfer_type=$8, pharmacist_name=$9, refills_remaining=$10, original_fill_date=$11, notes=$12, status=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [patient_name, medication, rx_number, from_pharmacy, from_phone, to_pharmacy, to_phone, transfer_type, pharmacist_name, refills_remaining, original_fill_date, notes, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prescription_transfers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
