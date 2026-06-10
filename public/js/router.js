/**
 * Router - Handles page navigation and sidebar state
 */

const pages = {
  home: { title: '首页', icon: 'fa-home', render: () => app.renderHome() },
  chat: { title: 'AI对话', icon: 'fa-comments', render: () => chat.render() },
  image: { title: 'AI图片', icon: 'fa-image', render: () => app.renderPlaceholder('AI图片生成', '🖼️') },
  video: { title: 'AI视频', icon: 'fa-video', render: () => app.renderPlaceholder('AI视频生成', '🎬') },
  audio: { title: 'AI音频', icon: 'fa-music', render: () => app.renderPlaceholder('AI音频', '🎵') },
  writing: { title: 'AI写作', icon: 'fa-pen', render: () => app.renderPlaceholder('AI写作', '✍️') },
  coding: { title: 'AI编程', icon: 'fa-code', render: () => app.renderPlaceholder('AI编程', '💻') },
  character: { title: 'AI角色', icon: 'fa-robot', render: () => app.renderPlaceholder('AI角色扮演', '🤖') },
  comic: { title: 'AI漫画', icon: 'fa-book-open', render: () => app.renderPlaceholder('AI漫画', '📚') },
  ecommerce: { title: 'AI电商', icon: 'fa-shopping-cart', render: () => app.renderPlaceholder('AI电商', '🛒') },
  agents: { title: 'AI智能体', icon: 'fa-brain', render: () => app.renderPlaceholder('AI智能体', '🧠') },
  openapi: { title: 'Open API', icon: 'fa-plug', render: () => app.renderPlaceholder('Open API 接入', '🔌') },
  recharge: { title: '充值中心', icon: 'fa-coins', render: () => app.renderPlaceholder('充值中心', '💰') },
  profile: { title: '个人中心', icon: 'fa-user', render: () => app.renderPlaceholder('个人中心', '👤') },
  admin: { title: '管理后台', icon: 'fa-shield', render: () => admin.render() },
};

let currentPage = 'home';

const navStructure = [
  {
    title: 'AI 工具',
    items: [
      { id: 'chat', label: 'AI对话', icon: 'fa-comments' },
      { id: 'image', label: 'AI图片', icon: 'fa-image', badge: 'Hot' },
      { id: 'video', label: 'AI视频', icon: 'fa-video' },
      { id: 'audio', label: 'AI音频', icon: 'fa-music' },
      { id: 'writing', label: 'AI写作', icon: 'fa-pen' },
      { id: 'coding', label: 'AI编程', icon: 'fa-code' },
    ]
  },
  {
    title: '创作',
    items: [
      { id: 'character', label: 'AI角色', icon: 'fa-robot' },
      { id: 'comic', label: 'AI漫画', icon: 'fa-book-open' },
      { id: 'ecommerce', label: 'AI电商', icon: 'fa-shopping-cart' },
      { id: 'agents', label: 'AI智能体', icon: 'fa-brain', badge: 'New' },
    ]
  },
  {
    title: '平台',
    items: [
      { id: 'openapi', label: 'Open API', icon: 'fa-plug' },
      { id: 'recharge', label: '充值中心', icon: 'fa-coins' },
      { id: 'profile', label: '个人中心', icon: 'fa-user' },
    ]
  }
];

const router = {
  go(page) {
    if (!pages[page]) page = 'home';
    currentPage = page;
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    
    // Update page title
    document.getElementById('page-title').textContent = pages[page].title;
    
    // Render page
    const container = document.getElementById('page-content');
    pages[page].render(container);
  },

  renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';

    // Home always first
    const homeItem = document.createElement('div');
    homeItem.className = 'nav-item' + (currentPage === 'home' ? ' active' : '');
    homeItem.dataset.page = 'home';
    homeItem.innerHTML = '<div class="nav-icon"><i class="fas fa-home"></i></div><span class="nav-label">首页</span>';
    homeItem.onclick = () => router.go('home');
    nav.appendChild(homeItem);

    // Render sections
    navStructure.forEach(section => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'nav-section';
      
      const title = document.createElement('div');
      title.className = 'nav-section-title';
      title.textContent = section.title;
      sectionDiv.appendChild(title);

      section.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'nav-item' + (currentPage === item.id ? ' active' : '');
        el.dataset.page = item.id;
        
        let html = `<div class="nav-icon"><i class="fas ${item.icon}"></i></div><span class="nav-label">${item.label}</span>`;
        if (item.badge) html += `<span class="nav-badge">${item.badge}</span>`;
        
        el.innerHTML = html;
        el.onclick = () => router.go(item.id);
        sectionDiv.appendChild(el);
      });

      nav.appendChild(sectionDiv);
    });

    // Admin link (conditionally shown)
    if (auth.user?.role === 'admin') {
      const adminSection = document.createElement('div');
      adminSection.className = 'nav-section';
      const adminItem = document.createElement('div');
      adminItem.className = 'nav-item' + (currentPage === 'admin' ? ' active' : '');
      adminItem.dataset.page = 'admin';
      adminItem.innerHTML = '<div class="nav-icon"><i class="fas fa-shield"></i></div><span class="nav-label">管理后台</span>';
      adminItem.onclick = () => router.go('admin');
      adminSection.appendChild(adminItem);
      nav.appendChild(adminSection);
    }
  }
};
