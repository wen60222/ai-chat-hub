/**
 * LLM Unified Service Layer
 * Routes requests to the appropriate AI provider
 */

const MODEL_CONFIG = {
  'gpt-4o':         { provider: 'openai',    model: 'gpt-4o',             priceIn: 5,    priceOut: 15,   display: 'GPT-4o' },
  'gpt-4o-mini':    { provider: 'openai',    model: 'gpt-4o-mini',        priceIn: 0.15, priceOut: 0.6,  display: 'GPT-4o Mini' },
  'gpt-4':          { provider: 'openai',    model: 'gpt-4',              priceIn: 30,   priceOut: 60,   display: 'GPT-4' },
  'gpt-3.5-turbo':  { provider: 'openai',    model: 'gpt-3.5-turbo',      priceIn: 0.5,  priceOut: 1.5,  display: 'GPT-3.5 Turbo' },
  'claude-3.5-sonnet': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', priceIn: 3, priceOut: 15, display: 'Claude 3.5 Sonnet' },
  'claude-3-opus':  { provider: 'anthropic', model: 'claude-3-opus-20240229', priceIn: 15, priceOut: 75, display: 'Claude 3 Opus' },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku-20240307', priceIn: 0.25, priceOut: 1.25, display: 'Claude 3 Haiku' },
  'gemini-2.0-flash': { provider: 'gemini',  model: 'gemini-2.0-flash',   priceIn: 0.1,  priceOut: 0.4,  display: 'Gemini 2.0 Flash' },
  'gemini-1.5-pro': { provider: 'gemini',    model: 'gemini-1.5-pro',     priceIn: 1.25, priceOut: 5,    display: 'Gemini 1.5 Pro' },
  'deepseek-v3':    { provider: 'deepseek',  model: 'deepseek-chat',      priceIn: 0.5,  priceOut: 2,    display: 'DeepSeek V3' },
  'deepseek-r1':    { provider: 'deepseek',  model: 'deepseek-reasoner',  priceIn: 0.55, priceOut: 2.19, display: 'DeepSeek R1' },
  'moonshot-v1':    { provider: 'moonshot',  model: 'moonshot-v1-128k',   priceIn: 0.6,  priceOut: 2,    display: 'Kimi Moonshot' },
  'qwen-turbo':     { provider: 'tongyi',    model: 'qwen-turbo',         priceIn: 0.3,  priceOut: 0.6,  display: '通义千问 Turbo' },
  'qwen-plus':      { provider: 'tongyi',    model: 'qwen-plus',          priceIn: 0.8,  priceOut: 2,    display: '通义千问 Plus' },
  'qwen-max':       { provider: 'tongyi',    model: 'qwen-max',           priceIn: 2,    priceOut: 6,    display: '通义千问 Max' },
};

function getConfig(modelKey) {
  const cfg = MODEL_CONFIG[modelKey];
  if (!cfg) throw new Error(`不支持的模型: ${modelKey}`);
  return cfg;
}

/**
 * Stream chat completion from the appropriate provider
 * Returns a ReadableStream
 */
async function streamChat(messages, modelKey, onChunk) {
  const cfg = getConfig(modelKey);
  
  switch (cfg.provider) {
    case 'openai':    return streamOpenAI(messages, cfg, onChunk);
    case 'anthropic': return streamAnthropic(messages, cfg, onChunk);
    case 'gemini':    return streamGemini(messages, cfg, onChunk);
    case 'deepseek':  return streamDeepSeek(messages, cfg, onChunk);
    case 'moonshot':  return streamMoonshot(messages, cfg, onChunk);
    case 'tongyi':    return streamTongyi(messages, cfg, onChunk);
    default: throw new Error(`未知提供商: ${cfg.provider}`);
  }
}

// === Provider Implementations ===

async function streamOpenAI(messages, cfg, onChunk) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await client.chat.completions.create({
    model: cfg.model,
    messages,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

async function streamAnthropic(messages, cfg, onChunk) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Convert OpenAI format to Anthropic format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const stream = await client.messages.create({
    model: cfg.model,
    system: systemMsg?.content,
    messages: chatMessages,
    max_tokens: 4096,
    stream: true,
  });

  let full = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      full += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  return full;
}

async function streamGemini(messages, cfg, onChunk) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: cfg.model });

  // Convert to Gemini format
  const history = [];
  const lastMsg = messages[messages.length - 1];
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i];
    if (m.role !== 'system') {
      history.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(lastMsg.content);

  let full = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

async function streamDeepSeek(messages, cfg, onChunk) {
  const OpenAI = require('openai');
  const client = new OpenAI({ 
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
  });

  const stream = await client.chat.completions.create({
    model: cfg.model,
    messages,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

async function streamMoonshot(messages, cfg, onChunk) {
  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: 'https://api.moonshot.cn/v1'
  });

  const stream = await client.chat.completions.create({
    model: cfg.model,
    messages,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

async function streamTongyi(messages, cfg, onChunk) {
  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: process.env.TONGYI_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  });

  const stream = await client.chat.completions.create({
    model: cfg.model,
    messages,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

/**
 * Non-streaming completion (for title generation etc.)
 */
async function simpleChat(messages, modelKey) {
  return new Promise((resolve, reject) => {
    let full = '';
    streamChat(messages, modelKey, (chunk) => { full += chunk; })
      .then(() => resolve(full))
      .catch(reject);
  });
}

function getAvailableModels() {
  return Object.entries(MODEL_CONFIG).map(([key, cfg]) => ({
    id: key,
    name: cfg.display,
    provider: cfg.provider,
    priceIn: cfg.priceIn,
    priceOut: cfg.priceOut,
  }));
}

module.exports = { streamChat, simpleChat, getAvailableModels, MODEL_CONFIG };
