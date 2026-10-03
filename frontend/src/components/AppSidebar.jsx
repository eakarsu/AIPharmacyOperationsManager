import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppSidebar.css';

const LINKS = [
  { to: '/codex/custom-viz', label: 'Custom Viz', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/prescriptions', label: 'Prescriptions', group: 'Workspace' },
  { to: '/drug-reviews', label: 'Drug Reviews', group: 'Workspace' },
  { to: '/inventory', label: 'Inventory', group: 'Workspace' },
  { to: '/claims', label: 'Claims', group: 'Workspace' },
  { to: '/controlled', label: 'Controlled', group: 'Workspace' },
  { to: '/patients', label: 'Patients', group: 'Workspace' },
  { to: '/compliance', label: 'Compliance', group: 'Workspace' },
  { to: '/interactions', label: 'Interactions', group: 'Workspace' },
  { to: '/suppliers', label: 'Suppliers', group: 'Workspace' },
  { to: '/staff', label: 'Staff', group: 'Workspace' },
  { to: '/adverse-events', label: 'Adverse Events', group: 'Workspace' },
  { to: '/workflow', label: 'Workflow', group: 'Workspace' },
  { to: '/reports', label: 'Reports', group: 'Workspace' },
  { to: '/audit-log', label: 'Audit Log', group: 'Workspace' },
  { to: '/notifications', label: 'Notifications', group: 'Workspace' },
  { to: '/transfers', label: 'Transfers', group: 'Workspace' },
  { to: '/financials', label: 'Financials', group: 'Workspace' },
  { to: '/scheduling', label: 'Scheduling', group: 'Workspace' },
  { to: '/ai-history', label: 'AI History', group: 'Workspace' },
  { to: '/drug-interactions', label: 'Drug Interaction Widget', group: 'Workspace' },
  { to: '/reorder-optimizer', label: 'Reorder Optimizer', group: 'Workspace' },
  { to: '/formulary-review', label: 'Formulary Review', group: 'Workspace' },
  { to: '/diversion-detect', label: 'Diversion Detect', group: 'Workspace' },
  { to: '/adherence-predict', label: 'Adherence Predict', group: 'Workspace' },
  { to: '/claim-denial-predict', label: 'Claim Denial Predict', group: 'Workspace' },
  { to: '/interaction-check-ai', label: 'Interaction Check AI', group: 'Workspace' },
  { to: '/custom-views', label: 'Custom Views', group: 'Workspace' },
  { to: '/cf-agentic-compliance-monitoring', label: 'CF Agentic Compliance Monitoring', group: 'Workspace' },
  { to: '/cf-drug-diversion-detection', label: 'CF Drug Diversion Detection', group: 'Workspace' },
  { to: '/cf-patient-medication-synchronization', label: 'CF Patient Medication Synchronization', group: 'Workspace' },
  { to: '/cf-insurance-pre-authorization-automation', label: 'CF Insurance Pre Authorization Automation', group: 'Workspace' },
  { to: '/cf-medication-therapy-management-mtm', label: 'CF Medication Therapy Management Mtm', group: 'Workspace' },
  { to: '/gap-aiadvanced-js-and-airesults-js-exist-but-tsv-shows', label: 'Gap Aiadvanced Js And Airesults Js Exist But Tsv Shows', group: 'Workspace' },
  { to: '/gap-inventory-without-reorder', label: 'Gap Inventory Without Reorder', group: 'Workspace' },
  { to: '/gap-claims-without-claim', label: 'Gap Claims Without Claim', group: 'Workspace' },
  { to: '/gap-controlled-without-diversion', label: 'Gap Controlled Without Diversion', group: 'Workspace' },
  { to: '/gap-patients-without-adherence', label: 'Gap Patients Without Adherence', group: 'Workspace' },
  { to: '/gap-limited-ncpdp-integration-integrations-stub-but-no', label: 'Gap Limited Ncpdp Integration Integrations Stub But No', group: 'Workspace' },
  { to: '/gap-no-insurance-verification-automation', label: 'Gap No Insurance Verification Automation', group: 'Workspace' },
  { to: '/gap-limited-patient-counseling-tools', label: 'Gap Limited Patient Counseling Tools', group: 'Workspace' },
  { to: '/gap-no-real', label: 'Gap No Real', group: 'Workspace' },
  { to: '/gap-no-webhooks-for-prescription-events', label: 'Gap No Webhooks For Prescription Events', group: 'Workspace' },
  { to: '/gap-no-mobile-app-for-pharmacists-on-the-floor', label: 'Gap No Mobile App For Pharmacists On The Floor', group: 'Workspace' },
  { to: '/gap-mtm-module-exists-but-workflow-depth-unclear', label: 'Gap Mtm Module Exists But Workflow Depth Unclear', group: 'Workspace' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AIPharmacy Operations Manager</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
