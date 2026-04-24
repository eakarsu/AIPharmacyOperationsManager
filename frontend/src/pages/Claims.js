import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Claims({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ patient_name: '', insurance_provider: '', policy_number: '', medication: '', quantity: 0, amount: 0, diagnosis_code: '', ndc_code: '', status: 'submitted' });

  const fetchItems = async () => {
    const res = await fetch(`${API}/api/claims`);
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/claims/${editing.id}` : `${API}/api/claims`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ patient_name: '', insurance_provider: '', policy_number: '', medication: '', quantity: 0, amount: 0, diagnosis_code: '', ndc_code: '', status: 'submitted' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this claim?')) return;
    await fetch(`${API}/api/claims/${id}`, { method: 'DELETE' });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/claims/${id}/process`, { method: 'POST' });
      const data = await res.json();
      setAiResult(data.processing);
    } catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, insurance_provider: item.insurance_provider, policy_number: item.policy_number, medication: item.medication, quantity: item.quantity, amount: item.amount, diagnosis_code: item.diagnosis_code, ndc_code: item.ndc_code, status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ patient_name: '', insurance_provider: '', policy_number: '', medication: '', quantity: 0, amount: 0, diagnosis_code: '', ndc_code: '', status: 'submitted' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading claims...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Insurance Claims</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Claim</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Patient</th><th>Insurance</th><th>Medication</th><th>Qty</th><th>Amount</th><th>Diagnosis</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td>{item.patient_name}</td>
                <td><strong>{item.insurance_provider}</strong></td>
                <td>{item.medication}</td>
                <td>{item.quantity}</td>
                <td>${parseFloat(item.amount).toFixed(2)}</td>
                <td>{item.diagnosis_code}</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Claim Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Insurance</div><div className="detail-value">{selected.insurance_provider}</div></div>
                <div className="detail-item"><div className="detail-label">Policy Number</div><div className="detail-value">{selected.policy_number}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication}</div></div>
                <div className="detail-item"><div className="detail-label">Quantity</div><div className="detail-value">{selected.quantity}</div></div>
                <div className="detail-item"><div className="detail-label">Amount</div><div className="detail-value">${parseFloat(selected.amount).toFixed(2)}</div></div>
                <div className="detail-item"><div className="detail-label">Diagnosis Code</div><div className="detail-value">{selected.diagnosis_code}</div></div>
                <div className="detail-item"><div className="detail-label">NDC Code</div><div className="detail-value">{selected.ndc_code}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status}`}>{selected.status.replace('_', ' ')}</span></div></div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Process Claim</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI processing claim...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI CLAIM PROCESSING</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Claim' : 'New Claim'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Insurance Provider</label><input value={form.insurance_provider} onChange={e => setForm({...form, insurance_provider: e.target.value})} /></div>
                <div className="form-group"><label>Policy Number</label><input value={form.policy_number} onChange={e => setForm({...form, policy_number: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Diagnosis Code</label><input value={form.diagnosis_code} onChange={e => setForm({...form, diagnosis_code: e.target.value})} /></div>
                <div className="form-group"><label>NDC Code</label><input value={form.ndc_code} onChange={e => setForm({...form, ndc_code: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="submitted">Submitted</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="under_review">Under Review</option></select></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
