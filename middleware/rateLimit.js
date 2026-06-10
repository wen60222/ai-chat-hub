const { getDb, get, run, all } = require('../db/schema');

async function checkDailyLimit(req, res, next) {
  const user = req.user;
  await getDb();
  
  if (user.subscription_plan === 'unlimited') {
    return next();
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  if (user.daily_reset_date !== today) {
    run('UPDATE users SET daily_usage = 0, daily_reset_date = ? WHERE id = ?', [today, user.id]);
    user.daily_usage = 0;
    user.daily_reset_date = today;
  }

  const dailyLimit = parseInt(process.env.FREE_DAILY_LIMIT || '20');
  const planLimits = { free: dailyLimit, basic: 500, pro: 2000, unlimited: Infinity };
  const limit = planLimits[user.subscription_plan] || dailyLimit;
  
  if (user.subscription_expires && user.subscription_plan !== 'free') {
    const expDate = new Date(user.subscription_expires);
    if (new Date() > expDate) {
      run('UPDATE users SET subscription_plan = ? WHERE id = ?', ['free', user.id]);
      return res.status(403).json({ error: '订阅已过期，请续费' });
    }
  }

  if (user.daily_usage >= limit) {
    return res.status(429).json({ 
      error: `今日用量已达上限(${limit}条)，升级套餐获取更多额度`,
      limit,
      used: user.daily_usage,
      plan: user.subscription_plan
    });
  }

  next();
}

function trackUsage(userId, model, tokensIn, tokensOut, cost) {
  run('UPDATE users SET daily_usage = daily_usage + 1 WHERE id = ?', [userId]);
  run('INSERT INTO usage_logs (user_id, model, tokens_in, tokens_out, cost) VALUES (?, ?, ?, ?, ?)',
    [userId, model, tokensIn, tokensOut, cost]);
}

module.exports = { checkDailyLimit, trackUsage };
