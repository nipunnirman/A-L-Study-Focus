import React, { useState, useEffect, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Play, Square, Pause } from 'lucide-react';
import api from '../api/axios';

const SUBJECTS = [
  { id: 'BIO', label: 'Biology', color: '#4ade80', rgb: '74,222,128' },
  { id: 'PHYSICS', label: 'Physics', color: '#60a5fa', rgb: '96,165,250' },
  { id: 'CHEMISTRY', label: 'Chemistry', color: '#f87171', rgb: '248,113,113' },
  { id: 'COMBINE MATHS', label: 'Combine Maths', color: '#fbbf24', rgb: '251,191,36' },
];

const PRESETS = [25, 45, 60, 90];

const StudyTimer = ({ onSessionStop }) => {
  const [subject, setSubject] = useState(SUBJECTS[0].id);
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const savedActive = localStorage.getItem('study_isActive') === 'true';
    if (savedActive) {
      const savedStartTime = parseInt(localStorage.getItem('study_startTime'), 10);
      const savedDuration = parseInt(localStorage.getItem('study_duration'), 10);
      const savedSubject = localStorage.getItem('study_subject');
      const savedSessionId = localStorage.getItem('study_sessionId');
      const savedPaused = localStorage.getItem('study_isPaused') === 'true';
      const savedTimeLeft = parseInt(localStorage.getItem('study_timeLeft'), 10);

      setSubject(savedSubject);
      setDuration(savedDuration);
      setSessionId(savedSessionId);
      setIsActive(true);
      setIsPaused(savedPaused);

      if (savedPaused) {
        setTimeLeft(savedTimeLeft);
      } else {
        const elapsedSeconds = Math.floor((Date.now() - savedStartTime) / 1000);
        const newTimeLeft = Math.max((savedDuration * 60) - elapsedSeconds, 0);
        setTimeLeft(newTimeLeft);
      }
    }
    syncOfflineSessions();
  }, []);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        const savedStartTime = parseInt(localStorage.getItem('study_startTime'), 10);
        const savedDuration = parseInt(localStorage.getItem('study_duration'), 10);
        const elapsedSeconds = Math.floor((Date.now() - savedStartTime) / 1000);
        const newTimeLeft = Math.max((savedDuration * 60) - elapsedSeconds, 0);
        setTimeLeft(newTimeLeft);
        localStorage.setItem('study_timeLeft', newTimeLeft.toString());
        if (newTimeLeft <= 0) { clearInterval(timerRef.current); handleComplete(); }
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, isPaused]);

  useEffect(() => {
    if (!isActive) setTimeLeft(duration * 60);
  }, [duration, isActive]);

  const saveToStorage = (id, sub, dur, startTime = Date.now()) => {
    localStorage.setItem('study_isActive', 'true');
    localStorage.setItem('study_sessionId', id || 'offline_started');
    localStorage.setItem('study_subject', sub);
    localStorage.setItem('study_duration', dur.toString());
    localStorage.setItem('study_startTime', startTime.toString());
    localStorage.setItem('study_isPaused', 'false');
    localStorage.setItem('study_timeLeft', (dur * 60).toString());
  };

  const clearStorage = () => {
    ['study_isActive','study_sessionId','study_subject','study_duration','study_startTime','study_isPaused','study_timeLeft']
      .forEach(k => localStorage.removeItem(k));
  };

  const syncOfflineSessions = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem('study_offlineQueue') || '[]');
      if (queue.length > 0 && navigator.onLine) {
        await api.post('/sessions/sync', { sessions: queue });
        localStorage.removeItem('study_offlineQueue');
        if (onSessionStop) onSessionStop();
      }
    } catch (err) { console.error('Sync failed', err); }
  };

  const handleStart = async () => {
    const startTime = Date.now();
    try {
      const res = await api.post('/sessions/start', { subject, plannedDuration: duration });
      setSessionId(res.data._id);
      saveToStorage(res.data._id, subject, duration, startTime);
    } catch {
      setSessionId('offline_started');
      saveToStorage('offline_started', subject, duration, startTime);
    }
    setIsActive(true); setIsPaused(false);
  };

  const handlePause = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    localStorage.setItem('study_isPaused', newPaused.toString());
    if (!newPaused) {
      const newStartTime = Date.now() - ((duration * 60 - timeLeft) * 1000);
      localStorage.setItem('study_startTime', newStartTime.toString());
    }
  };

  const handleStop = async () => { await stopSessionOnServer(true); clearStorage(); resetTimer(); };

  const handleComplete = async () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
    await stopSessionOnServer(false);
    clearStorage();
    resetTimer();
  };

  const stopSessionOnServer = async (stoppedEarly) => {
    let actualDuration = Math.round(((duration * 60) - timeLeft) / 60);
    if (actualDuration <= 0) actualDuration = 1;
    const endTime = new Date();
    const startTime = new Date(parseInt(localStorage.getItem('study_startTime'), 10));
    if (sessionId && sessionId !== 'offline_started') {
      try {
        await api.put(`/sessions/${sessionId}/stop`, { actualDuration });
        syncOfflineSessions();
        if (onSessionStop) onSessionStop();
      } catch { queueOfflineSession(startTime, endTime, actualDuration, stoppedEarly); }
    } else {
      queueOfflineSession(startTime, endTime, actualDuration, stoppedEarly);
      syncOfflineSessions();
    }
  };

  const queueOfflineSession = (startTime, endTime, actualDur, early) => {
    const sessionData = { subject, plannedDuration: duration, startTime, endTime, actualDuration: actualDur, completed: true, stoppedEarly: early };
    const queue = JSON.parse(localStorage.getItem('study_offlineQueue') || '[]');
    queue.push(sessionData);
    localStorage.setItem('study_offlineQueue', JSON.stringify(queue));
  };

  const resetTimer = () => { setIsActive(false); setIsPaused(false); setSessionId(null); setTimeLeft(duration * 60); };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 100 - (timeLeft / (duration * 60)) * 100;

  const currentSubjectObj = SUBJECTS.find(s => s.id === subject);
  const themeColor = currentSubjectObj?.color || '#d4af64';
  const themeRgb = currentSubjectObj?.rgb || '212,175,100';

  return (
    <div className="timer-card">
      {!isActive ? (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
            Subject
          </div>
          <div className="subject-pills">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                type="button"
                className={`subject-pill ${subject === s.id ? 'active' : ''}`}
                style={subject === s.id ? {
                  '--pill-color': s.color,
                  '--pill-bg': `rgba(${s.rgb},0.1)`
                } : {}}
                onClick={() => setSubject(s.id)}
              >
                <span className="subject-dot" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>

          <div className="duration-row">
            <span className="duration-label">Duration</span>
            <input
              type="number" min="1" max="300"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="duration-input"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>min</span>
            <div className="duration-presets">
              {PRESETS.map(p => (
                <button
                  key={p} type="button"
                  className={`preset-btn ${duration === p ? 'active-preset' : ''}`}
                  onClick={() => setDuration(p)}
                >
                  {p}m
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: themeColor, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.5rem' }}>
          {currentSubjectObj?.label}
        </div>
      )}

      <div className="timer-display-wrap" style={{ width: '220px', height: '220px' }}>
        <div className="timer-glow" style={{ '--glow-color': `rgba(${themeRgb},0.1)` }} />
        <CircularProgressbar
          value={progress}
          text={`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
          styles={buildStyles({
            pathColor: themeColor,
            textColor: 'var(--text-primary)',
            trailColor: 'rgba(255,255,255,0.06)',
            textSize: '18px',
          })}
        />
        {isActive && (
          <div className="timer-subject-badge" style={{ '--pill-color': themeColor, background: themeColor }}>
            {isPaused ? 'Paused' : 'Studying'}
          </div>
        )}
      </div>

      {!isActive && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem', fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>
          {Math.floor(duration / 60) > 0 && `${Math.floor(duration / 60)}h `}{duration % 60 > 0 && `${duration % 60}m`} · {currentSubjectObj?.label}
        </div>
      )}

      <div className="controls">
        {!isActive ? (
          <button onClick={handleStart} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: `linear-gradient(135deg, ${themeColor} 0%, rgba(${themeRgb},0.7) 100%)` }}>
            <Play size={16} />Start Session
          </button>
        ) : (
          <>
            <button className="btn-pause" onClick={handlePause} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {isPaused ? <><Play size={16} />Resume</> : <><Pause size={16} />Pause</>}
            </button>
            <button className="btn-stop" onClick={handleStop} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Square size={16} />Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default StudyTimer;
