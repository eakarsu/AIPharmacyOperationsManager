import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Compliance({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ regulation_type: '', description: '', audit_date: '', auditor: '', findings: '', risk_level: 'medium', corrective_action: '', status: 'open' });

  const fetchItems = async () => {
    const res = await fetch(`${API}/api/compliance`);
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/compliance/${editing.id}` : `${API}/api/compliance`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ regulation_type: '', description: '', audit_date: '', auditor: '', findings: '', risk_level: 'medium', corrective_action: '', status: 'open' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this compliance record?')) return;
    await fetch(`${API}/api/compliance/${id}`, { method: 'DELETE' });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/compliance/${id}/audit`, { method: 'POST' });
      const data = await res.json();
      setAiResult(data.audit);
    } catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ regulation_type: item.regulation_type, description: item.description, audit_date: item.audit_date ? item.audit_date.split('T')[0] : '', auditor: item.auditor, findings: item.findings, risk_level: item.risk_level, corrective_action: item.corrective_action, status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ regulation_type: '', description: '', audit_date: '', auditor: '', findings: '', risk_level: 'medium', corrective_action: '', status: 'open' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading compliance records...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Regulatory Compliance</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Record</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Regulation</th><th>Description</th><th>Audit Date</th><th>Auditor</th><th>Risk Level</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.regulation_type}</strong></td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</td>
                <td>{item.audit_date ? new Date(item.audit_date).toLocaleDateString() : 'N/A'}</td>
                <td>{item.auditor}</td>
                <td><span className={`risk-${item.risk_level}`}>{item.risk_level?.toUpperCase()}</span></td>
                <td><span className={`status-badge status-${item.status}`}>{item.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Compliance Record Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Regulation Type</div><div className="detail-value">{selected.regulation_type}</div></div>
                <div className="detail-item"><div className="detail-label">Audit Date</div><div className="detail-value">{selected.audit_date ? new Date(selected.audit_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Auditor</div><div className="detail-value">{selected.auditor}</div></div>
                <div className="detail-item"><div className="detail-label">Risk Level</div><div className="detail-value"><span className={`risk-${selected.risk_level}`}>{selected.risk_level?.toUpperCase()}</span></div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status}`}>{selected.status.replace('_', ' ')}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Description</div><div className="detail-value">{selected.description}</div></div>
              <div className="detail-item" style={{ marginTop: 12 }}><div className="detail-label">Findings</div><div className="detail-value">{selected.findings}</div></div>
              <div className="detail-item" style={{ marginTop: 12 }}><div className="detail-label">Corrective Action</div><div className="detail-value">{selected.corrective_action}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Audit Analysis</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI analyzing compliance record...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI AUDIT ANALYSIS</span></div>
                  <div className="ai-response-content" dangerouslySetInnerHTML={{ __html: formatAiContent(aiResult) }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Record' : 'New Record'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Regulation Type</label><select value={form.regulation_type} onChange={e => setForm({...form, regulation_type: e.target.value})}><option value="">Select...</option><option>DEA</option><option>FDA</option><option>HIPAA</option><option>State Board</option><option>OSHA</option><option>USP 797</option><option>USP 800</option><option>CMS</option></select></div>
                <div className="form-group"><label>Audit Date</label><input type="date" value={form.audit_date} onChange={e => setForm({...form, audit_date: e.target.value})} /></div>
                <div className="form-group"><label>Auditor</label><input value={form.auditor} onChange={e => setForm({...form, auditor: e.target.value})} /></div>
                <div className="form-group"><label>Risk Level</label><select value={form.risk_level} onChange={e => setForm({...form, risk_level: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="closed">Closed</option></select></div>
              </div>
              <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group"><label>Findings</label><textarea rows={2} value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} /></div>
              <div className="form-group"><label>Corrective Action</label><textarea rows={2} value={form.corrective_action} onChange={e => setForm({...form, corrective_action: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
