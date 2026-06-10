require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/models', require('./routes/models'));
app.use('/api/image', require('./routes/image'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// Start server
async function start() {
  try {
    await getDb();
    console.log('[DB] Database initialized');

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════╗
║    AI Chat Hub Server Ready!     ║
║    http://localhost:${PORT}        ║
║    Login: admin@aichat.com       ║
║    Password: admin123456         ║
╚══════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start:', err);
    process.exit(1);
  }
}

start();
