import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function FormularyReview({ token }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const headers = { 'Authorization': `Bearer ${token}` };

  const runReview = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/api/ai/formulary-review`, { method: 'POST', headers });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Formulary Review</h1>
        <p style={{ color: '#666', marginTop: 4 }}>AI analyzes your top dispensed drugs and identifies therapeutic alternatives and cost savings opportunities</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className="btn-ai" onClick={runReview} disabled={loading} style={{ fontSize: 16, padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8 }}></div>Analyzing Formulary...</> : '&#9733; Run AI Formulary Review'}
        </button>
      </div>

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#ffebee', borderRadius: 8 }}>Error: {result.error}</div>
      )}

      {result && !result.error && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#4caf50' }}>${(result.total_estimated_annual_savings || 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Annual Savings Potential</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2196f3' }}>{result.therapeutic_alternatives?.length || 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Therapeutic Alternatives</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff9800' }}>{result.generic_opportunities?.length || 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Generic Opportunities</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: result.formulary_health_score >= 70 ? '#4caf50' : result.formulary_health_score >= 40 ? '#ff9800' : '#f44336' }}>
                {result.formulary_health_score}/100
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Formulary Health Score</div>
            </div>
          </div>

          {/* Executive summary */}
          {result.executive_summary && (
            <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #4caf50' }}>
              <strong style={{ color: '#2e7d32' }}>Executive Summary:</strong>
              <p style={{ margin: '8px 0 0', color: '#333' }}>{result.executive_summary}</p>
            </div>
          )}

          {/* Priority switches */}
          {result.priority_switches?.length > 0 && (
            <div style={{ background: '#fff9c4', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid #f9a825' }}>
              <strong style={{ color: '#f57f17' }}>&#9733; Priority Switches to Implement First:</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {result.priority_switches.map((sw, i) => <li key={i}>{sw}</li>)}
              </ol>
            </div>
          )}

          {/* Therapeutic alternatives */}
          {result.therapeutic_alternatives?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 16 }}>Therapeutic Alternatives</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Current Drug</th>
                    <th>Alternative</th>
                    <th>Equivalence</th>
                    <th>Savings/Fill</th>
                    <th>Annual Savings</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.therapeutic_alternatives.map((alt, i) => (
                    <tr key={i}>
                      <td><strong>{alt.current_drug}</strong></td>
                      <td style={{ color: '#2196f3', fontWeight: 600 }}>{alt.alternative_drug}</td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 10, background: '#e3f2fd', fontSize: 12 }}>{alt.clinical_equivalence}</span></td>
                      <td style={{ color: '#4caf50', fontWeight: 600 }}>${alt.estimated_savings_per_fill}</td>
                      <td style={{ color: '#4caf50', fontWeight: 700 }}>${(alt.annual_savings_estimate || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: '#666' }}>{alt.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Generic opportunities */}
          {result.generic_opportunities?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 16 }}>Generic Drug Opportunities</div>
              <table className="data-table">
                <thead>
                  <tr><th>Brand Drug</th><th>Generic Name</th><th>Savings %</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {result.generic_opportunities.map((g, i) => (
                    <tr key={i}>
                      <td><strong>{g.brand_drug}</strong></td>
                      <td style={{ color: '#4caf50' }}>{g.generic_name}</td>
                      <td style={{ color: '#4caf50', fontWeight: 700 }}>{g.estimated_savings_percent}%</td>
                      <td style={{ fontSize: 12, color: '#666' }}>{g.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
