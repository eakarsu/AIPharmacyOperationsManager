const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure dispensing_rules table exists
async function ensureDispensingRulesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispensing_rules (
      id SERIAL PRIMARY KEY,
      rule_name VARCHAR(255) NOT NULL,
      drug_class VARCHAR(100),
      max_refills INTEGER DEFAULT 0,
      max_days_supply INTEGER DEFAULT 30,
      controlled_schedule VARCHAR(20),
      requires_id_check BOOLEAN DEFAULT FALSE,
      requires_pmp_check BOOLEAN DEFAULT FALSE,
      notes TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Seed defaults once
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM dispensing_rules');
  if (rows[0].c === 0) {
    await pool.query(`
      INSERT INTO dispensing_rules (rule_name, drug_class, max_refills, max_days_supply, controlled_schedule, requires_id_check, requires_pmp_check, notes)
      VALUES
      ('Opioid Schedule II', 'Analgesic', 0, 30, 'CII', true, true, 'No refills permitted. ID + PMP check required per state law.'),
      ('Benzodiazepine Schedule IV', 'Anxiolytic', 5, 30, 'CIV', true, true, 'Max 5 refills within 6 months. PMP recommended.'),
      ('Stimulant Schedule II', 'Stimulant', 0, 30, 'CII', true, true, 'No refills permitted. Frequent diversion target.'),
      ('Standard Antibiotic', 'Antibiotic', 1, 14, NULL, false, false, 'Limit refills to encourage follow-up.'),
      ('Maintenance Statin', 'Statin', 11, 90, NULL, false, false, '90-day supply allowed; annual lipid panel suggested.')
    `);
  }
}

// 1) VIZ: Prescription volume timeline (daily counts last 30 days)
router.get('/prescription-timeline', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const { rows } = await pool.query(`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count,
             SUM(CASE WHEN status='filled' THEN 1 ELSE 0 END)::int AS filled,
             SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END)::int AS pending,
             SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END)::int AS flagged
      FROM prescriptions
      WHERE created_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY 1
      ORDER BY 1 ASC
    `, [String(days)]);

    // Fill any missing days with zero so timeline is continuous
    const map = new Map(rows.map(r => [r.day, r]));
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push(map.get(key) || { day: key, count: 0, filled: 0, pending: 0, flagged: 0 });
    }
    const total = out.reduce((a, r) => a + (r.count || 0), 0);
    res.json({ days, total, series: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) VIZ: Inventory level heatmap (drug class/category x location)
router.get('/inventory-heatmap', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT COALESCE(NULLIF(category, ''), 'Uncategorized') AS drug_class,
             COALESCE(NULLIF(location, ''), 'Main') AS location,
             SUM(quantity)::int AS total_quantity,
             COUNT(*)::int AS sku_count,
             SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END)::int AS below_reorder
      FROM inventory
      GROUP BY 1, 2
      ORDER BY 1, 2
    `);
    const classes = Array.from(new Set(rows.map(r => r.drug_class))).sort();
    const locations = Array.from(new Set(rows.map(r => r.location))).sort();
    const matrix = classes.map(c => locations.map(l => {
      const cell = rows.find(r => r.drug_class === c && r.location === l);
      return cell ? cell.total_quantity : 0;
    }));
    res.json({ classes, locations, matrix, cells: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) NON-VIZ: Dispensing log PDF (text/PDF stream)
router.get('/dispensing-log-pdf', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { rows } = await pool.query(`
      SELECT id, name, dea_schedule, quantity_dispensed, prescriber_dea, patient_name,
             to_char(dispensed_date, 'YYYY-MM-DD HH24:MI') AS dispensed_at, log_entry, status
      FROM controlled_substances
      ORDER BY dispensed_date DESC NULLS LAST
      LIMIT $1
    `, [limit]);

    // Build a tiny inline PDF (no extra deps needed). Each line is one log entry.
    const header = `PHARMACY DISPENSING LOG\nGenerated: ${new Date().toISOString()}\nEntries: ${rows.length}\n`;
    const body = rows.map((r, i) =>
      `#${i + 1} | ${r.dispensed_at || 'n/a'} | ${r.name} (${r.dea_schedule}) | Qty ${r.quantity_dispensed} | Pt: ${r.patient_name || 'n/a'} | DEA: ${r.prescriber_dea || 'n/a'} | ${r.status}`
    ).join('\n');
    const fullText = header + '\n' + body + '\n';

    // Minimal hand-built PDF document
    const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const lines = fullText.split('\n');
    let textContent = 'BT /F1 9 Tf 36 780 Td 12 TL\n';
    lines.forEach((ln, idx) => {
      textContent += `(${escape(ln)}) Tj T*\n`;
    });
    textContent += 'ET';

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
    objects.push(`<< /Length ${textContent.length} >>\nstream\n${textContent}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="dispensing-log.pdf"');
    res.send(Buffer.from(pdf, 'binary'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) NON-VIZ: Dispensing rules editor (CRUD)
router.get('/dispensing-rules', async (req, res) => {
  try {
    await ensureDispensingRulesTable();
    const { rows } = await pool.query('SELECT * FROM dispensing_rules ORDER BY id ASC');
    res.json({ rules: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispensing-rules', async (req, res) => {
  try {
    await ensureDispensingRulesTable();
    const {
      rule_name, drug_class, max_refills, max_days_supply, controlled_schedule,
      requires_id_check, requires_pmp_check, notes, active
    } = req.body || {};
    if (!rule_name) return res.status(400).json({ error: 'rule_name required' });
    const { rows } = await pool.query(`
      INSERT INTO dispensing_rules
        (rule_name, drug_class, max_refills, max_days_supply, controlled_schedule, requires_id_check, requires_pmp_check, notes, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,true))
      RETURNING *
    `, [
      rule_name, drug_class || null, max_refills || 0, max_days_supply || 30,
      controlled_schedule || null, !!requires_id_check, !!requires_pmp_check,
      notes || null, active
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/dispensing-rules/:id', async (req, res) => {
  try {
    await ensureDispensingRulesTable();
    const {
      rule_name, drug_class, max_refills, max_days_supply, controlled_schedule,
      requires_id_check, requires_pmp_check, notes, active
    } = req.body || {};
    const { rows } = await pool.query(`
      UPDATE dispensing_rules SET
        rule_name = COALESCE($1, rule_name),
        drug_class = COALESCE($2, drug_class),
        max_refills = COALESCE($3, max_refills),
        max_days_supply = COALESCE($4, max_days_supply),
        controlled_schedule = COALESCE($5, controlled_schedule),
        requires_id_check = COALESCE($6, requires_id_check),
        requires_pmp_check = COALESCE($7, requires_pmp_check),
        notes = COALESCE($8, notes),
        active = COALESCE($9, active),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      rule_name, drug_class, max_refills, max_days_supply, controlled_schedule,
      requires_id_check, requires_pmp_check, notes, active, req.params.id
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/dispensing-rules/:id', async (req, res) => {
  try {
    await ensureDispensingRulesTable();
    await pool.query('DELETE FROM dispensing_rules WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
