const jwt = require('jsonwebtoken');
const { getDb, get } = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    await getDb();
    const user = get('SELECT id, username, email, role, credits, subscription_plan, subscription_expires, daily_usage, daily_reset_date, is_active FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = { generateToken, authenticate, requireAdmin };
