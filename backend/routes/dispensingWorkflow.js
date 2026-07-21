const express = require('express');
const pool = require('../db');
const { validatePrescription, durGate, validateTransition } = require('../domain/pharmacyPolicy');

const router = express.Router();
const tenantFor = (user) => String(user.tenant_id || user.tenantId || user.pharmacy_id || user.id);
const actorFor = (user) => String(user.id);

router.post('/cases', async (req, res) => {
  const client = await pool.connect();
  try {
    const validated = validatePrescription(req.body || {});
    const { prescription_ref, patient_ref, prescriber_ref, drug_code, drug_data_version, jurisdiction, written_at, idempotency_key, correlation_id } = req.body || {};
    if (!idempotency_key || !correlation_id) throw new Error('idempotency_key and correlation_id are required');
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    await client.query('BEGIN');
    let result = await client.query(
      `INSERT INTO dispensing_cases
       (tenant_id, prescription_ref, patient_ref, prescriber_ref, drug_code, drug_data_version, jurisdiction, quantity, days_supply, written_at, created_by, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING *`,
      [tenantId, prescription_ref, patient_ref, prescriber_ref, drug_code, drug_data_version, jurisdiction, validated.quantity, validated.days_supply, validated.written_at, actorId, idempotency_key]
    );
    const inserted = result.rows.length === 1;
    if (!inserted) result = await client.query('SELECT * FROM dispensing_cases WHERE tenant_id=$1 AND idempotency_key=$2', [tenantId, idempotency_key]);
    const dispensingCase = result.rows[0];
    await client.query(
      `INSERT INTO dispensing_workflow_audit (tenant_id, case_id, actor_id, action, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'received','received',$4,$5) ON CONFLICT (tenant_id, correlation_id) DO NOTHING`,
      [tenantId, dispensingCase.id, actorId, JSON.stringify({ prescription_ref, drug_data_version, jurisdiction }), correlation_id]
    );
    await client.query('COMMIT');
    res.status(inserted ? 201 : 200).json(dispensingCase);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/cases/:prescriptionRef/dur', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { expected_version, terminology_version, patient_profile_version, correlation_id } = req.body || {};
    if (!Number.isInteger(expected_version) || !terminology_version || !patient_profile_version || !correlation_id) throw new Error('integer expected_version, terminology_version, patient_profile_version, and correlation_id are required');
    const review = durGate(req.body || {});
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT case_id FROM dispensing_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM dispensing_cases WHERE id=$1', [priorAudit.rows[0].case_id]);
      const existingDur = await client.query('SELECT * FROM dispensing_dur_reviews WHERE case_id=$1 ORDER BY created_at DESC LIMIT 1', [priorAudit.rows[0].case_id]);
      await client.query('COMMIT');
      return res.json({ dispensing_case: existing.rows[0], dur_review: existingDur.rows[0] || null });
    }
    const current = await client.query('SELECT * FROM dispensing_cases WHERE tenant_id=$1 AND prescription_ref=$2 FOR UPDATE', [tenantId, req.params.prescriptionRef]);
    if (!current.rows.length) throw Object.assign(new Error('dispensing case not found'), { status: 404 });
    const dispensingCase = current.rows[0];
    if (dispensingCase.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    validateTransition(dispensingCase.stage, 'dur_review', { role: req.user.role, actorId, createdBy: dispensingCase.created_by });
    const durResult = await client.query(
      `INSERT INTO dispensing_dur_reviews
       (case_id, terminology_version, patient_profile_version, allergy, interaction, duplicate_therapy, dose_out_of_range, contraindication, controlled_substance, substitution_authorized, cold_chain_ok, blocked, reasons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [dispensingCase.id, terminology_version, patient_profile_version, Boolean(req.body.allergy), Boolean(req.body.interaction), Boolean(req.body.duplicate_therapy), Boolean(req.body.dose_out_of_range), Boolean(req.body.contraindication), Boolean(req.body.controlled_substance), req.body.substitution_authorized ?? null, req.body.cold_chain_ok ?? null, review.blocked, JSON.stringify(review.reasons)]
    );
    const updated = await client.query("UPDATE dispensing_cases SET stage='dur_review', version=version+1, updated_at=NOW() WHERE id=$1 RETURNING *", [dispensingCase.id]);
    await client.query(
      `INSERT INTO dispensing_workflow_audit (tenant_id, case_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'dur_review',$4,'dur_review',$5,$6)`,
      [tenantId, dispensingCase.id, actorId, dispensingCase.stage, JSON.stringify({ dur_review_id: durResult.rows[0].id, blocked: review.blocked, reasons: review.reasons, terminology_version, patient_profile_version }), correlation_id]
    );
    await client.query('COMMIT');
    res.json({ dispensing_case: updated.rows[0], dur_review: durResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || (error.code === '23505' ? 409 : 400)).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/cases/:prescriptionRef/transition', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { to_stage, expected_version, correlation_id, evidence: suppliedEvidence = {} } = req.body || {};
    if (to_stage === 'dur_review') throw new Error('use the DUR endpoint for dur_review transitions');
    if (!to_stage || !Number.isInteger(expected_version) || !correlation_id) throw new Error('to_stage, integer expected_version, and correlation_id are required');
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT case_id FROM dispensing_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM dispensing_cases WHERE id=$1', [priorAudit.rows[0].case_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }
    const current = await client.query('SELECT * FROM dispensing_cases WHERE tenant_id=$1 AND prescription_ref=$2 FOR UPDATE', [tenantId, req.params.prescriptionRef]);
    if (!current.rows.length) throw Object.assign(new Error('dispensing case not found'), { status: 404 });
    const dispensingCase = current.rows[0];
    if (dispensingCase.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    const evidence = { ...suppliedEvidence };
    if (to_stage === 'approved') {
      const dur = await client.query('SELECT id, blocked FROM dispensing_dur_reviews WHERE case_id=$1 ORDER BY created_at DESC LIMIT 1', [dispensingCase.id]);
      evidence.durEvidence = dur.rows[0]?.id;
      evidence.durBlocked = dur.rows[0]?.blocked ?? true;
    }
    validateTransition(dispensingCase.stage, to_stage, { ...evidence, role: req.user.role, actorId, createdBy: dispensingCase.created_by });
    const updated = await client.query('UPDATE dispensing_cases SET stage=$1, cancellation_reason=COALESCE($2,cancellation_reason), reconciliation_receipt=COALESCE($3,reconciliation_receipt), version=version+1, updated_at=NOW() WHERE id=$4 RETURNING *', [to_stage, evidence.cancellationReason || null, evidence.reconciliationReceipt || null, dispensingCase.id]);
    await client.query(
      `INSERT INTO dispensing_workflow_audit (tenant_id, case_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'transition',$4,$5,$6,$7)`,
      [tenantId, dispensingCase.id, actorId, dispensingCase.stage, to_stage, JSON.stringify(evidence), correlation_id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
