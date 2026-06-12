require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Database initialization
require('./db/database');

const authRoutes = require('./routes/auth.routes');
const scamRoutes = require('./routes/scam.routes');
const statsRoutes = require('./routes/stats.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentRoutes = require('./routes/payment.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scams', scamRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server!'
  });
});

// Serve Angular front‑end in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const clientBuildPath = path.resolve(__dirname, '../../frontend/dist');

  // Resolve the Angular build output directory (dist/frontend)
  app.use(express.static(clientBuildPath));
  // All non‑API routes should return index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}


// Start server
app.listen(PORT, () => {
  console.log(`🚀 fraudradar API running on http://localhost:${PORT}`);
});
