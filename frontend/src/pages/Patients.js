import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Patients({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', insurance_provider: '', policy_number: '', allergies: '', current_medications: '' });

  const fetchItems = async () => {
    const res = await fetch(`${API}/api/patients`);
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/patients/${editing.id}` : `${API}/api/patients`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', insurance_provider: '', policy_number: '', allergies: '', current_medications: '' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    await fetch(`${API}/api/patients/${id}`, { method: 'DELETE' });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/patients/${id}/medication-review`, { method: 'POST' });
      const data = await res.json();
      setAiResult(data.review);
    } catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ first_name: item.first_name, last_name: item.last_name, date_of_birth: item.date_of_birth ? item.date_of_birth.split('T')[0] : '', phone: item.phone, email: item.email, insurance_provider: item.insurance_provider, policy_number: item.policy_number, allergies: item.allergies, current_medications: item.current_medications });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', insurance_provider: '', policy_number: '', allergies: '', current_medications: '' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading patients...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Patient Management</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Patient</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>DOB</th><th>Phone</th><th>Insurance</th><th>Allergies</th><th>Medications</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.last_name}, {item.first_name}</strong></td>
                <td>{item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                <td>{item.phone}</td>
                <td>{item.insurance_provider}</td>
                <td>{item.allergies || 'None'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.current_medications || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Patient Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">First Name</div><div className="detail-value">{selected.first_name}</div></div>
                <div className="detail-item"><div className="detail-label">Last Name</div><div className="detail-value">{selected.last_name}</div></div>
                <div className="detail-item"><div className="detail-label">Date of Birth</div><div className="detail-value">{selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{selected.phone}</div></div>
                <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{selected.email}</div></div>
                <div className="detail-item"><div className="detail-label">Insurance</div><div className="detail-value">{selected.insurance_provider}</div></div>
                <div className="detail-item"><div className="detail-label">Policy Number</div><div className="detail-value">{selected.policy_number}</div></div>
                <div className="detail-item"><div className="detail-label">Allergies</div><div className="detail-value" style={{ color: selected.allergies && selected.allergies !== 'None' ? '#c62828' : '#666' }}>{selected.allergies || 'None reported'}</div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Current Medications</div><div className="detail-value">{selected.current_medications || 'None listed'}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Medication Review</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI reviewing medications...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI MEDICATION REVIEW</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Patient' : 'New Patient'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>First Name</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                <div className="form-group"><label>Last Name</label><input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
                <div className="form-group"><label>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} /></div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label>Insurance Provider</label><input value={form.insurance_provider} onChange={e => setForm({...form, insurance_provider: e.target.value})} /></div>
                <div className="form-group"><label>Policy Number</label><input value={form.policy_number} onChange={e => setForm({...form, policy_number: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Allergies</label><textarea rows={2} value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} /></div>
              <div className="form-group"><label>Current Medications</label><textarea rows={2} value={form.current_medications} onChange={e => setForm({...form, current_medications: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
