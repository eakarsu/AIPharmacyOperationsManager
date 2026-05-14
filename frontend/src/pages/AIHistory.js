import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function AIHistory({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchItems = async (p = page) => {
    try {
      const res = await fetch(`${API}/api/ai/history?page=${p}&limit=20`, { headers });
      const data = await res.json();
      if (data.data) {
        setItems(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setItems([]);
      }
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(page); }, [page]);

  const endpointLabel = (ep) => {
    const map = {
      prescription_verify: 'Rx Verification',
      patient_medication_review: 'Medication Review',
      inventory_analyze: 'Inventory Analysis',
      drug_review_analyze: 'Drug Review',
      drug_interaction_analyze: 'Drug Interaction',
      controlled_compliance_check: 'Compliance Check'
    };
    return map[ep] || ep;
  };

  const renderResult = (result) => {
    if (!result) return 'No data';
    if (result.raw) return <span style={{ fontSize: 12, color: '#666' }}>Raw AI response stored</span>;
    return <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{JSON.stringify(result, null, 2)}</pre>;
  };

  if (loading) return <div className="loading">Loading AI history...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>AI Analysis History</h1>
        <p style={{ color: '#666', marginTop: 4 }}>Past AI analyses for your account</p>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <p>No AI analyses yet. Run an AI analysis from any page to see results here.</p>
        </div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Analysis Type</th>
                  <th>Entity ID</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td><span className="status-badge status-verified">{endpointLabel(item.endpoint)}</span></td>
                    <td>{item.entity_id || '-'}</td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelected(selected?.id === item.id ? null : item)}>
                        {selected?.id === item.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="ai-response" style={{ marginTop: 16 }}>
              <div className="ai-response-header">
                <span className="ai-badge">{endpointLabel(selected.endpoint)} #{selected.id}</span>
                <span style={{ marginLeft: 16, fontSize: 12, color: '#aaa' }}>{new Date(selected.created_at).toLocaleString()}</span>
                <button className="modal-close" onClick={() => setSelected(null)} style={{ marginLeft: 'auto' }}>&times;</button>
              </div>
              <div className="ai-response-content">{renderResult(selected.result)}</div>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
