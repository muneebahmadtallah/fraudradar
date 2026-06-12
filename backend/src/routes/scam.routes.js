const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth.middleware');

// Scam patterns for message analysis
const SCAM_PATTERNS = [
  { pattern: /prize|winner|won|lottery|congratulation/i, weight: 25, label: 'Prize/Lottery Scam' },
  { pattern: /otp|pin|password|verify.*account|account.*verif/i, weight: 30, label: 'Credential Phishing' },
  { pattern: /urgent|immediately|expire|block|suspend/i, weight: 20, label: 'Urgency Tactic' },
  { pattern: /\d{11,}/i, weight: 10, label: 'Suspicious Number Pattern' },
  { pattern: /bit\.ly|tinyurl|short\.link|t\.me\/\+/i, weight: 20, label: 'Suspicious Short Link' },
  { pattern: /send money|transfer|bank detail|account number/i, weight: 25, label: 'Money Transfer Request' },
  { pattern: /job offer|earn \d+|work from home|part.?time/i, weight: 15, label: 'Job Scam' },
  { pattern: /investment|return|profit|trading|crypto/i, weight: 20, label: 'Investment Scam' },
  { pattern: /jazzcash|easypaisa|meezan|hbl|nbp/i, weight: 10, label: 'Bank Impersonation' },
  { pattern: /click here|tap here|visit now|open link/i, weight: 15, label: 'Click Bait' },
];

// GET /api/scams/recent
router.get('/recent', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM scam_reports';
    let countQuery = 'SELECT COUNT(*) as total FROM scam_reports';
    const params = [];

    if (type) {
      query += ' WHERE type = ?';
      countQuery += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const scams = db.prepare(query).all(...params, limit, offset);
    const { total } = db.prepare(countQuery).get(...params);

    res.json({
      success: true,
      data: scams,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/scams/check
router.post('/check', (req, res) => {
  try {
    const { query, type } = req.body;
    if (!query || !type) {
      return res.status(400).json({ success: false, message: 'Query and type required.' });
    }

    // Decode token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (err) {
        // Ignore invalid token
      }
    }

    // Enforce check limit for free plan users
    if (req.user) {
      const user = db.prepare('SELECT id, name, email, plan, created_at FROM users WHERE id = ?').get(req.user.id);
      if (user && user.plan === 'free') {
        const checkCountRes = db.prepare('SELECT COUNT(*) as count FROM check_logs WHERE user_id = ?').get(req.user.id);
        const count = checkCountRes ? checkCountRes.count : 0;
        if (count >= 3) {
          return res.status(403).json({
            success: false,
            limitExceeded: true,
            message: 'You have reached your limit of 3 free daily checks. Please upgrade your plan to continue scanning.'
          });
        }
      }
    }

    let result = { found: false, risk_score: 0, reports: [], labels: [], verdict: 'safe' };

    if (type === 'phone' || type === 'link' || type === 'social') {
      // Only return entries that have been verified (approved) by admin
      const allMatches = db.prepare(
        'SELECT * FROM scam_reports WHERE identifier LIKE ? ORDER BY risk_score DESC LIMIT 5'
      ).all(`%${query}%`);
      const scams = allMatches.filter(s => s.verified === 1 || s.verified === true);

      if (scams.length > 0) {
        result.found = true;
        result.risk_score = Math.max(...scams.map(s => s.risk_score));
        result.reports = scams;
        result.labels = [...new Set(scams.map(s => s.type))];
      } else {
        result.risk_score = Math.floor(Math.random() * 15); // Low random score for unknown
      }
    } else if (type === 'message') {
      let score = 0;
      const matchedLabels = [];

      for (const { pattern, weight, label } of SCAM_PATTERNS) {
        if (pattern.test(query)) {
          score += weight;
          matchedLabels.push(label);
        }
      }

      result.risk_score = Math.min(score, 100);
      result.labels = matchedLabels;
      result.found = score > 30;
    }

    if (result.risk_score >= 75) result.verdict = 'danger';
    else if (result.risk_score >= 40) result.verdict = 'warning';
    else result.verdict = 'safe';

    // Log the check
    if (req.user) {
      db.prepare('INSERT INTO check_logs (id, user_id, check_type, query, result, risk_score) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), req.user?.id || null, type, query.substring(0, 200), result.verdict, result.risk_score);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/scams/report
router.post('/report', [authMiddleware], (req, res) => {
  try {
    const { type, identifier, description } = req.body;
    if (!type || !identifier) {
      return res.status(400).json({ success: false, message: 'Type and identifier required.' });
    }

    const existing = db.prepare('SELECT id FROM scam_reports WHERE identifier = ?').get(identifier);
    if (existing) {
      db.prepare('UPDATE scam_reports SET report_count = report_count + 1 WHERE id = ?').run(existing.id);
      return res.json({ success: true, message: 'Report added to existing record. Thank you!', existing: true });
    }

    const id = uuidv4();
    // Insert as verified=0 (pending) so admin must approve before it shows in scans
    db.prepare('INSERT INTO scam_reports (id, user_id, type, identifier, description, risk_score, verified) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, type, identifier, description || '', 50, 0);

    // Bump stats
    db.prepare('UPDATE platform_stats SET reports_today = reports_today + 1 WHERE id = 1').run();

    res.status(201).json({ success: true, message: 'Report submitted successfully! Our team will review it.', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/scams/report-public (no auth required)
router.post('/report-public', (req, res) => {
  try {
    const { type, identifier, description } = req.body;
    if (!type || !identifier) {
      return res.status(400).json({ success: false, message: 'Type and identifier required.' });
    }

    const existing = db.prepare('SELECT id FROM scam_reports WHERE identifier = ?').get(identifier);
    if (existing) {
      db.prepare('UPDATE scam_reports SET report_count = report_count + 1 WHERE id = ?').run(existing.id);
      return res.json({ success: true, message: 'Report added to existing record. Thank you!', existing: true });
    }

    const id = uuidv4();
    // Insert as verified=0 (pending) so admin must approve before it shows in scans
    db.prepare('INSERT INTO scam_reports (id, type, identifier, description, risk_score, verified) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, type, identifier, description || '', 50, 0);

    db.prepare('UPDATE platform_stats SET reports_today = reports_today + 1 WHERE id = 1').run();

    res.status(201).json({ success: true, message: 'Report submitted successfully!', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/scams/upvote/:id
router.post('/upvote/:id', (req, res) => {
  try {
    const scam = db.prepare('SELECT id FROM scam_reports WHERE id = ?').get(req.params.id);
    if (!scam) return res.status(404).json({ success: false, message: 'Report not found.' });
    db.prepare('UPDATE scam_reports SET upvotes = upvotes + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Upvoted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
