const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, get, all, run } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/stats', async (req, res) => {
  await getDb();
  const totalUsers = get('SELECT COUNT(*) as count FROM users').count;
  const activeUsers = get("SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND daily_usage > 0").count;
  const totalConversations = get('SELECT COUNT(*) as count FROM conversations').count;
  const totalMessages = get('SELECT COUNT(*) as count FROM messages').count;
  const paidUsers = get("SELECT COUNT(*) as count FROM users WHERE subscription_plan != 'free'").count;
  
  const today = new Date().toISOString().split('T')[0];
  const todayUsage = get("SELECT COUNT(*) as count FROM usage_logs WHERE date(created_at) = ?", [today]).count;
  const totalRevenue = get("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid'").total;

  res.json({ totalUsers, activeUsers, totalConversations, totalMessages, paidUsers, todayUsage, totalRevenue });
});

// Users list
router.get('/users', async (req, res) => {
  await getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const total = get('SELECT COUNT(*) as count FROM users').count;
  const users = all(
    'SELECT id, username, email, role, credits, subscription_plan, subscription_expires, daily_usage, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
});

// Update user
router.put('/users/:id', async (req, res) => {
  await getDb();
  const { credits, subscription_plan, subscription_expires, is_active } = req.body;
  const updates = [];
  const params = [];

  if (credits !== undefined) { updates.push('credits = ?'); params.push(credits); }
  if (subscription_plan !== undefined) { updates.push('subscription_plan = ?'); params.push(subscription_plan); }
  if (subscription_expires !== undefined) { updates.push('subscription_expires = ?'); params.push(subscription_expires); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' });

  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ success: true });
});

// API keys
router.get('/api-keys', async (req, res) => {
  await getDb();
  const keys = all('SELECT id, provider, is_active, usage_count, last_used, created_at FROM api_keys');
  res.json(keys);
});

router.post('/api-keys', async (req, res) => {
  await getDb();
  const { provider, key_value } = req.body;
  if (!provider || !key_value) return res.status(400).json({ error: '请填写提供商和API密钥' });
  run('INSERT INTO api_keys (provider, key_value) VALUES (?, ?)', [provider, key_value]);
  res.status(201).json({ success: true });
});

router.delete('/api-keys/:id', async (req, res) => {
  await getDb();
  run('DELETE FROM api_keys WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Usage logs
router.get('/usage', async (req, res) => {
  await getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const total = get('SELECT COUNT(*) as count FROM usage_logs').count;
  const logs = all(
    `SELECT u.username, ul.model, ul.tokens_in, ul.tokens_out, ul.cost, ul.created_at 
     FROM usage_logs ul JOIN users u ON ul.user_id = u.id 
     ORDER BY ul.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
});

// Orders
router.get('/orders', async (req, res) => {
  await getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const total = get('SELECT COUNT(*) as count FROM orders').count;
  const orders = all(
    `SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  res.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
});

module.exports = router;
