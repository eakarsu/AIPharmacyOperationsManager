const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM financial_transactions ORDER BY transaction_date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_payments,
        COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(CASE WHEN type = 'copay' THEN amount ELSE 0 END), 0) as total_copays,
        COALESCE(SUM(CASE WHEN type = 'insurance_reimbursement' THEN amount ELSE 0 END), 0) as total_reimbursements,
        COALESCE(SUM(amount), 0) as net_total
      FROM financial_transactions
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM financial_transactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_name, type, amount, payment_method, reference_number, medication, insurance_provider, description, processed_by } = req.body;
    const result = await pool.query(
      `INSERT INTO financial_transactions (patient_name, type, amount, payment_method, reference_number, medication, insurance_provider, description, processed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_name, type, amount, payment_method || 'cash', reference_number || null, medication || null, insurance_provider || null, description || null, processed_by || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { patient_name, type, amount, payment_method, reference_number, medication, insurance_provider, description, processed_by, status } = req.body;
    const result = await pool.query(
      `UPDATE financial_transactions SET patient_name=$1, type=$2, amount=$3, payment_method=$4, reference_number=$5, medication=$6, insurance_provider=$7, description=$8, processed_by=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [patient_name, type, amount, payment_method, reference_number, medication, insurance_provider, description, processed_by, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM financial_transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
