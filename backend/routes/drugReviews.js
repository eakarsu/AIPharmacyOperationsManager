const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter, parseAIJson } = require('../ai');
const { aiRateLimiter } = require('../middleware/auth');

async function ensureAiResultsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, endpoint VARCHAR(100), entity_id INTEGER, result JSONB, created_at TIMESTAMP DEFAULT NOW())`
  );
}

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

// AI Drug Utilization Review - structured JSON
router.post('/:id/analyze', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drug_reviews WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const drug = result.rows[0];
    const prompt = `Drug Utilization Review:
- Drug: ${drug.drug_name} (${drug.category})
- Indication: ${drug.indication}
- Contraindications: ${drug.contraindications}
- Side Effects: ${drug.side_effects}
- Utilization Rate: ${drug.utilization_rate}%

Return JSON only: {"concerns":[{"type":"utilization|safety|cost|therapeutic","description":"","recommendation":"","severity":"low|moderate|high"}],"score":0,"requires_pharmacist_review":false}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacy AI specializing in Drug Utilization Review. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'drug_review_analyze', drug.id, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({ drug, analysis: aiResponse, structured: parsed, ai_result_id: aiResultId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
