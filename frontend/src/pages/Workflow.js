import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const stepOrder = ['intake', 'verification', 'filling', 'dispensing', 'completed'];
const stepColors = { intake: '#9c27b0', verification: '#1565c0', filling: '#f57c00', dispensing: '#2e7d32', completed: '#666' };

export default function Workflow({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ patient_name: '', medication: '', rx_number: '', step: 'intake', assigned_to: '', priority: 'normal', notes: '', due_date: '', status: 'pending' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/workflow`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/workflow/${editing.id}` : `${API}/api/workflow`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ patient_name: '', medication: '', rx_number: '', step: 'intake', assigned_to: '', priority: 'normal', notes: '', due_date: '', status: 'pending' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this workflow item?')) return; await fetch(`${API}/api/workflow/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch(`${API}/api/workflow/${id}/optimize`, { method: 'POST' }); const data = await res.json(); setAiResult(data.optimization); }
    catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, medication: item.medication, rx_number: item.rx_number, step: item.step, assigned_to: item.assigned_to, priority: item.priority, notes: item.notes || '', due_date: item.due_date ? item.due_date.split('T')[0] : '', status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ patient_name: '', medication: '', rx_number: '', step: 'intake', assigned_to: '', priority: 'normal', notes: '', due_date: '', status: 'pending' }); setShowForm(true); };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  const priorityColor = (p) => ({ urgent: '#c62828', high: '#e65100', normal: '#1565c0', low: '#666' }[p] || '#666');

  if (loading) return <div className="loading">Loading workflow queue...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Workflow Queue</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Workflow Item</button></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {stepOrder.map(step => {
          const count = items.filter(i => i.step === step).length;
          return (
            <div key={step} style={{ background: 'white', borderRadius: 10, padding: '12px 20px', border: `2px solid ${stepColors[step]}20`, minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: stepColors[step] }}>{count}</div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>{step}</div>
            </div>
          );
        })}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Rx#</th><th>Patient</th><th>Medication</th><th>Step</th><th>Assigned To</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.rx_number}</strong></td>
                <td>{item.patient_name}</td>
                <td>{item.medication}</td>
                <td><span style={{ color: stepColors[item.step], fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>{item.step}</span></td>
                <td>{item.assigned_to}</td>
                <td><span style={{ color: priorityColor(item.priority), fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>{item.priority}</span></td>
                <td>{item.due_date ? new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                <td><span className={`status-badge status-${item.status === 'completed' ? 'verified' : item.status === 'in_progress' ? 'in_progress' : 'pending'}`}>{item.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Workflow Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Rx Number</div><div className="detail-value">{selected.rx_number}</div></div>
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication}</div></div>
                <div className="detail-item"><div className="detail-label">Current Step</div><div className="detail-value" style={{ color: stepColors[selected.step], fontWeight: 700 }}>{selected.step?.toUpperCase()}</div></div>
                <div className="detail-item"><div className="detail-label">Assigned To</div><div className="detail-value">{selected.assigned_to}</div></div>
                <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value" style={{ color: priorityColor(selected.priority), fontWeight: 700 }}>{selected.priority?.toUpperCase()}</div></div>
                <div className="detail-item"><div className="detail-label">Due Date</div><div className="detail-value">{selected.due_date ? new Date(selected.due_date).toLocaleString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status === 'completed' ? 'verified' : 'pending'}`}>{selected.status.replace('_', ' ')}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Notes</div><div className="detail-value">{selected.notes || 'No notes'}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Optimize Workflow</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI optimizing workflow...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI WORKFLOW OPTIMIZATION</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Workflow Item' : 'New Workflow Item'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Rx Number</label><input value={form.rx_number} onChange={e => setForm({...form, rx_number: e.target.value})} /></div>
                <div className="form-group"><label>Step</label><select value={form.step} onChange={e => setForm({...form, step: e.target.value})}>{stepOrder.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label>Assigned To</label><input value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} /></div>
                <div className="form-group"><label>Priority</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div className="form-group"><label>Due Date</label><input type="datetime-local" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
              </div>
              <div className="form-group"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
