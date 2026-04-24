const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM staff ORDER BY last_name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, role, license_number, license_expiry, phone, email, hire_date, certifications, shift_schedule, status } = req.body;
    const result = await pool.query(
      `INSERT INTO staff (first_name, last_name, role, license_number, license_expiry, phone, email, hire_date, certifications, shift_schedule, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [first_name, last_name, role, license_number, license_expiry, phone, email, hire_date, certifications, shift_schedule, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, role, license_number, license_expiry, phone, email, hire_date, certifications, shift_schedule, status } = req.body;
    const result = await pool.query(
      `UPDATE staff SET first_name=$1, last_name=$2, role=$3, license_number=$4, license_expiry=$5, phone=$6, email=$7, hire_date=$8, certifications=$9, shift_schedule=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [first_name, last_name, role, license_number, license_expiry, phone, email, hire_date, certifications, shift_schedule, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM staff WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/review', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const s = result.rows[0];
    const prompt = `Provide a staff compliance and performance review for:
- Name: ${s.first_name} ${s.last_name}
- Role: ${s.role}
- License: ${s.license_number} (expires: ${s.license_expiry})
- Hire Date: ${s.hire_date}
- Certifications: ${s.certifications}
- Shift Schedule: ${s.shift_schedule}
- Status: ${s.status}

Provide:
1. License/certification compliance status
2. Continuing education requirements
3. Recommended training based on role
4. Staffing ratio compliance assessment
5. Schedule optimization suggestions
6. Professional development recommendations`;
    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy workforce management AI. Provide professional staff review and compliance assessment.');
    res.json({ staff: s, review: aiResponse });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
