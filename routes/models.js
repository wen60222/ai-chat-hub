const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAvailableModels } = require('../services/llm');

const router = express.Router();

// Get available models grouped by provider
router.get('/', authenticate, (req, res) => {
  const models = getAvailableModels();

  // Group by provider
  const grouped = {};
  models.forEach(m => {
    if (!grouped[m.provider]) grouped[m.provider] = [];
    grouped[m.provider].push(m);
  });

  // Provider display names
  const providerNames = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
    moonshot: 'Moonshot / Kimi',
    tongyi: '阿里通义千问'
  };

  const result = Object.entries(grouped).map(([key, models]) => ({
    id: key,
    name: providerNames[key] || key,
    models
  }));

  res.json(result);
});

module.exports = router;
