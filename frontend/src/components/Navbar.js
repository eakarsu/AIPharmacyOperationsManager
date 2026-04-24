import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span>PharmOps AI</span>
      </Link>
      <div className="navbar-right">
        <span className="navbar-user">{user?.name} ({user?.role})</span>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
