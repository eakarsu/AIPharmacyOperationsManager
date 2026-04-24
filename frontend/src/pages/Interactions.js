import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Interactions({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ drug_a: '', drug_b: '', severity: 'moderate', interaction_type: '', description: '', clinical_effect: '', management: '', status: 'active' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/interactions`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/interactions/${editing.id}` : `${API}/api/interactions`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ drug_a: '', drug_b: '', severity: 'moderate', interaction_type: '', description: '', clinical_effect: '', management: '', status: 'active' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this interaction?')) return; await fetch(`${API}/api/interactions/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch(`${API}/api/interactions/${id}/analyze`, { method: 'POST' }); const data = await res.json(); setAiResult(data.analysis); }
    catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ drug_a: item.drug_a, drug_b: item.drug_b, severity: item.severity, interaction_type: item.interaction_type, description: item.description, clinical_effect: item.clinical_effect, management: item.management, status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ drug_a: '', drug_b: '', severity: 'moderate', interaction_type: '', description: '', clinical_effect: '', management: '', status: 'active' }); setShowForm(true); };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  const severityColor = (s) => ({ contraindicated: '#d32f2f', major: '#e65100', moderate: '#f57c00', minor: '#2e7d32' }[s] || '#666');

  if (loading) return <div className="loading">Loading drug interactions...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Drug Interactions Checker</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Interaction</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Drug A</th><th>Drug B</th><th>Severity</th><th>Type</th><th>Clinical Effect</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.drug_a}</strong></td>
                <td><strong>{item.drug_b}</strong></td>
                <td><span style={{ color: severityColor(item.severity), fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>{item.severity}</span></td>
                <td>{item.interaction_type}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.clinical_effect}</td>
                <td><span className={`status-badge status-${item.status === 'active' ? 'verified' : 'pending'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Drug Interaction Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Drug A</div><div className="detail-value">{selected.drug_a}</div></div>
                <div className="detail-item"><div className="detail-label">Drug B</div><div className="detail-value">{selected.drug_b}</div></div>
                <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value" style={{ color: severityColor(selected.severity), fontWeight: 700 }}>{selected.severity?.toUpperCase()}</div></div>
                <div className="detail-item"><div className="detail-label">Interaction Type</div><div className="detail-value">{selected.interaction_type}</div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Description</div><div className="detail-value">{selected.description}</div></div>
              <div className="detail-item" style={{ marginTop: 12 }}><div className="detail-label">Clinical Effect</div><div className="detail-value">{selected.clinical_effect}</div></div>
              <div className="detail-item" style={{ marginTop: 12 }}><div className="detail-label">Management</div><div className="detail-value">{selected.management}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Interaction Analysis</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI analyzing interaction...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI INTERACTION ANALYSIS</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Interaction' : 'New Interaction'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Drug A</label><input value={form.drug_a} onChange={e => setForm({...form, drug_a: e.target.value})} /></div>
                <div className="form-group"><label>Drug B</label><input value={form.drug_b} onChange={e => setForm({...form, drug_b: e.target.value})} /></div>
                <div className="form-group"><label>Severity</label><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="major">Major</option><option value="contraindicated">Contraindicated</option></select></div>
                <div className="form-group"><label>Interaction Type</label><input value={form.interaction_type} onChange={e => setForm({...form, interaction_type: e.target.value})} placeholder="Pharmacokinetic / Pharmacodynamic" /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group"><label>Clinical Effect</label><textarea rows={2} value={form.clinical_effect} onChange={e => setForm({...form, clinical_effect: e.target.value})} /></div>
              <div className="form-group"><label>Management</label><textarea rows={2} value={form.management} onChange={e => setForm({...form, management: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
