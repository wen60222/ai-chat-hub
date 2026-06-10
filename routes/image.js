const express = require('express');
const { generateImages, getAvailableModels } = require('../services/image');
const { authenticate } = require('../middleware/auth');
const { checkDailyLimit, trackUsage } = require('../middleware/rateLimit');

const router = express.Router();

// Get available image models
router.get('/models', authenticate, (req, res) => {
  res.json(getAvailableModels());
});

// Generate images
router.post('/generate', authenticate, checkDailyLimit, async (req, res) => {
  const { prompt, model, n, size, quality, style, negative_prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: '请填写图片描述' });
  }
  if (!model) {
    return res.status(400).json({ error: '请选择图片模型' });
  }

  try {
    const urls = await generateImages(prompt, model, {
      n: Math.min(n || 1, 4), // Max 4 images
      size,
      quality,
      style,
      negative_prompt,
    });

    trackUsage(req.user.id, model, prompt.length, 0, 0);

    res.json({
      images: urls.map(url => ({ url })),
      model,
      prompt,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Image Gen Error]', err.message);
    res.status(500).json({ error: `图片生成失败: ${err.message}` });
  }
});

module.exports = router;
