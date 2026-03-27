const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  plannedDuration: { type: Number, required: true }, // in minutes
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  actualDuration: { type: Number, default: 0 }, // in minutes
  completed: { type: Boolean, default: false },
  stoppedEarly: { type: Boolean, default: false }
});

module.exports = mongoose.model('Session', SessionSchema);
