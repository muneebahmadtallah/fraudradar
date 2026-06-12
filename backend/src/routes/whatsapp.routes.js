const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// POST /api/whatsapp/subscribe
router.post('/subscribe', (req, res) => {
  try {
    const { phone, categories } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required.' });

    const cleanPhone = phone.replace(/\D/g, '');
    const existing = db.prepare('SELECT id FROM whatsapp_subscribers WHERE phone = ?').get(cleanPhone);

    if (existing) {
      db.prepare('UPDATE whatsapp_subscribers SET categories = ?, active = 1 WHERE phone = ?')
        .run(JSON.stringify(categories || ['all']), cleanPhone);
      return res.json({ success: true, message: 'Subscription updated successfully!' });
    }

    db.prepare('INSERT INTO whatsapp_subscribers (id, phone, categories) VALUES (?, ?, ?)')
      .run(uuidv4(), cleanPhone, JSON.stringify(categories || ['all']));

    res.status(201).json({ success: true, message: 'Subscribed to WhatsApp alerts successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/whatsapp/unsubscribe
router.post('/unsubscribe', (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required.' });
    const cleanPhone = phone.replace(/\D/g, '');
    db.prepare('UPDATE whatsapp_subscribers SET active = 0 WHERE phone = ?').run(cleanPhone);
    res.json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
