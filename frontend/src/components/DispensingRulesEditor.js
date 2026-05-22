import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const emptyForm = {
  rule_name: '',
  drug_class: '',
  max_refills: 0,
  max_days_supply: 30,
  controlled_schedule: '',
  requires_id_check: false,
  requires_pmp_check: false,
  notes: '',
  active: true,
};

export default function DispensingRulesEditor({ token }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/custom-views/dispensing-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      setRules(data.rules || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API}/api/custom-views/dispensing-rules/${editingId}`
        : `${API}/api/custom-views/dispensing-rules`;
      const r = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (rule) => {
    setEditingId(rule.id);
    setForm({
      rule_name: rule.rule_name || '',
      drug_class: rule.drug_class || '',
      max_refills: rule.max_refills || 0,
      max_days_supply: rule.max_days_supply || 30,
      controlled_schedule: rule.controlled_schedule || '',
      requires_id_check: !!rule.requires_id_check,
      requires_pmp_check: !!rule.requires_pmp_check,
      notes: rule.notes || '',
      active: rule.active !== false,
    });
  };

  const del = async (id) => {
    if (!window.confirm('Delete this dispensing rule?')) return;
    await fetch(`${API}/api/custom-views/dispensing-rules/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await load();
  };

  const cancel = () => { setEditingId(null); setForm(emptyForm); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Dispensing Rules Editor</h3>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <input placeholder="Rule name" value={form.rule_name} onChange={e => set('rule_name', e.target.value)} required />
        <input placeholder="Drug class (e.g. Opioid)" value={form.drug_class} onChange={e => set('drug_class', e.target.value)} />
        <label style={{ fontSize: 12 }}>Max refills
          <input type="number" min="0" value={form.max_refills} onChange={e => set('max_refills', parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
        </label>
        <label style={{ fontSize: 12 }}>Max days supply
          <input type="number" min="1" value={form.max_days_supply} onChange={e => set('max_days_supply', parseInt(e.target.value) || 30)} style={{ width: '100%' }} />
        </label>
        <input placeholder="Controlled schedule (CII, CIII, ...)" value={form.controlled_schedule} onChange={e => set('controlled_schedule', e.target.value)} />
        <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={form.requires_id_check} onChange={e => set('requires_id_check', e.target.checked)} />
          Requires ID check
        </label>
        <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={form.requires_pmp_check} onChange={e => set('requires_pmp_check', e.target.checked)} />
          Requires PMP check
        </label>
        <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
          Active
        </label>
        <textarea placeholder="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ gridColumn: '1 / span 2' }} />
        <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy} style={{ padding: '6px 14px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && <button type="button" onClick={cancel} style={{ padding: '6px 14px' }}>Cancel</button>}
        </div>
      </form>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={{ padding: 6, textAlign: 'left' }}>Name</th>
            <th style={{ padding: 6 }}>Class</th>
            <th style={{ padding: 6 }}>Schedule</th>
            <th style={{ padding: 6 }}>Refills</th>
            <th style={{ padding: 6 }}>Days</th>
            <th style={{ padding: 6 }}>ID</th>
            <th style={{ padding: 6 }}>PMP</th>
            <th style={{ padding: 6 }}>Active</th>
            <th style={{ padding: 6 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: 6 }}>{r.rule_name}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.drug_class || '-'}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.controlled_schedule || '-'}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.max_refills}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.max_days_supply}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.requires_id_check ? 'Y' : ''}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.requires_pmp_check ? 'Y' : ''}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>{r.active ? 'Y' : 'N'}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>
                <button onClick={() => edit(r)} style={{ marginRight: 4 }}>Edit</button>
                <button onClick={() => del(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
