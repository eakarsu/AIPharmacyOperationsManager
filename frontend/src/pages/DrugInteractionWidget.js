import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function DrugInteractionWidget({ token }) {
  const navigate = useNavigate();
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const headers = { 'Authorization': `Bearer ${token}` };

  const lookup = async () => {
    if (!drug1.trim() || !drug2.trim()) {
      alert('Please enter both drug names');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/drug-interactions/lookup?drug1=${encodeURIComponent(drug1)}&drug2=${encodeURIComponent(drug2)}`, { headers });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  const riskColor = (risk) => {
    const map = { critical: '#f44336', high: '#f44336', medium: '#ff9800', low: '#4caf50', unknown: '#9e9e9e' };
    return map[risk] || '#9e9e9e';
  };

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Drug Interaction Lookup</h1>
        <p style={{ color: '#666', marginTop: 4 }}>Check interactions between two drugs using NIH RxNav</p>
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24, maxWidth: 600 }}>
        <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Drug 1</label>
            <input
              value={drug1}
              onChange={e => setDrug1(e.target.value)}
              placeholder="e.g. aspirin"
              onKeyDown={e => e.key === 'Enter' && lookup()}
            />
          </div>
          <div className="form-group">
            <label>Drug 2</label>
            <input
              value={drug2}
              onChange={e => setDrug2(e.target.value)}
              placeholder="e.g. warfarin"
              onKeyDown={e => e.key === 'Enter' && lookup()}
            />
          </div>
        </div>
        <button className="btn-ai" onClick={lookup} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Looking up...' : '&#9733; Check Interaction'}
        </button>
      </div>

      {result && !result.error && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{result.drug1} + {result.drug2}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>Source: {result.source}</span>
              <span style={{ padding: '4px 12px', borderRadius: 12, background: riskColor(result.overall_risk), color: '#fff', fontWeight: 700, textTransform: 'uppercase', fontSize: 13 }}>
                {result.overall_risk} risk
              </span>
            </div>
          </div>

          {result.rxcui1 && <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>RxCUI: {result.drug1}={result.rxcui1}, {result.drug2}={result.rxcui2}</p>}

          {result.interactions && result.interactions.length > 0 ? (
            result.interactions.map((inter, i) => (
              <div key={i} style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 6, marginBottom: 10, borderLeft: `4px solid ${riskColor(inter.severity)}` }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {inter.drug1} &#8596; {inter.drug2}
                  <span style={{ marginLeft: 8, fontSize: 12, color: riskColor(inter.severity), fontWeight: 700, textTransform: 'uppercase' }}>{inter.severity}</span>
                </div>
                {inter.description && <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{inter.description}</div>}
                {inter.recommendation && <div style={{ fontSize: 12, color: '#1976d2', fontStyle: 'italic' }}>Recommendation: {inter.recommendation}</div>}
              </div>
            ))
          ) : (
            <div style={{ color: '#4caf50', fontWeight: 500 }}>No significant interactions found between these drugs.</div>
          )}
        </div>
      )}

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#fff3cd', borderRadius: 6 }}>Error: {result.error}</div>
      )}
    </div>
  );
}
