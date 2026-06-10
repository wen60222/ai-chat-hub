const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, get, run } = require('../db/schema');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '请填写所有字段' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  await getDb();

  const existing = get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    return res.status(409).json({ error: '用户名或邮箱已被注册' });
  }

  const hash = bcrypt.hashSync(password, 10);
  run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);

  const user = get('SELECT id, username, role FROM users WHERE username = ?', [username]);
  const token = generateToken(user);

  res.status(201).json({
    token,
    user: { id: user.id, username, email, role: 'user', credits: 0, subscription_plan: 'free' }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' });
  }

  await getDb();
  const user = get('SELECT * FROM users WHERE email = ?', [email]);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: '账号已被禁用' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id, username: user.username, email: user.email,
      role: user.role, credits: user.credits,
      subscription_plan: user.subscription_plan,
      subscription_expires: user.subscription_expires,
      daily_usage: user.daily_usage
    }
  });
});

router.get('/profile', authenticate, async (req, res) => {
  await getDb();
  const user = get('SELECT id, username, email, role, credits, subscription_plan, subscription_expires, daily_usage, daily_reset_date FROM users WHERE id = ?', [req.user.id]);
  
  const today = new Date().toISOString().split('T')[0];
  const dailyLimit = parseInt(process.env.FREE_DAILY_LIMIT || '20');
  const planLimits = { free: dailyLimit, basic: 500, pro: 2000, unlimited: Infinity };

  res.json({
    ...user,
    daily_limit: planLimits[user.subscription_plan] || dailyLimit,
    daily_reset: user.daily_reset_date === today
  });
});

module.exports = router;
