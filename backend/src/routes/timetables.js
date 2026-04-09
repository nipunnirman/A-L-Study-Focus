const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const timetableController = require('../controllers/timetableController');

// @route   GET /api/timetable
// @desc    Get all timetable entries for the user
router.get('/', auth, timetableController.getEntries);

// @route   POST /api/timetable
// @desc    Create a new timetable entry
router.post('/', auth, timetableController.createEntry);

// @route   PUT /api/timetable/:id
// @desc    Update an existing timetable entry
router.put('/:id', auth, timetableController.updateEntry);

// @route   DELETE /api/timetable/:id
// @desc    Delete a timetable entry
router.delete('/:id', auth, timetableController.deleteEntry);

module.exports = router;
