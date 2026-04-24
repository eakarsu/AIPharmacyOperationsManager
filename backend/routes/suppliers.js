const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, license_number, drug_categories, lead_time_days, reliability_score, contract_expiry, status } = req.body;
    const result = await pool.query(
      `INSERT INTO suppliers (name, contact_person, email, phone, address, license_number, drug_categories, lead_time_days, reliability_score, contract_expiry, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, contact_person, email, phone, address, license_number, drug_categories, lead_time_days || 3, reliability_score || 0, contract_expiry, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, license_number, drug_categories, lead_time_days, reliability_score, contract_expiry, status } = req.body;
    const result = await pool.query(
      `UPDATE suppliers SET name=$1, contact_person=$2, email=$3, phone=$4, address=$5, license_number=$6, drug_categories=$7, lead_time_days=$8, reliability_score=$9, contract_expiry=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, contact_person, email, phone, address, license_number, drug_categories, lead_time_days, reliability_score, contract_expiry, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/evaluate', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const s = result.rows[0];
    const prompt = `Evaluate this pharmaceutical supplier:
- Name: ${s.name}
- Contact: ${s.contact_person}
- License: ${s.license_number}
- Drug Categories: ${s.drug_categories}
- Lead Time: ${s.lead_time_days} days
- Reliability Score: ${s.reliability_score}/100
- Contract Expiry: ${s.contract_expiry}
- Status: ${s.status}

Provide:
1. Supplier reliability assessment
2. Risk factors for supply chain disruption
3. Contract renewal recommendations
4. Lead time optimization suggestions
5. Quality assurance evaluation
6. Cost negotiation strategies
7. Diversification recommendations`;
    const aiResponse = await callOpenRouter(prompt, 'You are a pharmaceutical supply chain AI expert. Provide strategic supplier evaluation.');
    res.json({ supplier: s, evaluation: aiResponse });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
