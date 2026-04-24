const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_log WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { user_name, action, module, record_id, details, ip_address } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_log (user_name, action, module, record_id, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_name, action, module, record_id || null, details || null, ip_address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/filter/by-user/:userName', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_log WHERE user_name = $1 ORDER BY timestamp DESC', [req.params.userName]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/filter/by-module/:module', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_log WHERE module = $1 ORDER BY timestamp DESC', [req.params.module]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
