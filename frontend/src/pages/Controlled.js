import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Controlled({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', dea_schedule: 'Schedule II', quantity_on_hand: 0, quantity_dispensed: 0, prescriber_dea: '', patient_name: '', dispensed_date: '', log_entry: '', status: 'logged' });

  const fetchItems = async () => {
    const res = await fetch(`${API}/api/controlled`);
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/controlled/${editing.id}` : `${API}/api/controlled`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ name: '', dea_schedule: 'Schedule II', quantity_on_hand: 0, quantity_dispensed: 0, prescriber_dea: '', patient_name: '', dispensed_date: '', log_entry: '', status: 'logged' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await fetch(`${API}/api/controlled/${id}`, { method: 'DELETE' });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/controlled/${id}/compliance-check`, { method: 'POST' });
      const data = await res.json();
      setAiResult(data.compliance);
    } catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, dea_schedule: item.dea_schedule, quantity_on_hand: item.quantity_on_hand, quantity_dispensed: item.quantity_dispensed, prescriber_dea: item.prescriber_dea, patient_name: item.patient_name, dispensed_date: item.dispensed_date ? item.dispensed_date.split('T')[0] : '', log_entry: item.log_entry, status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', dea_schedule: 'Schedule II', quantity_on_hand: 0, quantity_dispensed: 0, prescriber_dea: '', patient_name: '', dispensed_date: '', log_entry: '', status: 'logged' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading controlled substances...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Controlled Substances</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Record</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Substance</th><th>DEA Schedule</th><th>On Hand</th><th>Dispensed</th><th>Patient</th><th>Prescriber DEA</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.name}</strong></td>
                <td>{item.dea_schedule}</td>
                <td>{item.quantity_on_hand}</td>
                <td>{item.quantity_dispensed}</td>
                <td>{item.patient_name}</td>
                <td>{item.prescriber_dea}</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Controlled Substance Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Substance</div><div className="detail-value">{selected.name}</div></div>
                <div className="detail-item"><div className="detail-label">DEA Schedule</div><div className="detail-value">{selected.dea_schedule}</div></div>
                <div className="detail-item"><div className="detail-label">Quantity On Hand</div><div className="detail-value">{selected.quantity_on_hand}</div></div>
                <div className="detail-item"><div className="detail-label">Quantity Dispensed</div><div className="detail-value">{selected.quantity_dispensed}</div></div>
                <div className="detail-item"><div className="detail-label">Prescriber DEA#</div><div className="detail-value">{selected.prescriber_dea}</div></div>
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Dispensed Date</div><div className="detail-value">{selected.dispensed_date ? new Date(selected.dispensed_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Log Entry</div><div className="detail-value">{selected.log_entry}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Compliance Check</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI checking compliance...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI COMPLIANCE CHECK</span></div>
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
                <div className="form-group"><label>Substance Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label>DEA Schedule</label><select value={form.dea_schedule} onChange={e => setForm({...form, dea_schedule: e.target.value})}><option>Schedule II</option><option>Schedule III</option><option>Schedule IV</option><option>Schedule V</option></select></div>
                <div className="form-group"><label>Quantity On Hand</label><input type="number" value={form.quantity_on_hand} onChange={e => setForm({...form, quantity_on_hand: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Quantity Dispensed</label><input type="number" value={form.quantity_dispensed} onChange={e => setForm({...form, quantity_dispensed: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Prescriber DEA#</label><input value={form.prescriber_dea} onChange={e => setForm({...form, prescriber_dea: e.target.value})} /></div>
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Dispensed Date</label><input type="date" value={form.dispensed_date} onChange={e => setForm({...form, dispensed_date: e.target.value})} /></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="logged">Logged</option><option value="flagged">Flagged</option></select></div>
              </div>
              <div className="form-group"><label>Log Entry</label><textarea rows={3} value={form.log_entry} onChange={e => setForm({...form, log_entry: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
