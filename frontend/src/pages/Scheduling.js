import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Scheduling({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ staff_name: '', role: '', shift_date: '', start_time: '', end_time: '', shift_type: 'regular', location: 'Main Pharmacy', notes: '', status: 'scheduled' });

  const fetchItems = async () => { const res = await fetch(`${API}/api/scheduling`); setItems(await res.json()); setLoading(false); };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/scheduling/${editing.id}` : `${API}/api/scheduling`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ staff_name: '', role: '', shift_date: '', start_time: '', end_time: '', shift_type: 'regular', location: 'Main Pharmacy', notes: '', status: 'scheduled' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this shift?')) return; await fetch(`${API}/api/scheduling/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ staff_name: item.staff_name, role: item.role, shift_date: item.shift_date ? item.shift_date.split('T')[0] : '', start_time: item.start_time || '', end_time: item.end_time || '', shift_type: item.shift_type, location: item.location || 'Main Pharmacy', notes: item.notes || '', status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ staff_name: '', role: '', shift_date: viewDate, start_time: '08:00', end_time: '16:00', shift_type: 'regular', location: 'Main Pharmacy', notes: '', status: 'scheduled' }); setShowForm(true); };

  const getShiftColor = (type) => {
    switch (type) {
      case 'morning': return '#3498db';
      case 'afternoon': return '#e67e22';
      case 'evening': return '#9b59b6';
      case 'overnight': return '#2c3e50';
      case 'regular': return '#27ae60';
      default: return '#7f8c8d';
    }
  };

  // Group shifts by date
  const shiftsByDate = {};
  items.forEach(item => {
    const date = item.shift_date ? item.shift_date.split('T')[0] : 'unscheduled';
    if (!shiftsByDate[date]) shiftsByDate[date] = [];
    shiftsByDate[date].push(item);
  });

  const sortedDates = Object.keys(shiftsByDate).sort();

  if (loading) return <div className="loading">Loading schedule...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Shift Scheduling</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
          <button className="btn-primary" onClick={openNew}>+ New Shift</button>
        </div>
      </div>

      {sortedDates.map(date => (
        <div key={date} style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8, color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: 4 }}>
            {date === 'unscheduled' ? 'Unscheduled' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>({shiftsByDate[date].length} shifts)</span>
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Staff</th><th>Role</th><th>Time</th><th>Type</th><th>Location</th><th>Status</th></tr></thead>
              <tbody>
                {shiftsByDate[date].map(item => (
                  <tr key={item.id} onClick={() => setSelected(item)}>
                    <td><strong>{item.staff_name}</strong></td>
                    <td>{item.role}</td>
                    <td>{item.start_time} - {item.end_time}</td>
                    <td><span style={{ background: getShiftColor(item.shift_type), color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{item.shift_type}</span></td>
                    <td>{item.location}</td>
                    <td><span className={`status-badge ${item.status === 'scheduled' ? 'status-verified' : item.status === 'cancelled' ? 'status-flagged' : 'status-pending'}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {items.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>No shifts scheduled. Click "+ New Shift" to add one.</div>}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Shift Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Staff Name</div><div className="detail-value">{selected.staff_name}</div></div>
                <div className="detail-item"><div className="detail-label">Role</div><div className="detail-value">{selected.role}</div></div>
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{selected.shift_date ? new Date(selected.shift_date + 'T12:00:00').toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Start Time</div><div className="detail-value">{selected.start_time}</div></div>
                <div className="detail-item"><div className="detail-label">End Time</div><div className="detail-value">{selected.end_time}</div></div>
                <div className="detail-item"><div className="detail-label">Shift Type</div><div className="detail-value"><span style={{ background: getShiftColor(selected.shift_type), color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{selected.shift_type}</span></div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${selected.status === 'scheduled' ? 'status-verified' : selected.status === 'cancelled' ? 'status-flagged' : 'status-pending'}`}>{selected.status}</span></div></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Shift' : 'New Shift'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Staff Name</label><input value={form.staff_name} onChange={e => setForm({...form, staff_name: e.target.value})} /></div>
                <div className="form-group"><label>Role</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="">Select...</option><option>Pharmacist-in-Charge</option><option>Staff Pharmacist</option><option>Clinical Pharmacist</option><option>Float Pharmacist</option><option>Pharmacy Manager</option><option>Senior Pharmacy Technician</option><option>Pharmacy Technician</option><option>Compounding Technician</option><option>Pharmacy Intern</option><option>Pharmacy Cashier</option><option>Delivery Driver</option><option>Pharmacy Billing Specialist</option></select></div>
                <div className="form-group"><label>Shift Date</label><input type="date" value={form.shift_date} onChange={e => setForm({...form, shift_date: e.target.value})} /></div>
                <div className="form-group"><label>Start Time</label><input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} /></div>
                <div className="form-group"><label>End Time</label><input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} /></div>
                <div className="form-group"><label>Shift Type</label><select value={form.shift_type} onChange={e => setForm({...form, shift_type: e.target.value})}><option value="regular">Regular</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="overnight">Overnight</option><option value="on_call">On Call</option></select></div>
                <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                {editing && <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></select></div>}
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
