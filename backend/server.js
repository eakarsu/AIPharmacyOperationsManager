const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

const { authenticateToken } = require('./middleware/auth');

// Public routes (no auth)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/drug-interactions', require('./routes/drugInteractionLookup'));

// Protected routes
app.use('/api/prescriptions', authenticateToken, require('./routes/prescriptions'));
app.use('/api/drug-reviews', authenticateToken, require('./routes/drugReviews'));
app.use('/api/inventory', authenticateToken, require('./routes/inventory'));
app.use('/api/claims', authenticateToken, require('./routes/claims'));
app.use('/api/controlled', authenticateToken, require('./routes/controlled'));
app.use('/api/patients', authenticateToken, require('./routes/patients'));
app.use('/api/compliance', authenticateToken, require('./routes/compliance'));
app.use('/api/interactions', authenticateToken, require('./routes/interactions'));
app.use('/api/suppliers', authenticateToken, require('./routes/suppliers'));
app.use('/api/staff', authenticateToken, require('./routes/staff'));
app.use('/api/adverse-events', authenticateToken, require('./routes/adverseEvents'));
app.use('/api/workflow', authenticateToken, require('./routes/workflow'));
app.use('/api/reports', authenticateToken, require('./routes/reports'));
app.use('/api/audit-log', authenticateToken, require('./routes/auditLog'));
app.use('/api/notifications', authenticateToken, require('./routes/notifications'));
app.use('/api/transfers', authenticateToken, require('./routes/transfers'));
app.use('/api/financials', authenticateToken, require('./routes/financials'));
app.use('/api/scheduling', authenticateToken, require('./routes/scheduling'));
app.use('/api/ai', authenticateToken, require('./routes/aiResults'));
app.use('/api/ai', authenticateToken, require('./routes/aiAdvanced'));
app.use('/api/integrations', authenticateToken, require('./routes/integrations')); // apply pass 5: NCPDP/PBM/FHIR gated stubs
app.use('/api/mtm', authenticateToken, require('./routes/mtm')); // apply pass 5: MTM workflow

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-agentic-compliance-monitoring', require('./routes/customFeat01_AgenticComplianceMonitoring'));
app.use('/api/cf-drug-diversion-detection', require('./routes/customFeat02_DrugDiversionDetection'));
app.use('/api/cf-patient-medication-synchronization', require('./routes/customFeat03_PatientMedicationSynchronization'));
app.use('/api/cf-insurance-pre-authorization-automation', require('./routes/customFeat04_InsurancePreAuthorizationAutomation'));
app.use('/api/cf-medication-therapy-management-mtm', require('./routes/customFeat05_MedicationTherapyManagementMtm'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-aiadvanced-js-and-airesults-js-exist-but-tsv-shows', require('./routes/gapFeat_aiadvanced_js_and_airesults_js_exist_but_tsv_shows'));
app.use('/api/gap-inventory-without-reorder', require('./routes/gapFeat_inventory_without_reorder'));
app.use('/api/gap-claims-without-claim', require('./routes/gapFeat_claims_without_claim'));
app.use('/api/gap-controlled-without-diversion', require('./routes/gapFeat_controlled_without_diversion'));
app.use('/api/gap-patients-without-adherence', require('./routes/gapFeat_patients_without_adherence'));
app.use('/api/gap-limited-ncpdp-integration-integrations-stub-but-no', require('./routes/gapFeat_limited_ncpdp_integration_integrations_stub_but_no'));
app.use('/api/gap-no-insurance-verification-automation', require('./routes/gapFeat_no_insurance_verification_automation'));
app.use('/api/gap-limited-patient-counseling-tools', require('./routes/gapFeat_limited_patient_counseling_tools'));
app.use('/api/gap-no-real', require('./routes/gapFeat_no_real'));
app.use('/api/gap-no-webhooks-for-prescription-events', require('./routes/gapFeat_no_webhooks_for_prescription_events'));
app.use('/api/gap-no-mobile-app-for-pharmacists-on-the-floor', require('./routes/gapFeat_no_mobile_app_for_pharmacists_on_the_floor'));
app.use('/api/gap-mtm-module-exists-but-workflow-depth-unclear', require('./routes/gapFeat_mtm_module_exists_but_workflow_depth_unclear'));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
