const Session = require('../models/Session');

// Simple passthrough — no file cache, always reads from MongoDB directly.
// File caching was causing 500 errors on Vercel (serverless, ephemeral filesystem).
const jsonCache = {
  buildCache: async (userId) => {
    try {
      return await Session.find({ userId }).sort({ startTime: -1 }).lean();
    } catch (err) {
      console.error('Error fetching sessions:', err);
      return [];
    }
  },

  readCache: () => null, // Always return null so callers fall back to DB

  appendSession: async (userId, session) => {
    // No-op — session is already saved to DB by the caller
  },

  updateSession: async (userId, updatedSession) => {
    // No-op — session is already saved to DB by the caller
  }
};

module.exports = jsonCache;
