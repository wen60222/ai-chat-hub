const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, get, all, run } = require('../db/schema');
const { authenticate } = require('../middleware/auth');
const { checkDailyLimit, trackUsage } = require('../middleware/rateLimit');
const { streamChat, simpleChat } = require('../services/llm');

const router = express.Router();

// List conversations
router.get('/conversations', authenticate, async (req, res) => {
  await getDb();
  const convs = all(
    'SELECT id, title, model, message_count, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(convs);
});

// Get single conversation
router.get('/conversations/:id', authenticate, async (req, res) => {
  await getDb();
  const conv = get('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!conv) return res.status(404).json({ error: '对话不存在' });

  const messages = all('SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id', [req.params.id]);
  res.json({ ...conv, messages });
});

// Delete conversation
router.delete('/conversations/:id', authenticate, async (req, res) => {
  await getDb();
  const conv = get('SELECT id FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!conv) return res.status(404).json({ error: '对话不存在' });
  
  run('DELETE FROM messages WHERE conversation_id = ?', [req.params.id]);
  run('DELETE FROM conversations WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Send message with SSE streaming
router.post('/send', authenticate, checkDailyLimit, async (req, res) => {
  const { conversationId, message, model, systemPrompt } = req.body;
  if (!message || !model) {
    return res.status(400).json({ error: '缺少消息内容或模型参数' });
  }

  await getDb();
  let convId = conversationId;
  let isNew = false;

  if (!convId) {
    convId = uuidv4();
    isNew = true;
    run('INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)',
      [convId, req.user.id, message.slice(0, 30) + (message.length > 30 ? '...' : ''), model]);
  } else {
    const existing = get('SELECT id FROM conversations WHERE id = ? AND user_id = ?', [convId, req.user.id]);
    if (!existing) return res.status(404).json({ error: '对话不存在' });
    run("UPDATE conversations SET model = ?, updated_at = datetime('now','localtime') WHERE id = ?", [model, convId]);
  }

  // Save user message
  run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [convId, 'user', message]);
  run("UPDATE conversations SET message_count = message_count + 1, updated_at = datetime('now','localtime') WHERE id = ?", [convId]);

  // Build API messages
  const history = all('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id', [convId]);
  const apiMessages = [];
  if (systemPrompt) apiMessages.push({ role: 'system', content: systemPrompt });
  history.forEach(m => apiMessages.push({ role: m.role, content: m.content }));

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'init', conversationId: convId, isNew })}\n\n`);

  let fullResponse = '';
  let stopReason = 'complete';

  try {
    await streamChat(apiMessages, model, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    stopReason = 'error';
    res.write(`data: ${JSON.stringify({ type: 'error', message: `AI响应失败: ${err.message}` })}\n\n`);
  }

  if (fullResponse) {
    run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [convId, 'assistant', fullResponse]);
    run("UPDATE conversations SET message_count = message_count + 1, updated_at = datetime('now','localtime') WHERE id = ?", [convId]);
    trackUsage(req.user.id, model, 0, fullResponse.length, 0);
  }

  res.write(`data: ${JSON.stringify({ type: 'done', reason: stopReason, conversationId: convId })}\n\n`);
  res.end();
});

// Generate title
router.post('/conversations/:id/title', authenticate, async (req, res) => {
  await getDb();
  const conv = get('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!conv) return res.status(404).json({ error: '对话不存在' });

  const firstMsg = get('SELECT content FROM messages WHERE conversation_id = ? AND role = ? ORDER BY id LIMIT 1', [req.params.id, 'user']);
  if (!firstMsg) return res.json({ title: conv.title });

  try {
    const titleResponse = await simpleChat([
      { role: 'system', content: '根据用户的第一条消息，生成一个简短的对话标题(10字以内)，直接返回标题，不加引号。' },
      { role: 'user', content: firstMsg.content }
    ], 'gpt-3.5-turbo'); // Use cheapest model for title gen

    const title = titleResponse.trim().slice(0, 50);
    run('UPDATE conversations SET title = ? WHERE id = ?', [title, req.params.id]);
    res.json({ title });
  } catch (err) {
    res.json({ title: conv.title });
  }
});

module.exports = router;
