const fs = require('fs');
const path = require('path');
const Session = require('../models/Session');

const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const CACHE_DIR = IS_VERCEL ? '/tmp/cache' : path.join(__dirname, '../../cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const getCacheFilePath = (userId) => path.join(CACHE_DIR, `${userId}.json`);

const jsonCache = {
  // Initialize or rebuild cache from DB
  buildCache: async (userId) => {
    try {
      const sessions = await Session.find({ userId }).sort({ startTime: -1 });
      const filePath = getCacheFilePath(userId);
      fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
      return sessions;
    } catch (err) {
      console.error('Error building cache:', err);
      return [];
    }
  },

  // Read from cache
  readCache: (userId) => {
    const filePath = getCacheFilePath(userId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading cache:', err);
      return null;
    }
  },

  // Append new session to cache
  appendSession: (userId, session) => {
    let sessions = jsonCache.readCache(userId);
    if (!sessions) {
      // If cache doesn't exist, we just build it
      jsonCache.buildCache(userId);
      return;
    }
    // Add new session to top
    sessions.unshift(session);
    const filePath = getCacheFilePath(userId);
    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
  },

  // Update existing session in cache
  updateSession: (userId, updatedSession) => {
    let sessions = jsonCache.readCache(userId);
    if (!sessions) return;
    
    const index = sessions.findIndex(s => s._id.toString() === updatedSession._id.toString());
    if (index !== -1) {
      sessions[index] = updatedSession;
      const filePath = getCacheFilePath(userId);
      fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
    }
  }
};

module.exports = jsonCache;
