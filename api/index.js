/**
 * Vercel Serverless Entry Point
 * 
 * ⚠️ 重要说明：
 * Vercel 无服务器函数不支持 SQLite 持久化存储。
 * 每次冷启动数据会丢失。
 * 
 * 解决方案（选一）：
 * 1. Turso（边缘SQLite，推荐） https://turso.tech
 * 2. Neon（Serverless PostgreSQL） https://neon.tech
 * 3. Supabase（PostgreSQL + 认证） https://supabase.com
 * 4. Railway（完整Node.js部署，支持SQLite持久化）
 * 
 * 本文件保留Express完整逻辑，方便在支持持久化的平台运行。
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/chat', require('../routes/chat'));
app.use('/api/models', require('../routes/models'));
app.use('/api/image', require('../routes/image'));
app.use('/api/admin', require('../routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// Export for Vercel
module.exports = app;
