import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function AuditLog({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const fetchItems = async () => { const res = await fetch(`${API}/api/audit-log`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const modules = [...new Set(items.map(i => i.module))].sort();
  const actions = [...new Set(items.map(i => i.action))].sort();

  const filtered = items.filter(i => {
    if (filterModule !== 'all' && i.module !== filterModule) return false;
    if (filterAction !== 'all' && i.action !== filterAction) return false;
    return true;
  });

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'status-verified';
      case 'UPDATE': return 'status-pending';
      case 'DELETE': return 'status-flagged';
      case 'LOGIN': return 'status-verified';
      default: return 'status-pending';
    }
  };

  if (loading) return <div className="loading">Loading audit log...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Audit Log</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
            <option value="all">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
            <option value="all">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Module</th><th>Record ID</th><th>IP Address</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td>{new Date(item.timestamp).toLocaleString()}</td>
                <td><strong>{item.user_name}</strong></td>
                <td><span className={`status-badge ${getActionColor(item.action)}`}>{item.action}</span></td>
                <td>{item.module}</td>
                <td>{item.record_id || '-'}</td>
                <td>{item.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Audit Entry Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Timestamp</div><div className="detail-value">{new Date(selected.timestamp).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">User</div><div className="detail-value">{selected.user_name}</div></div>
                <div className="detail-item"><div className="detail-label">Action</div><div className="detail-value"><span className={`status-badge ${getActionColor(selected.action)}`}>{selected.action}</span></div></div>
                <div className="detail-item"><div className="detail-label">Module</div><div className="detail-value">{selected.module}</div></div>
                <div className="detail-item"><div className="detail-label">Record ID</div><div className="detail-value">{selected.record_id || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">IP Address</div><div className="detail-value">{selected.ip_address || 'N/A'}</div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Details</div><div className="detail-value">{selected.details || 'No additional details'}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
