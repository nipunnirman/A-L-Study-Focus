const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

// @route   POST api/sessions/start
// @desc    Start a new study session
router.post('/start', auth, sessionController.startSession);

// @route   PUT api/sessions/:id/stop
// @desc    Stop/complete a study session
router.put('/:id/stop', auth, sessionController.stopSession);

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
