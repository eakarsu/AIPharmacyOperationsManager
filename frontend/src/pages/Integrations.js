import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PROVIDERS = [
  { key: 'ncpdp', label: 'NCPDP / SureScripts', endpoint: '/api/integrations/ncpdp/send', envVar: 'NCPDP_API_KEY',
    fields: [{ k: 'patient_id', label: 'Patient ID' }, { k: 'prescription_id', label: 'Prescription ID' }, { k: 'ndc', label: 'NDC' }] },
  { key: 'pbm', label: 'PBM Pre-Auth', endpoint: '/api/integrations/pbm/preauth', envVar: 'PBM_API_KEY',
    fields: [{ k: 'patient_id', label: 'Patient ID' }, { k: 'drug', label: 'Drug' }, { k: 'quantity', label: 'Quantity' }, { k: 'days_supply', label: 'Days Supply' }, { k: 'member_id', label: 'Member ID' }] },
  { key: 'fhir', label: 'FHIR EHR Sync', endpoint: '/api/integrations/fhir/sync', envVar: 'FHIR_API_KEY',
    fields: [{ k: 'patient_id', label: 'Patient ID' }, { k: 'mrn', label: 'MRN' }] },
];

export default function Integrations({ token }) {
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const loadLog = async () => {
    try {
      const r = await fetch(`${API}/api/integrations/log`, { headers });
      const data = await r.json();
      if (Array.isArray(data)) setLog(data);
    } catch (_) {}
  };
  useEffect(() => { loadLog(); }, []); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setResult(null);
    try {
      const r = await fetch(`${API}${provider.endpoint}`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await r.json();
      setResult({ status: r.status, data });
      loadLog();
    } catch (err) {
      setResult({ error: err.message });
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>External Integrations</h2>
      <p style={{ color: '#6b7280' }}>Each provider is gated on its env var; missing var returns 503 with the missing key name.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {PROVIDERS.map((p) => (
          <button key={p.key} onClick={() => { setProvider(p); setForm({}); setResult(null); }}
            style={{ padding: '8px 14px', borderRadius: 6, border: 'none',
              background: provider.key === p.key ? '#3b82f6' : '#e5e7eb',
              color: provider.key === p.key ? '#fff' : '#111', cursor: 'pointer' }}>
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ background: '#f9fafb', padding: 16, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          POST <code>{provider.endpoint}</code> — gated on <code>{provider.envVar}</code>
        </div>
        {provider.fields.map((f) => (
          <div key={f.k} style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12 }}>{f.label}</label>
            <input value={form[f.k] || ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              style={{ width: '100%', padding: 6, border: '1px solid #d1d5db', borderRadius: 4 }} />
          </div>
        ))}
        <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 }}>
          {busy ? 'Calling…' : 'Call Provider'}
        </button>
      </form>

      {result && (
        <pre style={{ marginTop: 16, padding: 12, background: '#f3f4f6', borderRadius: 6, fontSize: 12, overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <h3 style={{ marginTop: 24 }}>Recent Calls</h3>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>When</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Provider</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Patient</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Response</th>
          </tr>
        </thead>
        <tbody>
          {log.length === 0 ? <tr><td colSpan="4" style={{ padding: 8, color: '#9ca3af' }}>No calls yet</td></tr> :
            log.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{new Date(row.created_at).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{row.provider}</td>
                <td style={{ padding: 8 }}>{row.patient_id || '—'}</td>
                <td style={{ padding: 8, fontSize: 11, color: '#6b7280' }}>{JSON.stringify(row.response).slice(0, 80)}…</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
