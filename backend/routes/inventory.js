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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM inventory');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM inventory ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, ndc_code, category, quantity, unit_cost, supplier, reorder_level, expiry_date, location } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory (name, ndc_code, category, quantity, unit_cost, supplier, reorder_level, expiry_date, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, ndc_code, category, quantity || 0, unit_cost || 0, supplier, reorder_level || 10, expiry_date, location]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, ndc_code, category, quantity, unit_cost, supplier, reorder_level, expiry_date, location } = req.body;
    const result = await pool.query(
      `UPDATE inventory SET name=$1, ndc_code=$2, category=$3, quantity=$4, unit_cost=$5, supplier=$6, reorder_level=$7, expiry_date=$8, location=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, ndc_code, category, quantity, unit_cost, supplier, reorder_level, expiry_date, location, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Inventory Analysis - structured JSON
router.post('/ai/analyze', aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name');
    const items = result.rows;

    const lowStock = items.filter(i => i.quantity <= i.reorder_level);
    const summary = items.map(i => `${i.name}: ${i.quantity} units (reorder at ${i.reorder_level}, cost $${i.unit_cost})`).join('\n');

    const prompt = `Analyze this pharmacy inventory:
${summary}

Low Stock Items (${lowStock.length}):
${lowStock.map(i => `- ${i.name}: ${i.quantity}/${i.reorder_level} at $${i.unit_cost}`).join('\n') || 'None'}

Return JSON only: {"reorder_items":[{"drug_name":"","current_qty":0,"recommended_order_qty":0,"reason":""}],"total_estimated_cost":0,"priority":"routine|urgent|critical"}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy inventory management AI. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    await ensureAiResultsTable();
    let aiResultId = null;
    try {
      const saved = await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, entity_id, result) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.id, 'inventory_analyze', null, JSON.stringify(parsed || { raw: aiResponse })]
      );
      aiResultId = saved.rows[0].id;
    } catch (_) {}

    res.json({ inventory_count: items.length, low_stock_count: lowStock.length, analysis: aiResponse, structured: parsed, ai_result_id: aiResultId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
