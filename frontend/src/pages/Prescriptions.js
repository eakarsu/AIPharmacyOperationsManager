import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Prescriptions({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ patient_name: '', medication: '', dosage: '', frequency: '', prescriber: '', refills: 0, status: 'pending' });

  const fetchItems = async () => {
    const res = await fetch(`${API}/api/prescriptions`);
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/prescriptions/${editing.id}` : `${API}/api/prescriptions`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditing(null);
    setForm({ patient_name: '', medication: '', dosage: '', frequency: '', prescriber: '', refills: 0, status: 'pending' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    await fetch(`${API}/api/prescriptions/${id}`, { method: 'DELETE' });
    setSelected(null);
    fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/api/prescriptions/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      setAiResult(data.verification);
    } catch (err) {
      setAiResult('Error: ' + err.message);
    }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, medication: item.medication, dosage: item.dosage, frequency: item.frequency, prescriber: item.prescriber, refills: item.refills, status: item.status });
    setShowForm(true);
    setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ patient_name: '', medication: '', dosage: '', frequency: '', prescriber: '', refills: 0, status: 'pending' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>')
      .replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>')
      .replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading prescriptions...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Prescription Verification</h1>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openNew}>+ New Prescription</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Prescriber</th>
              <th>Refills</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td>{item.patient_name}</td>
                <td><strong>{item.medication}</strong></td>
                <td>{item.dosage}</td>
                <td>{item.frequency}</td>
                <td>{item.prescriber}</td>
                <td>{item.refills}</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Prescription Details</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication}</div></div>
                <div className="detail-item"><div className="detail-label">Dosage</div><div className="detail-value">{selected.dosage}</div></div>
                <div className="detail-item"><div className="detail-label">Frequency</div><div className="detail-value">{selected.frequency}</div></div>
                <div className="detail-item"><div className="detail-label">Prescriber</div><div className="detail-value">{selected.prescriber}</div></div>
                <div className="detail-item"><div className="detail-label">Refills</div><div className="detail-value">{selected.refills}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div></div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Verify Prescription</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>

              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI analyzing prescription...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI VERIFICATION</span></div>
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
            <div className="modal-header">
              <h2>{editing ? 'Edit Prescription' : 'New Prescription'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Dosage</label><input value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} /></div>
                <div className="form-group"><label>Frequency</label><input value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} /></div>
                <div className="form-group"><label>Prescriber</label><input value={form.prescriber} onChange={e => setForm({...form, prescriber: e.target.value})} /></div>
                <div className="form-group"><label>Refills</label><input type="number" value={form.refills} onChange={e => setForm({...form, refills: parseInt(e.target.value) || 0})} /></div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
