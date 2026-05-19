import React from 'react';
import PrescriptionTimeline from '../components/PrescriptionTimeline';
import InventoryHeatmap from '../components/InventoryHeatmap';
import DispensingLogPdf from '../components/DispensingLogPdf';
import DispensingRulesEditor from '../components/DispensingRulesEditor';

export default function CustomViewsPage({ token }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Pharmacy Custom Views</h1>
      <p style={{ color: '#64748b' }}>
        Operational dashboards and tools tailored for pharmacy operations: prescription trends,
        inventory coverage, controlled-substance dispensing log export, and dispensing-rule policy editor.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginTop: 16 }}>
        <PrescriptionTimeline token={token} />
        <InventoryHeatmap token={token} />
        <DispensingLogPdf token={token} />
        <DispensingRulesEditor token={token} />
      </div>
    </div>
  );
}
