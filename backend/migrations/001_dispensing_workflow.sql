BEGIN;

CREATE TABLE IF NOT EXISTS dispensing_cases (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prescription_ref TEXT NOT NULL,
  patient_ref TEXT NOT NULL,
  prescriber_ref TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'received' CHECK (stage IN ('received','patient_matched','dur_review','pharmacist_review','approved','filling','partial_fill','labeled','ready','picked_up','delivered','cancelled','reversed')),
  drug_code TEXT NOT NULL,
  drug_data_version TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  days_supply INTEGER NOT NULL CHECK (days_supply > 0),
  written_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  cancellation_reason TEXT,
  reconciliation_receipt TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, prescription_ref),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS dispensing_dur_reviews (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES dispensing_cases(id),
  terminology_version TEXT NOT NULL,
  patient_profile_version TEXT NOT NULL,
  allergy BOOLEAN NOT NULL,
  interaction BOOLEAN NOT NULL,
  duplicate_therapy BOOLEAN NOT NULL,
  dose_out_of_range BOOLEAN NOT NULL,
  contraindication BOOLEAN NOT NULL,
  controlled_substance BOOLEAN NOT NULL,
  substitution_authorized BOOLEAN,
  cold_chain_ok BOOLEAN,
  blocked BOOLEAN NOT NULL,
  reasons JSONB NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispensing_fills (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES dispensing_cases(id),
  fill_number INTEGER NOT NULL CHECK (fill_number > 0),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  partial BOOLEAN NOT NULL DEFAULT FALSE,
  lot_ref TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  label_version TEXT,
  pharmacist_id TEXT,
  dispensing_evidence JSONB,
  completed_at TIMESTAMPTZ,
  UNIQUE (case_id, fill_number)
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_ref TEXT NOT NULL,
  drug_code TEXT NOT NULL,
  lot_ref TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('received','counted','allocated','dispensed','recalled','returned','wasted','corrected')),
  quantity_delta NUMERIC(14,3) NOT NULL,
  reason TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, event_ref),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS pharmacy_integration_deliveries (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  standard TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','rejected','failed','reconciled','reversed')),
  provider_receipt TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, idempotency_key)
);

CREATE TABLE IF NOT EXISTS dispensing_workflow_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id BIGINT NOT NULL REFERENCES dispensing_cases(id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_dispensing_cases_stage ON dispensing_cases (tenant_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_drug_lot ON pharmacy_inventory_events (tenant_id, drug_code, lot_ref, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_integrations_retry ON pharmacy_integration_deliveries (status, next_attempt_at);

CREATE OR REPLACE FUNCTION reject_dispensing_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'dispensing_workflow_audit is append-only';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'dispensing_workflow_audit_append_only') THEN
    CREATE TRIGGER dispensing_workflow_audit_append_only
      BEFORE UPDATE OR DELETE ON dispensing_workflow_audit
      FOR EACH ROW EXECUTE FUNCTION reject_dispensing_audit_mutation();
  END IF;
END;
$$;

COMMIT;
