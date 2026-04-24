import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Suppliers({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', license_number: '', drug_categories: '', lead_time_days: 3, reliability_score: 0, contract_expiry: '', status: 'active' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/suppliers`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/suppliers/${editing.id}` : `${API}/api/suppliers`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '', license_number: '', drug_categories: '', lead_time_days: 3, reliability_score: 0, contract_expiry: '', status: 'active' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this supplier?')) return; await fetch(`${API}/api/suppliers/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch(`${API}/api/suppliers/${id}/evaluate`, { method: 'POST' }); const data = await res.json(); setAiResult(data.evaluation); }
    catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, contact_person: item.contact_person, email: item.email, phone: item.phone, address: item.address, license_number: item.license_number, drug_categories: item.drug_categories, lead_time_days: item.lead_time_days, reliability_score: item.reliability_score, contract_expiry: item.contract_expiry ? item.contract_expiry.split('T')[0] : '', status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', license_number: '', drug_categories: '', lead_time_days: 3, reliability_score: 0, contract_expiry: '', status: 'active' }); setShowForm(true); };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading suppliers...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Supplier Management</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Supplier</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Lead Time</th><th>Reliability</th><th>Contract Expiry</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.name}</strong></td>
                <td>{item.contact_person}</td>
                <td>{item.phone}</td>
                <td>{item.lead_time_days} days</td>
                <td><span style={{ color: item.reliability_score >= 90 ? '#2e7d32' : item.reliability_score >= 80 ? '#f57c00' : '#c62828', fontWeight: 600 }}>{parseFloat(item.reliability_score).toFixed(1)}%</span></td>
                <td>{item.contract_expiry ? new Date(item.contract_expiry).toLocaleDateString() : 'N/A'}</td>
                <td><span className={`status-badge status-${item.status === 'active' ? 'verified' : 'pending'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Supplier Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{selected.name}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Person</div><div className="detail-value">{selected.contact_person}</div></div>
                <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{selected.email}</div></div>
                <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{selected.phone}</div></div>
                <div className="detail-item"><div className="detail-label">License</div><div className="detail-value">{selected.license_number}</div></div>
                <div className="detail-item"><div className="detail-label">Lead Time</div><div className="detail-value">{selected.lead_time_days} days</div></div>
                <div className="detail-item"><div className="detail-label">Reliability</div><div className="detail-value">{parseFloat(selected.reliability_score).toFixed(1)}%</div></div>
                <div className="detail-item"><div className="detail-label">Contract Expiry</div><div className="detail-value">{selected.contract_expiry ? new Date(selected.contract_expiry).toLocaleDateString() : 'N/A'}</div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Address</div><div className="detail-value">{selected.address}</div></div>
              <div className="detail-item" style={{ marginTop: 12 }}><div className="detail-label">Drug Categories</div><div className="detail-value">{selected.drug_categories}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Supplier Evaluation</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI evaluating supplier...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI SUPPLIER EVALUATION</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Supplier' : 'New Supplier'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label>Contact Person</label><input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label>License Number</label><input value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} /></div>
                <div className="form-group"><label>Lead Time (days)</label><input type="number" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Reliability Score (%)</label><input type="number" step="0.1" value={form.reliability_score} onChange={e => setForm({...form, reliability_score: parseFloat(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Contract Expiry</label><input type="date" value={form.contract_expiry} onChange={e => setForm({...form, contract_expiry: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Address</label><textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="form-group"><label>Drug Categories</label><textarea rows={2} value={form.drug_categories} onChange={e => setForm({...form, drug_categories: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
