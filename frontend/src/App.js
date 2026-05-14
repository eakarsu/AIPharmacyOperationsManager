import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Prescriptions from './pages/Prescriptions';
import DrugReviews from './pages/DrugReviews';
import Inventory from './pages/Inventory';
import Claims from './pages/Claims';
import Controlled from './pages/Controlled';
import Patients from './pages/Patients';
import Compliance from './pages/Compliance';
import Interactions from './pages/Interactions';
import Suppliers from './pages/Suppliers';
import Staff from './pages/Staff';
import AdverseEvents from './pages/AdverseEvents';
import Workflow from './pages/Workflow';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import Notifications from './pages/Notifications';
import Transfers from './pages/Transfers';
import Financials from './pages/Financials';
import Scheduling from './pages/Scheduling';
import AIHistory from './pages/AIHistory';
import DrugInteractionWidget from './pages/DrugInteractionWidget';
import ReorderOptimizer from './pages/ReorderOptimizer';
import FormularyReview from './pages/FormularyReview';
import DiversionDetect from './pages/DiversionDetect';
import AdherencePredict from './pages/AdherencePredict';
import ClaimDenialPredict from './pages/ClaimDenialPredict';
import InteractionCheckAI from './pages/InteractionCheckAI';
import Navbar from './components/Navbar';
import './App.css';

// // === Batch 06 Gaps & Frontend Mounts ===
import CFAgenticComplianceMonitoringPage from './pages/CFAgenticComplianceMonitoringPage';
import CFDrugDiversionDetectionPage from './pages/CFDrugDiversionDetectionPage';
import CFPatientMedicationSynchronizationPage from './pages/CFPatientMedicationSynchronizationPage';
import CFInsurancePreAuthorizationAutomationPage from './pages/CFInsurancePreAuthorizationAutomationPage';
import CFMedicationTherapyManagementMtmPage from './pages/CFMedicationTherapyManagementMtmPage';
import GapAiadvancedJsAndAiresultsJsExistButTsvShowsPage from './pages/GapAiadvancedJsAndAiresultsJsExistButTsvShowsPage';
import GapInventoryWithoutReorderPage from './pages/GapInventoryWithoutReorderPage';
import GapClaimsWithoutClaimPage from './pages/GapClaimsWithoutClaimPage';
import GapControlledWithoutDiversionPage from './pages/GapControlledWithoutDiversionPage';
import GapPatientsWithoutAdherencePage from './pages/GapPatientsWithoutAdherencePage';
import GapLimitedNcpdpIntegrationIntegrationsStubButNoPage from './pages/GapLimitedNcpdpIntegrationIntegrationsStubButNoPage';
import GapNoInsuranceVerificationAutomationPage from './pages/GapNoInsuranceVerificationAutomationPage';
import GapLimitedPatientCounselingToolsPage from './pages/GapLimitedPatientCounselingToolsPage';
import GapNoRealPage from './pages/GapNoRealPage';
import GapNoWebhooksForPrescriptionEventsPage from './pages/GapNoWebhooksForPrescriptionEventsPage';
import GapNoMobileAppForPharmacistsOnTheFloorPage from './pages/GapNoMobileAppForPharmacistsOnTheFloorPage';
import GapMtmModuleExistsButWorkflowDepthUnclearPage from './pages/GapMtmModuleExistsButWorkflowDepthUnclearPage';
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  // Validate token on mount
  useEffect(() => {
    if (token) {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (!res.ok) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }).catch(() => {});
    }
  }, [token]);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prescriptions" element={<Prescriptions token={token} />} />
            <Route path="/drug-reviews" element={<DrugReviews token={token} />} />
            <Route path="/inventory" element={<Inventory token={token} />} />
            <Route path="/claims" element={<Claims token={token} />} />
            <Route path="/controlled" element={<Controlled token={token} />} />
            <Route path="/patients" element={<Patients token={token} />} />
            <Route path="/compliance" element={<Compliance token={token} />} />
            <Route path="/interactions" element={<Interactions token={token} />} />
            <Route path="/suppliers" element={<Suppliers token={token} />} />
            <Route path="/staff" element={<Staff token={token} />} />
            <Route path="/adverse-events" element={<AdverseEvents token={token} />} />
            <Route path="/workflow" element={<Workflow token={token} />} />
            <Route path="/reports" element={<Reports token={token} />} />
            <Route path="/audit-log" element={<AuditLog token={token} />} />
            <Route path="/notifications" element={<Notifications token={token} />} />
            <Route path="/transfers" element={<Transfers token={token} />} />
            <Route path="/financials" element={<Financials token={token} />} />
            <Route path="/scheduling" element={<Scheduling token={token} />} />
            <Route path="/ai-history" element={<AIHistory token={token} />} />
            <Route path="/drug-interactions" element={<DrugInteractionWidget token={token} />} />
            <Route path="/reorder-optimizer" element={<ReorderOptimizer token={token} />} />
            <Route path="/formulary-review" element={<FormularyReview token={token} />} />
            <Route path="/diversion-detect" element={<DiversionDetect token={token} />} />
            <Route path="/adherence-predict" element={<AdherencePredict token={token} />} />
            <Route path="/claim-denial-predict" element={<ClaimDenialPredict token={token} />} />
            <Route path="/interaction-check-ai" element={<InteractionCheckAI token={token} />} />
            <Route path="*" element={<Navigate to="/" />} />
          
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-compliance-monitoring" element={<CFAgenticComplianceMonitoringPage />} />
          <Route path="/cf-drug-diversion-detection" element={<CFDrugDiversionDetectionPage />} />
          <Route path="/cf-patient-medication-synchronization" element={<CFPatientMedicationSynchronizationPage />} />
          <Route path="/cf-insurance-pre-authorization-automation" element={<CFInsurancePreAuthorizationAutomationPage />} />
          <Route path="/cf-medication-therapy-management-mtm" element={<CFMedicationTherapyManagementMtmPage />} />
          <Route path="/gap-aiadvanced-js-and-airesults-js-exist-but-tsv-shows" element={<GapAiadvancedJsAndAiresultsJsExistButTsvShowsPage />} />
          <Route path="/gap-inventory-without-reorder" element={<GapInventoryWithoutReorderPage />} />
          <Route path="/gap-claims-without-claim" element={<GapClaimsWithoutClaimPage />} />
          <Route path="/gap-controlled-without-diversion" element={<GapControlledWithoutDiversionPage />} />
          <Route path="/gap-patients-without-adherence" element={<GapPatientsWithoutAdherencePage />} />
          <Route path="/gap-limited-ncpdp-integration-integrations-stub-but-no" element={<GapLimitedNcpdpIntegrationIntegrationsStubButNoPage />} />
          <Route path="/gap-no-insurance-verification-automation" element={<GapNoInsuranceVerificationAutomationPage />} />
          <Route path="/gap-limited-patient-counseling-tools" element={<GapLimitedPatientCounselingToolsPage />} />
          <Route path="/gap-no-real" element={<GapNoRealPage />} />
          <Route path="/gap-no-webhooks-for-prescription-events" element={<GapNoWebhooksForPrescriptionEventsPage />} />
          <Route path="/gap-no-mobile-app-for-pharmacists-on-the-floor" element={<GapNoMobileAppForPharmacistsOnTheFloorPage />} />
          <Route path="/gap-mtm-module-exists-but-workflow-depth-unclear" element={<GapMtmModuleExistsButWorkflowDepthUnclearPage />} />
        </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
