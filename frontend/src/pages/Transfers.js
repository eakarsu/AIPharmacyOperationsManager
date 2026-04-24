import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Transfers({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ patient_name: '', medication: '', rx_number: '', from_pharmacy: '', from_phone: '', to_pharmacy: '', to_phone: '', transfer_type: 'outgoing', pharmacist_name: '', refills_remaining: 0, original_fill_date: '', notes: '', status: 'pending' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/transfers`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/transfers/${editing.id}` : `${API}/api/transfers`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ patient_name: '', medication: '', rx_number: '', from_pharmacy: '', from_phone: '', to_pharmacy: '', to_phone: '', transfer_type: 'outgoing', pharmacist_name: '', refills_remaining: 0, original_fill_date: '', notes: '', status: 'pending' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this transfer?')) return; await fetch(`${API}/api/transfers/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, medication: item.medication, rx_number: item.rx_number, from_pharmacy: item.from_pharmacy, from_phone: item.from_phone || '', to_pharmacy: item.to_pharmacy, to_phone: item.to_phone || '', transfer_type: item.transfer_type, pharmacist_name: item.pharmacist_name, refills_remaining: item.refills_remaining, original_fill_date: item.original_fill_date ? item.original_fill_date.split('T')[0] : '', notes: item.notes || '', status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ patient_name: '', medication: '', rx_number: '', from_pharmacy: '', from_phone: '', to_pharmacy: '', to_phone: '', transfer_type: 'outgoing', pharmacist_name: '', refills_remaining: 0, original_fill_date: '', notes: '', status: 'pending' }); setShowForm(true); };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'status-verified';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-flagged';
      default: return 'status-pending';
    }
  };

  if (loading) return <div className="loading">Loading transfers...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Prescription Transfers</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Transfer</button></div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Patient</th><th>Medication</th><th>Rx #</th><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.patient_name}</strong></td>
                <td>{item.medication}</td>
                <td>{item.rx_number}</td>
                <td><span className={`status-badge ${item.transfer_type === 'incoming' ? 'status-verified' : 'status-pending'}`}>{item.transfer_type}</span></td>
                <td>{item.from_pharmacy}</td>
                <td>{item.to_pharmacy}</td>
                <td><span className={`status-badge ${getStatusColor(item.status)}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Transfer Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication}</div></div>
                <div className="detail-item"><div className="detail-label">Rx Number</div><div className="detail-value">{selected.rx_number}</div></div>
                <div className="detail-item"><div className="detail-label">Transfer Type</div><div className="detail-value"><span className={`status-badge ${selected.transfer_type === 'incoming' ? 'status-verified' : 'status-pending'}`}>{selected.transfer_type}</span></div></div>
                <div className="detail-item"><div className="detail-label">From Pharmacy</div><div className="detail-value">{selected.from_pharmacy}</div></div>
                <div className="detail-item"><div className="detail-label">From Phone</div><div className="detail-value">{selected.from_phone || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">To Pharmacy</div><div className="detail-value">{selected.to_pharmacy}</div></div>
                <div className="detail-item"><div className="detail-label">To Phone</div><div className="detail-value">{selected.to_phone || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Pharmacist</div><div className="detail-value">{selected.pharmacist_name}</div></div>
                <div className="detail-item"><div className="detail-label">Refills Remaining</div><div className="detail-value">{selected.refills_remaining}</div></div>
                <div className="detail-item"><div className="detail-label">Original Fill Date</div><div className="detail-value">{selected.original_fill_date ? new Date(selected.original_fill_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${getStatusColor(selected.status)}`}>{selected.status}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Notes</div><div className="detail-value">{selected.notes || 'None'}</div></div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Transfer' : 'New Transfer'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Rx Number</label><input value={form.rx_number} onChange={e => setForm({...form, rx_number: e.target.value})} /></div>
                <div className="form-group"><label>Transfer Type</label><select value={form.transfer_type} onChange={e => setForm({...form, transfer_type: e.target.value})}><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option></select></div>
                <div className="form-group"><label>From Pharmacy</label><input value={form.from_pharmacy} onChange={e => setForm({...form, from_pharmacy: e.target.value})} /></div>
                <div className="form-group"><label>From Phone</label><input value={form.from_phone} onChange={e => setForm({...form, from_phone: e.target.value})} /></div>
                <div className="form-group"><label>To Pharmacy</label><input value={form.to_pharmacy} onChange={e => setForm({...form, to_pharmacy: e.target.value})} /></div>
                <div className="form-group"><label>To Phone</label><input value={form.to_phone} onChange={e => setForm({...form, to_phone: e.target.value})} /></div>
                <div className="form-group"><label>Pharmacist Name</label><input value={form.pharmacist_name} onChange={e => setForm({...form, pharmacist_name: e.target.value})} /></div>
                <div className="form-group"><label>Refills Remaining</label><input type="number" value={form.refills_remaining} onChange={e => setForm({...form, refills_remaining: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Original Fill Date</label><input type="date" value={form.original_fill_date} onChange={e => setForm({...form, original_fill_date: e.target.value})} /></div>
                {editing && <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>}
              </div>
              <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
