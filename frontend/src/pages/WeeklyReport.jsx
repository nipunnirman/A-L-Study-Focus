import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../api/axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.5rem' }}>{label}</p>
        {payload.map((entry, index) => (
          entry.value > 0 ? (
            <p key={index} style={{ margin: 0, color: entry.fill, fontSize: '0.9rem' }}>
              {entry.name}: {entry.value} mins
            </p>
          ) : null
        ))}
      </div>
    );
  }
  return null;
};

const WeeklyReport = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalHours: 0, dailyAvg: 0 });
  const [daysFilter, setDaysFilter] = useState(7);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/sessions/weekly?days=${daysFilter}`);
        let totalMinutes = 0;

        const formattedData = res.data.map(item => {
          const dayTotal = (item.BIO || 0) + (item.PHYSICS || 0) + (item.CHEMISTRY || 0) + (item['COMBINE MATHS'] || 0);
          totalMinutes += dayTotal;

          return {
            ...item,
            displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          };
        }).reverse();

        setData(formattedData);
        setStats({
          totalHours: (totalMinutes / 60).toFixed(1),
          dailyAvg: Math.round(totalMinutes / daysFilter)
        });

      } catch (err) {
        console.error("Error loading weekly report", err);
      }
    };
    fetchReport();
  }, [daysFilter]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Study Report</h2>
        <select 
          value={daysFilter} 
          onChange={e => setDaysFilter(Number(e.target.value))}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(15, 23, 42, 0.8)',
            color: 'white',
            outline: 'none',
            fontSize: '1rem'
          }}
        >
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, background: 'rgba(30, 41, 59, 0.7)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          <h4 style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Hours</h4>
          <p style={{ color: '#38bdf8', fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{stats.totalHours} <span style={{ fontSize: '1rem', color: '#f8fafc' }}>hrs</span></p>
        </div>
        <div style={{ flex: 1, background: 'rgba(30, 41, 59, 0.7)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          <h4 style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Daily Average</h4>
          <p style={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{stats.dailyAvg} <span style={{ fontSize: '1rem', color: '#f8fafc' }}>min/day</span></p>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(30, 41, 59, 0.7)', 
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '2rem 1rem', 
        borderRadius: '1rem',
        height: '450px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="displayDate" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Bar dataKey="BIO" name="Biology" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="PHYSICS" name="Physics" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="CHEMISTRY" name="Chemistry" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="COMBINE MATHS" name="Combine Maths" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyReport;
