import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Patients({ token }) {
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
    const res = await fetch(`${API}/api/patients?page=${p}&limit=20`, { headers });
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
    const url = editing ? `${API}/api/patients/${editing.id}` : `${API}/api/patients`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null);
    setForm({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', insurance_provider: '', policy_number: '', allergies: '', current_medications: '' });
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    await fetch(`${API}/api/patients/${id}`, { method: 'DELETE', headers });
    setSelected(null); fetchItems();
  };

  const handleAI = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/api/patients/${id}/medication-review`, { method: 'POST', headers });
      const data = await res.json();
      setAiResult(data.structured || { raw: data.review });
    } catch (err) { setAiResult({ raw: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const handleCounselingNotes = async (id, meds) => {
    setCounselingLoading(true); setCounselingResult(null);
    try {
      const res = await fetch(`${API}/api/patients/${id}/ai-counseling-notes`, { method: 'POST', headers });
      const data = await res.json();
      setCounselingResult(data.counseling_notes || { raw: data.raw_response });
    } catch (err) { setCounselingResult({ error: err.message }); }
    setCounselingLoading(false);
  };

  const handleAdherence = async (id) => {
    setAdherenceLoading(true); setAdherenceResult(null);
    try {
      const res = await fetch(`${API}/api/patients/${id}/ai-adherence`, { method: 'POST', headers });
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
      const res = await fetch(`${API}/api/ai/drug-interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ medications: medList })
      });
      const data = await res.json();
      setInteractionResult(data);
    } catch (err) { setInteractionResult({ error: err.message }); }
    setInteractionLoading(false);
  };

  const adherenceColor = (cat) => {
    const map = { excellent: '#4caf50', good: '#8bc34a', fair: '#ff9800', poor: '#f44336', unknown: '#9e9e9e' };
    return map[cat] || '#9e9e9e';
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

  const formatAiContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^- (.*$)/gm, '<div style="padding-left:16px">&#8226; $1</div>').replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>').replace(/\n/g, '<br/>');
  };

  const renderStructured = (data) => {
    if (!data) return null;
    if (data.raw) return <div dangerouslySetInnerHTML={{ __html: formatAiContent(data.raw) }} />;
    return (
      <div>
        {data.score !== undefined && <div style={{ marginBottom: 8 }}><strong>Risk Score:</strong> {data.score}/100 {data.requires_pharmacist_review && <span style={{ color: '#f44336', marginLeft: 8 }}>Pharmacist Review Required</span>}</div>}
        {data.concerns && data.concerns.map((c, i) => (
          <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: c.severity === 'high' ? '#fff3cd' : '#f5f5f5', borderRadius: 4, borderLeft: `3px solid ${c.severity === 'high' ? '#f44336' : c.severity === 'moderate' ? '#ff9800' : '#4caf50'}` }}>
            <strong>{c.type}</strong>: {c.description}
            {c.recommendation && <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>Recommendation: {c.recommendation}</div>}
          </div>
        ))}
      </div>
    );
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
                  <div className="ai-response-content">{renderStructured(aiResult)}</div>
                </div>
              )}
              {counselingLoading && <div className="ai-loading"><div className="spinner"></div>Generating counseling notes...</div>}
              {counselingResult && (
                <div className="ai-response" style={{ borderLeft: '4px solid #7b1fa2' }}>
                  <div className="ai-response-header"><span className="ai-badge" style={{ background: '#7b1fa2' }}>COUNSELING NOTES</span></div>
                  <div className="ai-response-content">
                    {counselingResult.error ? <p style={{ color: '#f44336' }}>{counselingResult.error}</p> :
                    counselingResult.counseling_points ? (
                      <div>
                        {counselingResult.counseling_points.map((cp, i) => (
                          <div key={i} style={{ marginBottom: 16, padding: '12px', background: '#f9f4ff', borderRadius: 8 }}>
                            <strong style={{ color: '#7b1fa2', fontSize: 15 }}>{cp.medication}</strong>
                            <div style={{ marginTop: 6 }}><strong>Dosing:</strong> {cp.dosage_instructions}</div>
                            {cp.key_side_effects?.length > 0 && <div style={{ marginTop: 4 }}><strong>Key Side Effects:</strong> {cp.key_side_effects.join(', ')}</div>}
                            {cp.warning_signs?.length > 0 && <div style={{ marginTop: 4, color: '#c62828' }}><strong>Warning Signs:</strong> {cp.warning_signs.join(', ')}</div>}
                            {cp.food_drug_interactions?.length > 0 && <div style={{ marginTop: 4 }}><strong>Food/Drug Interactions:</strong> {cp.food_drug_interactions.join('; ')}</div>}
                            <div style={{ marginTop: 4 }}><strong>Storage:</strong> {cp.storage_instructions}</div>
                          </div>
                        ))}
                        {counselingResult.interaction_warnings?.length > 0 && (
                          <div style={{ padding: '8px 12px', background: '#fff3e0', borderRadius: 6, border: '1px solid #ff9800' }}>
                            <strong>Cross-Medication Warnings:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                              {counselingResult.interaction_warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : <div>{JSON.stringify(counselingResult)}</div>}
                  </div>
                </div>
              )}
              {adherenceLoading && <div className="ai-loading"><div className="spinner"></div>Calculating adherence score...</div>}
              {adherenceResult && adherenceResult.adherence_analysis && (
                <div className="ai-response" style={{ borderLeft: '4px solid #00796b' }}>
                  <div className="ai-response-header"><span className="ai-badge" style={{ background: '#00796b' }}>ADHERENCE ANALYSIS</span></div>
                  <div className="ai-response-content">
                    <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 700, color: adherenceColor(adherenceResult.adherence_analysis.adherence_category) }}>
                          {adherenceResult.adherence_analysis.adherence_score}/100
                        </div>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, color: adherenceColor(adherenceResult.adherence_analysis.adherence_category) }}>
                          {adherenceResult.adherence_analysis.adherence_category}
                        </div>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <div><strong>Fill Rate:</strong> {adherenceResult.refill_stats?.rate}%</div>
                        <div><strong>On-Time Fills:</strong> {adherenceResult.refill_stats?.on_time} / {adherenceResult.refill_stats?.total}</div>
                        {adherenceResult.adherence_analysis.refill_synchronization_candidate && <div style={{ color: '#00796b' }}>&#10003; Candidate for Refill Sync</div>}
                      </div>
                    </div>
                    {adherenceResult.adherence_analysis.risk_factors?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong style={{ color: '#f44336' }}>Risk Factors:</strong>
                        <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{adherenceResult.adherence_analysis.risk_factors.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      </div>
                    )}
                    {adherenceResult.adherence_analysis.intervention_recommendations?.length > 0 && (
                      <div>
                        <strong style={{ color: '#00796b' }}>Interventions:</strong>
                        {adherenceResult.adherence_analysis.intervention_recommendations.map((iv, i) => (
                          <div key={i} style={{ marginTop: 4, padding: '6px 10px', background: '#e8f5e9', borderRadius: 4 }}>
                            <span style={{ fontWeight: 600 }}>{iv.priority?.toUpperCase()}: </span>{iv.intervention}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {interactionLoading && <div className="ai-loading"><div className="spinner"></div>Checking drug interactions...</div>}
              {interactionResult && (
                <div className="ai-response" style={{ borderLeft: '4px solid #e65100' }}>
                  <div className="ai-response-header"><span className="ai-badge" style={{ background: '#e65100' }}>DRUG INTERACTION CHECK</span></div>
                  <div className="ai-response-content">
                    {interactionResult.error ? <p style={{ color: '#f44336' }}>{interactionResult.error}</p> :
                    interactionResult.interaction_matrix ? (
                      <div>
                        {interactionResult.high_risk_pairs?.length > 0 && (
                          <div style={{ padding: '8px 12px', background: '#ffebee', borderRadius: 6, marginBottom: 12, border: '1px solid #f44336' }}>
                            <strong style={{ color: '#f44336' }}>High-Risk Pairs:</strong> {interactionResult.high_risk_pairs.join(', ')}
                          </div>
                        )}
                        {interactionResult.interaction_matrix.filter(m => m.severity !== 'none').map((m, i) => (
                          <div key={i} style={{ marginBottom: 8, padding: '10px 12px', background: '#fff3e0', borderRadius: 6,
                            borderLeft: `4px solid ${m.severity === 'major' ? '#f44336' : m.severity === 'moderate' ? '#ff9800' : '#8bc34a'}` }}>
                            <div style={{ fontWeight: 600 }}>{m.drug_a} + {m.drug_b}
                              <span style={{ marginLeft: 8, fontSize: 12, textTransform: 'uppercase', color: m.severity === 'major' ? '#f44336' : m.severity === 'moderate' ? '#ff9800' : '#8bc34a' }}>
                                {m.severity}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{m.clinical_effect}</div>
                            {m.management && <div style={{ fontSize: 12, color: '#1976d2', marginTop: 4 }}>Management: {m.management}</div>}
                          </div>
                        ))}
                        <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>{interactionResult.overall_risk_summary}</div>
                      </div>
                    ) : <div>{interactionResult.overall_risk_summary || 'No interactions found'}</div>}
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
