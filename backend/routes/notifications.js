const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notifications WHERE status = 'unread' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, message, type, priority, target_user, module, reference_id } = req.body;
    const result = await pool.query(
      `INSERT INTO notifications (title, message, type, priority, target_user, module, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, message, type || 'info', priority || 'normal', target_user || null, module || null, reference_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE notifications SET status = 'read', read_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/mark-all-read', async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET status = 'read', read_at = NOW() WHERE status = 'unread'");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate system notifications based on current data
router.post('/generate', async (req, res) => {
  try {
    const generated = [];

    // Check for low stock inventory
    const lowStock = await pool.query('SELECT * FROM inventory WHERE quantity <= reorder_level');
    for (const item of lowStock.rows) {
      const exists = await pool.query(
        "SELECT id FROM notifications WHERE reference_id = $1 AND module = 'inventory' AND status = 'unread'",
        [String(item.id)]
      );
      if (exists.rows.length === 0) {
        const n = await pool.query(
          `INSERT INTO notifications (title, message, type, priority, module, reference_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [`Low Stock: ${item.name}`, `${item.name} has ${item.quantity} units remaining (reorder level: ${item.reorder_level})`, 'warning', 'high', 'inventory', String(item.id)]
        );
        generated.push(n.rows[0]);
      }
    }

    // Check for expiring inventory (within 90 days)
    const expiring = await pool.query("SELECT * FROM inventory WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND expiry_date > CURRENT_DATE");
    for (const item of expiring.rows) {
      const exists = await pool.query(
        "SELECT id FROM notifications WHERE reference_id = $1 AND module = 'inventory_expiry' AND status = 'unread'",
        [String(item.id)]
      );
      if (exists.rows.length === 0) {
        const n = await pool.query(
          `INSERT INTO notifications (title, message, type, priority, module, reference_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [`Expiring: ${item.name}`, `${item.name} expires on ${item.expiry_date}. ${item.quantity} units on hand.`, 'warning', 'medium', 'inventory_expiry', String(item.id)]
        );
        generated.push(n.rows[0]);
      }
    }

    // Check for expiring staff licenses (within 90 days)
    const expiringLicenses = await pool.query("SELECT * FROM staff WHERE license_expiry IS NOT NULL AND license_expiry <= CURRENT_DATE + INTERVAL '90 days' AND license_expiry > CURRENT_DATE");
    for (const s of expiringLicenses.rows) {
      const exists = await pool.query(
        "SELECT id FROM notifications WHERE reference_id = $1 AND module = 'staff_license' AND status = 'unread'",
        [String(s.id)]
      );
      if (exists.rows.length === 0) {
        const n = await pool.query(
          `INSERT INTO notifications (title, message, type, priority, module, reference_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [`License Expiring: ${s.first_name} ${s.last_name}`, `${s.role} ${s.first_name} ${s.last_name}'s license (${s.license_number}) expires on ${s.license_expiry}.`, 'alert', 'high', 'staff_license', String(s.id)]
        );
        generated.push(n.rows[0]);
      }
    }

    // Check for open compliance issues
    const openCompliance = await pool.query("SELECT * FROM compliance_records WHERE status = 'open' AND risk_level = 'high'");
    for (const c of openCompliance.rows) {
      const exists = await pool.query(
        "SELECT id FROM notifications WHERE reference_id = $1 AND module = 'compliance' AND status = 'unread'",
        [String(c.id)]
      );
      if (exists.rows.length === 0) {
        const n = await pool.query(
          `INSERT INTO notifications (title, message, type, priority, module, reference_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [`High-Risk Compliance: ${c.regulation_type}`, `${c.description} - Risk: ${c.risk_level}. Action needed: ${c.corrective_action}`, 'alert', 'urgent', 'compliance', String(c.id)]
        );
        generated.push(n.rows[0]);
      }
    }

    res.json({ generated: generated.length, notifications: generated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
