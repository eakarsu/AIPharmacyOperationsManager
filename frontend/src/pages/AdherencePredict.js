import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function AdherencePredict({ token }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const body = patientId ? { patient_id: patientId } : {};
      const res = await fetch(`${API}/api/ai/adherence-predict`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || `HTTP ${res.status}` });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  const riskColor = (s) => ({ critical: '#b71c1c', high: '#f44336', medium: '#ff9800', low: '#4caf50' }[s] || '#9e9e9e');
  const atRisk = result && (result.parsed?.at_risk_patients || result.at_risk_patients || []);

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Adherence Prediction</h1>
        <p style={{ color: '#666', marginTop: 4 }}>Predict at-risk patients for non-adherence and suggest interventions</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Patient ID (optional)</label>
        <input
          type="text" value={patientId} onChange={e => setPatientId(e.target.value)}
          placeholder="Leave blank for all"
          style={{ width: 220, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button className="btn-ai" onClick={run} disabled={loading} style={{ fontSize: 16, padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8 }}></div>Predicting...</> : 'Run Adherence Prediction'}
        </button>
      </div>

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#ffebee', borderRadius: 8 }}>Error: {result.error}</div>
      )}

      {result && !result.error && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f44336' }}>{atRisk.length}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>At-Risk Patients</div>
            </div>
          </div>

          {atRisk.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700 }}>At-Risk Patients</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Risk</th>
                    <th>Reason</th>
                    <th>Intervention</th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.patient_name || p.patient_id || `Patient ${i+1}`}</strong></td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 12, background: riskColor(p.risk_level), color: '#fff', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                          {p.risk_level || 'unknown'}
                        </span>
                      </td>
                      <td>{p.reason || p.factors}</td>
                      <td>{p.intervention || p.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.content && atRisk.length === 0 && (
            <pre style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginTop: 24, whiteSpace: 'pre-wrap', fontSize: 13 }}>{result.content}</pre>
          )}
        </div>
      )}
    </div>
  );
}
