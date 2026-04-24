const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
    res.json(result.rows);
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

// AI Inventory Analysis
router.post('/ai/analyze', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name');
    const items = result.rows;

    const lowStock = items.filter(i => i.quantity <= i.reorder_level);
    const summary = items.map(i => `${i.name}: ${i.quantity} units (reorder at ${i.reorder_level}, cost $${i.unit_cost})`).join('\n');

    const prompt = `Analyze this pharmacy inventory and provide optimization recommendations:

Current Inventory:
${summary}

Low Stock Items (${lowStock.length}):
${lowStock.map(i => `- ${i.name}: ${i.quantity}/${i.reorder_level}`).join('\n') || 'None'}

Provide:
1. Reorder priority recommendations
2. Cost optimization suggestions
3. Expiry risk assessment
4. Stock level optimization
5. Supplier diversification advice
6. Seasonal demand predictions`;

    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy inventory management AI. Provide data-driven recommendations for inventory optimization.');
    res.json({ inventory_count: items.length, low_stock_count: lowStock.length, analysis: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
