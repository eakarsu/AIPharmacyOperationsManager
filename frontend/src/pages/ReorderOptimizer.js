import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ReorderOptimizer({ token }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const headers = { 'Authorization': `Bearer ${token}` };

  const runOptimizer = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/api/ai/reorder-optimize`, { method: 'POST', headers });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  const urgencyColor = (u) => {
    const m = { immediate: '#f44336', this_week: '#ff9800', this_month: '#2196f3', optional: '#9e9e9e' };
    return m[u] || '#9e9e9e';
  };

  const priorityColor = (p) => {
    const m = { critical: '#b71c1c', urgent: '#f44336', routine: '#4caf50' };
    return m[p] || '#9e9e9e';
  };

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Inventory Reorder Optimizer</h1>
        <p style={{ color: '#666', marginTop: 4 }}>AI analyzes current stock levels and dispensing rates to recommend optimal reorder quantities and timing</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className="btn-ai" onClick={runOptimizer} disabled={loading} style={{ fontSize: 16, padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8 }}></div>Analyzing Inventory...</> : '&#9733; Run AI Reorder Optimization'}
        </button>
      </div>

      {result && result.error && (
        <div style={{ color: '#f44336', padding: 16, background: '#ffebee', borderRadius: 8 }}>Error: {result.error}</div>
      )}

      {result && !result.error && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: priorityColor(result.action_priority) }}>{result.action_priority?.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Action Priority</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2196f3' }}>{result.recommendations?.length || 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Reorder Items</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f44336' }}>{result.low_stock_risk_drugs?.length || 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Low Stock Risk</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff9800' }}>${(result.total_reorder_cost_estimate || 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Est. Reorder Cost</div>
            </div>
          </div>

          {/* Strategic notes */}
          {result.strategic_notes && (
            <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #1976d2' }}>
              <strong style={{ color: '#1565c0' }}>Strategic Assessment:</strong>
              <p style={{ margin: '8px 0 0', color: '#333' }}>{result.strategic_notes}</p>
            </div>
          )}

          {/* Low stock risk alert */}
          {result.low_stock_risk_drugs?.length > 0 && (
            <div style={{ background: '#ffebee', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid #f44336' }}>
              <strong style={{ color: '#f44336' }}>&#9888; Low Stock Risk Drugs:</strong> {result.low_stock_risk_drugs.join(', ')}
            </div>
          )}

          {/* Expiring soon */}
          {result.expiring_soon?.length > 0 && (
            <div style={{ background: '#fff3e0', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid #ff9800' }}>
              <strong style={{ color: '#e65100' }}>Expiring Soon:</strong> {result.expiring_soon.join(', ')}
            </div>
          )}

          {/* Reorder recommendations */}
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 16 }}>Reorder Recommendations</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Current Qty</th>
                  <th>Reorder Level</th>
                  <th>Recommended Order</th>
                  <th>Days to Stockout</th>
                  <th>Est. Cost</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {(result.recommendations || []).map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.drug_name}</strong><div style={{ fontSize: 12, color: '#666' }}>{r.reason}</div></td>
                    <td>{r.current_quantity}</td>
                    <td>{r.reorder_level}</td>
                    <td style={{ fontWeight: 600, color: '#1976d2' }}>{r.recommended_order_quantity} units</td>
                    <td style={{ color: r.estimated_days_until_stockout < 7 ? '#f44336' : '#333' }}>{r.estimated_days_until_stockout} days</td>
                    <td>${(r.estimated_cost || 0).toLocaleString()}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 12, background: urgencyColor(r.urgency), color: '#fff', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                        {r.urgency?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!result.recommendations || result.recommendations.length === 0) && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: 24 }}>No reorder recommendations at this time</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
