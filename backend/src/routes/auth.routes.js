const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)')
      .run(userId, name, email, hashedPassword);

    const token = jwt.sign(
      { id: userId, email, name, plan: 'free', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: userId, name, email, plan: 'free', role: 'user' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, role: user.role || 'user' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth.middleware'), (req, res) => {
  const user = db.prepare('SELECT id, name, email, plan, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, user: { ...user, role: user.role || 'user' } });
});

module.exports = router;
