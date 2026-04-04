const Session = require('../models/Session');
const jsonCache = require('../cache/jsonCache');

exports.startSession = async (req, res) => {
  const { subject, plannedDuration } = req.body;
  try {
    const newSession = new Session({
      userId: req.user.id,
      subject,
      plannedDuration
    });

    const session = await newSession.save();
    
    // Update Cache
    jsonCache.appendSession(req.user.id, session);

    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.stopSession = async (req, res) => {
  try {
    let session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ msg: 'Session not found' });

    // Make sure user owns session
    if (session.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { actualDuration: frontendActualDuration } = req.body;
    
    const endTime = new Date();
    // Default to at least 1 minute if it's a fast test, otherwise trust frontend if sent
    let actualDuration = frontendActualDuration !== undefined ? frontendActualDuration : Math.round((endTime - session.startTime) / 60000);
    
    // Ensure test sessions (like <30 secs) still show 1 min on the graph instead of 0
    if (actualDuration <= 0) actualDuration = 1;

    session.endTime = endTime;
    session.actualDuration = actualDuration;
    
    if (actualDuration >= session.plannedDuration) {
      session.completed = true;
      session.stoppedEarly = false;
    } else {
      session.completed = true;
      session.stoppedEarly = true;
    }

    session = await session.save();

    // Update Cache
    jsonCache.updateSession(req.user.id, session);

    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateSessionHeartbeat = async (req, res) => {
  try {
    let session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ msg: 'Session not found' });

    if (session.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { actualDuration } = req.body;
    
    session.endTime = new Date();
    if (actualDuration !== undefined) {
      session.actualDuration = actualDuration;
    }

    session = await session.save();

    // Update Cache
    jsonCache.updateSession(req.user.id, session);

    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getSessions = async (req, res) => {
  try {
    // Try to get from JSON cache first
    let sessions = jsonCache.readCache(req.user.id);
    
    if (!sessions) {
      // Fallback to DB and build cache
      sessions = await jsonCache.buildCache(req.user.id);
    }

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.syncOfflineSessions = async (req, res) => {
  try {
    const { sessions } = req.body;
    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({ msg: 'Invalid payload' });
    }

    const savedSessions = [];
    for (const s of sessions) {
      const newSession = new Session({
        userId: req.user.id,
        subject: s.subject,
        plannedDuration: s.plannedDuration,
        startTime: s.startTime,
        endTime: s.endTime,
        actualDuration: s.actualDuration,
        completed: s.completed,
        stoppedEarly: s.stoppedEarly
      });
      const saved = await newSession.save();
      jsonCache.appendSession(req.user.id, saved);
      savedSessions.push(saved);
    }

    res.json(savedSessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getWeeklyReport = async (req, res) => {
  try {
    let sessions = jsonCache.readCache(req.user.id);
    if (!sessions) {
      sessions = await jsonCache.buildCache(req.user.id);
    }

    const daysStr = req.query.days || '7';
    let daysToFetch = parseInt(daysStr, 10);
    if (isNaN(daysToFetch) || daysToFetch <= 0) daysToFetch = 7;

    const limitAgo = new Date();
    limitAgo.setDate(limitAgo.getDate() - daysToFetch);
    
    const recentSessions = sessions.filter(s => new Date(s.startTime) >= limitAgo);

    const report = {};
    for (let i = daysToFetch - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      report[dateStr] = { BIO: 0, PHYSICS: 0, CHEMISTRY: 0, 'COMBINE MATHS': 0 };
    }

    recentSessions.forEach(session => {
      if (!session.completed) return;
      const dateStr = new Date(session.startTime).toISOString().split('T')[0];
      if (report[dateStr] && session.subject) {
        const sub = session.subject.toUpperCase();
        if (report[dateStr][sub] !== undefined) {
          report[dateStr][sub] += session.actualDuration || 0;
        } else {
          report[dateStr][sub] = (report[dateStr][sub] || 0) + (session.actualDuration || 0);
        }
      }
    });

    const formattedData = Object.keys(report).map(date => ({
      date,
      ...report[date]
    }));

    res.json(formattedData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
