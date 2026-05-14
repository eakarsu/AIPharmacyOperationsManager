import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
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
      </div>
      <div className="navbar-right">
        <span className="navbar-user">{user?.name} ({user?.role})</span>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
