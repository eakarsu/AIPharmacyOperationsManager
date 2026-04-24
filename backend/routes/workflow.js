const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../ai');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workflow_queue ORDER BY priority DESC, created_at ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workflow_queue WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { patient_name, medication, rx_number, step, assigned_to, priority, notes, due_date, status } = req.body;
    const result = await pool.query(
      `INSERT INTO workflow_queue (patient_name, medication, rx_number, step, assigned_to, priority, notes, due_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_name, medication, rx_number, step || 'intake', assigned_to, priority || 'normal', notes, due_date, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { patient_name, medication, rx_number, step, assigned_to, priority, notes, due_date, status } = req.body;
    const result = await pool.query(
      `UPDATE workflow_queue SET patient_name=$1, medication=$2, rx_number=$3, step=$4, assigned_to=$5, priority=$6, notes=$7, due_date=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [patient_name, medication, rx_number, step, assigned_to, priority, notes, due_date, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workflow_queue WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/optimize', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workflow_queue WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const w = result.rows[0];
    const allItems = await pool.query('SELECT * FROM workflow_queue ORDER BY priority DESC, created_at ASC');
    const queueSummary = allItems.rows.map(i => `${i.rx_number}: ${i.medication} - ${i.step} (${i.priority}, ${i.status})`).join('\n');
    const prompt = `Optimize this pharmacy workflow item and the overall queue:

Current Item:
- Patient: ${w.patient_name}
- Medication: ${w.medication}
- Rx#: ${w.rx_number}
- Current Step: ${w.step}
- Assigned To: ${w.assigned_to}
- Priority: ${w.priority}
- Notes: ${w.notes}
- Due Date: ${w.due_date}
- Status: ${w.status}

Full Queue (${allItems.rows.length} items):
${queueSummary}

Provide:
1. Priority assessment for this item
2. Bottleneck identification in the queue
3. Workflow step optimization
4. Staff assignment recommendations
5. Estimated completion time
6. Risk of delays or errors
7. Queue rebalancing suggestions`;
    const aiResponse = await callOpenRouter(prompt, 'You are a pharmacy workflow optimization AI. Provide actionable recommendations for efficient prescription processing.');
    res.json({ workflow: w, optimization: aiResponse });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
