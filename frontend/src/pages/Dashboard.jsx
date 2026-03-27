import React, { useState, useEffect, useContext } from 'react';
import StudyTimer from '../components/StudyTimer';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const { user } = useContext(AuthContext);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      // Limit to 5 recent sessions for dashboard
      setSessions(res.data.slice(0, 5));
    } catch (err) {
      console.error("Error loading sessions from JSON cache", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: '#f8fafc' }}>Your Study Dashboard</h2>
      
      <StudyTimer onSessionStop={fetchSessions} />

      <div style={{ marginTop: '4rem', maxWidth: '600px', margin: '4rem auto 0 auto' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
          Recent Sessions (Real-time from Cache)
        </h3>
        
        {sessions.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No recent sessions. Start studying to see them here!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sessions.map(s => (
              <div key={s._id} style={{ 
                background: 'rgba(30, 41, 59, 0.5)', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ color: '#38bdf8' }}>{s.subject}</h4>
                  <small style={{ color: '#94a3b8' }}>{new Date(s.startTime).toLocaleDateString()}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{s.actualDuration} / {s.plannedDuration} min</div>
                  <small style={{ color: s.completed && !s.stoppedEarly ? '#10b981' : '#f59e0b' }}>
                    {s.completed && !s.stoppedEarly ? 'Completed' : 'Stopped Early'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
