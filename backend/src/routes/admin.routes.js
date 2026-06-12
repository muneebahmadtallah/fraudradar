const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth.middleware');

// Admin verification middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrators only.' });
  }
  next();
};

// All admin routes require authentication & admin role
router.use(authMiddleware, adminOnly);

// GET /api/admin/reports - Get all reports (pending and confirmed)
router.get('/reports', (req, res) => {
  try {
    const reports = db.prepare('SELECT * FROM scam_reports ORDER BY created_at DESC').all();
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/admin/scams - Manually add a verified scam
router.post('/scams', (req, res) => {
  try {
    const { type, identifier, description, risk_score = 90 } = req.body;
    if (!type || !identifier) {
      return res.status(400).json({ success: false, message: 'Type and identifier required.' });
    }

    const id = uuidv4();
    // Insert scam report
    db.prepare('INSERT INTO scam_reports (id, user_id, type, identifier, description, risk_score) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, type, identifier, description || '', risk_score);

    // Confirm it immediately
    db.prepare('UPDATE scam_reports SET status = ?, verified = ?, risk_score = ? WHERE id = ?')
      .run('confirmed', 1, risk_score, id);

    res.status(201).json({ success: true, message: 'Scam entry created and verified successfully.', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/admin/reports/:id - Verify/update a report
router.put('/reports/:id', (req, res) => {
  try {
    const { status = 'confirmed', verified = 1, risk_score = 75 } = req.body;
    const { id } = req.params;

    const report = db.prepare('SELECT id FROM scam_reports WHERE id = ?').get(id);
    if (!report) {
      // Check in generic query
      const scamList = db.prepare('SELECT * FROM scam_reports ORDER BY created_at DESC').all();
      const match = scamList.find(s => s.id === id);
      if (!match) return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    db.prepare('UPDATE scam_reports SET status = ?, verified = ?, risk_score = ? WHERE id = ?')
      .run(status, verified, risk_score, id);

    res.json({ success: true, message: 'Report updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/admin/scams/:id - Delete a report/scam entry
router.delete('/scams/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM scam_reports WHERE id = ?').run(id);
    res.json({ success: true, message: 'Scam entry deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/subscribers - List WhatsApp alert subscribers
router.get('/subscribers', (req, res) => {
  try {
    const subscribers = db.prepare('SELECT * FROM whatsapp_subscribers ORDER BY created_at DESC').all();
    res.json({ success: true, data: subscribers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
