/**
 * AI Image Generation Service
 * Supports: OpenAI DALL-E 3, Stability AI, and generic API
 */

const MODEL_CONFIG = {
  'dall-e-3': {
    provider: 'openai',
    model: 'dall-e-3',
    maxSize: '1024x1024',
    quality: ['standard', 'hd'],
    style: ['vivid', 'natural'],
    pricePerImage: 0.04,
    display: 'DALL-E 3'
  },
  'dall-e-2': {
    provider: 'openai',
    model: 'dall-e-2',
    maxSize: '1024x1024',
    pricePerImage: 0.02,
    display: 'DALL-E 2'
  },
  'stable-diffusion-xl': {
    provider: 'stability',
    model: 'stable-diffusion-xl-1024-v1-0',
    maxSize: '1024x1024',
    pricePerImage: 0.04,
    display: 'Stable Diffusion XL'
  },
  'stable-diffusion-v3': {
    provider: 'stability',
    model: 'stable-diffusion-v3-0',
    maxSize: '1024x1024',
    pricePerImage: 0.035,
    display: 'Stable Diffusion 3.0'
  },
};

function getConfig(modelKey) {
  const cfg = MODEL_CONFIG[modelKey];
  if (!cfg) throw new Error(`不支持的图片模型: ${modelKey}`);
  return cfg;
}

/**
 * Generate images using the specified model
 * Returns array of image URLs
 */
async function generateImages(prompt, modelKey, options = {}) {
  const cfg = getConfig(modelKey);
  
  switch (cfg.provider) {
    case 'openai':    return generateOpenAI(prompt, cfg, options);
    case 'stability': return generateStability(prompt, cfg, options);
    default: throw new Error(`未知图片提供商: ${cfg.provider}`);
  }
}

async function generateOpenAI(prompt, cfg, options) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const body = {
    model: cfg.model,
    prompt,
    n: options.n || 1,
    size: options.size || '1024x1024',
    response_format: 'url',
  };

  if (cfg.quality && options.quality) body.quality = options.quality;
  if (cfg.style && options.style) body.style = options.style;

  const response = await client.images.generate(body);
  return response.data.map(img => img.url);
}

async function generateStability(prompt, cfg, options) {
  // Stability AI API
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) throw new Error('未配置 Stability AI API Key');

  const formData = new URLSearchParams();
  formData.append('prompt', prompt);
  formData.append('output_format', 'png');
  if (options.negative_prompt) formData.append('negative_prompt', options.negative_prompt);
  if (options.cfg_scale) formData.append('cfg_scale', options.cfg_scale);
  if (options.steps) formData.append('steps', options.steps);

  const response = await fetch(
    `https://api.stability.ai/v2beta/stable-image/generate/core`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/png',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stability AI 生成失败: ${text}`);
  }

  // Return as data URI or upload somewhere
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return [`data:image/png;base64,${base64}`];
}

function getAvailableModels() {
  return Object.entries(MODEL_CONFIG).map(([key, cfg]) => ({
    id: key,
    name: cfg.display,
    provider: cfg.provider,
    price: cfg.pricePerImage,
    sizes: getSizeOptions(key),
  }));
}

function getSizeOptions(modelKey) {
  const sizes = {
    'dall-e-3': ['1024x1024', '1792x1024', '1024x1792'],
    'dall-e-2': ['256x256', '512x512', '1024x1024'],
    'stable-diffusion-xl': ['1024x1024'],
    'stable-diffusion-v3': ['1024x1024'],
  };
  return sizes[modelKey] || ['1024x1024'];
}

module.exports = { generateImages, getAvailableModels };
