import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/* ─── Constants ─────────────────────────────────────────────────── */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SUBJECTS = ['BIO', 'PHYSICS', 'CHEMISTRY', 'COMBINE MATHS'];

const SUBJECT_COLORS = {
  BIO: { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)', text: '#4ade80', dot: '#4ade80' },
  PHYSICS: { bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.4)', text: '#60a5fa', dot: '#60a5fa' },
  CHEMISTRY: { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)', text: '#f87171', dot: '#f87171' },
  'COMBINE MATHS': { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24', dot: '#fbbf24' },
};

// Time range: 06:00 → 22:00 in 30-min slots
const TIME_START = 6 * 60;  // 360 minutes
const TIME_END   = 22 * 60; // 1320 minutes
const SLOT_HEIGHT = 48;     // px per 30-min slot
const TOTAL_SLOTS = (TIME_END - TIME_START) / 30;

const toMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const toTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};
const formatTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${period}`;
};

/* ─── Main Component ─────────────────────────────────────────────── */
const Timetable = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Panel state
  const [panel, setPanel] = useState(null); // { day, startTime, endTime, subject, note, editId }
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState('');

  /* ─── Fetch ──────────────────────────────────────────────────── */
  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get('/timetable');
      setEntries(res.data);
    } catch (err) {
      console.error('Error fetching timetable', err);
      setError('Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  /* ─── Open add-panel on cell click ───────────────────────────── */
  const openAddPanel = (day, slotIndex) => {
    const startMins = TIME_START + slotIndex * 30;
    const endMins = startMins + 60; // default 1-hr block
    setPanel({
      day,
      startTime: toTime(startMins),
      endTime: toTime(Math.min(endMins, TIME_END)),
      subject: 'BIO',
      note: '',
      editId: null,
    });
    setPanelError('');
  };

  const openEditPanel = (entry, e) => {
    e.stopPropagation();
    setPanel({
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subject: entry.subject,
      note: entry.note || '',
      editId: entry._id,
    });
    setPanelError('');
  };

  const closePanel = () => { setPanel(null); setPanelError(''); };

  /* ─── Save (create or update) ────────────────────────────────── */
  const handleSave = async () => {
    if (!panel) return;
    setSaving(true);
    setPanelError('');
    try {
      const payload = {
        day: panel.day,
        startTime: panel.startTime,
        endTime: panel.endTime,
        subject: panel.subject,
        note: panel.note,
      };
      if (panel.editId) {
        const res = await api.put(`/timetable/${panel.editId}`, payload);
        setEntries(prev => prev.map(e => e._id === panel.editId ? res.data : e));
      } else {
        const res = await api.post('/timetable', payload);
        setEntries(prev => [...prev, res.data]);
      }
      closePanel();
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to save entry.';
      setPanelError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete ─────────────────────────────────────────────────── */
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/timetable/${id}`);
      setEntries(prev => prev.filter(e => e._id !== id));
      if (panel?.editId === id) closePanel();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  /* ─── Layout helpers ─────────────────────────────────────────── */
  const getEntriesForDay = (day) => entries.filter(e => e.day === day);

  const blockStyle = (entry) => {
    const top = ((toMins(entry.startTime) - TIME_START) / 30) * SLOT_HEIGHT;
    const height = ((toMins(entry.endTime) - toMins(entry.startTime)) / 30) * SLOT_HEIGHT - 4;
    const colors = SUBJECT_COLORS[entry.subject] || SUBJECT_COLORS.BIO;
    return { top, height, ...colors };
  };

  /* ─── Render ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          LOADING TIMETABLE…
        </div>
      </div>
    );
  }

  return (
    <div className="timetable-page">
      {/* Header */}
      <div className="report-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Weekly Timetable</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Click any time slot to add a study block
          </p>
        </div>
        {/* Legend */}
        <div className="legend-pills" style={{ marginBottom: 0 }}>
          {SUBJECTS.map(s => (
            <div key={s} className="legend-pill">
              <div className="legend-dot" style={{ background: SUBJECT_COLORS[s].dot }} />
              {s}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Total Blocks" value={entries.length} unit="slots" cls="gold" />
        <StatCard
          label="Weekly Hours"
          value={Math.round(entries.reduce((acc, e) => acc + (toMins(e.endTime) - toMins(e.startTime)), 0) / 60 * 10) / 10}
          unit="hrs"
          cls="green"
        />
        <StatCard
          label="Active Days"
          value={new Set(entries.map(e => e.day)).size}
          unit="/ 7"
          cls="blue"
        />
      </div>

      {/* Grid wrapper */}
      <div className="chart-card" style={{ padding: '1rem 0.5rem', overflowX: 'auto' }}>
        <div className="tt-grid-container">
          {/* Time labels column */}
          <div className="tt-time-col">
            <div className="tt-day-header" style={{ height: 44 }} />
            {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
              const mins = TIME_START + i * 30;
              if (mins > TIME_END) return null;
              return (
                <div key={i} className="tt-time-label" style={{ height: SLOT_HEIGHT }}>
                  {i % 2 === 0 ? formatTime(toTime(mins)) : ''}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {DAYS.map((day, dayIdx) => {
            const dayEntries = getEntriesForDay(day);
            const isWeekend = dayIdx >= 5;
            return (
              <div key={day} className={`tt-day-col ${isWeekend ? 'tt-weekend' : ''}`}>
                {/* Day header */}
                <div className="tt-day-header">
                  <span className="tt-day-name">{DAY_SHORT[dayIdx]}</span>
                  {dayEntries.length > 0 && (
                    <span className="tt-day-count">{dayEntries.length}</span>
                  )}
                </div>

                {/* Slot cells (clickable) */}
                <div className="tt-slots-wrapper" style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}>
                  {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
                    <div
                      key={i}
                      className="tt-slot-cell"
                      style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      onClick={() => openAddPanel(day, i)}
                    />
                  ))}

                  {/* Placed blocks */}
                  {dayEntries.map(entry => {
                    const { top, height, bg, border, text } = blockStyle(entry);
                    return (
                      <div
                        key={entry._id}
                        className="tt-block"
                        style={{ top, height, background: bg, borderColor: border, color: text }}
                        onClick={(e) => openEditPanel(entry, e)}
                      >
                        <div className="tt-block-subject">{entry.subject}</div>
                        <div className="tt-block-time">
                          {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
                        </div>
                        {entry.note && <div className="tt-block-note">{entry.note}</div>}
                        <button
                          className="tt-delete-btn"
                          onClick={(e) => handleDelete(entry._id, e)}
                          title="Delete"
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Panel */}
      {panel && (
        <div className="tt-panel-overlay" onClick={closePanel}>
          <div className="tt-panel" onClick={e => e.stopPropagation()}>
            <div className="tt-panel-header">
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>
                {panel.editId ? 'Edit Block' : 'Add Block'}
              </h3>
              <button className="tt-panel-close" onClick={closePanel}>×</button>
            </div>

            {/* Day display */}
            <div className="form-group">
              <label className="form-label">Day</label>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0', fontSize: '0.95rem' }}>
                {panel.day}
              </div>
            </div>

            {/* Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  value={panel.startTime}
                  min="06:00" max="22:00" step="1800"
                  onChange={e => setPanel(p => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  value={panel.endTime}
                  min="06:00" max="22:00" step="1800"
                  onChange={e => setPanel(p => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Subject */}
            <div className="form-group">
              <label className="form-label">Subject</label>
              <div className="subject-pills" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                {SUBJECTS.map(s => {
                  const colors = SUBJECT_COLORS[s];
                  const active = panel.subject === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setPanel(p => ({ ...p, subject: s }))}
                      className={`subject-pill ${active ? 'active' : ''}`}
                      style={active ? {
                        '--pill-color': colors.text,
                        '--pill-bg': colors.bg,
                        borderColor: colors.border,
                      } : {}}
                    >
                      <span className="subject-dot" style={{ background: colors.dot }} />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Chapter 5, Past Papers…"
                value={panel.note}
                onChange={e => setPanel(p => ({ ...p, note: e.target.value }))}
                maxLength={80}
              />
            </div>

            {panelError && (
              <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                {panelError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : panel.editId ? 'Update Block' : 'Add Block'}
              </button>
              {panel.editId && (
                <button
                  onClick={(e) => handleDelete(panel.editId, e)}
                  style={{ flex: '0 0 auto', width: 'auto', padding: '0.78rem 1.2rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Stat Card helper ──────────────────────────────────────────── */
const StatCard = ({ label, value, unit, cls }) => (
  <div className={`stat-card ${cls}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">
      {value}
      <span className="stat-unit">{unit}</span>
    </div>
  </div>
);

export default Timetable;
