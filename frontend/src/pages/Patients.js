import AIReport from '../components/AIReport';
import authenticatedFetch from '../authenticatedFetch';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Patients({ token }) {
  const apiFetch = (url, options) => authenticatedFetch(token, url, options);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [counselingResult, setCounselingResult] = useState(null);
  const [counselingLoading, setCounselingLoading] = useState(false);
  const [adherenceResult, setAdherenceResult] = useState(null);
  const [adherenceLoading, setAdherenceLoading] = useState(false);
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', insurance_provider: '', policy_number: '', allergies: '', current_medications: '' });
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchItems = async (p = page) => {
    const res = await apiFetch(`${API}/api/patients?page=${p}&limit=20`, { headers });
    const data = await res.json();
    if (data.data) {
      setItems(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.totalPages || 1);
    } else {
      setItems(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(page); }, [page]);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/patients/${editing.id}` : `${API}/api/patients`;
    await apiFetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', insurance_provider: '', policy_number: '', allergies: '', current_medications: '' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    await apiFetch(`${API}/api/patients/${id}`, { method: 'DELETE', headers });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await apiFetch(`${API}/api/patients/${id}/medication-review`, { method: 'POST', headers });
      const data = await res.json();
      setAiResult(data.structured || { raw: data.review });
    } catch (err) { setAiResult({ raw: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const handleCounselingNotes = async (id, meds) => {
    setCounselingLoading(true); setCounselingResult(null);
    try {
      const res = await apiFetch(`${API}/api/patients/${id}/ai-counseling-notes`, { method: 'POST', headers });
      const data = await res.json();
      setCounselingResult(data.counseling_notes || { raw: data.raw_response });
    } catch (err) { setCounselingResult({ error: err.message }); }
    setCounselingLoading(false);
  };

  const handleAdherence = async (id) => {
    setAdherenceLoading(true); setAdherenceResult(null);
    try {
      const res = await apiFetch(`${API}/api/patients/${id}/ai-adherence`, { method: 'POST', headers });
      const data = await res.json();
      setAdherenceResult(data);
    } catch (err) { setAdherenceResult({ error: err.message }); }
    setAdherenceLoading(false);
  };

  const handleDrugInteraction = async (patient) => {
    const meds = patient.current_medications;
    if (!meds) return alert('No current medications on file for this patient.');
    const medList = meds.split(/[,;\n]+/).map(m => m.trim()).filter(Boolean);
    if (medList.length < 2) return alert('Patient needs at least 2 medications to check interactions.');
    setInteractionLoading(true); setInteractionResult(null);
    try {
      const res = await apiFetch(`${API}/api/ai/drug-interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ medications: medList })
      });
      const data = await res.json();
      setInteractionResult(data);
    } catch (err) { setInteractionResult({ error: err.message }); }
    setInteractionLoading(false);
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

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
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Med Review</button>
                <button className="btn-ai" style={{ background: '#7b1fa2' }} onClick={() => handleCounselingNotes(selected.id)}>&#9733; Counseling Notes</button>
                <button className="btn-ai" style={{ background: '#00796b' }} onClick={() => handleAdherence(selected.id)}>&#9733; Adherence Score</button>
                <button className="btn-ai" style={{ background: '#e65100' }} onClick={() => handleDrugInteraction(selected)}>&#9733; Drug Interactions</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI reviewing medications...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI MEDICATION REVIEW</span></div>
                  <div className="ai-response-content"><AIReport response={aiResult} title="Medication review" /></div>
                </div>
              )}
              {counselingLoading && <div className="ai-loading"><div className="spinner"></div>Generating counseling notes...</div>}
              {counselingResult && <AIReport response={counselingResult} title="Counseling notes" />}
              {adherenceLoading && <div className="ai-loading"><div className="spinner"></div>Calculating adherence score...</div>}
              {adherenceResult && <AIReport response={adherenceResult} title="Adherence analysis" />}
              {interactionLoading && <div className="ai-loading"><div className="spinner"></div>Checking drug interactions...</div>}
              {interactionResult && <AIReport response={interactionResult} title="Drug interaction check" />}
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
