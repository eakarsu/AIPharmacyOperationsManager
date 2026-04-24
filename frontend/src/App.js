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
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
