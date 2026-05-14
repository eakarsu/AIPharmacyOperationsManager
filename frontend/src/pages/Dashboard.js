import React from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    key: 'prescriptions',
    title: 'Prescription Verification',
    description: 'AI-powered prescription verification, safety checks, and drug interaction screening for accurate dispensing.',
    icon: '\u2695',
    path: '/prescriptions',
    stats: ['AI Verification', 'Safety Checks']
  },
  {
    key: 'drug-reviews',
    title: 'Drug Utilization Review',
    description: 'Analyze drug usage patterns, therapeutic appropriateness, and cost-effectiveness with AI insights.',
    icon: '\uD83D\uDD2C',
    path: '/drug-reviews',
    stats: ['Utilization Analysis', 'DUR Reports']
  },
  {
    key: 'inventory',
    title: 'Inventory Management',
    description: 'Track stock levels, predict reorder needs, and optimize inventory with AI-driven analytics.',
    icon: '\uD83D\uDCE6',
    path: '/inventory',
    stats: ['Stock Tracking', 'AI Predictions']
  },
  {
    key: 'claims',
    title: 'Insurance Claims',
    description: 'Process insurance claims, validate coding, and maximize reimbursement with AI assistance.',
    icon: '\uD83D\uDCB3',
    path: '/claims',
    stats: ['Claim Processing', 'AI Coding']
  },
  {
    key: 'controlled',
    title: 'Controlled Substances',
    description: 'DEA compliance tracking, Schedule II-V monitoring, and PDMP reporting with AI compliance checks.',
    icon: '\uD83D\uDD12',
    path: '/controlled',
    stats: ['DEA Compliance', 'PDMP Reports']
  },
  {
    key: 'patients',
    title: 'Patient Management',
    description: 'Manage patient records, medication profiles, allergies, and AI-powered medication therapy reviews.',
    icon: '\uD83D\uDC65',
    path: '/patients',
    stats: ['Patient Records', 'Med Reviews']
  },
  {
    key: 'compliance',
    title: 'Regulatory Compliance',
    description: 'Track FDA, DEA, HIPAA, and state board compliance with AI-powered audit analysis and risk assessment.',
    icon: '\uD83D\uDCCB',
    path: '/compliance',
    stats: ['Audit Tracking', 'Risk Assessment']
  },
  {
    key: 'interactions',
    title: 'Drug Interactions',
    description: 'Comprehensive drug-drug interaction database with AI-powered clinical analysis and management recommendations.',
    icon: '\u26A0\uFE0F',
    path: '/interactions',
    stats: ['Interaction Database', 'AI Analysis']
  },
  {
    key: 'suppliers',
    title: 'Supplier Management',
    description: 'Manage pharmaceutical suppliers, track reliability scores, contracts, and AI-driven supply chain evaluation.',
    icon: '\uD83D\uDE9A',
    path: '/suppliers',
    stats: ['Vendor Tracking', 'AI Evaluation']
  },
  {
    key: 'staff',
    title: 'Staff Management',
    description: 'Track pharmacists, technicians, licenses, certifications, schedules, and AI-powered compliance reviews.',
    icon: '\uD83D\uDC68\u200D\u2695\uFE0F',
    path: '/staff',
    stats: ['License Tracking', 'Staff Reviews']
  },
  {
    key: 'adverse-events',
    title: 'Adverse Event Reporting',
    description: 'FDA MedWatch-style adverse drug event reporting with AI causality assessment and safety analysis.',
    icon: '\uD83D\uDEA8',
    path: '/adverse-events',
    stats: ['MedWatch Reports', 'AI Assessment']
  },
  {
    key: 'workflow',
    title: 'Workflow Queue',
    description: 'Prescription processing pipeline from intake to dispensing with AI workflow optimization.',
    icon: '\u2699\uFE0F',
    path: '/workflow',
    stats: ['Queue Management', 'AI Optimization']
  },
  {
    key: 'reports',
    title: 'Analytics & Reports',
    description: 'Comprehensive pharmacy reports and KPI dashboards with AI-generated business insights.',
    icon: '\uD83D\uDCCA',
    path: '/reports',
    stats: ['KPI Dashboard', 'AI Insights']
  },
  {
    key: 'audit-log',
    title: 'Audit Log',
    description: 'Track all system actions with user attribution, timestamps, and detailed change history for compliance.',
    icon: '\uD83D\uDCDD',
    path: '/audit-log',
    stats: ['Action Tracking', 'User Attribution']
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'System alerts for low stock, expiring medications, license renewals, and compliance deadlines.',
    icon: '\uD83D\uDD14',
    path: '/notifications',
    stats: ['Smart Alerts', 'Auto-Scanning']
  },
  {
    key: 'transfers',
    title: 'Rx Transfers',
    description: 'Manage prescription transfers between pharmacies with full documentation and tracking.',
    icon: '\uD83D\uDD04',
    path: '/transfers',
    stats: ['Transfer Tracking', 'Documentation']
  },
  {
    key: 'financials',
    title: 'Financial Transactions',
    description: 'Track payments, copays, insurance reimbursements, and refunds with financial summaries.',
    icon: '\uD83D\uDCB0',
    path: '/financials',
    stats: ['Payment Tracking', 'Revenue Summary']
  },
  {
    key: 'scheduling',
    title: 'Shift Scheduling',
    description: 'Manage staff shifts, schedules, and coverage with daily and weekly calendar views.',
    icon: '\uD83D\uDCC5',
    path: '/scheduling',
    stats: ['Shift Management', 'Coverage Planning']
  },
  {
    key: 'reorder-optimizer',
    title: 'AI Reorder Optimizer',
    description: 'AI analyzes inventory levels and dispensing rates to generate optimal reorder recommendations with cost estimates.',
    icon: '\uD83D\uDCE6',
    path: '/reorder-optimizer',
    stats: ['AI Reorder Plan', 'Stockout Prevention']
  },
  {
    key: 'formulary-review',
    title: 'AI Formulary Review',
    description: 'AI identifies therapeutic alternatives, generic substitutions, and cost savings opportunities across your formulary.',
    icon: '\uD83D\uDCB9',
    path: '/formulary-review',
    stats: ['Cost Savings', 'Therapeutic Alternatives']
  }
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="dashboard-header">
        <h1>Pharmacy Operations Dashboard</h1>
        <p>AI-powered tools for modern pharmacy management</p>
      </div>

      <div className="dashboard-grid">
        {features.map(f => (
          <div
            key={f.key}
            className={`dashboard-card ${f.key}`}
            onClick={() => navigate(f.path)}
          >
            <div className="card-icon">{f.icon}</div>
            <div className="card-title">{f.title}</div>
            <div className="card-description">{f.description}</div>
            <div className="card-stats">
              {f.stats.map(s => (
                <span key={s} className="card-stat"><strong>{s}</strong></span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
