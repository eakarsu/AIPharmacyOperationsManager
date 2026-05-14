import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function InteractionCheckAI({ token }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [meds, setMeds] = useState('warfarin, atorvastatin');
  const [conditions, setConditions] = useState('atrial fibrillation, hypertension');
  const [allergies, setAllergies] = useState('sulfa');
  const [patientId, setPatientId] = useState('');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const splitList = (s) => s.split(',').map(x => x.trim()).filter(Boolean);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const body = {
        medications: splitList(meds),
        conditions: splitList(conditions),
        allergies: splitList(allergies),
        patient_id: patientId || undefined,
      };
      const res = await fetch(`${API}/api/ai/interaction-check-ai`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 503) {
        setResult({ error: data.error || 'AI service unavailable (no API key configured)' });
      } else if (!res.ok) {
        setResult({ error: data.error || `HTTP ${res.status}` });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  const sevColor = (s) => ({ critical: '#b71c1c', major: '#f44336', moderate: '#ff9800', minor: '#4caf50' }[String(s).toLowerCase()] || '#9e9e9e');

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Interaction Check (Drug-Disease/Allergy/Drug)</h1>
        <p style={{ color: '#666', marginTop: 4 }}>Comprehensive interaction screening across medications, conditions, and allergies</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <label>Medications (comma-separated)</label>
          <input value={meds} onChange={e => setMeds(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }} />
        </div>
        <div>
          <label>Conditions (comma-separated)</label>
          <input value={conditions} onChange={e => setConditions(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }} />
        </div>
        <div>
          <label>Allergies (comma-separated)</label>
          <input value={allergies} onChange={e => setAllergies(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }} />
        </div>
        <div>
          <label>Patient ID (optional)</label>
          <input value={patientId} onChange={e => setPatientId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className="btn-ai" onClick={run} disabled={loading} style={{ fontSize: 16, padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8 }}></div>Checking...</> : 'Run Interaction Check'}
        </button>
      </div>

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#ffebee', borderRadius: 8 }}>Error: {result.error}</div>
      )}

      {result && !result.error && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Section title="Drug-Disease Interactions" rows={result.drug_disease_interactions || []}
            cols={['drug','disease_or_condition','severity','recommendation']} sevColor={sevColor} />
          <Section title="Drug-Allergy Alerts" rows={result.drug_allergy_alerts || []}
            cols={['drug','allergy_match','severity','recommendation']} sevColor={sevColor} />
          <Section title="Drug-Drug Interactions" rows={result.drug_drug_interactions || []}
            cols={['drug_a','drug_b','severity','clinical_effect','management']} sevColor={sevColor} />
          {result.executive_summary && (
            <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
              <strong>Executive Summary (risk: {result.overall_risk_level})</strong>
              <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{result.executive_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, rows, cols, sevColor }) {
  if (!rows.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700 }}>{title}</div>
      <table className="data-table">
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c}>
                  {c === 'severity' ? (
                    <span style={{ padding: '3px 10px', borderRadius: 12, background: sevColor(r[c]), color: '#fff', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                      {r[c] || 'unknown'}
                    </span>
                  ) : String(r[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
