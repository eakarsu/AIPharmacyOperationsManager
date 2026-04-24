import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Staff({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ first_name: '', last_name: '', role: '', license_number: '', license_expiry: '', phone: '', email: '', hire_date: '', certifications: '', shift_schedule: '', status: 'active' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/staff`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/staff/${editing.id}` : `${API}/api/staff`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ first_name: '', last_name: '', role: '', license_number: '', license_expiry: '', phone: '', email: '', hire_date: '', certifications: '', shift_schedule: '', status: 'active' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this staff member?')) return; await fetch(`${API}/api/staff/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch(`${API}/api/staff/${id}/review`, { method: 'POST' }); const data = await res.json(); setAiResult(data.review); }
    catch (err) { setAiResult('Error: ' + err.message); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ first_name: item.first_name, last_name: item.last_name, role: item.role, license_number: item.license_number || '', license_expiry: item.license_expiry ? item.license_expiry.split('T')[0] : '', phone: item.phone, email: item.email, hire_date: item.hire_date ? item.hire_date.split('T')[0] : '', certifications: item.certifications || '', shift_schedule: item.shift_schedule || '', status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ first_name: '', last_name: '', role: '', license_number: '', license_expiry: '', phone: '', email: '', hire_date: '', certifications: '', shift_schedule: '', status: 'active' }); setShowForm(true); };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  if (loading) return <div className="loading">Loading staff...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Staff Management</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Staff Member</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Role</th><th>License</th><th>License Expiry</th><th>Shift</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td><strong>{item.last_name}, {item.first_name}</strong></td>
                <td>{item.role}</td>
                <td>{item.license_number || 'N/A'}</td>
                <td>{item.license_expiry ? new Date(item.license_expiry).toLocaleDateString() : 'N/A'}</td>
                <td>{item.shift_schedule}</td>
                <td><span className={`status-badge status-${item.status === 'active' ? 'verified' : 'flagged'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Staff Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">First Name</div><div className="detail-value">{selected.first_name}</div></div>
                <div className="detail-item"><div className="detail-label">Last Name</div><div className="detail-value">{selected.last_name}</div></div>
                <div className="detail-item"><div className="detail-label">Role</div><div className="detail-value">{selected.role}</div></div>
                <div className="detail-item"><div className="detail-label">License</div><div className="detail-value">{selected.license_number || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">License Expiry</div><div className="detail-value">{selected.license_expiry ? new Date(selected.license_expiry).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{selected.phone}</div></div>
                <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{selected.email}</div></div>
                <div className="detail-item"><div className="detail-label">Hire Date</div><div className="detail-value">{selected.hire_date ? new Date(selected.hire_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Shift Schedule</div><div className="detail-value">{selected.shift_schedule}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status === 'active' ? 'verified' : 'flagged'}`}>{selected.status}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Certifications</div><div className="detail-value">{selected.certifications || 'None'}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Staff Review</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI reviewing staff member...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI STAFF REVIEW</span></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Staff' : 'New Staff Member'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>First Name</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                <div className="form-group"><label>Last Name</label><input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
                <div className="form-group"><label>Role</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="">Select...</option><option>Pharmacist-in-Charge</option><option>Staff Pharmacist</option><option>Clinical Pharmacist</option><option>Float Pharmacist</option><option>Pharmacy Manager</option><option>Senior Pharmacy Technician</option><option>Pharmacy Technician</option><option>Compounding Technician</option><option>Pharmacy Intern</option><option>Pharmacy Cashier</option><option>Delivery Driver</option><option>Pharmacy Billing Specialist</option></select></div>
                <div className="form-group"><label>License Number</label><input value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} /></div>
                <div className="form-group"><label>License Expiry</label><input type="date" value={form.license_expiry} onChange={e => setForm({...form, license_expiry: e.target.value})} /></div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label>Hire Date</label><input type="date" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})} /></div>
                <div className="form-group"><label>Shift Schedule</label><input value={form.shift_schedule} onChange={e => setForm({...form, shift_schedule: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Certifications</label><textarea rows={2} value={form.certifications} onChange={e => setForm({...form, certifications: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
