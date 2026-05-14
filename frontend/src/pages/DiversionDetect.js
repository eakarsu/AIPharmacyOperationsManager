import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function DiversionDetect({ token }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [windowDays, setWindowDays] = useState(90);
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/api/ai/diversion-detect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ window_days: Number(windowDays) || 90 }),
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

  const sevColor = (s) => ({ critical: '#b71c1c', high: '#f44336', medium: '#ff9800', low: '#9e9e9e' }[s] || '#9e9e9e');

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Diversion Detection</h1>
        <p style={{ color: '#666', marginTop: 4 }}>AI scans controlled-substance dispensing history for diversion patterns and outliers</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Window (days)</label>
        <input
          type="number" value={windowDays} onChange={e => setWindowDays(e.target.value)}
          min={7} max={365}
          style={{ width: 100, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button className="btn-ai" onClick={run} disabled={loading} style={{ fontSize: 16, padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8 }}></div>Scanning...</> : 'Run Diversion Scan'}
        </button>
      </div>

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#ffebee', borderRadius: 8 }}>Error: {result.error}</div>
      )}

      {result && !result.error && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: sevColor(result.parsed?.overall_risk || result.overall_risk) }}>
                {(result.parsed?.overall_risk || result.overall_risk || 'unknown').toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Overall Risk</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f44336' }}>
                {(result.parsed?.suspicious_patterns || result.suspicious_patterns || []).length}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Patterns Flagged</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff9800' }}>
                {(result.parsed?.outliers || result.outliers || []).length}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Outliers</div>
            </div>
          </div>

          {(result.parsed?.suspicious_patterns || result.suspicious_patterns || []).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700 }}>Suspicious Patterns</div>
              <div style={{ padding: 16 }}>
                {(result.parsed?.suspicious_patterns || result.suspicious_patterns).map((p, i) => (
                  <div key={i} style={{ padding: 12, borderLeft: `4px solid ${sevColor(p.severity)}`, background: '#fafafa', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{p.pattern || p.title || `Pattern ${i+1}`}</div>
                    {p.description && <div style={{ color: '#444', marginTop: 4 }}>{p.description}</div>}
                    {p.recommended_action && <div style={{ color: '#1976d2', marginTop: 6, fontSize: 13 }}><strong>Action:</strong> {p.recommended_action}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(result.parsed?.outliers || result.outliers || []).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700 }}>Outliers</div>
              <div style={{ padding: 16 }}>
                {(result.parsed?.outliers || result.outliers).map((o, i) => (
                  <div key={i} style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                    <strong>{o.entity_type || 'Entity'}: </strong>{o.entity_name || o.id}
                    {o.reason && <div style={{ color: '#666', fontSize: 13 }}>{o.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.content && (
            <pre style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginTop: 24, whiteSpace: 'pre-wrap', fontSize: 13 }}>{result.content}</pre>
          )}
        </div>
      )}
    </div>
  );
}
