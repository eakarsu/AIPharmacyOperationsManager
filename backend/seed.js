const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') throw new Error('set ALLOW_DESTRUCTIVE_SEED=true to run the destructive demo seed explicitly');
  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword) throw new Error('SEED_USER_PASSWORD is required');
  console.log('Seeding database...');

  // Create tables
  await pool.query(`
    DROP TABLE IF EXISTS shift_schedule CASCADE;
    DROP TABLE IF EXISTS financial_transactions CASCADE;
    DROP TABLE IF EXISTS prescription_transfers CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS audit_log CASCADE;
    DROP TABLE IF EXISTS reports CASCADE;
    DROP TABLE IF EXISTS workflow_queue CASCADE;
    DROP TABLE IF EXISTS adverse_events CASCADE;
    DROP TABLE IF EXISTS staff CASCADE;
    DROP TABLE IF EXISTS suppliers CASCADE;
    DROP TABLE IF EXISTS drug_interactions CASCADE;
    DROP TABLE IF EXISTS compliance_records CASCADE;
    DROP TABLE IF EXISTS controlled_substances CASCADE;
    DROP TABLE IF EXISTS insurance_claims CASCADE;
    DROP TABLE IF EXISTS inventory CASCADE;
    DROP TABLE IF EXISTS drug_reviews CASCADE;
    DROP TABLE IF EXISTS prescriptions CASCADE;
    DROP TABLE IF EXISTS patients CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'pharmacist',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE prescriptions (
      id SERIAL PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL,
      medication VARCHAR(255) NOT NULL,
      dosage VARCHAR(100) NOT NULL,
      frequency VARCHAR(100) NOT NULL,
      prescriber VARCHAR(255) NOT NULL,
      refills INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE drug_reviews (
      id SERIAL PRIMARY KEY,
      drug_name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      indication TEXT NOT NULL,
      contraindications TEXT,
      side_effects TEXT,
      utilization_rate DECIMAL(5,2) DEFAULT 0,
      review_date TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE inventory (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      ndc_code VARCHAR(20),
      category VARCHAR(100),
      quantity INTEGER DEFAULT 0,
      unit_cost DECIMAL(10,2) DEFAULT 0,
      supplier VARCHAR(255),
      reorder_level INTEGER DEFAULT 10,
      expiry_date DATE,
      location VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE insurance_claims (
      id SERIAL PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL,
      insurance_provider VARCHAR(255) NOT NULL,
      policy_number VARCHAR(50) NOT NULL,
      medication VARCHAR(255) NOT NULL,
      quantity INTEGER DEFAULT 0,
      amount DECIMAL(10,2) DEFAULT 0,
      diagnosis_code VARCHAR(20),
      ndc_code VARCHAR(20),
      submitted_date TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'submitted',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE controlled_substances (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      dea_schedule VARCHAR(20) NOT NULL,
      quantity_on_hand INTEGER DEFAULT 0,
      quantity_dispensed INTEGER DEFAULT 0,
      prescriber_dea VARCHAR(20),
      patient_name VARCHAR(255),
      dispensed_date TIMESTAMP DEFAULT NOW(),
      log_entry TEXT,
      status VARCHAR(50) DEFAULT 'logged',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE patients (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      date_of_birth DATE,
      phone VARCHAR(20),
      email VARCHAR(255),
      insurance_provider VARCHAR(255),
      policy_number VARCHAR(50),
      allergies TEXT,
      current_medications TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE compliance_records (
      id SERIAL PRIMARY KEY,
      regulation_type VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      audit_date DATE DEFAULT CURRENT_DATE,
      auditor VARCHAR(255),
      findings TEXT,
      risk_level VARCHAR(20) DEFAULT 'medium',
      corrective_action TEXT,
      status VARCHAR(50) DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE drug_interactions (
      id SERIAL PRIMARY KEY,
      drug_a VARCHAR(255) NOT NULL,
      drug_b VARCHAR(255) NOT NULL,
      severity VARCHAR(20) DEFAULT 'moderate',
      interaction_type VARCHAR(100),
      description TEXT,
      clinical_effect TEXT,
      management TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(20),
      address TEXT,
      license_number VARCHAR(50),
      drug_categories TEXT,
      lead_time_days INTEGER DEFAULT 3,
      reliability_score DECIMAL(5,2) DEFAULT 0,
      contract_expiry DATE,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE staff (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      license_number VARCHAR(50),
      license_expiry DATE,
      phone VARCHAR(20),
      email VARCHAR(255),
      hire_date DATE,
      certifications TEXT,
      shift_schedule VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE adverse_events (
      id SERIAL PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL,
      medication VARCHAR(255) NOT NULL,
      event_date DATE DEFAULT CURRENT_DATE,
      event_description TEXT NOT NULL,
      severity VARCHAR(20) DEFAULT 'moderate',
      outcome TEXT,
      reporter VARCHAR(255),
      report_type VARCHAR(50) DEFAULT 'initial',
      meddra_code VARCHAR(20),
      causality VARCHAR(50),
      status VARCHAR(50) DEFAULT 'reported',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE workflow_queue (
      id SERIAL PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL,
      medication VARCHAR(255) NOT NULL,
      rx_number VARCHAR(20) NOT NULL,
      step VARCHAR(50) DEFAULT 'intake',
      assigned_to VARCHAR(255),
      priority VARCHAR(20) DEFAULT 'normal',
      notes TEXT,
      due_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE reports (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      report_type VARCHAR(100) NOT NULL,
      period_start DATE,
      period_end DATE,
      generated_date TIMESTAMP DEFAULT NOW(),
      generated_by VARCHAR(255),
      summary TEXT,
      metrics TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE audit_log (
      id SERIAL PRIMARY KEY,
      user_name VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      module VARCHAR(100) NOT NULL,
      record_id VARCHAR(50),
      details TEXT,
      ip_address VARCHAR(45),
      timestamp TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      priority VARCHAR(20) DEFAULT 'normal',
      target_user VARCHAR(255),
      module VARCHAR(100),
      reference_id VARCHAR(50),
      status VARCHAR(20) DEFAULT 'unread',
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE prescription_transfers (
      id SERIAL PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL,
      medication VARCHAR(255) NOT NULL,
      rx_number VARCHAR(50) NOT NULL,
      from_pharmacy VARCHAR(255) NOT NULL,
      from_phone VARCHAR(20),
      to_pharmacy VARCHAR(255) NOT NULL,
      to_phone VARCHAR(20),
      transfer_type VARCHAR(20) DEFAULT 'outgoing',
      pharmacist_name VARCHAR(255) NOT NULL,
      refills_remaining INTEGER DEFAULT 0,
      original_fill_date DATE,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE financial_transactions (
      id SERIAL PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cash',
      reference_number VARCHAR(50),
      medication VARCHAR(255),
      insurance_provider VARCHAR(255),
      description TEXT,
      processed_by VARCHAR(255),
      transaction_date TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE shift_schedule (
      id SERIAL PRIMARY KEY,
      staff_name VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      shift_date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      shift_type VARCHAR(50) DEFAULT 'regular',
      location VARCHAR(255) DEFAULT 'Main Pharmacy',
      notes TEXT,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed users
  const hash = await bcrypt.hash(seedPassword, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES
     ('Dr. Sarah Johnson', 'admin@pharmacy.example', $1, 'admin'),
     ('James Wilson', 'pharmacist@pharmacy.example', $1, 'pharmacist'),
     ('Emily Chen', 'tech@pharmacy.example', $1, 'technician')`,
    [hash]
  );

  // Seed prescriptions (15+)
  await pool.query(`
    INSERT INTO prescriptions (patient_name, medication, dosage, frequency, prescriber, refills, status) VALUES
    ('John Smith', 'Lisinopril', '10mg', 'Once daily', 'Dr. Martinez', 3, 'verified'),
    ('Maria Garcia', 'Metformin', '500mg', 'Twice daily', 'Dr. Thompson', 5, 'verified'),
    ('Robert Brown', 'Atorvastatin', '20mg', 'Once daily at bedtime', 'Dr. Williams', 6, 'pending'),
    ('Lisa Anderson', 'Amoxicillin', '500mg', 'Three times daily', 'Dr. Davis', 0, 'verified'),
    ('David Wilson', 'Omeprazole', '20mg', 'Once daily before breakfast', 'Dr. Martinez', 3, 'pending'),
    ('Jennifer Taylor', 'Levothyroxine', '50mcg', 'Once daily on empty stomach', 'Dr. Chen', 11, 'verified'),
    ('Michael Lee', 'Amlodipine', '5mg', 'Once daily', 'Dr. Thompson', 2, 'flagged'),
    ('Sarah Davis', 'Sertraline', '100mg', 'Once daily', 'Dr. Williams', 5, 'verified'),
    ('James Martinez', 'Gabapentin', '300mg', 'Three times daily', 'Dr. Davis', 2, 'pending'),
    ('Patricia White', 'Metoprolol', '25mg', 'Twice daily', 'Dr. Chen', 4, 'verified'),
    ('Christopher Harris', 'Losartan', '50mg', 'Once daily', 'Dr. Martinez', 6, 'verified'),
    ('Amanda Clark', 'Prednisone', '10mg', '5-day taper', 'Dr. Thompson', 0, 'pending'),
    ('Daniel Lewis', 'Ciprofloxacin', '500mg', 'Twice daily for 7 days', 'Dr. Williams', 0, 'flagged'),
    ('Michelle Robinson', 'Fluoxetine', '20mg', 'Once daily', 'Dr. Davis', 5, 'verified'),
    ('Kevin Walker', 'Hydrochlorothiazide', '25mg', 'Once daily', 'Dr. Chen', 6, 'verified'),
    ('Stephanie Hall', 'Pantoprazole', '40mg', 'Once daily', 'Dr. Martinez', 3, 'pending');
  `);

  // Seed drug reviews (15+)
  await pool.query(`
    INSERT INTO drug_reviews (drug_name, category, indication, contraindications, side_effects, utilization_rate, status) VALUES
    ('Lisinopril', 'ACE Inhibitor', 'Hypertension, Heart Failure', 'Pregnancy, Angioedema history, Bilateral renal artery stenosis', 'Dry cough, Hyperkalemia, Dizziness', 85.5, 'reviewed'),
    ('Metformin', 'Biguanide', 'Type 2 Diabetes', 'Renal impairment (eGFR <30), Metabolic acidosis', 'GI upset, Lactic acidosis (rare), B12 deficiency', 92.3, 'reviewed'),
    ('Atorvastatin', 'HMG-CoA Reductase Inhibitor', 'Hyperlipidemia, Cardiovascular prevention', 'Active liver disease, Pregnancy', 'Myalgia, Elevated liver enzymes, Rhabdomyolysis (rare)', 78.1, 'pending'),
    ('Amoxicillin', 'Penicillin Antibiotic', 'Bacterial infections', 'Penicillin allergy, Mononucleosis', 'Diarrhea, Rash, Nausea', 65.4, 'reviewed'),
    ('Omeprazole', 'Proton Pump Inhibitor', 'GERD, Peptic ulcer', 'Hypersensitivity to PPIs', 'Headache, C. diff risk, Magnesium depletion', 88.7, 'reviewed'),
    ('Levothyroxine', 'Thyroid Hormone', 'Hypothyroidism', 'Uncorrected adrenal insufficiency, Acute MI', 'Palpitations, Weight loss, Tremor', 94.2, 'reviewed'),
    ('Amlodipine', 'Calcium Channel Blocker', 'Hypertension, Angina', 'Severe aortic stenosis', 'Peripheral edema, Flushing, Dizziness', 72.8, 'pending'),
    ('Sertraline', 'SSRI', 'Depression, Anxiety, OCD, PTSD', 'MAO inhibitor use, Pimozide use', 'Nausea, Insomnia, Sexual dysfunction', 81.5, 'reviewed'),
    ('Gabapentin', 'Anticonvulsant', 'Neuropathic pain, Seizures', 'Hypersensitivity', 'Drowsiness, Dizziness, Ataxia', 76.3, 'flagged'),
    ('Metoprolol', 'Beta Blocker', 'Hypertension, Heart failure, Post-MI', 'Severe bradycardia, Heart block, Cardiogenic shock', 'Fatigue, Bradycardia, Cold extremities', 83.9, 'reviewed'),
    ('Losartan', 'ARB', 'Hypertension, Diabetic nephropathy', 'Pregnancy, Bilateral renal artery stenosis', 'Hyperkalemia, Dizziness, Renal impairment', 69.7, 'reviewed'),
    ('Prednisone', 'Corticosteroid', 'Inflammation, Autoimmune conditions', 'Systemic fungal infections, Live vaccines', 'Weight gain, Hyperglycemia, Osteoporosis', 58.2, 'pending'),
    ('Ciprofloxacin', 'Fluoroquinolone', 'Bacterial infections, UTI', 'Tendon disorders, Myasthenia gravis, QT prolongation', 'Tendinopathy, GI upset, Photosensitivity', 45.6, 'flagged'),
    ('Fluoxetine', 'SSRI', 'Depression, OCD, Panic disorder', 'MAO inhibitor use, Thioridazine use', 'Insomnia, Anxiety, Nausea', 77.8, 'reviewed'),
    ('Hydrochlorothiazide', 'Thiazide Diuretic', 'Hypertension, Edema', 'Anuria, Sulfonamide allergy', 'Hypokalemia, Hyperuricemia, Photosensitivity', 71.4, 'reviewed'),
    ('Pantoprazole', 'Proton Pump Inhibitor', 'GERD, Zollinger-Ellison', 'Rilpivirine use', 'Headache, Diarrhea, Joint pain', 82.1, 'pending');
  `);

  // Seed inventory (15+)
  await pool.query(`
    INSERT INTO inventory (name, ndc_code, category, quantity, unit_cost, supplier, reorder_level, expiry_date, location) VALUES
    ('Lisinopril 10mg', '68180-0513-01', 'ACE Inhibitor', 500, 0.15, 'McKesson', 100, '2027-06-15', 'Shelf A1'),
    ('Metformin 500mg', '00093-7212-01', 'Antidiabetic', 800, 0.08, 'Cardinal Health', 200, '2027-09-30', 'Shelf A2'),
    ('Atorvastatin 20mg', '00378-3952-77', 'Statin', 350, 0.22, 'AmerisourceBergen', 75, '2027-03-20', 'Shelf A3'),
    ('Amoxicillin 500mg', '65862-0015-01', 'Antibiotic', 600, 0.12, 'McKesson', 150, '2026-12-15', 'Shelf B1'),
    ('Omeprazole 20mg', '62175-0110-37', 'PPI', 450, 0.18, 'Cardinal Health', 100, '2027-08-10', 'Shelf B2'),
    ('Levothyroxine 50mcg', '00378-1805-01', 'Thyroid', 300, 0.35, 'AmerisourceBergen', 50, '2027-01-25', 'Shelf B3'),
    ('Amlodipine 5mg', '68180-0517-01', 'CCB', 420, 0.10, 'McKesson', 100, '2027-11-30', 'Shelf C1'),
    ('Sertraline 100mg', '00093-7198-05', 'SSRI', 280, 0.28, 'Cardinal Health', 60, '2027-05-20', 'Shelf C2'),
    ('Gabapentin 300mg', '27241-0049-10', 'Anticonvulsant', 550, 0.14, 'AmerisourceBergen', 120, '2027-07-15', 'Shelf C3'),
    ('Metoprolol 25mg', '00378-0222-01', 'Beta Blocker', 380, 0.11, 'McKesson', 80, '2027-04-10', 'Shelf D1'),
    ('Losartan 50mg', '68180-0517-09', 'ARB', 5, 0.19, 'Cardinal Health', 90, '2027-10-25', 'Shelf D2'),
    ('Insulin Glargine', '00088-5020-01', 'Insulin', 45, 85.50, 'AmerisourceBergen', 20, '2026-08-30', 'Refrigerator 1'),
    ('Albuterol Inhaler', '00173-0682-20', 'Bronchodilator', 65, 12.75, 'McKesson', 25, '2027-02-15', 'Shelf E1'),
    ('Prednisone 10mg', '00054-4728-25', 'Corticosteroid', 200, 0.09, 'Cardinal Health', 50, '2027-06-30', 'Shelf E2'),
    ('Azithromycin 250mg', '00093-7169-56', 'Antibiotic', 8, 0.45, 'AmerisourceBergen', 40, '2026-11-20', 'Shelf E3'),
    ('Fluoxetine 20mg', '00378-4220-10', 'SSRI', 310, 0.16, 'McKesson', 70, '2027-08-25', 'Shelf F1');
  `);

  // Seed insurance claims (15+)
  await pool.query(`
    INSERT INTO insurance_claims (patient_name, insurance_provider, policy_number, medication, quantity, amount, diagnosis_code, ndc_code, status) VALUES
    ('John Smith', 'Blue Cross Blue Shield', 'BCBS-12345', 'Lisinopril 10mg', 30, 45.00, 'I10', '68180-0513-01', 'approved'),
    ('Maria Garcia', 'Aetna', 'AET-67890', 'Metformin 500mg', 60, 32.00, 'E11.9', '00093-7212-01', 'approved'),
    ('Robert Brown', 'United Healthcare', 'UHC-11111', 'Atorvastatin 20mg', 30, 68.50, 'E78.5', '00378-3952-77', 'pending'),
    ('Lisa Anderson', 'Cigna', 'CIG-22222', 'Amoxicillin 500mg', 21, 28.00, 'J02.9', '65862-0015-01', 'approved'),
    ('David Wilson', 'Humana', 'HUM-33333', 'Omeprazole 20mg', 30, 55.00, 'K21.0', '62175-0110-37', 'denied'),
    ('Jennifer Taylor', 'Blue Cross Blue Shield', 'BCBS-44444', 'Levothyroxine 50mcg', 30, 42.00, 'E03.9', '00378-1805-01', 'approved'),
    ('Michael Lee', 'Aetna', 'AET-55555', 'Amlodipine 5mg', 30, 38.00, 'I10', '68180-0517-01', 'submitted'),
    ('Sarah Davis', 'United Healthcare', 'UHC-66666', 'Sertraline 100mg', 30, 72.00, 'F32.1', '00093-7198-05', 'approved'),
    ('James Martinez', 'Cigna', 'CIG-77777', 'Gabapentin 300mg', 90, 95.00, 'G89.29', '27241-0049-10', 'under_review'),
    ('Patricia White', 'Medicare Part D', 'MED-88888', 'Metoprolol 25mg', 60, 28.00, 'I10', '00378-0222-01', 'approved'),
    ('Christopher Harris', 'Humana', 'HUM-99999', 'Losartan 50mg', 30, 52.00, 'I10', '68180-0517-09', 'pending'),
    ('Amanda Clark', 'Blue Cross Blue Shield', 'BCBS-10101', 'Prednisone 10mg', 21, 15.00, 'M79.3', '00054-4728-25', 'approved'),
    ('Daniel Lewis', 'Aetna', 'AET-20202', 'Ciprofloxacin 500mg', 14, 48.00, 'N39.0', '00093-7160-01', 'denied'),
    ('Michelle Robinson', 'United Healthcare', 'UHC-30303', 'Fluoxetine 20mg', 30, 58.00, 'F33.0', '00378-4220-10', 'approved'),
    ('Kevin Walker', 'Cigna', 'CIG-40404', 'HCTZ 25mg', 30, 22.00, 'I10', '00378-0035-01', 'submitted'),
    ('Stephanie Hall', 'Medicare Part D', 'MED-50505', 'Insulin Glargine', 1, 285.00, 'E11.9', '00088-5020-01', 'under_review');
  `);

  // Seed controlled substances (15+)
  await pool.query(`
    INSERT INTO controlled_substances (name, dea_schedule, quantity_on_hand, quantity_dispensed, prescriber_dea, patient_name, dispensed_date, log_entry, status) VALUES
    ('Hydrocodone/APAP 5/325', 'Schedule II', 500, 30, 'AM1234567', 'John Smith', '2026-03-15', 'Routine fill - chronic pain management', 'logged'),
    ('Oxycodone 5mg', 'Schedule II', 200, 60, 'BT9876543', 'Robert Brown', '2026-03-14', 'Post-surgical pain - verified with surgeon', 'logged'),
    ('Alprazolam 0.5mg', 'Schedule IV', 800, 30, 'CM5555555', 'Lisa Anderson', '2026-03-13', 'Anxiety disorder - monthly refill', 'logged'),
    ('Methylphenidate 20mg', 'Schedule II', 300, 30, 'DW4444444', 'Michael Lee', '2026-03-12', 'ADHD management - monthly fill', 'logged'),
    ('Lorazepam 1mg', 'Schedule IV', 600, 30, 'AM1234567', 'Sarah Davis', '2026-03-11', 'Anxiety management - psychiatrist referral', 'flagged'),
    ('Adderall XR 20mg', 'Schedule II', 250, 30, 'BT9876543', 'James Martinez', '2026-03-10', 'ADHD - quarterly review due', 'logged'),
    ('Diazepam 5mg', 'Schedule IV', 400, 20, 'CM5555555', 'Patricia White', '2026-03-09', 'Muscle spasm - short term use', 'logged'),
    ('Morphine Sulfate ER 15mg', 'Schedule II', 100, 60, 'DW4444444', 'Christopher Harris', '2026-03-08', 'Chronic pain - palliative care', 'logged'),
    ('Zolpidem 10mg', 'Schedule IV', 350, 30, 'AM1234567', 'Amanda Clark', '2026-03-07', 'Insomnia - 30 day supply', 'logged'),
    ('Codeine/APAP 30/300', 'Schedule III', 450, 20, 'BT9876543', 'Daniel Lewis', '2026-03-06', 'Moderate pain - dental procedure', 'logged'),
    ('Fentanyl Patch 25mcg/hr', 'Schedule II', 50, 5, 'CM5555555', 'Michelle Robinson', '2026-03-05', 'Cancer pain management - oncology referral', 'flagged'),
    ('Clonazepam 1mg', 'Schedule IV', 550, 30, 'DW4444444', 'Kevin Walker', '2026-03-04', 'Seizure disorder - neurologist prescribed', 'logged'),
    ('Tramadol 50mg', 'Schedule IV', 700, 30, 'AM1234567', 'Stephanie Hall', '2026-03-03', 'Moderate pain - step-down from oxycodone', 'logged'),
    ('Testosterone Cypionate 200mg/mL', 'Schedule III', 80, 1, 'BT9876543', 'David Wilson', '2026-03-02', 'Hormone replacement - endocrinologist', 'logged'),
    ('Pregabalin 75mg', 'Schedule V', 400, 60, 'CM5555555', 'Jennifer Taylor', '2026-03-01', 'Fibromyalgia - monthly refill', 'logged'),
    ('Dextroamphetamine 10mg', 'Schedule II', 180, 30, 'DW4444444', 'Maria Garcia', '2026-02-28', 'ADHD management - titration phase', 'logged');
  `);

  // Seed patients (15+)
  await pool.query(`
    INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, insurance_provider, policy_number, allergies, current_medications) VALUES
    ('John', 'Smith', '1965-03-15', '555-0101', 'john.smith@email.com', 'Blue Cross Blue Shield', 'BCBS-12345', 'Penicillin', 'Lisinopril 10mg, Hydrocodone/APAP 5/325'),
    ('Maria', 'Garcia', '1978-07-22', '555-0102', 'maria.garcia@email.com', 'Aetna', 'AET-67890', 'None', 'Metformin 500mg, Dextroamphetamine 10mg'),
    ('Robert', 'Brown', '1955-11-08', '555-0103', 'robert.brown@email.com', 'United Healthcare', 'UHC-11111', 'Sulfa drugs', 'Atorvastatin 20mg, Oxycodone 5mg'),
    ('Lisa', 'Anderson', '1990-01-30', '555-0104', 'lisa.anderson@email.com', 'Cigna', 'CIG-22222', 'None', 'Amoxicillin 500mg, Alprazolam 0.5mg'),
    ('David', 'Wilson', '1982-05-18', '555-0105', 'david.wilson@email.com', 'Humana', 'HUM-33333', 'Aspirin', 'Omeprazole 20mg, Testosterone Cypionate'),
    ('Jennifer', 'Taylor', '1972-09-12', '555-0106', 'jennifer.taylor@email.com', 'Blue Cross Blue Shield', 'BCBS-44444', 'Iodine', 'Levothyroxine 50mcg, Pregabalin 75mg'),
    ('Michael', 'Lee', '1988-12-03', '555-0107', 'michael.lee@email.com', 'Aetna', 'AET-55555', 'None', 'Amlodipine 5mg, Methylphenidate 20mg'),
    ('Sarah', 'Davis', '1995-04-25', '555-0108', 'sarah.davis@email.com', 'United Healthcare', 'UHC-66666', 'Latex', 'Sertraline 100mg, Lorazepam 1mg'),
    ('James', 'Martinez', '1960-08-14', '555-0109', 'james.martinez@email.com', 'Cigna', 'CIG-77777', 'Codeine', 'Gabapentin 300mg, Adderall XR 20mg'),
    ('Patricia', 'White', '1948-02-28', '555-0110', 'patricia.white@email.com', 'Medicare Part D', 'MED-88888', 'None', 'Metoprolol 25mg, Diazepam 5mg'),
    ('Christopher', 'Harris', '1970-06-20', '555-0111', 'chris.harris@email.com', 'Humana', 'HUM-99999', 'NSAIDs', 'Losartan 50mg, Morphine Sulfate ER 15mg'),
    ('Amanda', 'Clark', '1985-10-05', '555-0112', 'amanda.clark@email.com', 'Blue Cross Blue Shield', 'BCBS-10101', 'Shellfish', 'Prednisone 10mg, Zolpidem 10mg'),
    ('Daniel', 'Lewis', '1992-03-17', '555-0113', 'daniel.lewis@email.com', 'Aetna', 'AET-20202', 'Erythromycin', 'Ciprofloxacin 500mg, Codeine/APAP'),
    ('Michelle', 'Robinson', '1958-11-22', '555-0114', 'michelle.robinson@email.com', 'United Healthcare', 'UHC-30303', 'None', 'Fluoxetine 20mg, Fentanyl Patch 25mcg/hr'),
    ('Kevin', 'Walker', '1975-07-09', '555-0115', 'kevin.walker@email.com', 'Cigna', 'CIG-40404', 'Penicillin, Sulfa', 'HCTZ 25mg, Clonazepam 1mg'),
    ('Stephanie', 'Hall', '1968-01-14', '555-0116', 'stephanie.hall@email.com', 'Medicare Part D', 'MED-50505', 'Gluten', 'Pantoprazole 40mg, Tramadol 50mg');
  `);

  // Seed compliance records (15+)
  await pool.query(`
    INSERT INTO compliance_records (regulation_type, description, audit_date, auditor, findings, risk_level, corrective_action, status) VALUES
    ('DEA', 'Annual controlled substance inventory count', '2026-01-15', 'State Inspector J. Reynolds', 'All Schedule II counts within acceptable variance (±0.5%)', 'low', 'Continue current counting protocols', 'closed'),
    ('State Board', 'Pharmacist license verification audit', '2026-02-01', 'Board Auditor M. Thompson', 'All pharmacist licenses current and verified', 'low', 'None required - maintain renewal calendar', 'closed'),
    ('HIPAA', 'Patient data privacy assessment', '2026-02-15', 'Compliance Officer K. Patel', 'Minor finding: shared workstation auto-lock timeout set to 15min', 'medium', 'Reduce auto-lock timeout to 5 minutes on all workstations', 'in_progress'),
    ('FDA', 'Drug recall compliance check', '2026-03-01', 'FDA Inspector L. Chen', 'Recalled lot of Losartan found on shelf - 3 units', 'high', 'Immediate removal and patient notification required', 'open'),
    ('DEA', 'Controlled substance disposal documentation', '2026-01-20', 'DEA Agent R. Morrison', 'Disposal records complete but missing witness signature on 2 entries', 'medium', 'Retrain staff on dual-signature requirement', 'in_progress'),
    ('State Board', 'Prescription labeling compliance', '2026-02-10', 'State Inspector S. Williams', 'All labels meet state requirements', 'low', 'None required', 'closed'),
    ('USP 797', 'Sterile compounding area inspection', '2026-01-25', 'Accreditation Surveyor D. Kim', 'Air quality test passed, surface contamination within limits', 'low', 'Schedule next quarterly testing', 'closed'),
    ('USP 800', 'Hazardous drug handling assessment', '2026-02-20', 'Safety Officer A. Brown', 'PPE compliance at 92% - target is 100%', 'medium', 'Mandatory PPE refresher training for all staff', 'in_progress'),
    ('DEA', 'PDMP reporting verification', '2026-03-05', 'DEA Compliance Officer', 'All controlled substance dispensing properly reported to state PDMP', 'low', 'Continue automated reporting', 'closed'),
    ('OSHA', 'Workplace safety inspection', '2026-02-28', 'OSHA Inspector T. Garcia', 'Eyewash station in compounding area needs maintenance', 'medium', 'Schedule maintenance within 30 days', 'open'),
    ('State Board', 'Pharmacy technician ratio compliance', '2026-03-10', 'Board Auditor M. Thompson', 'Technician-to-pharmacist ratio exceeds limit on 2 shifts', 'high', 'Adjust scheduling to maintain 3:1 ratio', 'open'),
    ('CMS', 'Medicare Part D audit', '2026-01-30', 'CMS Auditor J. Anderson', 'Documentation complete for all sampled claims', 'low', 'None required', 'closed'),
    ('DEA', 'Biennial DEA registration renewal', '2026-03-15', 'Internal Compliance Team', 'DEA registration current through 2028', 'low', 'Set reminder for 2028 renewal', 'closed'),
    ('HIPAA', 'Business Associate Agreement review', '2026-02-05', 'Legal Counsel P. Nguyen', 'Two vendor BAAs expired and need renewal', 'high', 'Contact vendors for BAA renewal within 14 days', 'open'),
    ('State Board', 'Continuing education tracking', '2026-03-12', 'HR Manager C. Foster', 'One pharmacist 2 CE credits short of requirement', 'medium', 'Pharmacist to complete CE by end of quarter', 'in_progress'),
    ('FDA', 'REMS program compliance', '2026-02-25', 'FDA Compliance Team', 'All REMS medications properly documented and dispensed', 'low', 'Continue current REMS protocols', 'closed');
  `);

  // Seed drug interactions (16)
  await pool.query(`
    INSERT INTO drug_interactions (drug_a, drug_b, severity, interaction_type, description, clinical_effect, management, status) VALUES
    ('Warfarin', 'Aspirin', 'major', 'Pharmacodynamic', 'Additive anticoagulant effect', 'Increased bleeding risk', 'Monitor INR closely, consider alternatives', 'active'),
    ('Lisinopril', 'Spironolactone', 'major', 'Pharmacodynamic', 'Dual RAAS blockade with potassium-sparing diuretic', 'Hyperkalemia risk', 'Monitor potassium levels every 2-4 weeks', 'active'),
    ('Metformin', 'IV Contrast Dye', 'major', 'Pharmacokinetic', 'Contrast media may reduce renal function', 'Lactic acidosis risk', 'Hold metformin 48h before/after contrast', 'active'),
    ('Sertraline', 'Tramadol', 'major', 'Pharmacodynamic', 'Serotonergic synergy', 'Serotonin syndrome risk', 'Avoid combination if possible', 'active'),
    ('Ciprofloxacin', 'Tizanidine', 'contraindicated', 'Pharmacokinetic', 'CYP1A2 inhibition by ciprofloxacin', 'Extreme hypotension and sedation', 'Absolutely contraindicated - use alternative antibiotic', 'active'),
    ('Simvastatin', 'Amiodarone', 'major', 'Pharmacokinetic', 'CYP3A4 inhibition increases statin levels', 'Rhabdomyolysis risk', 'Limit simvastatin to 20mg/day', 'active'),
    ('Fluoxetine', 'MAO Inhibitors', 'contraindicated', 'Pharmacodynamic', 'Serotonergic crisis', 'Serotonin syndrome - potentially fatal', '14-day washout required between medications', 'active'),
    ('Methotrexate', 'NSAIDs', 'major', 'Pharmacokinetic', 'Reduced renal clearance of methotrexate', 'Methotrexate toxicity', 'Avoid NSAIDs or monitor methotrexate levels', 'active'),
    ('Digoxin', 'Amiodarone', 'major', 'Pharmacokinetic', 'Reduced digoxin clearance', 'Digoxin toxicity', 'Reduce digoxin dose by 50%, monitor levels', 'active'),
    ('Clopidogrel', 'Omeprazole', 'moderate', 'Pharmacokinetic', 'CYP2C19 inhibition reduces clopidogrel activation', 'Reduced antiplatelet effect', 'Use pantoprazole instead of omeprazole', 'active'),
    ('Levothyroxine', 'Calcium Carbonate', 'moderate', 'Pharmacokinetic', 'Calcium chelates levothyroxine in GI tract', 'Reduced thyroid hormone absorption', 'Separate administration by 4 hours', 'active'),
    ('Amlodipine', 'Simvastatin', 'moderate', 'Pharmacokinetic', 'CYP3A4 competition', 'Increased statin exposure', 'Limit simvastatin to 20mg with amlodipine', 'active'),
    ('Gabapentin', 'Morphine', 'moderate', 'Pharmacodynamic', 'Additive CNS depression', 'Respiratory depression risk', 'Start gabapentin at lower dose, monitor respiratory status', 'active'),
    ('Prednisone', 'NSAIDs', 'moderate', 'Pharmacodynamic', 'Additive GI mucosal damage', 'Increased GI bleeding risk', 'Add PPI for gastroprotection', 'active'),
    ('Losartan', 'Potassium Supplements', 'moderate', 'Pharmacodynamic', 'ARB reduces potassium excretion', 'Hyperkalemia', 'Monitor potassium regularly', 'active'),
    ('Alprazolam', 'Opioids', 'major', 'Pharmacodynamic', 'Additive CNS and respiratory depression', 'Fatal respiratory depression', 'FDA black box warning - avoid if possible', 'active')
  `);

  // Seed suppliers (16)
  await pool.query(`
    INSERT INTO suppliers (name, contact_person, email, phone, address, license_number, drug_categories, lead_time_days, reliability_score, contract_expiry, status) VALUES
    ('McKesson Corporation', 'John Barrett', 'orders@mckesson.com', '800-422-4134', '6555 State Hwy 161, Irving, TX 75039', 'DEA-MC8834521', 'Full line - generics, brands, OTC, supplies', 2, 96.5, '2027-12-31', 'active'),
    ('Cardinal Health', 'Susan Palmer', 'pharmacy@cardinalhealth.com', '800-234-8701', '7000 Cardinal Place, Dublin, OH 43017', 'DEA-CH7712345', 'Full line - generics, brands, biologics', 2, 94.8, '2027-06-30', 'active'),
    ('AmerisourceBergen', 'Mark Richardson', 'supply@amerisourcebergen.com', '800-829-3132', '1 W First Ave, Conshohocken, PA 19428', 'DEA-AB9945678', 'Specialty, oncology, biosimilars, generics', 3, 93.2, '2027-09-30', 'active'),
    ('Morris & Dickson', 'Patricia Cole', 'orders@morrisdickson.com', '800-336-4851', '4001 Industrail Dr, Shreveport, LA 71109', 'DEA-MD5567890', 'Full line - independent pharmacy focused', 3, 91.7, '2027-03-31', 'active'),
    ('HD Smith (now AmerisourceBergen)', 'Robert Kim', 'hdsmith@amerisource.com', '800-223-0182', '3901 W White Oaks Dr, Springfield, IL 62704', 'DEA-HD3312345', 'Generics, OTC, health & beauty', 3, 89.4, '2026-12-31', 'active'),
    ('Anda Inc (Teva)', 'Lisa Tran', 'sales@andanet.com', '800-331-2632', '2915 Weston Rd, Weston, FL 33331', 'DEA-AN6678901', 'Generics, branded generics', 4, 88.6, '2027-04-30', 'active'),
    ('KeySource Medical', 'David Chen', 'orders@keysourcemedical.com', '800-459-4580', '4415 Metro Pkwy, Fort Myers, FL 33916', 'DEA-KS2234567', 'Medical devices, diabetic supplies, DME', 5, 87.1, '2026-11-30', 'active'),
    ('Smith Drug Company', 'Emily Watson', 'supply@smithdrug.com', '800-572-1216', '2001 S Lynnhaven Rd, Virginia Beach, VA 23452', 'DEA-SD8890123', 'Full line - regional distributor', 3, 90.3, '2027-08-31', 'active'),
    ('Rochester Drug Cooperative', 'James Patel', 'orders@rfroch.com', '800-333-0538', '50 Jet View Dr, Rochester, NY 14624', 'DEA-RD4456789', 'Generics, brands, cooperative pricing', 4, 86.9, '2026-10-31', 'active'),
    ('Biologics by McKesson', 'Sarah O''Brien', 'biologics@mckesson.com', '855-253-7900', '6555 State Hwy 161, Irving, TX 75039', 'DEA-BM1123456', 'Specialty biologics, cold chain', 1, 97.2, '2027-12-31', 'active'),
    ('Pfizer Direct', 'Michael Torres', 'pharmaorders@pfizer.com', '800-533-4535', '235 E 42nd St, New York, NY 10017', 'MFR-PF9901234', 'Pfizer branded products only', 5, 92.8, '2027-05-31', 'active'),
    ('Teva Pharmaceuticals', 'Rachel Green', 'tevaorders@tevapharm.com', '888-838-2872', '400 Interpace Pkwy, Parsippany, NJ 07054', 'MFR-TV5567890', 'Teva generics, specialty', 6, 88.3, '2027-02-28', 'active'),
    ('Mylan (Viatris)', 'Chris Anderson', 'orders@viatris.com', '800-796-9526', '1000 Mylan Blvd, Canonsburg, PA 15317', 'MFR-MY3345678', 'Generic medications', 5, 87.5, '2026-09-30', 'active'),
    ('BioCompounding Supplies', 'Anna Martinez', 'sales@biocompound.com', '877-266-7611', '1520 E University Dr, Phoenix, AZ 85034', 'DEA-BC7789012', 'Compounding chemicals, bases, supplies', 7, 85.4, '2027-01-31', 'active'),
    ('Medline Industries', 'Thomas Wright', 'orders@medline.com', '800-633-5463', '3 Lakes Dr, Northfield, IL 60093', 'LIC-ML2234567', 'Medical supplies, PPE, pharmacy supplies', 3, 94.1, '2027-07-31', 'active'),
    ('IPC Compounding Pharmacy', 'Jennifer Davis', 'orders@ipcpharm.com', '800-727-2272', '7835 Freedom Ave, North Canton, OH 44720', 'DEA-IP4456789', 'Compounding cooperative, bulk chemicals', 5, 86.2, '2026-08-31', 'active')
  `);

  // Seed staff (16)
  await pool.query(`
    INSERT INTO staff (first_name, last_name, role, license_number, license_expiry, phone, email, hire_date, certifications, shift_schedule, status) VALUES
    ('Sarah', 'Johnson', 'Pharmacist-in-Charge', 'RPH-2024-0451', '2027-06-30', '555-0201', 'sarah.johnson@pharmacy.com', '2018-03-15', 'PharmD, Board Certified (BCPS), Immunization Certified', 'Mon-Fri 8AM-4PM', 'active'),
    ('James', 'Wilson', 'Staff Pharmacist', 'RPH-2024-0892', '2027-09-30', '555-0202', 'james.wilson@pharmacy.com', '2020-06-01', 'PharmD, MTM Certified, Immunization Certified', 'Mon-Fri 12PM-8PM', 'active'),
    ('Emily', 'Chen', 'Senior Pharmacy Technician', 'TECH-2024-1234', '2026-12-31', '555-0203', 'emily.chen@pharmacy.com', '2019-01-10', 'CPhT, IV Certified, Compounding Certified', 'Mon-Fri 8AM-4PM', 'active'),
    ('Michael', 'Rodriguez', 'Pharmacy Technician', 'TECH-2024-5678', '2027-03-31', '555-0204', 'michael.rod@pharmacy.com', '2021-08-15', 'CPhT, Immunization Trained', 'Tue-Sat 9AM-5PM', 'active'),
    ('Ashley', 'Thompson', 'Pharmacy Technician', 'TECH-2024-9012', '2027-01-31', '555-0205', 'ashley.t@pharmacy.com', '2022-02-01', 'CPhT', 'Mon-Fri 12PM-8PM', 'active'),
    ('Robert', 'Kim', 'Clinical Pharmacist', 'RPH-2024-3456', '2027-08-31', '555-0206', 'robert.kim@pharmacy.com', '2019-09-01', 'PharmD, BCACP, Diabetes Educator', 'Mon-Fri 8AM-4PM', 'active'),
    ('Jessica', 'Martinez', 'Pharmacy Intern', 'INT-2024-7890', '2026-06-30', '555-0207', 'jessica.m@pharmacy.com', '2025-05-15', 'P4 Student, Immunization Certified', 'Wed-Sun 10AM-6PM', 'active'),
    ('David', 'Brown', 'Pharmacy Technician', 'TECH-2024-2345', '2026-11-30', '555-0208', 'david.brown@pharmacy.com', '2023-03-01', 'CPhT, Sterile Compounding', 'Mon-Fri 6AM-2PM', 'active'),
    ('Maria', 'Garcia', 'Pharmacy Manager', 'RPH-2024-6789', '2027-05-31', '555-0209', 'maria.garcia@pharmacy.com', '2017-01-15', 'PharmD, MBA, BCGP, Residency Trained', 'Mon-Fri 7AM-3PM', 'active'),
    ('Thomas', 'Anderson', 'Float Pharmacist', 'RPH-2024-0123', '2027-04-30', '555-0210', 'thomas.a@pharmacy.com', '2021-11-01', 'PharmD, Immunization Certified', 'Variable - PRN', 'active'),
    ('Nicole', 'Davis', 'Pharmacy Cashier', NULL, NULL, '555-0211', 'nicole.d@pharmacy.com', '2024-01-15', 'HIPAA Trained', 'Mon-Fri 9AM-5PM', 'active'),
    ('Kevin', 'Patel', 'Delivery Driver', NULL, NULL, '555-0212', 'kevin.p@pharmacy.com', '2023-07-01', 'HIPAA Trained, Valid DL', 'Mon-Fri 10AM-6PM', 'active'),
    ('Laura', 'White', 'Compounding Technician', 'TECH-2024-3457', '2027-02-28', '555-0213', 'laura.w@pharmacy.com', '2020-04-15', 'CPhT, USP 795/797/800 Certified', 'Mon-Fri 7AM-3PM', 'active'),
    ('Christopher', 'Lee', 'Staff Pharmacist', 'RPH-2024-7891', '2027-07-31', '555-0214', 'chris.lee@pharmacy.com', '2022-09-01', 'PharmD, Oncology Specialty', 'Tue-Sat 8AM-4PM', 'active'),
    ('Amanda', 'Taylor', 'Pharmacy Technician', 'TECH-2024-1235', '2026-10-31', '555-0215', 'amanda.t@pharmacy.com', '2024-06-01', 'CPhT (new)', 'Mon-Fri 2PM-10PM', 'active'),
    ('Brandon', 'Harris', 'Pharmacy Billing Specialist', NULL, NULL, '555-0216', 'brandon.h@pharmacy.com', '2021-03-15', 'HIPAA, Insurance Billing Certified', 'Mon-Fri 8AM-4PM', 'active')
  `);

  // Seed adverse events (16)
  await pool.query(`
    INSERT INTO adverse_events (patient_name, medication, event_date, event_description, severity, outcome, reporter, report_type, meddra_code, causality, status) VALUES
    ('John Smith', 'Lisinopril 10mg', '2026-03-10', 'Persistent dry cough developing 2 weeks after initiation', 'mild', 'Medication switched to Losartan', 'Dr. Sarah Johnson, RPh', 'initial', '10011224', 'probable', 'resolved'),
    ('Robert Brown', 'Atorvastatin 20mg', '2026-03-08', 'Bilateral lower extremity myalgia with elevated CK levels (3x ULN)', 'moderate', 'Dose reduced, symptoms improved', 'James Wilson, RPh', 'initial', '10028411', 'probable', 'under_review'),
    ('Maria Garcia', 'Metformin 500mg', '2026-02-28', 'Severe GI upset with nausea, vomiting, and diarrhea', 'moderate', 'Switched to extended-release formulation', 'Dr. Sarah Johnson, RPh', 'initial', '10017947', 'definite', 'resolved'),
    ('Lisa Anderson', 'Amoxicillin 500mg', '2026-03-05', 'Generalized urticarial rash appearing day 3 of therapy', 'moderate', 'Amoxicillin discontinued, treated with diphenhydramine', 'Emily Chen, CPhT', 'initial', '10037868', 'definite', 'resolved'),
    ('David Wilson', 'Omeprazole 20mg', '2026-02-20', 'Hypomagnesemia detected on routine labs after 2 years of use', 'moderate', 'Magnesium supplementation started', 'Robert Kim, PharmD', 'initial', '10021027', 'possible', 'reported'),
    ('Michael Lee', 'Amlodipine 5mg', '2026-03-12', 'Bilateral ankle edema causing difficulty with shoes', 'mild', 'Patient counseled, compression stockings recommended', 'James Wilson, RPh', 'initial', '10033371', 'probable', 'reported'),
    ('Sarah Davis', 'Sertraline 100mg', '2026-02-15', 'Significant weight gain (12 lbs) over 6 months', 'mild', 'Nutritional counseling provided', 'Dr. Sarah Johnson, RPh', 'follow_up', '10047895', 'possible', 'under_review'),
    ('James Martinez', 'Gabapentin 300mg', '2026-03-01', 'Excessive daytime somnolence affecting daily activities', 'moderate', 'Dose adjusted, evening dosing emphasized', 'Emily Chen, CPhT', 'initial', '10041349', 'probable', 'resolved'),
    ('Patricia White', 'Metoprolol 25mg', '2026-02-25', 'Symptomatic bradycardia (HR 48 bpm) with dizziness', 'serious', 'ED visit, dose reduced to 12.5mg', 'James Wilson, RPh', 'initial', '10006093', 'definite', 'reported'),
    ('Christopher Harris', 'Morphine Sulfate ER 15mg', '2026-03-07', 'Severe constipation unresponsive to stool softeners', 'moderate', 'Added polyethylene glycol, bowel regimen initiated', 'Dr. Sarah Johnson, RPh', 'initial', '10010774', 'definite', 'resolved'),
    ('Amanda Clark', 'Prednisone 10mg', '2026-02-18', 'Elevated blood glucose (280 mg/dL) during taper course', 'moderate', 'Temporary insulin coverage prescribed', 'Robert Kim, PharmD', 'initial', '10018421', 'probable', 'resolved'),
    ('Daniel Lewis', 'Ciprofloxacin 500mg', '2026-03-14', 'Right Achilles tendon pain and swelling on day 5', 'serious', 'Ciprofloxacin immediately discontinued, orthopedic referral', 'James Wilson, RPh', 'initial', '10043255', 'probable', 'under_review'),
    ('Michelle Robinson', 'Fentanyl Patch 25mcg/hr', '2026-02-10', 'Patch adhesion failure leading to breakthrough pain episodes', 'moderate', 'Switched to different manufacturer lot', 'Emily Chen, CPhT', 'initial', '10033799', 'not_related', 'resolved'),
    ('Kevin Walker', 'HCTZ 25mg', '2026-03-03', 'Hypokalemia (K+ 3.0 mEq/L) with muscle cramps', 'moderate', 'Potassium supplementation started', 'Dr. Sarah Johnson, RPh', 'initial', '10021015', 'definite', 'reported'),
    ('Jennifer Taylor', 'Levothyroxine 50mcg', '2026-02-22', 'Heart palpitations and anxiety after dose increase', 'mild', 'TSH rechecked, dose adjustment pending', 'Robert Kim, PharmD', 'initial', '10033557', 'probable', 'under_review'),
    ('Stephanie Hall', 'Pantoprazole 40mg', '2026-03-09', 'C. difficile infection after 8 months of continuous PPI use', 'serious', 'PPI discontinued, treated with vancomycin', 'James Wilson, RPh', 'initial', '10009657', 'possible', 'reported')
  `);

  // Seed workflow queue (16)
  await pool.query(`
    INSERT INTO workflow_queue (patient_name, medication, rx_number, step, assigned_to, priority, notes, due_date, status) VALUES
    ('John Smith', 'Lisinopril 10mg #30', 'RX-2026-001', 'dispensing', 'Emily Chen', 'normal', 'Routine refill, patient picking up at 2pm', '2026-03-19 14:00:00', 'in_progress'),
    ('Maria Garcia', 'Metformin 500mg #60', 'RX-2026-002', 'verification', 'Dr. Sarah Johnson', 'normal', 'Refill request from patient portal', '2026-03-19 16:00:00', 'pending'),
    ('Robert Brown', 'Oxycodone 5mg #60', 'RX-2026-003', 'verification', 'James Wilson', 'high', 'Schedule II - requires pharmacist verification, new e-script', '2026-03-19 11:00:00', 'pending'),
    ('Lisa Anderson', 'Azithromycin 250mg Z-pack', 'RX-2026-004', 'intake', 'Michael Rodriguez', 'urgent', 'Acute sinusitis - patient waiting', '2026-03-19 10:30:00', 'pending'),
    ('David Wilson', 'Omeprazole 20mg #30', 'RX-2026-005', 'filling', 'Ashley Thompson', 'normal', 'Auto-refill triggered', '2026-03-19 17:00:00', 'in_progress'),
    ('Jennifer Taylor', 'Levothyroxine 75mcg #30', 'RX-2026-006', 'verification', 'Dr. Sarah Johnson', 'high', 'Dose change from 50mcg to 75mcg, need to verify with endo', '2026-03-19 12:00:00', 'pending'),
    ('Michael Lee', 'Methylphenidate 20mg #30', 'RX-2026-007', 'intake', 'Emily Chen', 'high', 'Schedule II - paper prescription received', '2026-03-19 13:00:00', 'pending'),
    ('Sarah Davis', 'Sertraline 100mg #30', 'RX-2026-008', 'completed', 'Ashley Thompson', 'normal', 'Ready for pickup, patient notified via text', '2026-03-19 09:00:00', 'completed'),
    ('James Martinez', 'Gabapentin 300mg #270', 'RX-2026-009', 'filling', 'Michael Rodriguez', 'normal', '90-day supply, insurance pre-auth approved', '2026-03-19 15:00:00', 'in_progress'),
    ('Patricia White', 'Insulin Glargine 100u/mL', 'RX-2026-010', 'verification', 'James Wilson', 'high', 'Refrigerated item - verify with Medicare Part B coverage', '2026-03-19 11:30:00', 'pending'),
    ('Christopher Harris', 'Morphine ER 15mg #60', 'RX-2026-011', 'verification', 'Dr. Sarah Johnson', 'urgent', 'Pain management refill, patient reports running out tomorrow', '2026-03-19 10:00:00', 'pending'),
    ('Amanda Clark', 'Albuterol Inhaler', 'RX-2026-012', 'dispensing', 'Emily Chen', 'normal', 'Rescue inhaler refill, demonstrate technique', '2026-03-19 14:30:00', 'in_progress'),
    ('Daniel Lewis', 'Amoxicillin 500mg #30', 'RX-2026-013', 'completed', 'Michael Rodriguez', 'normal', 'Dental prescription, picked up this morning', '2026-03-19 08:00:00', 'completed'),
    ('Michelle Robinson', 'Fluoxetine 20mg #30', 'RX-2026-014', 'filling', 'Ashley Thompson', 'normal', 'Transfer from Walgreens, called to verify', '2026-03-19 16:30:00', 'in_progress'),
    ('Kevin Walker', 'HCTZ 25mg + KCl 20mEq', 'RX-2026-015', 'verification', 'James Wilson', 'normal', 'New potassium supplement added, verify with prescriber', '2026-03-19 13:30:00', 'pending'),
    ('Stephanie Hall', 'Insulin Glargine + Syringes', 'RX-2026-016', 'intake', 'Emily Chen', 'high', 'New insulin start - needs patient education session', '2026-03-19 15:00:00', 'pending')
  `);

  // Seed reports (16)
  await pool.query(`
    INSERT INTO reports (title, report_type, period_start, period_end, generated_by, summary, metrics, status) VALUES
    ('Q1 2026 Prescription Volume Report', 'Prescription Volume', '2026-01-01', '2026-03-31', 'Maria Garcia, PharmD', 'Prescription volume increased 8% QoQ. Generic dispensing rate maintained at 91%.', 'Total Rx: 4,521 | New Rx: 1,203 | Refills: 3,318 | GDR: 91%', 'published'),
    ('March 2026 Controlled Substance Audit', 'Controlled Substance', '2026-03-01', '2026-03-31', 'Dr. Sarah Johnson', 'Monthly C-II through C-V inventory reconciliation complete. No discrepancies found.', 'C-II Count: 1,580 | C-III: 530 | C-IV: 2,450 | C-V: 400 | Discrepancies: 0', 'published'),
    ('February Insurance Claims Summary', 'Financial', '2026-02-01', '2026-02-28', 'Brandon Harris', 'Claims approval rate at 94.2%. Average reimbursement time 12.3 days.', 'Submitted: 1,847 | Approved: 1,740 | Denied: 107 | Revenue: $284,521', 'published'),
    ('Weekly Inventory Status', 'Inventory', '2026-03-11', '2026-03-17', 'Emily Chen, CPhT', '3 items below reorder level. 2 items approaching expiry within 90 days.', 'Total SKUs: 842 | Below Reorder: 3 | Expiring Soon: 2 | Dead Stock: 5', 'published'),
    ('Staff Compliance Dashboard Q1', 'Staff Compliance', '2026-01-01', '2026-03-31', 'Maria Garcia, PharmD', 'All pharmacist licenses current. 1 technician CE requirement pending.', 'Licenses Current: 15/16 | CE Complete: 14/16 | Immunization Cert: 8/8', 'published'),
    ('Adverse Event Summary YTD', 'Pharmacovigilance', '2026-01-01', '2026-03-19', 'Robert Kim, PharmD', '14 adverse events reported YTD. 2 serious events requiring hospitalization.', 'Total Events: 14 | Mild: 4 | Moderate: 8 | Serious: 2 | Fatal: 0', 'published'),
    ('Patient Satisfaction Survey Q1', 'Quality', '2026-01-01', '2026-03-31', 'Maria Garcia, PharmD', 'Overall satisfaction 4.6/5.0. Wait time satisfaction improved from 4.1 to 4.4.', 'Overall: 4.6/5 | Wait Time: 4.4/5 | Staff: 4.8/5 | Accuracy: 4.9/5', 'draft'),
    ('DEA Biennial Inventory Report', 'Regulatory', '2024-03-15', '2026-03-15', 'Dr. Sarah Johnson', 'Biennial controlled substance inventory completed per DEA requirements.', 'Schedule II: 14 items | III: 4 items | IV: 8 items | V: 2 items', 'published'),
    ('Monthly Revenue Analysis', 'Financial', '2026-02-01', '2026-02-28', 'Brandon Harris', 'Gross revenue up 5.3% YoY. Specialty pharmacy revenue growing fastest at 12%.', 'Gross Revenue: $412,850 | COGS: $328,420 | Margin: 20.4% | Specialty: $98,500', 'published'),
    ('Workflow Efficiency Report', 'Operations', '2026-03-01', '2026-03-15', 'Emily Chen, CPhT', 'Average fill time reduced to 14 minutes. Verification queue averaging 8 items.', 'Avg Fill Time: 14min | Queue Depth: 8 | Throughput: 32 Rx/hr | Errors: 0', 'draft'),
    ('HIPAA Compliance Annual', 'Regulatory', '2025-03-19', '2026-03-19', 'Compliance Officer', 'Annual HIPAA risk assessment complete. 2 minor findings addressed.', 'Findings: 2 | Resolved: 2 | Training: 100% | Breach Incidents: 0', 'published'),
    ('Drug Utilization Review Q1', 'Clinical', '2026-01-01', '2026-03-31', 'Robert Kim, PharmD', 'DUR interventions resulted in 23 therapy modifications. Cost savings estimated $12,400.', 'Interventions: 23 | Accepted: 19 | Cost Savings: $12,400 | DDIs Caught: 7', 'draft'),
    ('Compounding Quality Report', 'Quality', '2026-02-01', '2026-02-28', 'Laura White, CPhT', 'All sterile compounds passed potency and sterility testing. BUD compliance at 100%.', 'Compounds Made: 87 | Sterile: 34 | Non-Sterile: 53 | QC Pass Rate: 100%', 'published'),
    ('Supplier Performance Review', 'Operations', '2026-01-01', '2026-03-31', 'Emily Chen, CPhT', 'McKesson maintaining highest reliability. 2 back-order issues with secondary suppliers.', 'On-Time: 97.2% | Fill Rate: 98.8% | Back Orders: 12 | Returns: 3', 'draft'),
    ('Immunization Services Report', 'Clinical', '2026-01-01', '2026-03-31', 'James Wilson, RPh', 'Administered 342 immunizations Q1. COVID boosters and flu shots leading volume.', 'Total: 342 | COVID: 128 | Flu: 95 | Shingles: 54 | Pneumonia: 38 | Other: 27', 'published'),
    ('Annual Pharmacy Operations Review', 'Executive', '2025-01-01', '2025-12-31', 'Maria Garcia, PharmD', 'Annual comprehensive review of all pharmacy operations for board presentation.', 'Rx Volume: 17,845 | Revenue: $1.62M | Patients: 2,341 | Staff: 16 | Compliance: 98%', 'published')
  `);

  // Seed audit log (16)
  await pool.query(`
    INSERT INTO audit_log (user_name, action, module, record_id, details, ip_address, timestamp) VALUES
    ('Dr. Sarah Johnson', 'LOGIN', 'auth', NULL, 'Successful login from pharmacy workstation 1', '192.168.1.10', '2026-03-19 07:45:00'),
    ('Dr. Sarah Johnson', 'CREATE', 'prescriptions', '17', 'New prescription: Lisinopril 10mg for John Smith', '192.168.1.10', '2026-03-19 08:15:00'),
    ('James Wilson', 'LOGIN', 'auth', NULL, 'Successful login from pharmacy workstation 2', '192.168.1.11', '2026-03-19 11:55:00'),
    ('Emily Chen', 'UPDATE', 'inventory', '5', 'Updated quantity: Omeprazole 20mg from 200 to 180', '192.168.1.12', '2026-03-19 09:30:00'),
    ('Dr. Sarah Johnson', 'CREATE', 'controlled', '17', 'New controlled substance log: Oxycodone 5mg dispensed', '192.168.1.10', '2026-03-19 10:00:00'),
    ('James Wilson', 'UPDATE', 'prescriptions', '3', 'Status changed from pending to verified', '192.168.1.11', '2026-03-19 12:30:00'),
    ('Emily Chen', 'CREATE', 'workflow', '17', 'New workflow item: RX-2026-017 intake', '192.168.1.12', '2026-03-19 13:00:00'),
    ('Dr. Sarah Johnson', 'DELETE', 'drug-reviews', '5', 'Removed outdated drug review for discontinued medication', '192.168.1.10', '2026-03-19 14:00:00'),
    ('Brandon Harris', 'CREATE', 'claims', '17', 'New insurance claim submitted for Maria Garcia', '192.168.1.15', '2026-03-19 14:30:00'),
    ('James Wilson', 'UPDATE', 'patients', '2', 'Updated allergies field for Maria Garcia', '192.168.1.11', '2026-03-19 15:00:00'),
    ('Robert Kim', 'CREATE', 'adverse-events', '17', 'New adverse event report: Atorvastatin myalgia', '192.168.1.13', '2026-03-19 15:30:00'),
    ('Emily Chen', 'UPDATE', 'workflow', '1', 'Step changed from filling to dispensing', '192.168.1.12', '2026-03-19 16:00:00'),
    ('Dr. Sarah Johnson', 'UPDATE', 'compliance', '3', 'Updated corrective action for HIPAA finding', '192.168.1.10', '2026-03-19 16:30:00'),
    ('Maria Garcia', 'LOGIN', 'auth', NULL, 'Successful login from admin office', '192.168.1.20', '2026-03-19 07:00:00'),
    ('Maria Garcia', 'CREATE', 'reports', '17', 'Generated Q1 2026 Operations Report', '192.168.1.20', '2026-03-19 09:00:00'),
    ('James Wilson', 'UPDATE', 'controlled', '3', 'Updated quantity reconciliation for Oxycodone', '192.168.1.11', '2026-03-19 17:00:00')
  `);

  // Seed notifications (16)
  await pool.query(`
    INSERT INTO notifications (title, message, type, priority, target_user, module, reference_id, status, created_at) VALUES
    ('Low Stock: Amoxicillin 500mg', 'Amoxicillin 500mg has only 45 units remaining (reorder level: 50). Place order immediately.', 'warning', 'high', NULL, 'inventory', '4', 'unread', '2026-03-19 08:00:00'),
    ('License Expiring: Jessica Martinez', 'Pharmacy Intern Jessica Martinez license (INT-2024-7890) expires on 2026-06-30. Renew within 90 days.', 'alert', 'high', NULL, 'staff_license', '7', 'unread', '2026-03-19 08:00:00'),
    ('High-Risk Compliance Issue', 'FDA drug recall compliance check found recalled Losartan on shelf. Immediate action required.', 'alert', 'urgent', NULL, 'compliance', '4', 'unread', '2026-03-19 08:00:00'),
    ('Insurance Claim Denied', 'Claim #CLM-2026-107 for Robert Brown denied by United Healthcare. Review and resubmit.', 'warning', 'medium', 'Brandon Harris', 'claims', '5', 'unread', '2026-03-18 14:00:00'),
    ('Controlled Substance Count Due', 'Monthly Schedule II inventory count is due by end of business today.', 'info', 'normal', 'Dr. Sarah Johnson', 'controlled', NULL, 'read', '2026-03-18 07:00:00'),
    ('New Adverse Event Reported', 'Serious adverse event reported: Ciprofloxacin tendon pain for Daniel Lewis. Review required.', 'alert', 'high', 'Robert Kim', 'adverse_events', '12', 'unread', '2026-03-18 16:00:00'),
    ('Staff CE Reminder', 'Christopher Lee needs to complete 2 continuing education credits by end of quarter.', 'info', 'medium', NULL, 'staff', '14', 'read', '2026-03-17 09:00:00'),
    ('Supplier Contract Expiring', 'Rochester Drug Cooperative contract expires 2026-10-31. Begin renewal process.', 'warning', 'medium', NULL, 'suppliers', '9', 'unread', '2026-03-17 08:00:00'),
    ('Prescription Ready for Pickup', 'John Smith Lisinopril 10mg (RX-2026-001) ready for pickup. Patient notified.', 'success', 'normal', NULL, 'workflow', '1', 'read', '2026-03-19 13:00:00'),
    ('PDMP Report Submitted', 'Daily PDMP report submitted successfully. 8 controlled substance dispensings reported.', 'success', 'normal', NULL, 'controlled', NULL, 'read', '2026-03-18 20:00:00'),
    ('Expiring Medication Alert', 'Metformin 500mg batch expires in 60 days. 120 units on hand.', 'warning', 'medium', NULL, 'inventory_expiry', '3', 'unread', '2026-03-19 08:00:00'),
    ('BAA Renewal Required', 'Two vendor Business Associate Agreements expired. Contact vendors within 14 days.', 'alert', 'high', NULL, 'compliance', '14', 'unread', '2026-03-17 10:00:00'),
    ('Workflow Bottleneck', 'Verification queue has 6 pending items. Consider reassigning pharmacist resources.', 'warning', 'medium', 'Maria Garcia', 'workflow', NULL, 'read', '2026-03-19 11:00:00'),
    ('Patient Allergy Update', 'Lisa Anderson allergy profile updated: added Amoxicillin based on recent adverse event.', 'info', 'normal', NULL, 'patients', '4', 'read', '2026-03-18 12:00:00'),
    ('Technician Ratio Alert', 'Afternoon shift technician-to-pharmacist ratio exceeds 3:1 limit. Adjust staffing.', 'alert', 'high', 'Maria Garcia', 'staff', NULL, 'unread', '2026-03-19 12:00:00'),
    ('Monthly Report Available', 'March 2026 Controlled Substance Audit report has been published.', 'success', 'normal', NULL, 'reports', '2', 'read', '2026-03-19 09:00:00')
  `);

  // Seed prescription transfers (12)
  await pool.query(`
    INSERT INTO prescription_transfers (patient_name, medication, rx_number, from_pharmacy, from_phone, to_pharmacy, to_phone, transfer_type, pharmacist_name, refills_remaining, original_fill_date, notes, status) VALUES
    ('John Smith', 'Lisinopril 10mg #30', 'RX-W-445521', 'Walgreens #1234', '555-0301', 'Our Pharmacy', '555-0100', 'incoming', 'Dr. Sarah Johnson', 2, '2026-01-15', 'Patient relocated to our area. Verified with sending pharmacy.', 'completed'),
    ('Maria Garcia', 'Metformin 500mg #60', 'RX-CVS-887744', 'CVS Pharmacy #5678', '555-0302', 'Our Pharmacy', '555-0100', 'incoming', 'James Wilson', 4, '2025-12-01', 'Patient prefers our pharmacy for better service.', 'completed'),
    ('Robert Brown', 'Atorvastatin 20mg #30', 'RX-2026-003', 'Our Pharmacy', '555-0100', 'Rite Aid #9012', '555-0303', 'outgoing', 'Dr. Sarah Johnson', 3, '2026-02-01', 'Patient moving out of state. Faxed copy sent.', 'completed'),
    ('Lisa Anderson', 'Alprazolam 0.5mg #30', 'RX-2026-CIV-001', 'Our Pharmacy', '555-0100', 'Walgreens #3456', '555-0304', 'outgoing', 'James Wilson', 0, '2026-03-01', 'Schedule IV - one-time transfer per federal law. Patient aware.', 'completed'),
    ('David Wilson', 'Omeprazole 20mg #30', 'RX-KRG-112233', 'Kroger Pharmacy #7890', '555-0305', 'Our Pharmacy', '555-0100', 'incoming', 'Dr. Sarah Johnson', 5, '2026-01-20', 'Auto-refill transfer. Kroger closing this location.', 'completed'),
    ('Jennifer Taylor', 'Levothyroxine 50mcg #30', 'RX-2026-006', 'Our Pharmacy', '555-0100', 'CVS Pharmacy #2345', '555-0306', 'outgoing', 'James Wilson', 2, '2026-02-15', 'Patient insurance changed, CVS preferred pharmacy.', 'pending'),
    ('Michael Lee', 'Amlodipine 5mg #30', 'RX-TGT-556677', 'Target Pharmacy #6789', '555-0307', 'Our Pharmacy', '555-0100', 'incoming', 'Dr. Sarah Johnson', 3, '2025-11-10', 'Target pharmacy closed. Patient transferred all medications.', 'completed'),
    ('Sarah Davis', 'Sertraline 100mg #30', 'RX-2026-008', 'Our Pharmacy', '555-0100', 'Walmart Pharmacy #0123', '555-0308', 'outgoing', 'James Wilson', 1, '2026-03-05', 'Patient requested transfer for lower copay.', 'pending'),
    ('Patricia White', 'Metoprolol 12.5mg #30', 'RX-HEB-889900', 'H-E-B Pharmacy #4567', '555-0309', 'Our Pharmacy', '555-0100', 'incoming', 'Dr. Sarah Johnson', 4, '2026-02-25', 'Dose recently reduced. New prescription transferred.', 'completed'),
    ('Amanda Clark', 'Prednisone 10mg taper', 'RX-2026-012', 'Our Pharmacy', '555-0100', 'Walgreens #8901', '555-0310', 'outgoing', 'James Wilson', 0, '2026-03-10', 'Short course, no refills. Patient traveling.', 'completed'),
    ('Kevin Walker', 'HCTZ 25mg #30', 'RX-SAM-334455', 'Sam''s Club Pharmacy', '555-0311', 'Our Pharmacy', '555-0100', 'incoming', 'Dr. Sarah Johnson', 5, '2026-01-05', 'Patient membership expired. Transferring to us.', 'completed'),
    ('Stephanie Hall', 'Pantoprazole 40mg #30', 'RX-2026-016', 'Our Pharmacy', '555-0100', 'Costco Pharmacy', '555-0312', 'outgoing', 'James Wilson', 3, '2026-02-10', 'PPI being discontinued per new treatment plan. Final transfer.', 'cancelled')
  `);

  // Seed financial transactions (16)
  await pool.query(`
    INSERT INTO financial_transactions (patient_name, type, amount, payment_method, reference_number, medication, insurance_provider, description, processed_by, transaction_date, status) VALUES
    ('John Smith', 'copay', 10.00, 'credit_card', 'TXN-2026-001', 'Lisinopril 10mg #30', 'Blue Cross Blue Shield', 'Monthly copay for maintenance medication', 'Nicole Davis', '2026-03-19 09:15:00', 'completed'),
    ('Maria Garcia', 'copay', 15.00, 'debit_card', 'TXN-2026-002', 'Metformin 500mg #60', 'Aetna', 'Copay for 60-day supply', 'Nicole Davis', '2026-03-19 10:30:00', 'completed'),
    ('Robert Brown', 'payment', 85.50, 'cash', 'TXN-2026-003', 'Atorvastatin 20mg #30', NULL, 'Cash pay - no insurance on file', 'Nicole Davis', '2026-03-18 14:00:00', 'completed'),
    ('Blue Cross Blue Shield', 'insurance_reimbursement', 245.00, 'insurance', 'BCBS-RMB-44521', 'Multiple prescriptions', 'Blue Cross Blue Shield', 'Weekly batch reimbursement for BCBS patients', 'Brandon Harris', '2026-03-18 16:00:00', 'completed'),
    ('Lisa Anderson', 'copay', 25.00, 'credit_card', 'TXN-2026-005', 'Azithromycin Z-pack', 'Cigna', 'Brand name copay tier', 'Nicole Davis', '2026-03-19 11:00:00', 'completed'),
    ('David Wilson', 'refund', -15.00, 'credit_card', 'TXN-2026-006', 'Omeprazole 20mg', 'Humana', 'Overcharge on copay - insurance adjustment', 'Brandon Harris', '2026-03-17 15:00:00', 'completed'),
    ('Aetna', 'insurance_reimbursement', 189.75, 'insurance', 'AET-RMB-33892', 'Multiple prescriptions', 'Aetna', 'Weekly batch reimbursement for Aetna patients', 'Brandon Harris', '2026-03-18 16:30:00', 'completed'),
    ('Jennifer Taylor', 'copay', 10.00, 'cash', 'TXN-2026-008', 'Levothyroxine 50mcg #30', 'Blue Cross Blue Shield', 'Generic tier copay', 'Nicole Davis', '2026-03-18 09:00:00', 'completed'),
    ('Michael Lee', 'copay', 35.00, 'debit_card', 'TXN-2026-009', 'Methylphenidate 20mg #30', 'Aetna', 'Brand name stimulant copay', 'Nicole Davis', '2026-03-19 13:30:00', 'completed'),
    ('United Healthcare', 'insurance_reimbursement', 312.50, 'insurance', 'UHC-RMB-55743', 'Multiple prescriptions', 'United Healthcare', 'Weekly batch reimbursement for UHC patients', 'Brandon Harris', '2026-03-17 16:00:00', 'completed'),
    ('Christopher Harris', 'payment', 120.00, 'check', 'TXN-2026-011', 'Morphine ER 15mg #60', 'Humana', 'Patient responsibility after insurance', 'Nicole Davis', '2026-03-18 11:00:00', 'completed'),
    ('Amanda Clark', 'copay', 5.00, 'cash', 'TXN-2026-012', 'Albuterol Inhaler', 'Blue Cross Blue Shield', 'Preferred generic copay', 'Nicole Davis', '2026-03-19 14:45:00', 'completed'),
    ('Patricia White', 'payment', 0.00, 'insurance', 'TXN-2026-013', 'Metoprolol 12.5mg', 'Medicare Part D', 'Zero copay - Medicare covered', 'Nicole Davis', '2026-03-17 10:00:00', 'completed'),
    ('Cigna', 'insurance_reimbursement', 156.25, 'insurance', 'CIG-RMB-22156', 'Multiple prescriptions', 'Cigna', 'Weekly batch reimbursement for Cigna patients', 'Brandon Harris', '2026-03-19 16:00:00', 'pending'),
    ('Daniel Lewis', 'refund', -25.00, 'debit_card', 'TXN-2026-015', 'Ciprofloxacin 500mg', 'Aetna', 'Medication discontinued due to adverse event - partial refund', 'Brandon Harris', '2026-03-15 14:00:00', 'completed'),
    ('OTC Customer', 'payment', 24.99, 'credit_card', 'TXN-2026-016', 'Vitamin D3 5000IU', NULL, 'OTC purchase - no prescription required', 'Nicole Davis', '2026-03-19 15:30:00', 'completed')
  `);

  // Seed shift schedule (20)
  await pool.query(`
    INSERT INTO shift_schedule (staff_name, role, shift_date, start_time, end_time, shift_type, location, notes, status) VALUES
    ('Sarah Johnson', 'Pharmacist-in-Charge', '2026-03-19', '08:00', '16:00', 'morning', 'Main Pharmacy', 'Opening pharmacist', 'completed'),
    ('James Wilson', 'Staff Pharmacist', '2026-03-19', '12:00', '20:00', 'afternoon', 'Main Pharmacy', 'Closing pharmacist', 'completed'),
    ('Emily Chen', 'Senior Pharmacy Technician', '2026-03-19', '08:00', '16:00', 'morning', 'Main Pharmacy', 'Lead tech - morning shift', 'completed'),
    ('Michael Rodriguez', 'Pharmacy Technician', '2026-03-19', '09:00', '17:00', 'regular', 'Main Pharmacy', NULL, 'completed'),
    ('Ashley Thompson', 'Pharmacy Technician', '2026-03-19', '12:00', '20:00', 'afternoon', 'Main Pharmacy', NULL, 'completed'),
    ('Nicole Davis', 'Pharmacy Cashier', '2026-03-19', '09:00', '17:00', 'regular', 'Main Pharmacy', 'Front register', 'completed'),
    ('Kevin Patel', 'Delivery Driver', '2026-03-19', '10:00', '18:00', 'regular', 'Delivery Routes', '12 deliveries scheduled', 'completed'),
    ('Sarah Johnson', 'Pharmacist-in-Charge', '2026-03-20', '08:00', '16:00', 'morning', 'Main Pharmacy', 'Opening pharmacist', 'scheduled'),
    ('James Wilson', 'Staff Pharmacist', '2026-03-20', '12:00', '20:00', 'afternoon', 'Main Pharmacy', 'Closing pharmacist', 'scheduled'),
    ('Emily Chen', 'Senior Pharmacy Technician', '2026-03-20', '08:00', '16:00', 'morning', 'Main Pharmacy', 'Lead tech', 'scheduled'),
    ('David Brown', 'Pharmacy Technician', '2026-03-20', '06:00', '14:00', 'morning', 'Compounding Lab', 'Sterile compounding day', 'scheduled'),
    ('Laura White', 'Compounding Technician', '2026-03-20', '07:00', '15:00', 'morning', 'Compounding Lab', 'USP 797 compounding', 'scheduled'),
    ('Robert Kim', 'Clinical Pharmacist', '2026-03-20', '08:00', '16:00', 'regular', 'Clinical Office', 'MTM appointments: 3 patients', 'scheduled'),
    ('Christopher Lee', 'Staff Pharmacist', '2026-03-21', '08:00', '16:00', 'morning', 'Main Pharmacy', 'Saturday opening', 'scheduled'),
    ('Jessica Martinez', 'Pharmacy Intern', '2026-03-21', '10:00', '18:00', 'regular', 'Main Pharmacy', 'Weekend internship hours', 'scheduled'),
    ('Michael Rodriguez', 'Pharmacy Technician', '2026-03-21', '09:00', '17:00', 'regular', 'Main Pharmacy', 'Saturday shift', 'scheduled'),
    ('Thomas Anderson', 'Float Pharmacist', '2026-03-22', '08:00', '16:00', 'regular', 'Main Pharmacy', 'Covering for Sarah Johnson PTO', 'scheduled'),
    ('Amanda Taylor', 'Pharmacy Technician', '2026-03-20', '14:00', '22:00', 'evening', 'Main Pharmacy', 'Evening shift coverage', 'scheduled'),
    ('Brandon Harris', 'Pharmacy Billing Specialist', '2026-03-20', '08:00', '16:00', 'regular', 'Admin Office', 'Weekly claims reconciliation', 'scheduled'),
    ('Nicole Davis', 'Pharmacy Cashier', '2026-03-20', '09:00', '17:00', 'regular', 'Main Pharmacy', 'Front register', 'scheduled')
  `);

  console.log('Database seeded successfully!');
  pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  pool.end();
  process.exit(1);
});
