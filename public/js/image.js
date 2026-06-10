/**
 * Image Generation Page
 */

const imageGen = {
  models: [],

  async render(container) {
    if (!container) container = document.getElementById('page-content');
    await this.loadModels();

    container.innerHTML = `
      <div class="fade-in" style="max-width:900px;margin:0 auto;">
        <div class="welcome-banner" style="padding:24px;">
          <h2><i class="fas fa-image" style="color:var(--accent)"></i> AI图片生成</h2>
          <p>输入文字描述，AI为你生成精美图片</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="form-group">
            <label>选择模型</label>
            <select id="img-model" style="width:100%;padding:10px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);" onchange="imageGen.onModelChange()">
              ${this.models.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>图片尺寸</label>
            <select id="img-size" style="width:100%;padding:10px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);">
              ${this.getSizeOptions()}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="form-group">
            <label>数量</label>
            <select id="img-count" style="width:100%;padding:10px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);">
              <option value="1">1张</option>
              <option value="2">2张</option>
              <option value="4">4张</option>
            </select>
          </div>
          <div class="form-group">
            <label>风格 <span style="font-size:12px;color:var(--text-muted);">(DALL-E 3)</span></label>
            <select id="img-style" style="width:100%;padding:10px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);">
              <option value="vivid">生动 (Vivid)</option>
              <option value="natural">自然 (Natural)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>图片描述 (Prompt)</label>
          <textarea id="img-prompt" rows="4" style="width:100%;padding:12px 16px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-size:14px;resize:vertical;outline:none;font-family:inherit;" placeholder="用文字描述你想要的画面，例如：一只穿西装的猫站在太空站里，赛博朋克风格，4K，细节丰富"></textarea>
        </div>

        <button id="img-generate-btn" class="btn-primary" style="width:auto;padding:10px 32px;margin-top:4px;" onclick="imageGen.generate()">
          <i class="fas fa-magic"></i> 生成图片
        </button>

        <div id="img-loading" class="hidden" style="text-align:center;padding:40px;color:var(--text-secondary);">
          <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;"></i>
          <p>AI正在生成中，请稍候...</p>
        </div>

        <div id="img-results" style="margin-top:24px;"></div>
      </div>
    `;
  },

  async loadModels() {
    try {
      this.models = await auth.request('GET', '/image/models');
    } catch (err) {
      this.models = [
        { id: 'dall-e-3', name: 'DALL-E 3', sizes: ['1024x1024', '1792x1024', '1024x1792'] },
        { id: 'dall-e-2', name: 'DALL-E 2', sizes: ['256x256', '512x512', '1024x1024'] },
      ];
    }
  },

  getSizeOptions() {
    const model = document.getElementById('img-model');
    const currentModel = model?.value || 'dall-e-3';
    const cfg = this.models.find(m => m.id === currentModel);
    const sizes = cfg?.sizes || ['1024x1024'];
    return sizes.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  onModelChange() {
    const sizeSelect = document.getElementById('img-size');
    if (sizeSelect) sizeSelect.innerHTML = this.getSizeOptions();
  },

  async generate() {
    const prompt = document.getElementById('img-prompt').value.trim();
    const model = document.getElementById('img-model').value;
    const size = document.getElementById('img-size').value;
    const n = parseInt(document.getElementById('img-count').value);
    const style = document.getElementById('img-style').value;

    if (!prompt) {
      app.showToast('请填写图片描述', 'error');
      return;
    }

    const btn = document.getElementById('img-generate-btn');
    const loading = document.getElementById('img-loading');
    const results = document.getElementById('img-results');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    loading.classList.remove('hidden');
    results.innerHTML = '';

    try {
      const data = await auth.request('POST', '/image/generate', {
        prompt, model, n, size, style
      });

      loading.classList.add('hidden');

      if (data.images && data.images.length > 0) {
        results.innerHTML = `
          <h3 style="margin-bottom:12px;">生成结果</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
            ${data.images.map(img => `
              <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;">
                <div style="aspect-ratio:1;background:var(--bg-elev-1);display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img src="${img.url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=color:var(--text-muted);font-size:13px;>图片加载失败</span>'">
                </div>
                <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:var(--text-muted);">${model} · ${size}</span>
                  <a href="${img.url}" target="_blank" style="font-size:12px;" download>下载 <i class="fas fa-download"></i></a>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        results.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">未生成图片，请重试</p>';
      }
    } catch (err) {
      loading.classList.add('hidden');
      results.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px;">${app.escapeHtml(err.message)}</p>`;
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-magic"></i> 生成图片';
    }
  }
};
