const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: { type: String, required: true }, // "HH:MM"
  endTime: { type: String, required: true },   // "HH:MM"
  subject: {
    type: String,
    required: true,
    enum: ['BIO', 'PHYSICS', 'CHEMISTRY', 'COMBINE MATHS']
  },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', TimetableSchema);
