const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const createJwtToken = (payload) => {
  return new Promise((resolve, reject) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return reject(new Error('JWT_SECRET is not configured'));
    }

    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) return reject(err);
        return resolve(token);
      }
    );
  });
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ name, email, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = { user: { id: user.id } };
    const token = await createJwtToken(payload);

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.message === 'JWT_SECRET is not configured') {
      return res.status(500).json({ msg: 'Server auth configuration error' });
    }
    return res.status(500).json({ msg: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id } };
    const token = await createJwtToken(payload);

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err.message);

    if (err.message === 'JWT_SECRET is not configured') {
      return res.status(500).json({ msg: 'Server auth configuration error' });
    }

    if (err.message && err.message.toLowerCase().includes('buffering timed out')) {
      return res.status(500).json({ msg: 'Database connection issue. Try again in a moment.' });
    }

    return res.status(500).json({ msg: 'Server error during login' });
  }
};
