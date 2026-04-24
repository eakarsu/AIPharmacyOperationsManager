const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_interactions ORDER BY severity DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_interactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { drug_a, drug_b, severity, interaction_type, description, clinical_effect, management, status } = req.body;
    const result = await pool.query(
      `INSERT INTO drug_interactions (drug_a, drug_b, severity, interaction_type, description, clinical_effect, management, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [drug_a, drug_b, severity || 'moderate', interaction_type, description, clinical_effect, management, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { drug_a, drug_b, severity, interaction_type, description, clinical_effect, management, status } = req.body;
    const result = await pool.query(
      `UPDATE drug_interactions SET drug_a=$1, drug_b=$2, severity=$3, interaction_type=$4, description=$5, clinical_effect=$6, management=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [drug_a, drug_b, severity, interaction_type, description, clinical_effect, management, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM drug_interactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_interactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const item = result.rows[0];
    const prompt = `Analyze this drug-drug interaction in detail:
- Drug A: ${item.drug_a}
- Drug B: ${item.drug_b}
- Severity: ${item.severity}
- Interaction Type: ${item.interaction_type}
- Description: ${item.description}
- Clinical Effect: ${item.clinical_effect}
- Current Management: ${item.management}

Provide:
1. Mechanism of interaction (pharmacokinetic/pharmacodynamic)
2. Clinical significance assessment
3. Risk factors that increase severity
4. Monitoring parameters
5. Alternative therapy recommendations
6. Patient counseling points
7. Evidence level and references`;
    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacology AI expert specializing in drug interactions. Provide evidence-based analysis.');
    res.json({ interaction: item, analysis: aiResponse });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
