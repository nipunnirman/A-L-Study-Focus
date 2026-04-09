const Timetable = require('../models/Timetable');

// GET /api/timetable — get all entries for the logged-in user
exports.getEntries = async (req, res) => {
  try {
    const entries = await Timetable.find({ userId: req.user.id }).sort({ day: 1, startTime: 1 }).lean();
    res.json(entries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// POST /api/timetable — create a new time block
exports.createEntry = async (req, res) => {
  const { day, startTime, endTime, subject, note } = req.body;

  if (!day || !startTime || !endTime || !subject) {
    return res.status(400).json({ msg: 'day, startTime, endTime, and subject are required' });
  }

  try {
    // Check for overlap on the same day for this user
    const existing = await Timetable.find({ userId: req.user.id, day }).lean();
    const toMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const newStart = toMins(startTime);
    const newEnd = toMins(endTime);

    if (newEnd <= newStart) {
      return res.status(400).json({ msg: 'End time must be after start time' });
    }

    const overlap = existing.find(e => {
      const eStart = toMins(e.startTime);
      const eEnd = toMins(e.endTime);
      return newStart < eEnd && newEnd > eStart;
    });

    if (overlap) {
      return res.status(400).json({ msg: `Overlaps with existing ${overlap.subject} block (${overlap.startTime}–${overlap.endTime})` });
    }

    const entry = new Timetable({
      userId: req.user.id,
      day,
      startTime,
      endTime,
      subject,
      note: note || ''
    });

    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// PUT /api/timetable/:id — update an existing entry
exports.updateEntry = async (req, res) => {
  try {
    let entry = await Timetable.findById(req.params.id);
    if (!entry) return res.status(404).json({ msg: 'Entry not found' });

    if (entry.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { day, startTime, endTime, subject, note } = req.body;
    if (day) entry.day = day;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (subject) entry.subject = subject;
    if (note !== undefined) entry.note = note;

    const updated = await entry.save();
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// DELETE /api/timetable/:id — delete an entry
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await Timetable.findById(req.params.id);
    if (!entry) return res.status(404).json({ msg: 'Entry not found' });

    if (entry.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Entry removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
