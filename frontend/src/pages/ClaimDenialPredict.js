import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ClaimDenialPredict({ token }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claimId, setClaimId] = useState('');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const body = claimId ? { claim_id: claimId } : {};
      const res = await fetch(`${API}/api/ai/claim-denial-predict`, {
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

  const predictions = result && (result.predictions || []);

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Claim Denial Prediction</h1>
        <p style={{ color: '#666', marginTop: 4 }}>Predict denial likelihood for pharmacy claims and recommend pre-emptive corrections</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Claim ID (optional)</label>
        <input
          type="text" value={claimId} onChange={e => setClaimId(e.target.value)}
          placeholder="Leave blank for recent batch"
          style={{ width: 220, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button className="btn-ai" onClick={run} disabled={loading} style={{ fontSize: 16, padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8 }}></div>Predicting...</> : 'Run Denial Prediction'}
        </button>
      </div>

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#ffebee', borderRadius: 8 }}>Error: {result.error}</div>
      )}

      {result && !result.error && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2196f3' }}>{result.claims_analyzed ?? 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Claims Analyzed</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f44336' }}>
                {result.aggregate_denial_rate_estimate ? `${(result.aggregate_denial_rate_estimate * 100).toFixed(1)}%` : '0%'}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Denial Rate Estimate</div>
            </div>
          </div>

          {predictions.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700 }}>Predictions</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Denial %</th>
                    <th>Top Risks</th>
                    <th>Recommended Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.claim_id || `#${i+1}`}</strong></td>
                      <td>{p.denial_probability != null ? `${(p.denial_probability * 100).toFixed(0)}%` : '-'}</td>
                      <td>{(p.top_risk_factors || []).join(', ')}</td>
                      <td>{(p.recommended_actions || []).join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.executive_summary && (
            <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginTop: 24 }}>
              <strong>Executive Summary</strong>
              <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{result.executive_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
