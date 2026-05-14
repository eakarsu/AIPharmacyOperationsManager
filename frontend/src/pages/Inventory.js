import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Inventory({ token }) {
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
  const [form, setForm] = useState({ name: '', ndc_code: '', category: '', quantity: 0, unit_cost: 0, supplier: '', reorder_level: 10, expiry_date: '', location: '' });
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchItems = async (p = page) => {
    const res = await fetch(`${API}/api/inventory?page=${p}&limit=20`, { headers });
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
    const url = editing ? `${API}/api/inventory/${editing.id}` : `${API}/api/inventory`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ name: '', ndc_code: '', category: '', quantity: 0, unit_cost: 0, supplier: '', reorder_level: 10, expiry_date: '', location: '' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    await fetch(`${API}/api/inventory/${id}`, { method: 'DELETE', headers });
    setSelected(null); fetchItems();
  };

  const handleAI = async () => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/inventory/ai/analyze`, { method: 'POST', headers });
      const data = await res.json();
      setAiResult(data.structured || { raw: data.analysis });
    } catch (err) { setAiResult({ raw: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, ndc_code: item.ndc_code, category: item.category, quantity: item.quantity, unit_cost: item.unit_cost, supplier: item.supplier, reorder_level: item.reorder_level, expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '', location: item.location });
    setShowForm(true); setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', ndc_code: '', category: '', quantity: 0, unit_cost: 0, supplier: '', reorder_level: 10, expiry_date: '', location: '' });
    setShowForm(true);
  };

  const isLowStock = (item) => item.quantity <= item.reorder_level;

  const renderAiStructured = (data) => {
    if (!data) return null;
    if (data.raw) return <div>{data.raw}</div>;
    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <span><strong>Priority:</strong> <span style={{ color: data.priority === 'critical' ? '#f44336' : data.priority === 'urgent' ? '#ff9800' : '#4caf50', textTransform: 'uppercase' }}>{data.priority}</span></span>
          <span><strong>Est. Cost:</strong> ${(data.total_estimated_cost || 0).toLocaleString()}</span>
        </div>
        {data.reorder_items && data.reorder_items.map((item, i) => (
          <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            <strong>{item.drug_name}</strong>: {item.current_qty} on hand, order {item.recommended_order_qty} units
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.reason}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="loading">Loading inventory...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Inventory Management</h1>
        <div className="page-header-actions">
          <button className="btn-ai" onClick={handleAI}>&#9733; AI Inventory Analysis</button>
          <button className="btn-primary" onClick={openNew}>+ New Item</button>
        </div>
      </div>

      {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI analyzing inventory...</div>}
      {aiResult && !selected && (
        <div className="ai-response" style={{ marginBottom: 24 }}>
          <div className="ai-response-header"><span className="ai-badge">AI INVENTORY ANALYSIS</span><button className="modal-close" onClick={() => setAiResult(null)} style={{marginLeft:'auto'}}>&times;</button></div>
          <div className="ai-response-content">{renderAiStructured(aiResult)}</div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>NDC Code</th><th>Category</th><th>Quantity</th><th>Unit Cost</th><th>Supplier</th><th>Location</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }} style={isLowStock(item) ? { background: '#fff8f0' } : {}}>
                <td><strong>{item.name}</strong> {isLowStock(item) && <span className="status-badge status-flagged">LOW</span>}</td>
                <td>{item.ndc_code}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>${parseFloat(item.unit_cost).toFixed(2)}</td>
                <td>{item.supplier}</td>
                <td>{item.location}</td>
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
            <div className="modal-header"><h2>Inventory Details</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{selected.name}</div></div>
                <div className="detail-item"><div className="detail-label">NDC Code</div><div className="detail-value">{selected.ndc_code}</div></div>
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selected.category}</div></div>
                <div className="detail-item"><div className="detail-label">Quantity</div><div className="detail-value">{selected.quantity} {isLowStock(selected) && <span className="status-badge status-flagged">LOW STOCK</span>}</div></div>
                <div className="detail-item"><div className="detail-label">Unit Cost</div><div className="detail-value">${parseFloat(selected.unit_cost).toFixed(2)}</div></div>
                <div className="detail-item"><div className="detail-label">Supplier</div><div className="detail-value">{selected.supplier}</div></div>
                <div className="detail-item"><div className="detail-label">Reorder Level</div><div className="detail-value">{selected.reorder_level}</div></div>
                <div className="detail-item"><div className="detail-label">Expiry Date</div><div className="detail-value">{selected.expiry_date ? new Date(selected.expiry_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location}</div></div>
              </div>
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
            <div className="modal-header"><h2>{editing ? 'Edit Item' : 'New Item'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label>NDC Code</label><input value={form.ndc_code} onChange={e => setForm({...form, ndc_code: e.target.value})} /></div>
                <div className="form-group"><label>Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
                <div className="form-group"><label>Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Unit Cost ($)</label><input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: parseFloat(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Supplier</label><input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} /></div>
                <div className="form-group"><label>Reorder Level</label><input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} /></div>
                <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
