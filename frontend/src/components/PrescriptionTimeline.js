import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function PrescriptionTimeline({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`${API}/api/custom-views/prescription-timeline?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message));
  }, [token, days]);

  if (error) return <div style={{ color: 'crimson' }}>Timeline error: {error}</div>;
  if (!data) return <div>Loading timeline...</div>;

  const series = data.series || [];
  const max = Math.max(1, ...series.map(s => s.count || 0));
  const w = 720, h = 180, pad = 28;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const stepX = series.length > 1 ? innerW / (series.length - 1) : innerW;
  const pts = series.map((s, i) => {
    const x = pad + i * stepX;
    const y = pad + innerH - ((s.count || 0) / max) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Prescription Volume Timeline</h3>
        <div>
          <label style={{ fontSize: 12, marginRight: 8 }}>Days:</label>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))}>
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
            <option value={90}>90</option>
          </select>
        </div>
      </div>
      <div style={{ fontSize: 13, marginBottom: 8 }}>Total: <strong>{data.total}</strong> Rx over {data.days} days</div>
      <svg width={w} height={h} style={{ background: '#1e293b', borderRadius: 4 }}>
        <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={pts} />
        {series.map((s, i) => {
          const x = pad + i * stepX;
          const y = pad + innerH - ((s.count || 0) / max) * innerH;
          return <circle key={i} cx={x} cy={y} r={3} fill="#38bdf8">
            <title>{s.day}: {s.count} Rx (filled {s.filled}, pending {s.pending}, flagged {s.flagged})</title>
          </circle>;
        })}
        <text x={pad} y={pad - 8} fill="#94a3b8" fontSize="10">max {max}</text>
        <text x={pad} y={h - 4} fill="#94a3b8" fontSize="10">{series[0]?.day}</text>
        <text x={w - pad - 60} y={h - 4} fill="#94a3b8" fontSize="10">{series[series.length - 1]?.day}</text>
      </svg>
    </div>
  );
}
