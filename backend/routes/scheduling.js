const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shift_schedule ORDER BY shift_date ASC, start_time ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/week/:date', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM shift_schedule WHERE shift_date >= $1::date AND shift_date < $1::date + INTERVAL '7 days' ORDER BY shift_date ASC, start_time ASC`,
      [req.params.date]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shift_schedule WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { staff_name, role, shift_date, start_time, end_time, shift_type, location, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO shift_schedule (staff_name, role, shift_date, start_time, end_time, shift_type, location, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [staff_name, role, shift_date, start_time, end_time, shift_type || 'regular', location || 'Main Pharmacy', notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { staff_name, role, shift_date, start_time, end_time, shift_type, location, notes, status } = req.body;
    const result = await pool.query(
      `UPDATE shift_schedule SET staff_name=$1, role=$2, shift_date=$3, start_time=$4, end_time=$5, shift_type=$6, location=$7, notes=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [staff_name, role, shift_date, start_time, end_time, shift_type, location, notes, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM shift_schedule WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
