/**
 * Unified Navigation System for Enhanced Agent Interface
 * Provides seamless switching between Chat, Dashboard, and Advanced Features
 */
class UnifiedNavigation {
  constructor() {
    this.currentView = 'dashboard';
    this.isCollapsed = false;
    this.theme = localStorage.getItem('agent-theme') || 'dark';
    this.notifications = [];
    this.init();
  }

  init() {
    this.createNavigation();
    this.setupEventListeners();
    this.loadUserPreferences();
    this.setupKeyboardShortcuts();
    this.initializeTheme();
  }

  createNavigation() {
    const navHTML = `
      <nav id="unified-nav" class="unified-nav">
        <!-- Navigation Header -->
        <div class="nav-header">
          <div class="nav-brand">
            <div class="brand-logo">
              <div class="logo-icon">🧠</div>
              <div class="brand-text">
                <h1>Agent Command Center</h1>
                <span class="brand-subtitle">Advanced Research Assistant</span>
              </div>
            </div>
            <button id="nav-toggle" class="nav-toggle">
              <svg class="nav-icon" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- Agent Status Bar -->
          <div class="agent-status-bar">
            <div class="status-indicators">
              <div class="status-item connection">
                <div class="status-dot" id="connection-status"></div>
                <span class="status-text">Connected</span>
              </div>
              <div class="status-item cognitive-load">
                <div class="load-meter">
                  <div class="load-fill" id="cognitive-load"></div>
                </div>
                <span class="status-text">Cognitive Load</span>
              </div>
              <div class="status-item learning">
                <div class="learning-indicator" id="learning-status">
                  <div class="learning-dot"></div>
                </div>
                <span class="status-text">Learning Active</span>
              </div>
            </div>
          </div>

          <!-- User Controls -->
          <div class="nav-controls">
            <button id="theme-toggle" class="control-btn" title="Toggle Theme">
              <svg class="control-icon" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
              </svg>
            </button>
            <button id="notifications-btn" class="control-btn" title="Notifications">
              <svg class="control-icon" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span class="notification-badge" id="notification-count">0</span>
            </button>
            <button id="settings-btn" class="control-btn" title="Settings">
              <svg class="control-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M1 12h6m6 0h6" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Navigation Menu -->
        <div class="nav-menu">
          <div class="menu-section">
            <h3 class="menu-title">Workspaces</h3>
            <div class="menu-items">
              <button class="menu-item active" data-view="dashboard">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                  <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                  <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                  <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Command Center</span>
                <span class="menu-badge" id="active-projects-badge">0</span>
              </button>

              <button class="menu-item" data-view="chat">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                <span class="menu-text">AI Chat</span>
                <span class="menu-indicator" id="chat-indicator"></span>
              </button>

              <button class="menu-item" data-view="strategic">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M9 11H3v10h6V11zm0-8H3v6h6V3zm11 0h-6v10h6V3zm0 12h-6v6h6v-6z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Strategic Plans</span>
                <span class="menu-badge" id="strategic-plans-badge">0</span>
              </button>

              <button class="menu-item" data-view="memory">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                <span class="menu-text">Memory Lab</span>
                <span class="menu-indicator" id="memory-indicator"></span>
              </button>
            </div>
          </div>

          <div class="menu-section">
            <h3 class="menu-title">Analytics</h3>
            <div class="menu-items">
              <button class="menu-item" data-view="learning">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Learning Analytics</span>
              </button>

              <button class="menu-item" data-view="performance">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                <span class="menu-text">Performance Monitor</span>
              </button>

              <button class="menu-item" data-view="deliverables">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Deliverables</span>
                <span class="menu-badge" id="deliverables-badge">0</span>
              </button>
            </div>
          </div>

          <div class="menu-section">
            <h3 class="menu-title">Tools</h3>
            <div class="menu-items">
              <button class="menu-item" data-view="recovery">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Error Recovery</span>
                <span class="menu-indicator" id="recovery-indicator"></span>
              </button>

              <button class="menu-item" data-view="tools">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Tool Manager</span>
              </button>

              <button class="menu-item" data-view="sessions">
                <svg class="menu-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class="menu-text">Sessions</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button id="quick-research" class="quick-action-btn primary">
            <svg class="quick-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Quick Research</span>
          </button>

          <button id="quick-strategic" class="quick-action-btn secondary">
            <svg class="quick-icon" viewBox="0 0 24 24">
              <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2"/>
              <path d="M9 3v18m6-18v18" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Strategic Plan</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="nav-footer">
          <div class="agent-info">
            <div class="agent-version">v2.0 Enhanced</div>
            <div class="agent-uptime" id="agent-uptime">Uptime: 0m</div>
          </div>
        </div>
      </nav>

      <!-- Mobile Overlay -->
      <div id="nav-overlay" class="nav-overlay"></div>
    `;

    // Insert navigation into DOM
    document.body.insertAdjacentHTML('afterbegin', navHTML);
  }

  setupEventListeners() {
    // Navigation toggle
    document.getElementById('nav-toggle').addEventListener('click', () => {
      this.toggleNavigation();
    });

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Quick actions
    document.getElementById('quick-research').addEventListener('click', () => {
      this.showQuickResearch();
    });

    document.getElementById('quick-strategic').addEventListener('click', () => {
      this.showQuickStrategic();
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showSettings();
    });

    // Notifications
    document.getElementById('notifications-btn').addEventListener('click', () => {
      this.showNotifications();
    });

    // Mobile overlay
    document.getElementById('nav-overlay').addEventListener('click', () => {
      this.closeMobileNav();
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  switchView(view) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Hide all views
    document.querySelectorAll('.main-view').forEach(v => {
      v.style.display = 'none';
    });

    // Show selected view
    const viewElement = document.getElementById(`${view}-view`);
    if (viewElement) {
      viewElement.style.display = 'block';
    }

    this.currentView = view;
    this.onViewChange(view);

    // Close mobile navigation
    if (window.innerWidth <= 768) {
      this.closeMobileNav();
    }
  }

  toggleNavigation() {
    this.isCollapsed = !this.isCollapsed;
    const nav = document.getElementById('unified-nav');

    if (this.isCollapsed) {
      nav.classList.add('collapsed');
    } else {
      nav.classList.remove('collapsed');
    }

    localStorage.setItem('nav-collapsed', this.isCollapsed);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.theme);
    localStorage.setItem('agent-theme', this.theme);
  }

  initializeTheme() {
    this.applyTheme(this.theme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const themeIcon = document.querySelector('#theme-toggle .control-icon');
    if (theme === 'dark') {
      themeIcon.innerHTML = '<circle cx="12" cy="12" r="5" fill="currentColor"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/>';
    } else {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>';
    }
  }

  updateAgentStatus(status) {
    // Update connection status
    const connectionDot = document.getElementById('connection-status');
    connectionDot.className = `status-dot ${status.connection || 'offline'}`;

    // Update cognitive load
    const cognitiveLoad = document.getElementById('cognitive-load');
    if (status.cognitiveLoad !== undefined) {
      cognitiveLoad.style.width = `${status.cognitiveLoad}%`;
    }

    // Update learning status
    const learningStatus = document.getElementById('learning-status');
    learningStatus.className = `learning-indicator ${status.learning ? 'active' : 'inactive'}`;
  }

  updateBadges(data) {
    // Update various badges
    document.getElementById('active-projects-badge').textContent = data.activeProjects || '0';
    document.getElementById('strategic-plans-badge').textContent = data.strategicPlans || '0';
    document.getElementById('deliverables-badge').textContent = data.deliverables || '0';
  }

  addNotification(notification) {
    this.notifications.unshift({
      ...notification,
      id: Date.now(),
      timestamp: new Date()
    });

    // Update notification count
    const count = document.getElementById('notification-count');
    count.textContent = this.notifications.length;
    count.style.display = this.notifications.length > 0 ? 'block' : 'none';

    // Show toast
    this.showToast(notification.message, notification.type);
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close">×</button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, 5000);

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    });
  }

  showQuickResearch() {
    // Dispatch custom event for main app to handle
    document.dispatchEvent(new CustomEvent('showQuickResearch'));
  }

  showQuickStrategic() {
    // Dispatch custom event for main app to handle
    document.dispatchEvent(new CustomEvent('showQuickStrategic'));
  }

  showSettings() {
    // Dispatch custom event for main app to handle
    document.dispatchEvent(new CustomEvent('showSettings'));
  }

  showNotifications() {
    // Dispatch custom event for main app to handle
    document.dispatchEvent(new CustomEvent('showNotifications', {
      detail: { notifications: this.notifications }
    }));
  }

  closeMobileNav() {
    const nav = document.getElementById('unified-nav');
    const overlay = document.getElementById('nav-overlay');

    nav.classList.remove('mobile-open');
    overlay.classList.remove('active');
  }

  openMobileNav() {
    const nav = document.getElementById('unified-nav');
    const overlay = document.getElementById('nav-overlay');

    nav.classList.add('mobile-open');
    overlay.classList.add('active');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for quick search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.showQuickSearch();
      }

      // Ctrl/Cmd + B for navigation toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleNavigation();
      }

      // Ctrl/Cmd + Shift + D for dark mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
      }

      // Alt + number for quick navigation
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const views = ['dashboard', 'chat', 'strategic', 'memory', 'learning', 'performance', 'deliverables', 'recovery', 'tools'];
        const index = parseInt(e.key) - 1;
        if (views[index]) {
          this.switchView(views[index]);
        }
      }
    });
  }

  loadUserPreferences() {
    // Load navigation state
    const isCollapsed = localStorage.getItem('nav-collapsed') === 'true';
    if (isCollapsed) {
      this.isCollapsed = true;
      document.getElementById('unified-nav').classList.add('collapsed');
    }
  }

  handleResize() {
    if (window.innerWidth > 768) {
      this.closeMobileNav();
    }
  }

  onViewChange(view) {
    // Dispatch view change event
    document.dispatchEvent(new CustomEvent('viewChanged', {
      detail: { view, previousView: this.currentView }
    }));
  }

  // Public API
  getCurrentView() {
    return this.currentView;
  }

  getTheme() {
    return this.theme;
  }

  updateUptime(uptime) {
    const uptimeElement = document.getElementById('agent-uptime');
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    if (hours > 0) {
      uptimeElement.textContent = `Uptime: ${hours}h ${minutes}m`;
    } else {
      uptimeElement.textContent = `Uptime: ${minutes}m`;
    }
  }
}

// Export for global use
window.UnifiedNavigation = UnifiedNavigation;