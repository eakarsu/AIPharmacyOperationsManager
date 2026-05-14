import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Prescriptions({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scanLoading, setScanLoading] = useState(false);
  const [form, setForm] = useState({ patient_name: '', medication: '', dosage: '', frequency: '', prescriber: '', refills: 0, status: 'pending' });
  const fileInputRef = useRef(null);
  const headers = { 'Authorization': `Bearer ${token}` };

  const fetchItems = async (p = page) => {
    const res = await fetch(`${API}/api/prescriptions?page=${p}&limit=20`, { headers });
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
    const url = editing ? `${API}/api/prescriptions/${editing.id}` : `${API}/api/prescriptions`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditing(null);
    setForm({ patient_name: '', medication: '', dosage: '', frequency: '', prescriber: '', refills: 0, status: 'pending' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    await fetch(`${API}/api/prescriptions/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/api/prescriptions/${id}/verify`, { method: 'POST', headers });
      const data = await res.json();
      setAiResult(data.structured || { raw: data.verification });
    } catch (err) {
      setAiResult({ raw: 'Error: ' + err.message });
    }
    setAiLoading(false);
  };

  const handleFraudCheck = async (id) => {
    setFraudLoading(true); setFraudResult(null);
    try {
      const res = await fetch(`${API}/api/prescriptions/${id}/ai-fraud-check`, { method: 'POST', headers });
      const data = await res.json();
      setFraudResult(data);
    } catch (err) { setFraudResult({ error: err.message }); }
    setFraudLoading(false);
  };

  const fraudRiskColor = (level) => {
    const map = { low: '#4caf50', moderate: '#ff9800', high: '#f44336', critical: '#b71c1c' };
    return map[level] || '#9e9e9e';
  };

  const handleScanImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API}/api/prescriptions/scan-image`, {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await res.json();
      if (data.prefill) {
        setForm(prev => ({ ...prev, ...data.prefill }));
        setShowForm(true);
        setEditing(null);
        alert('Rx image scanned! Form pre-filled with extracted data. Please verify before saving.');
      }
    } catch (err) {
      alert('Scan failed: ' + err.message);
    }
    setScanLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ patient_name: item.patient_name, medication: item.medication, dosage: item.dosage, frequency: item.frequency, prescriber: item.prescriber, refills: item.refills, status: item.status });
    setShowForm(true);
    setSelected(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ patient_name: '', medication: '', dosage: '', frequency: '', prescriber: '', refills: 0, status: 'pending' });
    setShowForm(true);
  };

  const formatAiContent = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>')
      .replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>')
      .replace(/\n/g, '<br/>');
  };

  const renderAiStructured = (data) => {
    if (!data) return null;
    if (data.raw) return <div dangerouslySetInnerHTML={{ __html: formatAiContent(data.raw) }} />;
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <strong>Valid:</strong> <span style={{ color: data.valid ? '#4caf50' : '#f44336' }}>{data.valid ? 'Yes' : 'No'}</span>
          {data.confidence !== undefined && <span style={{ marginLeft: 16 }}><strong>Confidence:</strong> {(data.confidence * 100).toFixed(0)}%</span>}
        </div>
        {data.issues && data.issues.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: '#f44336' }}>Issues:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{data.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
          </div>
        )}
        {data.recommendations && data.recommendations.length > 0 && (
          <div>
            <strong style={{ color: '#2196f3' }}>Recommendations:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading">Loading prescriptions...</div>;

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/')}>&#8592; Back to Dashboard</button>
      <div className="page-header">
        <h1>Prescription Verification</h1>
        <div className="page-header-actions">
          <label style={{ cursor: 'pointer' }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanImage} />
            <button className="btn-secondary" style={{ marginRight: 8 }} onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={scanLoading}>
              {scanLoading ? 'Scanning...' : 'Scan Rx Image'}
            </button>
          </label>
          <button className="btn-primary" onClick={openNew}>+ New Prescription</button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Prescriber</th>
              <th>Refills</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); setFraudResult(null); }}>
                <td>{item.patient_name}</td>
                <td><strong>{item.medication}</strong></td>
                <td>{item.dosage}</td>
                <td>{item.frequency}</td>
                <td>{item.prescriber}</td>
                <td>{item.refills}</td>
                <td>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                  {item.status === 'flagged' && <span style={{ marginLeft: 6, fontSize: 11, color: '#b71c1c', fontWeight: 700 }}>&#9888; FRAUD RISK</span>}
                </td>
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
            <div className="modal-header">
              <h2>Prescription Details</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Patient</div><div className="detail-value">{selected.patient_name}</div></div>
                <div className="detail-item"><div className="detail-label">Medication</div><div className="detail-value">{selected.medication}</div></div>
                <div className="detail-item"><div className="detail-label">Dosage</div><div className="detail-value">{selected.dosage}</div></div>
                <div className="detail-item"><div className="detail-label">Frequency</div><div className="detail-value">{selected.frequency}</div></div>
                <div className="detail-item"><div className="detail-label">Prescriber</div><div className="detail-value">{selected.prescriber}</div></div>
                <div className="detail-item"><div className="detail-label">Refills</div><div className="detail-value">{selected.refills}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div></div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-ai" onClick={() => handleAI(selected.id)}>&#9733; AI Verify</button>
                <button className="btn-ai" style={{ background: '#b71c1c' }} onClick={() => handleFraudCheck(selected.id)}>&#9733; Fraud Check</button>
                <button className="btn-edit" onClick={() => openEdit(selected)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              </div>

              {aiLoading && <div className="ai-loading"><div className="spinner"></div>AI analyzing prescription...</div>}
              {aiResult && (
                <div className="ai-response">
                  <div className="ai-response-header"><span className="ai-badge">AI VERIFICATION</span></div>
                  <div className="ai-response-content">{renderAiStructured(aiResult)}</div>
                </div>
              )}
              {fraudLoading && <div className="ai-loading"><div className="spinner"></div>Running fraud detection...</div>}
              {fraudResult && (
                <div className="ai-response" style={{ borderLeft: `4px solid ${fraudRiskColor(fraudResult.fraud_assessment?.risk_level)}` }}>
                  <div className="ai-response-header">
                    <span className="ai-badge" style={{ background: fraudRiskColor(fraudResult.fraud_assessment?.risk_level) }}>FRAUD DETECTION</span>
                    {fraudResult.fraud_assessment?.risk_level && (
                      <span style={{ marginLeft: 12, fontSize: 13, color: fraudRiskColor(fraudResult.fraud_assessment.risk_level), fontWeight: 700 }}>
                        {fraudResult.fraud_assessment.risk_level.toUpperCase()} RISK — Score: {fraudResult.fraud_assessment.risk_score}/100
                      </span>
                    )}
                  </div>
                  <div className="ai-response-content">
                    {fraudResult.error ? <p style={{ color: '#f44336' }}>{fraudResult.error}</p> : (
                      <div>
                        {fraudResult.fraud_assessment?.red_flags?.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <strong style={{ color: '#f44336' }}>Red Flags:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{fraudResult.fraud_assessment.red_flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
                          </div>
                        )}
                        {fraudResult.fraud_assessment?.positive_indicators?.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <strong style={{ color: '#4caf50' }}>Positive Indicators:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{fraudResult.fraud_assessment.positive_indicators.map((p, i) => <li key={i}>{p}</li>)}</ul>
                          </div>
                        )}
                        <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                          <strong>Recommended Action:</strong> <span style={{ color: '#1976d2', fontWeight: 600 }}>{fraudResult.fraud_assessment?.recommended_action?.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        {fraudResult.fraud_assessment?.assessment && (
                          <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>{fraudResult.fraud_assessment.assessment}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Prescription' : 'New Prescription'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="form-group"><label>Medication</label><input value={form.medication} onChange={e => setForm({...form, medication: e.target.value})} /></div>
                <div className="form-group"><label>Dosage</label><input value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} /></div>
                <div className="form-group"><label>Frequency / Directions</label><input value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} /></div>
                <div className="form-group"><label>Prescriber</label><input value={form.prescriber} onChange={e => setForm({...form, prescriber: e.target.value})} /></div>
                <div className="form-group"><label>Refills</label><input type="number" value={form.refills} onChange={e => setForm({...form, refills: parseInt(e.target.value) || 0})} /></div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
