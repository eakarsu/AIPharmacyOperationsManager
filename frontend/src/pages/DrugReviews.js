import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function DrugReviews({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ drug_name: '', category: '', indication: '', contraindications: '', side_effects: '', utilization_rate: 0, status: 'pending' });

  const fetchItems = async () => {
    const res = await fetch(`${API}/api/drug-reviews`);
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/drug-reviews/${editing.id}` : `${API}/api/drug-reviews`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ drug_name: '', category: '', indication: '', contraindications: '', side_effects: '', utilization_rate: 0, status: 'pending' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this drug review?')) return;
    await fetch(`${API}/api/drug-reviews/${id}`, { method: 'DELETE' });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/drug-reviews/${id}/analyze`, { method: 'POST' });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ drug_name: item.drug_name, category: item.category, indication: item.indication, contraindications: item.contraindications, side_effects: item.side_effects, utilization_rate: item.utilization_rate, status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ drug_name: '', category: '', indication: '', contraindications: '', side_effects: '', utilization_rate: 0, status: 'pending' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading drug reviews...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Drug Utilization Review</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Drug Review</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Drug Name</th><th>Category</th><th>Indication</th><th>Utilization Rate</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.drug_name}</strong></td>
                <td>{item.category}</td>
                <td>{item.indication}</td>
                <td>{item.utilization_rate}%</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Drug Review Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Drug Name</div><div className="detail-value">{selected.drug_name}</div></div>
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selected.category}</div></div>
                <div className="detail-item"><div className="detail-label">Indication</div><div className="detail-value">{selected.indication}</div></div>
                <div className="detail-item"><div className="detail-label">Utilization Rate</div><div className="detail-value">{selected.utilization_rate}%</div></div>
                <div className="detail-item"><div className="detail-label">Contraindications</div><div className="detail-value">{selected.contraindications}</div></div>
                <div className="detail-item"><div className="detail-label">Side Effects</div><div className="detail-value">{selected.side_effects}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div></div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Utilization Analysis</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI analyzing drug utilization...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI DUR ANALYSIS</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Drug Review' : 'New Drug Review'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Drug Name</label><input value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} /></div>
                <div className="form-group"><label>Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
                <div className="form-group"><label>Utilization Rate (%)</label><input type="number" value={form.utilization_rate} onChange={e => setForm({...form, utilization_rate: parseFloat(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="flagged">Flagged</option></select></div>
              </div>
              <div className="form-group"><label>Indication</label><textarea rows={2} value={form.indication} onChange={e => setForm({...form, indication: e.target.value})} /></div>
              <div className="form-group"><label>Contraindications</label><textarea rows={2} value={form.contraindications} onChange={e => setForm({...form, contraindications: e.target.value})} /></div>
              <div className="form-group"><label>Side Effects</label><textarea rows={2} value={form.side_effects} onChange={e => setForm({...form, side_effects: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
