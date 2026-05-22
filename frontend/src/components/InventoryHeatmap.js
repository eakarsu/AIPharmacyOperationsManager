import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function InventoryHeatmap({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/custom-views/inventory-heatmap`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message));
  }, [token]);

  if (error) return <div style={{ color: 'crimson' }}>Heatmap error: {error}</div>;
  if (!data) return <div>Loading heatmap...</div>;

  const { classes = [], locations = [], matrix = [] } = data;
  const flat = matrix.flat();
  const maxVal = Math.max(1, ...flat);
  const color = (v) => {
    if (v === 0) return '#1e293b';
    const t = v / maxVal;
    const r = Math.round(56 + (239 - 56) * t);
    const g = Math.round(189 - (189 - 68) * t);
    const b = Math.round(248 - (248 - 68) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Inventory Level Heatmap (Drug Class x Location)</h3>
      {classes.length === 0 ? (
        <div style={{ fontSize: 13 }}>No inventory data.</div>
      ) : (
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: 6, textAlign: 'left' }}></th>
              {locations.map(l => (
                <th key={l} style={{ padding: 6, color: '#94a3b8', fontWeight: 600 }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((cls, i) => (
              <tr key={cls}>
                <td style={{ padding: 6, color: '#cbd5e1', fontWeight: 600 }}>{cls}</td>
                {locations.map((loc, j) => {
                  const v = matrix[i][j];
                  return (
                    <td
                      key={loc}
                      title={`${cls} @ ${loc}: ${v} units`}
                      style={{
                        padding: '12px 16px',
                        background: color(v),
                        color: v > maxVal * 0.5 ? '#fff' : '#e2e8f0',
                        textAlign: 'center',
                        minWidth: 60,
                        border: '1px solid #0f172a'
                      }}
                    >{v}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Scale: 0 (dim) → {maxVal} (bright). Hover cells for details.</div>
    </div>
  );
}
