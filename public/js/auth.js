/**
 * Auth - Authentication module
 */

const API_BASE = '/api';

class Auth {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = null;
  }

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  }

  showError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.classList.add('show');
  }

  hideError() {
    document.getElementById('login-error').classList.remove('show');
  }

  showRegister() {
    this.hideError();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
  }

  showLogin() {
    this.hideError();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  }

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return this.showError('请填写邮箱和密码');
    
    try {
      this.hideError();
      const data = await this.request('POST', '/auth/login', { email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      this.enterApp();
    } catch (err) {
      this.showError(err.message);
    }
  }

  async register() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!username || !email || !password) return this.showError('请填写所有字段');
    if (password.length < 6) return this.showError('密码至少6位');

    try {
      this.hideError();
      const data = await this.request('POST', '/auth/register', { username, email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      this.enterApp();
    } catch (err) {
      this.showError(err.message);
    }
  }

  async loadProfile() {
    const data = await this.request('GET', '/auth/profile');
    this.user = data;
    return data;
  }

  enterApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    app.init();
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  }
}

const auth = new Auth();
