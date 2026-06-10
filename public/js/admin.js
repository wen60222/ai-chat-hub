/**
 * Admin - Management console
 */

const admin = {
  async render(container) {
    if (!container) container = document.getElementById('page-content');
    container.innerHTML = `
      <div style="display:flex;gap:20px;height:calc(100vh - 96px);">
        <div class="admin-sidebar" style="width:180px;">
          <div class="admin-title">管理后台</div>
          <a class="active" onclick="admin.showSection('dashboard', this)">概览</a>
          <a onclick="admin.showSection('users', this)">用户管理</a>
          <a onclick="admin.showSection('apikeys', this)">API密钥</a>
          <a onclick="admin.showSection('usage', this)">使用记录</a>
          <a onclick="admin.showSection('orders', this)">订单</a>
        </div>
        <div class="admin-main" style="flex:1;padding-left:0;padding-top:0;" id="admin-content">
          <h1>概览</h1>
          <div class="stats-grid" id="admin-stats"></div>
        </div>
      </div>
    `;
    this.showSection('dashboard');
  },

  showSection(name, el) {
    if (el) {
      document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
    }
    const content = document.getElementById('admin-content');
    const methods = { dashboard: this.renderDashboard, users: this.renderUsers, apikeys: this.renderApiKeys, usage: this.renderUsage, orders: this.renderOrders };
    if (methods[name]) methods[name].call(this, content);
  },

  async renderDashboard(content) {
    try {
      const stats = await auth.request('GET', '/admin/stats');
      content.innerHTML = `
        <h1>管理概览</h1>
        <div class="stats-grid">
          <div class="stat-card"><div class="value">${stats.totalUsers}</div><div class="label">总用户数</div></div>
          <div class="stat-card"><div class="value">${stats.activeUsers}</div><div class="label">今日活跃</div></div>
          <div class="stat-card"><div class="value">${stats.paidUsers}</div><div class="label">付费用户</div></div>
          <div class="stat-card"><div class="value">${stats.totalConversations}</div><div class="label">总对话数</div></div>
          <div class="stat-card"><div class="value">${stats.todayUsage}</div><div class="label">今日调用</div></div>
          <div class="stat-card"><div class="value">¥${stats.totalRevenue}</div><div class="label">总收入</div></div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<h1>概览</h1><p style="color:var(--danger)">加载失败: ${err.message}</p>`;
    }
  },

  async renderUsers(content) {
    let page = 1;
    const render = async () => {
      try {
        const data = await auth.request('GET', `/admin/users?page=${page}`);
        const planMap = { free: '免费', basic: '基础', pro: '专业', unlimited: '无限' };
        let rows = data.users.map(u => `<tr>
          <td>${u.id}</td><td>${u.username}</td><td>${u.email}</td>
          <td>${planMap[u.subscription_plan] || '免费'}</td>
          <td>${u.daily_usage}</td>
          <td>${u.is_active ? '✅' : '❌'}</td>
          <td>${u.created_at}</td>
        </tr>`).join('');

        content.innerHTML = `
          <h1>用户管理</h1>
          <table class="data-table">
            <thead><tr><th>ID</th><th>用户名</th><th>邮箱</th><th>套餐</th><th>今日用量</th><th>状态</th><th>注册时间</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">暂无用户</td></tr>'}</tbody>
          </table>
          <div class="pagination">
            <button ${page <= 1 ? 'disabled' : ''} onclick="admin.changeUsers(${page - 1})">上一页</button>
            <span style="padding:6px 12px;color:var(--text-muted);">${page}/${data.totalPages}</span>
            <button ${page >= data.totalPages ? 'disabled' : ''} onclick="admin.changeUsers(${page + 1})">下一页</button>
          </div>
        `;
      } catch (err) { content.innerHTML = `<h1>用户管理</h1><p style="color:var(--danger)">加载失败</p>`; }
    };
    this._renderUsers = render;
    this._usersPage = () => page;
    this._setUsersPage = (p) => { page = p; render(); };
    await render();
  },

  changeUsers(p) { if (this._setUsersPage) this._setUsersPage(p); },

  async renderApiKeys(content) {
    try {
      const keys = await auth.request('GET', '/admin/api-keys');
      const providerNames = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', deepseek: 'DeepSeek', moonshot: 'Moonshot', tongyi: '通义千问' };
      let rows = keys.map(k => `<tr>
        <td>${k.id}</td><td>${providerNames[k.provider] || k.provider}</td>
        <td>${k.is_active ? '✅' : '❌'}</td><td>${k.usage_count}</td><td>${k.created_at}</td>
      </tr>`).join('');

      content.innerHTML = `
        <h1>API密钥管理</h1>
        <table class="data-table">
          <thead><tr><th>ID</th><th>提供商</th><th>状态</th><th>使用次数</th><th>创建时间</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">暂无密钥</td></tr>'}</tbody>
        </table>
        <div style="margin-top:16px;">
          <button class="header-btn" onclick="admin.toggleAddKeyForm()"><i class="fas fa-plus"></i> 添加密钥</button>
        </div>
        <div id="add-key-section" style="display:none;margin-top:16px;background:var(--bg-card);padding:20px;border:1px solid var(--border);border-radius:var(--radius);">
          <h3 style="margin-bottom:12px;">添加API密钥</h3>
          <div class="form-group">
            <label>提供商</label>
            <select id="key-provider" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="deepseek">DeepSeek</option>
              <option value="moonshot">Moonshot / Kimi</option>
              <option value="tongyi">阿里通义千问</option>
            </select>
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input type="text" id="key-value" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);">
          </div>
          <button class="btn-primary" style="width:auto;padding:8px 24px;" onclick="admin.addKey()">保存</button>
        </div>
      `;
    } catch (err) { content.innerHTML = `<h1>API密钥管理</h1><p style="color:var(--danger)">加载失败</p>`; }
  },

  toggleAddKeyForm() {
    const el = document.getElementById('add-key-section');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },

  async addKey() {
    const provider = document.getElementById('key-provider').value;
    const keyValue = document.getElementById('key-value').value.trim();
    if (!keyValue) return app.showToast('请输入API密钥', 'error');
    try {
      await auth.request('POST', '/admin/api-keys', { provider, key_value: keyValue });
      app.showToast('密钥添加成功', 'success');
      this.renderApiKeys(document.getElementById('admin-content'));
    } catch (err) { app.showToast(err.message, 'error'); }
  },

  async renderUsage(content) {
    let page = 1;
    const render = async () => {
      try {
        const data = await auth.request('GET', `/admin/usage?page=${page}`);
        let rows = data.logs.map(l => `<tr>
          <td>${l.username}</td><td>${l.model}</td>
          <td>${l.tokens_in}</td><td>${l.tokens_out}</td>
          <td>${l.created_at}</td>
        </tr>`).join('');

        content.innerHTML = `
          <h1>使用记录</h1>
          <table class="data-table">
            <thead><tr><th>用户</th><th>模型</th><th>输入</th><th>输出</th><th>时间</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">暂无记录</td></tr>'}</tbody>
          </table>
          <div class="pagination">
            <button ${page <= 1 ? 'disabled' : ''} onclick="admin.changeUsage(${page - 1})">上一页</button>
            <span style="padding:6px 12px;color:var(--text-muted);">${page}/${data.totalPages}</span>
            <button ${page >= data.totalPages ? 'disabled' : ''} onclick="admin.changeUsage(${page + 1})">下一页</button>
          </div>
        `;
      } catch (err) { content.innerHTML = `<h1>使用记录</h1><p style="color:var(--danger)">加载失败</p>`; }
    };
    this._usagePage = () => page;
    this._setUsagePage = (p) => { page = p; render(); };
    await render();
  },

  changeUsage(p) { if (this._setUsagePage) this._setUsagePage(p); },

  async renderOrders(content) {
    let page = 1;
    const statusMap = { pending: '待支付', paid: '已支付', failed: '失败', refunded: '已退款' };
    const render = async () => {
      try {
        const data = await auth.request('GET', `/admin/orders?page=${page}`);
        let rows = data.orders.map(o => `<tr>
          <td>${o.id.slice(0, 8)}</td><td>${o.username}</td>
          <td>${o.plan}</td><td>¥${o.amount}</td>
          <td>${statusMap[o.status] || o.status}</td>
          <td>${o.created_at}</td>
        </tr>`).join('');

        content.innerHTML = `
          <h1>订单</h1>
          <table class="data-table">
            <thead><tr><th>订单号</th><th>用户</th><th>套餐</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">暂无订单</td></tr>'}</tbody>
          </table>
          <div class="pagination">
            <button ${page <= 1 ? 'disabled' : ''} onclick="admin.changeOrders(${page - 1})">上一页</button>
            <span style="padding:6px 12px;color:var(--text-muted);">${page}/${data.totalPages}</span>
            <button ${page >= data.totalPages ? 'disabled' : ''} onclick="admin.changeOrders(${page + 1})">下一页</button>
          </div>
        `;
      } catch (err) { content.innerHTML = `<h1>订单</h1><p style="color:var(--danger)">加载失败</p>`; }
    };
    this._ordersPage = () => page;
    this._setOrdersPage = (p) => { page = p; render(); };
    await render();
  },

  changeOrders(p) { if (this._setOrdersPage) this._setOrdersPage(p); }
};
