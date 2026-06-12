const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth.middleware');

// Admin verification helper middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrators only.' });
  }
  next();
};

// 1. Submit Payment Proof (User)
router.post('/submit', authMiddleware, (req, res) => {
  try {
    const { plan, amount, payment_method, transaction_id, screenshot } = req.body;
    
    if (!plan || !amount || !payment_method || !transaction_id || !screenshot) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const id = uuidv4();
    const created_at = new Date().toISOString();
    
    db.prepare('INSERT INTO payments (id, user_id, user_name, user_email, plan, amount, payment_method, transaction_id, screenshot, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, req.user.name, req.user.email, plan, amount, payment_method, transaction_id, screenshot, 'pending', created_at);

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted successfully! Admin will verify and upgrade your plan soon.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while submitting payment.' });
  }
});

// 2. Get All Payment Proofs (Admin only)
router.get('/admin/all', authMiddleware, adminOnly, (req, res) => {
  try {
    const payments = db.prepare('SELECT * FROM payments ORDER BY created_at DESC').all();
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while fetching payments.' });
  }
});

// 3. Verify Payment Proof (Admin only)
router.post('/admin/verify', authMiddleware, adminOnly, (req, res) => {
  try {
    const { paymentId, status } = req.body;

    if (!paymentId || !status || (status !== 'approved' && status !== 'rejected')) {
      return res.status(400).json({ success: false, message: 'Payment ID and valid status required.' });
    }

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    // Update status in payments
    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(status, paymentId);

    // If approved, update user's plan
    if (status === 'approved') {
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(payment.plan, payment.user_id);
    }

    res.json({
      success: true,
      message: `Payment verification complete. Status set to: ${status}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while verifying payment.' });
  }
});

module.exports = router;
