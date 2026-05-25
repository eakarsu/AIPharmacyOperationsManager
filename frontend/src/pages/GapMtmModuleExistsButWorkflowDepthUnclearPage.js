// === Batch 06 Gaps & Frontend Mounts ===
// Gap (AI): Inventory without '/reorder
// MTM module exists but workflow depth unclear
import React, { useState, useEffect, useCallback } from 'react';

const API_PATH = '/api/gap-mtm-module-exists-but-workflow-depth-unclear';
const TITLE = "MTM Workflow AI";
const SUBTITLE = "MTM module exists but workflow depth unclear";

export default function GapMtmModuleExistsButWorkflowDepthUnclearPage({ token }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sampleRequests = [
      {
          "label": "Scenario",
          "value": "Run {TITLE} for a realistic customer case.\nContext: A mid-market operations team is under deadline pressure and needs an actionable recommendation.\nGoal: identify the best next steps, risks, assumptions, and expected business impact.\nOutput format: concise summary, prioritized actions, confidence level, and follow-up questions."
      },
      {
          "label": "Data sample",
          "value": "Analyze this {TITLE} data sample.\nRecords:\n- Item A: high priority, owner unassigned, due this week, customer impact high\n- Item B: medium priority, owner assigned, blocked by missing information\n- Item C: low priority, recurring pattern, possible automation candidate\nReturn structured findings, anomalies, recommendations, and a short implementation plan."
      },
      {
          "label": "Executive review",
          "value": "Prepare an executive review for {TITLE}.\nAudience: business owner and operations manager.\nInclude: what happened, why it matters, financial or operational impact, risks, and three decisions needed today.\nTone: professional, direct, and implementation-focused."
      }
  ];

  const applySampleRequest = (value) => {
    setInput(value);
    setError(null);
    setResult(null);
  };
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const authHeader = () => {
    const t = token || (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    setHistError(null);
    try {
      const res = await fetch(`${API_PATH}/history`, { headers: authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(data.items || []);
    } catch (e) {
      setHistError(e.message);
    } finally {
      setHistLoading(false);
    }
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_PATH}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Request failed (${res.status}): ${txt.slice(0, 200)}`);
      }
      const data = await res.json();
      setResult(data);
      loadHistory();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const parseResult = (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  return (
    <div style={{ padding: 24, color: '#e5e7eb', maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{TITLE}</h1>
      <p style={{ color: '#9ca3af', marginBottom: 20 }}>{SUBTITLE}</p>

      <div style={{ background: '#111827', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Input / Prompt</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {sampleRequests.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleRequest(sample.value)}
              style={{ padding: '6px 10px', background: '#374151', color: '#e5e7eb', border: '1px solid #4b5563', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {sample.label}
            </button>
          ))}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          placeholder="Describe the scenario, paste data, or enter free-form input..."
          style={{ width: '100%', padding: 10, background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, boxSizing: 'border-box' }}
        />
        <button
          onClick={run}
          disabled={loading || !input.trim()}
          style={{ marginTop: 12, padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontWeight: 600 }}
        >
          {loading ? 'Running…' : 'Run AI Analysis'}
        </button>
      </div>

      {error && <div style={{ background: '#7f1d1d', color: '#fecaca', padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {result && (() => {
        const parsed = parseResult(result.result);
        return (
          <div style={{ background: '#0b1220', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#a5b4fc' }}>AI Result</h3>
            {parsed ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {parsed.summary && <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}><strong style={{ color: '#fbbf24' }}>Summary:</strong><p style={{ margin: '6px 0 0', color: '#d1d5db' }}>{parsed.summary}</p></div>}
                {parsed.recommendations?.length > 0 && <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}><strong style={{ color: '#34d399' }}>Recommendations:</strong><ul style={{ margin: '6px 0 0', paddingLeft: 20, color: '#d1d5db' }}>{parsed.recommendations.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}</ul></div>}
                {parsed.risks?.length > 0 && <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}><strong style={{ color: '#f87171' }}>Risks:</strong><ul style={{ margin: '6px 0 0', paddingLeft: 20, color: '#d1d5db' }}>{parsed.risks.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}</ul></div>}
                {parsed.next_steps?.length > 0 && <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}><strong style={{ color: '#60a5fa' }}>Next Steps:</strong><ul style={{ margin: '6px 0 0', paddingLeft: 20, color: '#d1d5db' }}>{parsed.next_steps.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}</ul></div>}
              </div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: 12, color: '#d1d5db' }}>{result.result}</pre>
            )}
            <p style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>Tokens: {result.tokens_used} | Model: {result.model}</p>
          </div>
        );
      })()}

      <div style={{ background: '#111827', padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#a5b4fc' }}>Run History</h3>
          <button onClick={loadHistory} disabled={histLoading} style={{ background: '#374151', color: '#e5e7eb', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
            {histLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {histError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>Error loading history: {histError}</div>}
        {history.length === 0 && !histLoading && <p style={{ color: '#6b7280', fontSize: 13 }}>No history yet. Run an analysis above.</p>}
        {history.map((item) => {
          const parsed = parseResult(item.result);
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} style={{ background: '#1e293b', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'none', border: 'none', color: '#e5e7eb', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 13 }}>
                  <span style={{ color: '#9ca3af', marginRight: 8 }}>#{item.id}</span>
                  {parsed?.summary ? parsed.summary.slice(0, 80) + (parsed.summary.length > 80 ? '…' : '') : 'Run result'}
                </span>
                <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 12 }}>
                  {new Date(item.created_at).toLocaleString()} | {item.tokens_used || 0} tokens
                </span>
              </button>
              {isExpanded && (
                <div style={{ padding: '0 14px 14px' }}>
                  {parsed ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {parsed.summary && <p style={{ color: '#d1d5db', margin: 0, fontSize: 13 }}><strong style={{ color: '#fbbf24' }}>Summary:</strong> {parsed.summary}</p>}
                      {parsed.recommendations?.length > 0 && <div><strong style={{ color: '#34d399', fontSize: 13 }}>Recommendations:</strong><ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#d1d5db', fontSize: 13 }}>{parsed.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
                      {parsed.risks?.length > 0 && <div><strong style={{ color: '#f87171', fontSize: 13 }}>Risks:</strong><ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#d1d5db', fontSize: 13 }}>{parsed.risks.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
                      {parsed.next_steps?.length > 0 && <div><strong style={{ color: '#60a5fa', fontSize: 13 }}>Next Steps:</strong><ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#d1d5db', fontSize: 13 }}>{parsed.next_steps.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
                    </div>
                  ) : (
                    <pre style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.result}</pre>
                  )}
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Model: {item.model}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
