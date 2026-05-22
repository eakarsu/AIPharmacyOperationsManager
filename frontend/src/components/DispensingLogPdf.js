import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function DispensingLogPdf({ token }) {
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState('');
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    setStatus('');
    try {
      const res = await fetch(`${API}/api/custom-views/dispensing-log-pdf?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispensing-log-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded PDF (${blob.size} bytes).`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Dispensing Log PDF Export</h3>
      <p style={{ fontSize: 13, color: '#94a3b8' }}>
        Generate a printable controlled-substance dispensing log as PDF.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}>Limit:
          <input
            type="number"
            value={limit}
            min={1}
            max={200}
            onChange={e => setLimit(parseInt(e.target.value) || 50)}
            style={{ marginLeft: 6, width: 80 }}
          />
        </label>
        <button onClick={download} disabled={downloading} style={{ padding: '6px 14px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      {status && <div style={{ marginTop: 10, fontSize: 13 }}>{status}</div>}
    </div>
  );
}
