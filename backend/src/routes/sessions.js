const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

// @route   POST api/sessions/start
// @desc    Start a new study session
router.post('/start', auth, sessionController.startSession);

// @route   POST api/sessions/tuition
// @desc    Add a completed tuition class session
router.post('/tuition', auth, sessionController.addTuitionSession);

// @route   PUT api/sessions/:id/stop
// @desc    Stop/complete a study session
router.put('/:id/stop', auth, sessionController.stopSession);

// @route   PUT api/sessions/:id/heartbeat
// @desc    Update session duration in real-time
router.put('/:id/heartbeat', auth, sessionController.updateSessionHeartbeat);

// @route   GET api/sessions
// @desc    Get all user sessions
router.get('/', auth, sessionController.getSessions);

// @route   GET api/sessions/weekly
// @desc    Get weekly report data
router.get('/weekly', auth, sessionController.getWeeklyReport);

// @route   POST api/sessions/sync
// @desc    Sync bulk offline completed sessions
router.post('/sync', auth, sessionController.syncOfflineSessions);

module.exports = router;
