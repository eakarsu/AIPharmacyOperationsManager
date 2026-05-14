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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showReconcile, setShowReconcile] = useState(false);
  const [reconcileForm, setReconcileForm] = useState({ dispensed_qty: '', reason: '' });
  const [form, setForm] = useState({ name: '', dea_schedule: 'Schedule II', quantity_on_hand: 0, quantity_dispensed: 0, prescriber_dea: '', patient_name: '', dispensed_date: '', log_entry: '', status: 'logged' });
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchItems = async (p = page) => {
    const res = await fetch(`${API}/api/controlled?page=${p}&limit=20`, { headers });
    const data = await res.json();
    if (data.data) {
      setItems(data.data);
      setTotalPages(data.totalPages || 1);
    } else {
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(page); }, [page]);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/controlled/${editing.id}` : `${API}/api/controlled`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ name: '', dea_schedule: 'Schedule II', quantity_on_hand: 0, quantity_dispensed: 0, prescriber_dea: '', patient_name: '', dispensed_date: '', log_entry: '', status: 'logged' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await fetch(`${API}/api/controlled/${id}`, { method: 'DELETE', headers });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/controlled/${id}/compliance-check`, { method: 'POST', headers });
      const data = await res.json();
      setAiResult(data.structured || { raw: data.compliance });
    } catch (err) { setAiResult({ raw: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const handleReconcile = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/api/controlled/${selected.id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ dispensed_qty: parseInt(reconcileForm.dispensed_qty), reason: reconcileForm.reason })
      });
      const data = await res.json();
      if (data.has_discrepancy) {
        alert(`DISCREPANCY DETECTED: Expected ${data.expected_qty}, got ${data.dispensed_qty} (diff: ${data.discrepancy}). Audit log created.`);
      } else {
        alert('Reconciliation complete. No discrepancy found.');
      }
      setShowReconcile(false);
      setReconcileForm({ dispensed_qty: '', reason: '' });
      fetchItems();
    } catch (err) {
      alert('Reconciliation failed: ' + err.message);
    }
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

  const renderAiStructured = (data) => {
    if (!data) return null;
    if (data.raw) return <div>{data.raw}</div>;
    return (
      <div>
        {data.score !== undefined && <div style={{ marginBottom: 8 }}><strong>Compliance Score:</strong> {data.score}/100 {data.requires_pharmacist_review && <span style={{ color: '#f44336', marginLeft: 8 }}>Review Required</span>}</div>}
        {data.concerns && data.concerns.map((c, i) => (
          <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4, borderLeft: `3px solid ${c.severity === 'high' ? '#f44336' : c.severity === 'moderate' ? '#ff9800' : '#4caf50'}` }}>
            <strong>{c.type}</strong>: {c.description}
            {c.recommendation && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Action: {c.recommendation}</div>}
          </div>
        ))}
      </div>
    );
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
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Compliance Check</button>
                <button className="btn-secondary" onClick={() => { setShowReconcile(true); setReconcileForm({ dispensed_qty: selected.quantity_dispensed, reason: '' }); }}>Reconcile</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>

              {showReconcile && (
                <div style={{ marginTop: 16, padding: 16, background: '#fff8e1', borderRadius: 6, border: '1px solid #ffe082' }}>
                  <h4 style={{ margin: '0 0 12px' }}>Reconcile Controlled Substance</h4>
                  <div className="form-group">
                    <label>Actual Dispensed Quantity</label>
                    <input type="number" value={reconcileForm.dispensed_qty} onChange={e => setReconcileForm({...reconcileForm, dispensed_qty: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Reason / Notes</label>
                    <textarea rows={2} value={reconcileForm.reason} onChange={e => setReconcileForm({...reconcileForm, reason: e.target.value})} placeholder="Reason for reconciliation..." />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={handleReconcile}>Submit Reconciliation</button>
                    <button className="btn-secondary" onClick={() => setShowReconcile(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI checking compliance...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI COMPLIANCE CHECK</span></div>
                  <div className="ai-response-content">{renderAiStructured(aiResult)}</div>
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
