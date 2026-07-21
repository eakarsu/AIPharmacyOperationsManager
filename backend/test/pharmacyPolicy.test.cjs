const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePrescription, durGate, validateTransition } = require('../domain/pharmacyPolicy');

const prescription = { prescription_ref: 'rx-1', patient_ref: 'patient-1', prescriber_ref: 'provider-1', drug_code: 'ndc-1', drug_data_version: 'v5', jurisdiction: 'NY', written_at: '2026-07-18', quantity: 30, days_supply: 30 };

test('validates complete versioned prescription input', () => {
  assert.deepEqual(validatePrescription(prescription), { quantity: 30, days_supply: 30, written_at: '2026-07-18T00:00:00.000Z' });
});

test('rejects invalid quantity and days supply', () => {
  assert.throws(() => validatePrescription({ ...prescription, quantity: 0 }), /valid quantity/);
  assert.throws(() => validatePrescription({ ...prescription, days_supply: 2.5 }), /valid quantity/);
  assert.throws(() => validatePrescription({ ...prescription, written_at: 'not-a-date' }), /valid written_at/);
});

test('DUR gate enumerates all blocked safety reasons', () => {
  const result = durGate({ allergy: true, interaction: true, duplicate_therapy: false, dose_out_of_range: false, contraindication: false, controlled_substance: true, substitution_authorized: false, cold_chain_ok: false });
  assert.equal(result.blocked, true);
  assert.deepEqual(result.reasons, ['allergy', 'interaction', 'controlled_substance_review', 'substitution_not_authorized', 'cold_chain']);
});

test('DUR gate passes only explicit clear evidence', () => {
  assert.deepEqual(durGate({ allergy: false, interaction: false, duplicate_therapy: false, dose_out_of_range: false, contraindication: false, controlled_substance: false, substitution_authorized: true, cold_chain_ok: true }), { blocked: false, reasons: [] });
});

test('pharmacist approval requires independent cleared DUR evidence', () => {
  assert.throws(() => validateTransition('pharmacist_review', 'approved', { role: 'pharmacist', actorId: 'p1', createdBy: 'p1', durEvidence: 'dur-1', durBlocked: false }), /independent/);
  assert.equal(validateTransition('pharmacist_review', 'approved', { role: 'pharmacist', actorId: 'p2', createdBy: 'p1', durEvidence: 'dur-1', durBlocked: false }), true);
});

test('dispensing and reversals require immutable external evidence', () => {
  assert.throws(() => validateTransition('ready', 'picked_up', { role: 'pharmacist' }), /dispensing evidence/);
  assert.throws(() => validateTransition('delivered', 'reversed', { role: 'pharmacist' }), /reconciliation receipt/);
});
