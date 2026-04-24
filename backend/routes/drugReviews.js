const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_reviews ORDER BY review_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_reviews WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { drug_name, category, indication, contraindications, side_effects, utilization_rate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO drug_reviews (drug_name, category, indication, contraindications, side_effects, utilization_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [drug_name, category, indication, contraindications, side_effects, utilization_rate || 0, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { drug_name, category, indication, contraindications, side_effects, utilization_rate, status } = req.body;
    const result = await pool.query(
      `UPDATE drug_reviews SET drug_name=$1, category=$2, indication=$3, contraindications=$4, side_effects=$5, utilization_rate=$6, status=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [drug_name, category, indication, contraindications, side_effects, utilization_rate, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM drug_reviews WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Drug Utilization Review
router.post('/:id/analyze', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_reviews WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const drug = result.rows[0];
    const prompt = `Perform a Drug Utilization Review (DUR) for:
- Drug: ${drug.drug_name}
- Category: ${drug.category}
- Indication: ${drug.indication}
- Known Contraindications: ${drug.contraindications}
- Side Effects: ${drug.side_effects}
- Current Utilization Rate: ${drug.utilization_rate}%

Provide:
1. Therapeutic appropriateness assessment
2. Utilization pattern analysis
3. Cost-effectiveness evaluation
4. Potential over/under-utilization flags
5. Recommendations for optimization
6. Safety monitoring requirements`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacy AI specializing in Drug Utilization Review. Provide evidence-based analysis.');
    res.json({ drug: drug, analysis: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
