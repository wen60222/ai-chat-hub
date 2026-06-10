/**
 * App - Main application controller and home page
 */

const app = {
  init() {
    router.renderSidebar();
    this.updateUserInfo();
    router.go('home');
  },

  renderHome(container) {
    if (!container) container = document.getElementById('page-content');
    
    const today = new Date().toISOString().split('T')[0];
    const used = auth.user?.daily_usage || 0;
    const limit = auth.user?.daily_limit || 20;
    const planMap = { free: '免费', basic: '基础', pro: '专业', unlimited: '无限' };
    const plan = planMap[auth.user?.subscription_plan] || '免费';

    container.innerHTML = `
      <div class="welcome-banner">
        <h2>欢迎回来，${this.escapeHtml(auth.user?.username || '用户')}</h2>
        <p>选择一个AI工具开始你的创作之旅</p>
        <div class="usage-stats">
          <div class="usage-stat-item">
            <i class="fas fa-comment" style="color:var(--accent)"></i>
            今日已用 <span class="num">${used}</span> / ${limit} 条
          </div>
          <div class="usage-stat-item">
            <i class="fas fa-crown" style="color:var(--warning)"></i>
            当前套餐 <span class="num">${plan}</span>
          </div>
        </div>
      </div>

      <div class="tool-section">
        <div class="tool-section-header">
          <div class="tool-section-title">热门工具</div>
        </div>
        <div class="tool-grid" id="home-tool-grid"></div>
      </div>
    `;

    this.renderToolGrid(document.getElementById('home-tool-grid'));
  },

  renderToolGrid(container) {
    const tools = [
      { id: 'chat', name: 'AI对话', desc: '多模型智能对话，支持GPT/Claude/DeepSeek等', icon: 'fa-comments', color: 'green', badge: 'Hot' },
      { id: 'image', name: 'AI图片生成', desc: '文字描述生成图片，支持多种风格', icon: 'fa-image', color: 'blue' },
      { id: 'video', name: 'AI视频', desc: 'AI视频生成与编辑', icon: 'fa-video', color: 'purple', badge: 'New' },
      { id: 'audio', name: 'AI音频', desc: '语音合成、语音识别', icon: 'fa-music', color: 'pink' },
      { id: 'writing', name: 'AI写作', desc: '智能写作助手，文章/文案/报告', icon: 'fa-pen', color: 'orange' },
      { id: 'coding', name: 'AI编程', desc: '代码生成、调试、优化', icon: 'fa-code', color: 'cyan' },
      { id: 'character', name: 'AI角色', desc: '与AI角色对话互动', icon: 'fa-robot', color: 'green' },
      { id: 'comic', name: 'AI漫画', desc: 'AI辅助漫画创作', icon: 'fa-book-open', color: 'red' },
      { id: 'ecommerce', name: 'AI电商', desc: '电商图片生成、商品描述', icon: 'fa-shopping-cart', color: 'orange' },
      { id: 'agents', name: 'AI智能体', desc: '自定义AI助手工作流', icon: 'fa-brain', color: 'purple' },
      { id: 'openapi', name: 'Open API', desc: 'API接入文档与密钥管理', icon: 'fa-plug', color: 'blue' },
      { id: 'recharge', name: '充值中心', desc: '购买套餐，解锁更多额度', icon: 'fa-coins', color: 'pink' },
    ];

    tools.forEach(t => {
      const card = document.createElement('div');
      card.className = 'tool-card fade-in';
      card.style.animationDelay = (tools.indexOf(t) * 30) + 'ms';

      let badgeHtml = '';
      if (t.badge) badgeHtml = `<span class="card-badge badge-${t.badge === 'Hot' ? 'hot' : 'new'}">${t.badge}</span>`;

      card.innerHTML = `
        <div class="card-icon icon-${t.color}"><i class="fas ${t.icon}"></i></div>
        <div class="card-name">${t.name}</div>
        <div class="card-desc">${t.desc}</div>
        ${badgeHtml}
      `;
      card.onclick = () => router.go(t.id);
      container.appendChild(card);
    });
  },

  renderPlaceholder(title, emoji, container) {
    if (!container) container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="welcome-banner" style="text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">${emoji}</div>
        <h2>${title}</h2>
        <p>此功能正在开发中，敬请期待</p>
        <div style="margin-top:20px;">
          <div style="display:inline-block;padding:8px 24px;border:1px solid var(--border);border-radius:var(--radius);color:var(--text-muted);font-size:13px;cursor:pointer;" onclick="router.go('chat')">
            <i class="fas fa-comments"></i> 先去体验AI对话
          </div>
        </div>
      </div>
    `;
  },

  updateUserInfo() {
    if (!auth.user) return;
    const u = auth.user;
    document.getElementById('sidebar-avatar').textContent = (u.username || 'U')[0].toUpperCase();
    document.getElementById('sidebar-username').textContent = u.username || '用户';
    const planMap = { free: '免费版', basic: '基础版', pro: '专业版', unlimited: '无限版' };
    document.getElementById('sidebar-plan').textContent = planMap[u.subscription_plan] || '免费版';

    const adminBtn = document.getElementById('admin-header-btn');
    if (adminBtn && u.role === 'admin') adminBtn.style.display = 'inline-flex';
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },

  scrollToBottom(el) {
    setTimeout(() => { if (el) el.scrollTop = el.scrollHeight; }, 50);
  },

  showToast(msg, type = 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};
