/**
 * Chat - AI对话页面
 */

const chat = {
  currentConvId: null,
  streaming: false,
  abortController: null,
  models: [],
  allModels: {},

  async render(container) {
    if (!container) container = document.getElementById('page-content');
    if (!this.models.length) await this.loadModels();

    container.innerHTML = `
      <div class="chat-view fade-in">
        <div class="chat-model-bar">
          <select id="chat-model-select">
            ${this.renderModelOptions()}
          </select>
          <span style="font-size:12px;color:var(--text-muted);">
            免费用户每日 <span id="chat-limit-display">${auth.user?.daily_limit || 20}</span> 条
          </span>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="chat-message assistant" style="max-width:800px;margin:0 auto;width:100%;">
            <div class="chat-avatar ai">AI</div>
            <div class="chat-content">
              <p>你好！我是AI助手，有什么可以帮你的？</p>
              <p style="font-size:13px;color:var(--text-muted);">选择左侧的模型开始对话，或输入问题开始。</p>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea id="chat-input" rows="1" placeholder="输入消息，Enter发送，Shift+Enter换行" 
              oninput="chat.autoResize(this)" onkeydown="chat.onKeyDown(event)"></textarea>
            <button class="btn-send" id="chat-send-btn" onclick="chat.sendMessage()">
              <i class="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Load conversations in sidebar
    this.loadConversations();

    // Focus input
    setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
  },

  renderModelOptions() {
    return Object.values(this.allModels).map(m => 
      `<option value="${m.id}">${m.name}</option>`
    ).join('');
  },

  async loadModels() {
    try {
      const providers = await auth.request('GET', '/models');
      providers.forEach(p => {
        p.models.forEach(m => { this.allModels[m.id] = m; });
      });
    } catch (err) {
      console.error('Load models error:', err);
    }
  },

  async loadConversations() {
    try {
      const convs = await auth.request('GET', '/chat/conversations');
      // Could show recent conversations in a dropdown or sidebar
    } catch (err) {}
  },

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const model = document.getElementById('chat-model-select').value;

    if (!message || this.streaming) return;
    if (!model || !this.allModels[model]) {
      app.showToast('请先选择一个模型', 'error');
      return;
    }

    input.value = '';
    input.style.height = 'auto';

    const container = document.getElementById('chat-messages');
    
    // Add user message
    container.appendChild(this.createMessageEl('user', message));
    this.scrollToBottom(container);

    // Add assistant placeholder
    const msgDiv = this.createMessageEl('assistant', '', true);
    const contentDiv = msgDiv.querySelector('.chat-content');
    contentDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    container.appendChild(msgDiv);

    // Start streaming
    this.streaming = true;
    this.abortController = new AbortController();
    
    const sendBtn = document.getElementById('chat-send-btn');
    sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
    sendBtn.onclick = () => this.stopGeneration();
    sendBtn.style.background = 'var(--danger)';

    let fullResponse = '';

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify({ conversationId: this.currentConvId, message, model }),
        signal: this.abortController.signal
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '请求失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'init') {
              this.currentConvId = data.conversationId;
              if (data.isNew) setTimeout(() => this.generateTitle(data.conversationId), 2000);
            } else if (data.type === 'chunk') {
              fullResponse += data.content;
              contentDiv.innerHTML = this.renderMarkdown(fullResponse);
              this.scrollToBottom(container);
            } else if (data.type === 'error') {
              contentDiv.innerHTML = `<p style="color:var(--danger)">${app.escapeHtml(data.message)}</p>`;
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        contentDiv.innerHTML = this.renderMarkdown(fullResponse + '\n\n*（已停止）*');
      } else {
        contentDiv.innerHTML = `<p style="color:var(--danger)">${app.escapeHtml(err.message)}</p>`;
        app.showToast(err.message, 'error');
      }
    } finally {
      this.streaming = false;
      sendBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
      sendBtn.onclick = () => this.sendMessage();
      sendBtn.style.background = '';

      // Update daily usage display
      const limitDisplay = document.getElementById('chat-limit-display');
      if (limitDisplay && auth.user) {
        auth.user.daily_usage = (auth.user.daily_usage || 0) + 1;
      }
    }
  },

  stopGeneration() {
    if (this.abortController) this.abortController.abort();
  },

  createMessageEl(role, content, isPlaceholder) {
    const div = document.createElement('div');
    div.className = `chat-message ${role} fade-in`;
    div.innerHTML = `
      <div class="chat-avatar ${role === 'user' ? 'user' : 'ai'}">${role === 'user' ? 'U' : 'AI'}</div>
      <div class="chat-content">${isPlaceholder ? '' : this.renderMarkdown(content)}</div>
    `;
    return div;
  },

  renderMarkdown(text) {
    if (!text) return '';
    let html = app.escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  },

  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  },

  onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },

  async generateTitle(convId) {
    try {
      await auth.request('POST', `/chat/conversations/${convId}/title`, {});
    } catch (err) {}
  },

  scrollToBottom(container) {
    app.scrollToBottom(container);
  }
};
