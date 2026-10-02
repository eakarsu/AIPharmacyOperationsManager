import React from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: "/prescriptions", label: "Prescriptions" },
  { to: "/drug-reviews", label: "Drug Reviews" },
  { to: "/inventory", label: "Inventory" },
  { to: "/claims", label: "Claims" },
  { to: "/controlled", label: "Controlled" },
  { to: "/patients", label: "Patients" },
  { to: "/compliance", label: "Compliance" },
  { to: "/interactions", label: "Interactions" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/staff", label: "Staff" },
  { to: "/adverse-events", label: "Adverse Events" },
  { to: "/workflow", label: "Workflow" },
  { to: "/reports", label: "Reports" },
  { to: "/audit-log", label: "Audit Log" },
  { to: "/notifications", label: "Notifications" },
  { to: "/transfers", label: "Transfers" },
  { to: "/financials", label: "Financials" },
  { to: "/scheduling", label: "Scheduling" },
  { to: "/ai-history", label: "AIHistory" },
  { to: "/drug-interactions", label: "Drug Interaction Widget" },
  { to: "/reorder-optimizer", label: "Reorder Optimizer" },
  { to: "/formulary-review", label: "Formulary Review" },
  { to: "/diversion-detect", label: "Diversion Detect" },
  { to: "/adherence-predict", label: "Adherence Predict" },
  { to: "/claim-denial-predict", label: "Claim Denial Predict" },
  { to: "/interaction-check-ai", label: "Interaction Check AI" },
  { to: "/custom-views", label: "Custom Views Page" },
  { to: "/cf-agentic-compliance-monitoring", label: "CFAgentic Compliance Monitoring Page" },
  { to: "/cf-drug-diversion-detection", label: "CFDrug Diversion Detection Page" },
  { to: "/cf-patient-medication-synchronization", label: "CFPatient Medication Synchronization Page" },
  { to: "/cf-insurance-pre-authorization-automation", label: "CFInsurance Pre Authorization Automation Page" },
  { to: "/cf-medication-therapy-management-mtm", label: "CFMedication Therapy Management Mtm Page" },
  { to: "/gap-aiadvanced-js-and-airesults-js-exist-but-tsv-shows", label: "Gap Aiadvanced Js And Airesults Js Exist But Tsv Shows Page" },
  { to: "/gap-inventory-without-reorder", label: "Gap Inventory Without Reorder Page" },
  { to: "/gap-claims-without-claim", label: "Gap Claims Without Claim Page" },
  { to: "/gap-controlled-without-diversion", label: "Gap Controlled Without Diversion Page" },
  { to: "/gap-patients-without-adherence", label: "Gap Patients Without Adherence Page" },
  { to: "/gap-limited-ncpdp-integration-integrations-stub-but-no", label: "Gap Limited Ncpdp Integration Integrations Stub But No Page" },
  { to: "/gap-no-insurance-verification-automation", label: "Gap No Insurance Verification Automation Page" },
  { to: "/gap-limited-patient-counseling-tools", label: "Gap Limited Patient Counseling Tools Page" },
  { to: "/gap-no-real", label: "Gap No Real Page" },
  { to: "/gap-no-webhooks-for-prescription-events", label: "Gap No Webhooks For Prescription Events Page" },
  { to: "/gap-no-mobile-app-for-pharmacists-on-the-floor", label: "Gap No Mobile App For Pharmacists On The Floor Page" },
  { to: "/gap-mtm-module-exists-but-workflow-depth-unclear", label: "Gap Mtm Module Exists But Workflow Depth Unclear Page" },
];

const CSS = `
.app-shell{display:grid;grid-template-columns:264px 1fr;min-height:100vh}
.sidebar{background:#0b1220;color:#fff;padding:22px 14px;position:sticky;top:0;height:100vh;overflow:auto;display:flex;flex-direction:column;gap:6px}
.sidebar-brand{padding:6px 10px 16px;border-bottom:1px solid #ffffff18;margin-bottom:10px}
.sidebar-brand .eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800;color:#7dd3fc}
.sidebar-brand h1{font-size:17px;margin:8px 0 0;line-height:1.25;word-break:break-word}
.sidebar-nav{display:flex;flex-direction:column;gap:2px;flex:1;overflow:auto}
.sidebar-nav a{display:block;border-radius:10px;color:#94a3b8;padding:9px 12px;text-decoration:none;font-weight:600;font-size:13.5px}
.sidebar-nav a:hover{background:#ffffff12;color:#fff}
.sidebar-nav a.active{background:#2563eb;color:#fff}
.sidebar-foot{margin-top:12px;padding-top:12px;border-top:1px solid #ffffff18;display:flex;flex-direction:column;gap:8px}
.sidebar-user{font-size:12px;color:#cbd5e1}
.sidebar-logout{border:0;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer;background:#1e293b;color:#e2e8f0}
.sidebar-logout:hover{background:#334155}
@media(max-width:900px){.app-shell{grid-template-columns:1fr}.sidebar{position:relative;height:auto}}
`;

export default function Sidebar({ user, onLogout }) {
  return (
    <>
      <style>{CSS}</style>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="eyebrow">Sidebar app</span>
          <h1>AIPharmacyOperationsManager</h1>
        </div>
        <nav className="sidebar-nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {user && <span className="sidebar-user">{user.name || user.email || 'Signed in'}</span>}
          <button className="sidebar-logout" onClick={onLogout}>Logout</button>
        </div>
      </aside>
    </>
  );
}
