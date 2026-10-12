import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function RecordPresets({ token, endpoint, recordName, onSelect, disabled }) {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('Loading available records…');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load records');
        return response.json();
      })
      .then(data => {
        const items = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        setRecords(items.filter(item => item.id !== null && item.id !== undefined).slice(0, 2));
        setStatus(items.length ? '' : `No ${recordName.toLowerCase()} records are available. Select an existing record before using a record preset.`);
      })
      .catch(error => { if (error.name !== 'AbortError') setStatus(`Could not load ${recordName.toLowerCase()} records. Select an existing record before using a record preset.`); });
    return () => controller.abort();
  }, [token, endpoint, recordName]);
  return <div className="ai-preset-bar"><strong>Input presets</strong><div className="ai-actions"><button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => onSelect('')}>All {recordName.toLowerCase()} records</button>{records.map((record, index) => <button type="button" className="btn btn-secondary" key={record.id} disabled={disabled} onClick={() => onSelect(String(record.id))}>{recordName} record {index + 1}</button>)}</div>{status && <small role="status">{status}</small>}<small>Presets fill the optional record reference only. Review before running analysis.</small></div>;
}
