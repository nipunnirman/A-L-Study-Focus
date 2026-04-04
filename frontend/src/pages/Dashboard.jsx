import React, { useState, useEffect, useContext } from 'react';
import StudyTimer from '../components/StudyTimer';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const SUBJECT_COLORS = {
  BIO: '#4ade80',
  PHYSICS: '#60a5fa',
  CHEMISTRY: '#f87171',
  'COMBINE MATHS': '#fbbf24',
};

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const { user } = useContext(AuthContext);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      // Get today's date at midnight (local time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysSessions = res.data.filter(s => new Date(s.startTime) >= today);
      setSessions(todaysSessions.slice(0, 6));
    } catch (err) {
      console.error('Error loading sessions', err);
    }
  };

  // Called by StudyTimer when a session is stopped
  const handleSessionStop = () => {
    setTimeout(() => fetchSessions(), 500);
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchSessions();

    // Self-healing timer: recursive setTimeout restarts itself every cycle.
    // Unlike setInterval, this can't "pile up" and survives mobile browser throttling.
    let timerId;
    const schedulePoll = () => {
      timerId = setTimeout(() => {
        fetchSessions();
        schedulePoll(); // schedule the next one after this one finishes
      }, 10000);
    };
    schedulePoll();

    // ─── Mobile-critical event hooks ──────────────────────────────────────────
    // Mobile browsers suspend timers when the screen locks or you switch apps.
    // These events fire the moment the user comes BACK to the app.

    // 1. Tab becomes visible (works on all platforms)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
        clearTimeout(timerId);
        schedulePoll(); // restart the polling fresh
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // 2. Window regains focus (desktop + some mobile)
    const onFocus = () => { fetchSessions(); };
    window.addEventListener('focus', onFocus);

    // 3. pageshow fires when navigating back on mobile (iOS Safari back swipe)
    const onPageShow = (e) => { fetchSessions(); };
    window.addEventListener('pageshow', onPageShow);

    // 4. Internet reconnected → sync immediately
    const onOnline = () => { fetchSessions(); };
    window.addEventListener('online', onOnline);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, []);



  return (
    <div>
      <div className="dashboard-grid">
        <div>
          <StudyTimer onSessionStop={handleSessionStop} />
        </div>

        <div>
          <div className="section-heading">Recent Sessions</div>

          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p style={{ marginBottom: '0.5rem' }}>No sessions yet</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Start a study session to see it here</p>
            </div>
          ) : (
            sessions.map(s => (
              <div key={s._id} className="session-card">
                <div>
                  <div className="session-subject" style={{ color: SUBJECT_COLORS[s.subject] || 'var(--text-primary)' }}>
                    {s.subject}
                  </div>
                  <div className="session-date">
                    {new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="session-duration">
                    {s.actualDuration}<span style={{ color: 'var(--text-muted)' }}>/{s.plannedDuration} min</span>
                  </div>
                  <span className={`session-status ${s.completed ? (!s.stoppedEarly ? 'status-complete' : 'status-early') : 'status-early'}`}>
                    {s.completed ? (!s.stoppedEarly ? '✓ Done' : '⚡ Early') : '⏳ Recorded'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
