import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function AdverseEvents({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ patient_name: '', medication: '', event_date: '', event_description: '', severity: 'moderate', outcome: '', reporter: '', report_type: 'initial', meddra_code: '', causality: '', status: 'reported' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/adverse-events`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/adverse-events/${editing.id}` : `${API}/api/adverse-events`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ patient_name: '', medication: '', event_date: '', event_description: '', severity: 'moderate', outcome: '', reporter: '', report_type: 'initial', meddra_code: '', causality: '', status: 'reported' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this event?')) return; await fetch(`${API}/api/adverse-events/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch(`${API}/api/adverse-events/${id}/assess`, { method: 'POST' }); const data = await res.json(); setAiResult(data.assessment); }
    catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, medication: item.medication, event_date: item.event_date ? item.event_date.split('T')[0] : '', event_description: item.event_description, severity: item.severity, outcome: item.outcome, reporter: item.reporter, report_type: item.report_type, meddra_code: item.meddra_code, causality: item.causality, status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ patient_name: '', medication: '', event_date: '', event_description: '', severity: 'moderate', outcome: '', reporter: '', report_type: 'initial', meddra_code: '', causality: '', status: 'reported' }); setShowForm(true); };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  const severityColor = (s) => ({ mild: '#2e7d32', moderate: '#f57c00', serious: '#c62828', fatal: '#4a148c' }[s] || '#666');

  if (loading) return <div className="loading">Loading adverse events...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Adverse Event Reporting</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Event Report</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Patient</th><th>Medication</th><th>Date</th><th>Severity</th><th>Causality</th><th>Reporter</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td>{item.patient_name}</td>
                <td><strong>{item.medication}</strong></td>
                <td>{item.event_date ? new Date(item.event_date).toLocaleDateString() : 'N/A'}</td>
                <td><span style={{ color: severityColor(item.severity), fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>{item.severity}</span></td>
                <td>{item.causality}</td>
                <td>{item.reporter}</td>
                <td><span className={`status-badge status-${item.status === 'resolved' ? 'verified' : item.status === 'under_review' ? 'pending' : 'flagged'}`}>{item.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Adverse Event Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication}</div></div>
                <div className="detail-item"><div className="detail-label">Event Date</div><div className="detail-value">{selected.event_date ? new Date(selected.event_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value" style={{ color: severityColor(selected.severity), fontWeight: 700 }}>{selected.severity?.toUpperCase()}</div></div>
                <div className="detail-item"><div className="detail-label">Reporter</div><div className="detail-value">{selected.reporter}</div></div>
                <div className="detail-item"><div className="detail-label">Report Type</div><div className="detail-value">{selected.report_type}</div></div>
                <div className="detail-item"><div className="detail-label">MedDRA Code</div><div className="detail-value">{selected.meddra_code}</div></div>
                <div className="detail-item"><div className="detail-label">Causality</div><div className="detail-value">{selected.causality}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status === 'resolved' ? 'verified' : 'flagged'}`}>{selected.status.replace('_', ' ')}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Event Description</div><div className="detail-value">{selected.event_description}</div></div>
              <div className="detail-item" style={{ marginTop: 12 }}><div className="detail-label">Outcome</div><div className="detail-value">{selected.outcome}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Safety Assessment</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI assessing adverse event...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI SAFETY ASSESSMENT</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Event' : 'New Adverse Event Report'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Event Date</label><input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} /></div>
                <div className="form-group"><label>Severity</label><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="serious">Serious</option><option value="fatal">Fatal</option></select></div>
                <div className="form-group"><label>Reporter</label><input value={form.reporter} onChange={e => setForm({...form, reporter: e.target.value})} /></div>
                <div className="form-group"><label>Report Type</label><select value={form.report_type} onChange={e => setForm({...form, report_type: e.target.value})}><option value="initial">Initial</option><option value="follow_up">Follow Up</option><option value="final">Final</option></select></div>
                <div className="form-group"><label>MedDRA Code</label><input value={form.meddra_code} onChange={e => setForm({...form, meddra_code: e.target.value})} /></div>
                <div className="form-group"><label>Causality</label><select value={form.causality} onChange={e => setForm({...form, causality: e.target.value})}><option value="">Select...</option><option value="definite">Definite</option><option value="probable">Probable</option><option value="possible">Possible</option><option value="unlikely">Unlikely</option><option value="not_related">Not Related</option></select></div>
              </div>
              <div className="form-group"><label>Event Description</label><textarea rows={3} value={form.event_description} onChange={e => setForm({...form, event_description: e.target.value})} /></div>
              <div className="form-group"><label>Outcome</label><textarea rows={2} value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
