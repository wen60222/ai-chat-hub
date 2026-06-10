# AI Chat Hub - 多模型AI对话平台

## 快速启动

```bash
cd C:\Users\LENOVO\.openclaw\workspace-reviewer\ai-chat-hub
npm start
```

访问：http://localhost:3000

## 默认管理员账号

- 邮箱：admin@aichat.com
- 密码：admin123456

## 现已支持的AI模型

| 供应商 | 模型 | 
|--------|------|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4, GPT-3.5 Turbo |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro |
| DeepSeek | DeepSeek V3, DeepSeek R1 |
| Moonshot | Kimi Moonshot v1 |
| 阿里云 | 通义千问 Turbo/Plus/Max |

## 配置API密钥

编辑 `.env` 文件，填上你自己的API密钥：

```
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GEMINI_API_KEY=xxx
DEEPSEEK_API_KEY=sk-xxx
MOONSHOT_API_KEY=sk-xxx
TONGYI_API_KEY=xxx
```

也可以在管理后台 → API密钥 页面在线添加。

## 盈利模式

| 套餐 | 价格 | 每日限额 | 
|------|------|---------|
| 免费版 | ¥0 | 20条 |
| 基础版 | ¥29/月 | 500条 |
| 专业版 | ¥79/月 | 2000条 |
| 无限版 | ¥199/月 | 不限量 |

> ⚠️ 支付功能尚未对接，当前为框架预留。可通过管理后台手动给用户升级套餐。

## 项目结构

```
ai-chat-hub/
├── server.js          # 服务器入口
├── .env               # 配置(API Keys)
├── db/
│   └── schema.js      # SQLite数据库
├── routes/
│   ├── auth.js        # 注册/登录
│   ├── chat.js        # 对话API (SSE流式)
│   ├── models.js      # 模型列表
│   └── admin.js       # 管理后台
├── middleware/
│   ├── auth.js        # JWT验证
│   └── rateLimit.js   # 速率限制
├── services/
│   └── llm.js         # LLM统一调用层(6家供应商)
└── public/
    ├── index.html     # 前端SPA
    ├── css/style.css  # 暗色主题样式
    └── js/
        ├── auth.js    # 登录逻辑
        ├── app.js     # 聊天主逻辑
        └── admin.js   # 管理后台
```

## 后续开发方向

- [ ] 微信/支付宝支付对接
- [ ] 用户注册邮箱验证
- [ ] 对话导出(PDF/Markdown)
- [ ] 提示词模板库
- [ ] 用量统计图表
- [ ] Docker部署
