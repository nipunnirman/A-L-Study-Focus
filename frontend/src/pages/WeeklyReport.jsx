import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../api/axios';

const SUBJECT_META = [
  { key: 'BIO', label: 'Biology', color: '#4ade80' },
  { key: 'PHYSICS', label: 'Physics', color: '#60a5fa' },
  { key: 'CHEMISTRY', label: 'Chemistry', color: '#f87171' },
  { key: 'COMBINE MATHS', label: 'Combine Maths', color: '#fbbf24' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, e) => a + (e.value || 0), 0);
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border-soft)',
      padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: '160px'
    }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem', fontSize: '0.82rem' }}>{label}</p>
      {payload.map((entry, i) =>
        entry.value > 0 ? (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.fill, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>{entry.name}</span>
            </div>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace', fontSize: '0.76rem', fontWeight: 500 }}>{entry.value}m</span>
          </div>
        ) : null
      )}
      {total > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
          <span style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace', fontSize: '0.76rem', fontWeight: 500 }}>{total}m</span>
        </div>
      )}
    </div>
  );
};

const WeeklyReport = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalHours: 0, dailyAvg: 0, bestSubject: '—', bestSubjectMins: 0 });
  const [daysFilter, setDaysFilter] = useState(7);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/sessions/weekly?days=${daysFilter}`);
        let totalMinutes = 0;
        const subjectTotals = {};

        const formattedData = res.data.map(item => {
          const dayTotal = SUBJECT_META.reduce((a, s) => a + (item[s.key] || 0), 0);
          totalMinutes += dayTotal;
          SUBJECT_META.forEach(s => { subjectTotals[s.key] = (subjectTotals[s.key] || 0) + (item[s.key] || 0); });
          return { ...item, displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
        }).reverse();

        const bestKey = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])[0];
        const bestMeta = bestKey ? SUBJECT_META.find(s => s.key === bestKey[0]) : null;

        setData(formattedData);
        setStats({
          totalHours: (totalMinutes / 60).toFixed(1),
          dailyAvg: Math.round(totalMinutes / daysFilter),
          bestSubject: bestMeta?.label || '—',
          bestSubjectMins: bestKey?.[1] || 0,
        });
      } catch (err) {
        console.error('Error loading report', err);
      }
    };
    fetchReport();
  }, [daysFilter]);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div className="report-header">
        <h2 className="page-title">Study Report</h2>
        <select className="filter-select" value={daysFilter} onChange={e => setDaysFilter(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat-card gold">
          <div className="stat-label">Total Hours</div>
          <div className="stat-value">{stats.totalHours}<span className="stat-unit">hrs</span></div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Daily Avg</div>
          <div className="stat-value">{stats.dailyAvg}<span className="stat-unit">min</span></div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Top Subject</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', paddingTop: '0.4rem' }}>{stats.bestSubject}</div>
        </div>
      </div>

      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Study Time by Subject</div>
          <div className="legend-pills">
            {SUBJECT_META.map(s => (
              <div key={s.key} className="legend-pill">
                <div className="legend-dot" style={{ background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '380px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="displayDate" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }} />
              {SUBJECT_META.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="a"
                  fill={s.color}
                  radius={i === SUBJECT_META.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  fillOpacity={0.85}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
