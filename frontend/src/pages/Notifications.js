import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Notifications({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchItems = async () => { const res = await fetch(`${API}/api/notifications`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    await fetch(`${API}/api/notifications/generate`, { method: 'POST' });
    await fetchItems();
    setGenerating(false);
  };

  const handleMarkRead = async (id) => {
    await fetch(`${API}/api/notifications/${id}/read`, { method: 'PUT' });
    fetchItems();
    if (selected && selected.id === id) setSelected({ ...selected, status: 'read' });
  };

  const handleMarkAllRead = async () => {
    await fetch(`${API}/api/notifications/mark-all-read`, { method: 'PUT' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE' });
    setSelected(null);
    fetchItems();
  };

  const filtered = items.filter(i => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    return true;
  });

  const unreadCount = items.filter(i => i.status === 'unread').length;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'status-flagged';
      case 'high': return 'status-flagged';
      case 'medium': return 'status-pending';
      default: return 'status-verified';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return '\u26A0\uFE0F';
      case 'alert': return '\uD83D\uDEA8';
      case 'success': return '\u2705';
      default: return '\u2139\uFE0F';
    }
  };

  if (loading) return <div className="loading">Loading notifications...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Notifications {unreadCount > 0 && <span style={{ fontSize: 16, background: '#e74c3c', color: '#fff', padding: '2px 10px', borderRadius: 12, marginLeft: 8 }}>{unreadCount} unread</span>}</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Scanning...' : 'Scan for Alerts'}
          </button>
          {unreadCount > 0 && <button className="btn-secondary" onClick={handleMarkAllRead}>Mark All Read</button>}
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="alert">Alert</option>
            <option value="success">Success</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Type</th><th>Title</th><th>Priority</th><th>Module</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)} style={{ fontWeight: item.status === 'unread' ? 'bold' : 'normal', background: item.status === 'unread' ? '#f8f9ff' : 'transparent' }}>
                <td>{getTypeIcon(item.type)}</td>
                <td>{item.title}</td>
                <td><span className={`status-badge ${getPriorityColor(item.priority)}`}>{item.priority}</span></td>
                <td>{item.module || '-'}</td>
                <td><span className={`status-badge ${item.status === 'unread' ? 'status-pending' : 'status-verified'}`}>{item.status}</span></td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Notification Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Title</div><div className="detail-value">{selected.title}</div></div>
                <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{getTypeIcon(selected.type)} {selected.type}</div></div>
                <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value"><span className={`status-badge ${getPriorityColor(selected.priority)}`}>{selected.priority}</span></div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${selected.status === 'unread' ? 'status-pending' : 'status-verified'}`}>{selected.status}</span></div></div>
                <div className="detail-item"><div className="detail-label">Module</div><div className="detail-value">{selected.module || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{new Date(selected.created_at).toLocaleString()}</div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Message</div><div className="detail-value">{selected.message}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                {selected.status === 'unread' && <button className="btn-primary" onClick={() => handleMarkRead(selected.id)}>Mark as Read</button>}
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
