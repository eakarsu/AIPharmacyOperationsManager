const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports ORDER BY generated_date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, report_type, period_start, period_end, generated_by, summary, metrics, status } = req.body;
    const result = await pool.query(
      `INSERT INTO reports (title, report_type, period_start, period_end, generated_by, summary, metrics, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, report_type, period_start, period_end, generated_by, summary, metrics, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, report_type, period_start, period_end, generated_by, summary, metrics, status } = req.body;
    const result = await pool.query(
      `UPDATE reports SET title=$1, report_type=$2, period_start=$3, period_end=$4, generated_by=$5, summary=$6, metrics=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [title, report_type, period_start, period_end, generated_by, summary, metrics, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-insights', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const r = result.rows[0];

    // Gather live stats
    const rxCount = (await pool.query('SELECT count(*) FROM prescriptions')).rows[0].count;
    const invCount = (await pool.query('SELECT count(*) FROM inventory WHERE quantity <= reorder_level')).rows[0].count;
    const claimTotal = (await pool.query('SELECT COALESCE(sum(amount),0) as total FROM insurance_claims')).rows[0].total;
    const csCount = (await pool.query('SELECT count(*) FROM controlled_substances')).rows[0].count;
    const patientCount = (await pool.query('SELECT count(*) FROM patients')).rows[0].count;

    const prompt = `Generate AI insights for this pharmacy operations report:

Report: ${r.title}
Type: ${r.report_type}
Period: ${r.period_start} to ${r.period_end}
Summary: ${r.summary}
Metrics: ${r.metrics}

Live Database Stats:
- Total Prescriptions: ${rxCount}
- Low Stock Items: ${invCount}
- Insurance Claims Total: $${claimTotal}
- Controlled Substance Records: ${csCount}
- Active Patients: ${patientCount}

Provide:
1. Key performance indicators analysis
2. Trend identification
3. Operational efficiency score
4. Revenue optimization opportunities
5. Compliance risk summary
6. Strategic recommendations
7. Benchmarking against industry standards`;
    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy business analytics AI. Provide data-driven insights and strategic recommendations.');
    res.json({ report: r, insights: aiResponse });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
