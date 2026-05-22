import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const GAP_LINKS = [
  { to: '/gap-aiadvanced-js-and-airesults-js-exist-but-tsv-shows', label: 'AI Stub Wiring' },
  { to: '/gap-inventory-without-reorder', label: 'Reorder Predict' },
  { to: '/gap-claims-without-claim', label: 'Claim Denial Predict' },
  { to: '/gap-controlled-without-diversion', label: 'Diversion Detect' },
  { to: '/gap-patients-without-adherence', label: 'Adherence Predict' },
  { to: '/gap-limited-ncpdp-integration-integrations-stub-but-no', label: 'NCPDP Integration' },
  { to: '/gap-no-insurance-verification-automation', label: 'Insurance Verify AI' },
  { to: '/gap-limited-patient-counseling-tools', label: 'Counseling Tools' },
  { to: '/gap-no-real', label: 'EHR Sync AI' },
  { to: '/gap-no-webhooks-for-prescription-events', label: 'Rx Webhooks AI' },
  { to: '/gap-no-mobile-app-for-pharmacists-on-the-floor', label: 'Mobile Pharmacist AI' },
  { to: '/gap-mtm-module-exists-but-workflow-depth-unclear', label: 'MTM Workflow AI' },
];

export default function Navbar({ user, onLogout }) {
  const [gapOpen, setGapOpen] = useState(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span>PharmOps AI</span>
      </Link>
      <div className="navbar-links">
        <Link to="/drug-interactions" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Drug Interactions</Link>
        <Link to="/reorder-optimizer" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Reorder AI</Link>
        <Link to="/formulary-review" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Formulary AI</Link>
        <Link to="/diversion-detect" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Diversion AI</Link>
        <Link to="/adherence-predict" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Adherence AI</Link>
        <Link to="/claim-denial-predict" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Denial AI</Link>
        <Link to="/interaction-check-ai" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Interaction AI+</Link>
        <Link to="/ai-history" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>AI History</Link>
        <Link to="/custom-views" style={{ color: '#90caf9', textDecoration: 'none', fontSize: 13, marginRight: 16 }}>Pharmacy Views</Link>
        {/* Gap Features dropdown */}
        <span
          style={{ position: 'relative', display: 'inline-block' }}
          onMouseEnter={() => setGapOpen(true)}
          onMouseLeave={() => setGapOpen(false)}
        >
          <button
            style={{ background: 'none', border: '1px solid #4b5563', color: '#fbbf24', fontSize: 13, borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setGapOpen(o => !o)}
          >
            Gap Features ▾
          </button>
          {gapOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 1000,
              background: '#1f2937', border: '1px solid #374151', borderRadius: 6,
              minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.5)', padding: '6px 0'
            }}>
              {GAP_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setGapOpen(false)}
                  style={{
                    display: 'block', padding: '7px 16px',
                    color: '#fbbf24', textDecoration: 'none', fontSize: 13,
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </span>
      </div>
      <div className="navbar-right">
        <span className="navbar-user">{user?.name} ({user?.role})</span>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
