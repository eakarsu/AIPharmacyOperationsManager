import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Financials({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ patient_name: '', type: 'payment', amount: '', payment_method: 'cash', reference_number: '', medication: '', insurance_provider: '', description: '', processed_by: '', status: 'completed' });

  const fetchItems = async () => {
    const [res, sumRes] = await Promise.all([fetch(`${API}/api/financials`), fetch(`${API}/api/financials/summary`)]);
    setItems(await res.json());
    setSummary(await sumRes.json());
    setLoading(false);
  };
  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/api/financials/${editing.id}` : `${API}/api/financials`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
    setShowForm(false); setEditing(null);
    setForm({ patient_name: '', type: 'payment', amount: '', payment_method: 'cash', reference_number: '', medication: '', insurance_provider: '', description: '', processed_by: '', status: 'completed' });
    fetchItems();
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this transaction?')) return; await fetch(`${API}/api/financials/${id}`, { method: 'DELETE' }); setSelected(null); fetchItems(); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, type: item.type, amount: item.amount, payment_method: item.payment_method, reference_number: item.reference_number || '', medication: item.medication || '', insurance_provider: item.insurance_provider || '', description: item.description || '', processed_by: item.processed_by || '', status: item.status });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => { setEditing(null); setForm({ patient_name: '', type: 'payment', amount: '', payment_method: 'cash', reference_number: '', medication: '', insurance_provider: '', description: '', processed_by: '', status: 'completed' }); setShowForm(true); };

  const getTypeColor = (type) => {
    switch (type) {
      case 'payment': return 'status-verified';
      case 'copay': return 'status-verified';
      case 'insurance_reimbursement': return 'status-verified';
      case 'refund': return 'status-flagged';
      default: return 'status-pending';
    }
  };

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

  if (loading) return <div className="loading">Loading financials...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Financial Transactions</h1>
        <div className="page-header-actions"><button className="btn-primary" onClick={openNew}>+ New Transaction</button></div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Payments</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#27ae60' }}>{formatCurrency(summary.total_payments)}</div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Copays</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#2980b9' }}>{formatCurrency(summary.total_copays)}</div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Reimbursements</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#8e44ad' }}>{formatCurrency(summary.total_reimbursements)}</div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Refunds</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(summary.total_refunds)}</div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Net Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#2c3e50' }}>{formatCurrency(summary.net_total)}</div>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Patient</th><th>Type</th><th>Amount</th><th>Method</th><th>Medication</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td>{new Date(item.transaction_date).toLocaleDateString()}</td>
                <td><strong>{item.patient_name}</strong></td>
                <td><span className={`status-badge ${getTypeColor(item.type)}`}>{item.type.replace('_', ' ')}</span></td>
                <td style={{ fontWeight: 700, color: item.type === 'refund' ? '#e74c3c' : '#27ae60' }}>{formatCurrency(item.amount)}</td>
                <td>{item.payment_method}</td>
                <td>{item.medication || '-'}</td>
                <td><span className={`status-badge ${item.status === 'completed' ? 'status-verified' : 'status-pending'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Transaction Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{new Date(selected.transaction_date).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value"><span className={`status-badge ${getTypeColor(selected.type)}`}>{selected.type.replace('_', ' ')}</span></div></div>
                <div className="detail-item"><div className="detail-label">Amount</div><div className="detail-value" style={{ fontWeight: 700, fontSize: 18 }}>{formatCurrency(selected.amount)}</div></div>
                <div className="detail-item"><div className="detail-label">Payment Method</div><div className="detail-value">{selected.payment_method}</div></div>
                <div className="detail-item"><div className="detail-label">Reference #</div><div className="detail-value">{selected.reference_number || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Insurance</div><div className="detail-value">{selected.insurance_provider || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Processed By</div><div className="detail-value">{selected.processed_by || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${selected.status === 'completed' ? 'status-verified' : 'status-pending'}`}>{selected.status}</span></div></div>
              </div>
              <div className="detail-item" style={{ marginTop: 16 }}><div className="detail-label">Description</div><div className="detail-value">{selected.description || 'None'}</div></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Transaction' : 'New Transaction'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="payment">Payment</option><option value="copay">Copay</option><option value="insurance_reimbursement">Insurance Reimbursement</option><option value="refund">Refund</option></select></div>
                <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <div className="form-group"><label>Payment Method</label><select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}><option value="cash">Cash</option><option value="credit_card">Credit Card</option><option value="debit_card">Debit Card</option><option value="insurance">Insurance</option><option value="check">Check</option></select></div>
                <div className="form-group"><label>Reference #</label><input value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Insurance Provider</label><input value={form.insurance_provider} onChange={e => setForm({...form, insurance_provider: e.target.value})} /></div>
                <div className="form-group"><label>Processed By</label><input value={form.processed_by} onChange={e => setForm({...form, processed_by: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
