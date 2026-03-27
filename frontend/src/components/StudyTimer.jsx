import React, { useState, useEffect, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Play, Square, Pause } from 'lucide-react';
import api from '../api/axios';

const SUBJECTS = [
  { id: 'BIO', label: 'Biology', color: '#10b981' },
  { id: 'PHYSICS', label: 'Physics', color: '#3b82f6' },
  { id: 'CHEMISTRY', label: 'Chemistry', color: '#ef4444' },
  { id: 'COMBINE MATHS', label: 'Combine Maths', color: '#f59e0b' }
];

const StudyTimer = ({ onSessionStop }) => {
  const [subject, setSubject] = useState(SUBJECTS[0].id);
  const [duration, setDuration] = useState(60); // minutes
  const [timeLeft, setTimeLeft] = useState(60 * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const timerRef = useRef(null);

  // Load saved session on mount to persist across pages
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

    // Try syncing any offline sessions on load
    syncOfflineSessions();
  }, []);

  // Timer interval logic using absolute timestamps to prevent browser throttling!
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        const savedStartTime = parseInt(localStorage.getItem('study_startTime'), 10);
        const savedDuration = parseInt(localStorage.getItem('study_duration'), 10);
        
        const elapsedSeconds = Math.floor((Date.now() - savedStartTime) / 1000);
        const newTimeLeft = Math.max((savedDuration * 60) - elapsedSeconds, 0);
        
        setTimeLeft(newTimeLeft);
        localStorage.setItem('study_timeLeft', newTimeLeft.toString());

        if (newTimeLeft <= 0) {
          clearInterval(timerRef.current);
          handleComplete();
        }
      }, 500); // Check twice a second for smoothness
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, isPaused]);

  // Sync duration input with time left when not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isActive]);

  const saveToStorage = (id, sub, dur, startTime = Date.now()) => {
    localStorage.setItem('study_isActive', 'true');
    localStorage.setItem('study_sessionId', id || 'offline_started'); // use placeholder if offline start
    localStorage.setItem('study_subject', sub);
    localStorage.setItem('study_duration', dur.toString());
    localStorage.setItem('study_startTime', startTime.toString());
    localStorage.setItem('study_isPaused', 'false');
    localStorage.setItem('study_timeLeft', (dur * 60).toString());
  };

  const clearStorage = () => {
    localStorage.removeItem('study_isActive');
    localStorage.removeItem('study_sessionId');
    localStorage.removeItem('study_subject');
    localStorage.removeItem('study_duration');
    localStorage.removeItem('study_startTime');
    localStorage.removeItem('study_isPaused');
    localStorage.removeItem('study_timeLeft');
  };

  const syncOfflineSessions = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem('study_offlineQueue') || '[]');
      if (queue.length > 0 && navigator.onLine) {
        await api.post('/sessions/sync', { sessions: queue });
        localStorage.removeItem('study_offlineQueue');
        if (onSessionStop) onSessionStop();
      }
    } catch (err) {
      console.error('Failed to sync offline sessions', err);
    }
  };

  const handleStart = async () => {
    const startTime = Date.now();
    try {
      const res = await api.post('/sessions/start', { subject, plannedDuration: duration });
      setSessionId(res.data._id);
      saveToStorage(res.data._id, subject, duration, startTime);
    } catch (err) {
      // If offline, start locally anyway!
      setSessionId('offline_started');
      saveToStorage('offline_started', subject, duration, startTime);
    }
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    localStorage.setItem('study_isPaused', newPausedState.toString());
    if (!newPausedState) {
      // Resuming, need to reset start time to accurately reflect remaining left
      const newStartTime = Date.now() - ((duration * 60 - timeLeft) * 1000);
      localStorage.setItem('study_startTime', newStartTime.toString());
    }
  };

  const handleStop = async () => {
    await stopSessionOnServer(true);
    clearStorage();
    resetTimer();
  };

  const handleComplete = async () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed', e));

    await stopSessionOnServer(false);
    clearStorage();
    alert('Session complete! Great job!');
    resetTimer();
  };

  const stopSessionOnServer = async (stoppedEarly) => {
    let actualDuration = Math.round(((duration * 60) - timeLeft) / 60);
    if (actualDuration <= 0) actualDuration = 1; // 1 min minimum so it shows on UI
    
    const endTime = new Date();
    const startTime = new Date(parseInt(localStorage.getItem('study_startTime'), 10));

    if (sessionId && sessionId !== 'offline_started') {
      try {
        await api.put(`/sessions/${sessionId}/stop`, { actualDuration });
        syncOfflineSessions(); // try syncing any old ones too
        if (onSessionStop) onSessionStop();
      } catch (err) {
        queueOfflineSession(startTime, endTime, actualDuration, stoppedEarly);
      }
    } else {
      // Entire session was offline
      queueOfflineSession(startTime, endTime, actualDuration, stoppedEarly);
      syncOfflineSessions(); // attempt immediate sync just in case they just came online
    }
  };

  const queueOfflineSession = (startTime, endTime, actualDur, early) => {
    const sessionData = {
      subject,
      plannedDuration: duration,
      startTime,
      endTime,
      actualDuration: actualDur,
      completed: true,
      stoppedEarly: early
    };
    const queue = JSON.parse(localStorage.getItem('study_offlineQueue') || '[]');
    queue.push(sessionData);
    localStorage.setItem('study_offlineQueue', JSON.stringify(queue));
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setSessionId(null);
    setTimeLeft(duration * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 100 - (timeLeft / (duration * 60)) * 100;

  const currentSubjectObj = SUBJECTS.find(s => s.id === subject);
  const themeColor = currentSubjectObj ? currentSubjectObj.color : '#38bdf8';

  return (
    <div className="timer-card">
      {!isActive ? (
        <div style={{ width: '100%' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Select Subject:</label>
            <select 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
            >
              {SUBJECTS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8' }}>
            <label>Duration (min):</label>
            <input 
              type="number" 
              min="1" 
              max="300" 
              value={duration} 
              onChange={e => setDuration(Number(e.target.value))} 
              style={{ width: '80px', padding: '0.5rem' }}
            />
          </div>
        </div>
      ) : (
        <h3 style={{ marginBottom: '2rem', color: themeColor }}>{currentSubjectObj?.label}</h3>
      )}

      <div style={{ width: '250px', height: '250px', margin: '2rem 0' }}>
        <CircularProgressbar
          value={progress}
          text={`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
          styles={buildStyles({
            pathColor: themeColor,
            textColor: '#f8fafc',
            trailColor: 'rgba(255,255,255,0.1)',
          })}
        />
      </div>

      <div className="controls">
        {!isActive ? (
          <button onClick={handleStart} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: themeColor }}>
            <Play size={20} /> Start Session
          </button>
        ) : (
          <>
            <button onClick={handlePause} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#eab308' }}>
              {isPaused ? <Play size={20} /> : <Pause size={20} />} {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={handleStop} className="btn-stop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Square size={20} /> Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default StudyTimer;
