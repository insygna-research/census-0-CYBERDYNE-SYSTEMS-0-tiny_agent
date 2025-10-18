// Tiny Autonomous Research Agent - Web UI
class AgentUI {
  constructor() {
    this.ws = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectDelay = 2000;
    this.currentFilter = 'active';
    this.projects = new Map();
    this.pendingRequests = new Map();
    this.settings = {
      llmProvider: 'lmstudio',
      lmStudioUrl: 'http://localhost:1234',
      openRouterApiKey: '',
      maxConcurrentTasks: 3,
      autoCleanup: true
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.connectWebSocket();
    this.loadSettings();
    this.renderProjects();
  }

  // WebSocket Connection
  connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionAttempts = 0;
        this.updateConnectionStatus('connected');
        this.loadAgentStatus();
        this.loadProjects();
      };
      
      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.updateConnectionStatus('disconnected');
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showToast('Connection error', 'error');
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      console.log(`Scheduling reconnection attempt ${this.connectionAttempts}`);
      setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
    } else {
      this.showToast('Unable to connect to server. Please refresh the page.', 'error');
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'status':
        this.updateAgentStatus(message);
        break;
      case 'agent.status_changed':
        this.updateAgentStatus({ data: message.data });
        break;
      case 'task.started':
        this.showToast('Task started', 'info');
        this.loadProjects();
        break;
      case 'task.completed':
        this.showToast('Task completed successfully!', 'success');
        this.loadProjects();
        break;
      case 'project.completed':
        this.showToast(`Project completed: ${message.data.project?.goal}`, 'success');
        this.loadProjects();
        break;
      case 'agent.error':
        this.showToast(`Agent error: ${message.data.error}`, 'error');
        break;
      case 'response':
        this.handleResponse(message.id, message.data);
        break;
    }
  }

  handleResponse(requestId, data) {
    if (this.pendingRequests && this.pendingRequests.has(requestId)) {
      const { resolve, reject } = this.pendingRequests.get(requestId);
      
      if (data.success === false || data.error) {
        reject(new Error(data.error || 'Request failed'));
      } else {
        resolve(data);
      }
      
      this.pendingRequests.delete(requestId);
    }
  }

  // API Requests (WebSocket fallback to HTTP)
  async sendRequest(type, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Store resolve and reject callbacks as object
        this.pendingRequests.set(requestId, { resolve, reject });
        
        this.ws.send(JSON.stringify({ type, id: requestId, data }));
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 30000);
      } else {
        // Fallback to HTTP
        this.httpRequest(type, data).then(resolve).catch(reject);
      }
    });
  }

  async httpRequest(type, data) {
    let url, method, body;
    
    switch (type) {
      case 'research.start':
        url = '/api/research';
        method = 'POST';
        body = data;
        break;
      case 'project.status':
        url = `/api/project/${data.projectId}`;
        break;
      case 'project.pause':
        url = `/api/project/${data.projectId}/pause`;
        method = 'POST';
        break;
      case 'project.resume':
        url = `/api/project/${data.projectId}/resume`;
        method = 'POST';
        break;
      case 'agent.status':
        url = '/api/status';
        break;
      case 'projects.list':
        url = '/api/projects';
        break;
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
    
    const options = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Request failed');
    }
    
    return result.data;
  }

  // Event Listeners
  setupEventListeners() {
    // Research form
    const researchForm = document.getElementById('research-form');
    if (researchForm) {
      researchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleResearchSubmit();
      });
    }

    // Project filter tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.setProjectFilter(tab.dataset.filter);
      });
    });

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.openSettingsModal();
      });
    }

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = btn.closest('.modal');
        if (modal) {
          modal.classList.remove('show');
        }
      });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    });
  }

  // Research Handling
  async handleResearchSubmit() {
    const form = document.getElementById('research-form');
    const formData = new FormData(form);
    const goal = formData.get('goal')?.trim();
    
    if (!goal) {
      this.showToast('Please enter a research goal', 'error');
      return;
    }

    const btn = document.getElementById('start-research-btn');
    const originalText = btn.innerHTML;
    
    try {
      btn.innerHTML = '<span class="loading"></span> Starting research...';
      btn.disabled = true;

      const options = {
        includeDetailed: formData.get('includeDetailed') === 'on',
        generateReport: formData.get('generateReport') === 'on',
        reportFormat: formData.get('reportFormat') || 'markdown'
      };

      const result = await this.sendRequest('research.start', { goal, options });
      
      if (result.success) {
        this.showToast('Research started successfully!', 'success');
        form.reset();
        this.loadProjects();
        
        if (result.projectId) {
          this.showProjectDetails(result.projectId);
        }
      } else {
        this.showToast(`Research failed: ${result.error}`, 'error');
      }
      
    } catch (error) {
      console.error('Research submission error:', error);
      this.showToast(`Research failed: ${error.message}`, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // Project Management
  async loadProjects() {
    try {
      const data = await this.httpRequest('projects.list');
      
      this.projects = new Map();
      
      // Combine active and completed projects
      [...data.active, ...data.completed].forEach(project => {
        this.projects.set(project.id, {
          ...project,
          status: this.getProjectStatusFromData(project)
        });
      });
      
      this.renderProjects();
      this.updateProjectCounts();
      
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showToast('Failed to load projects', 'error');
    }
  }

  async loadProjectDetails(projectId) {
    try {
      const project = await this.sendRequest('project.status', { projectId });
      return project;
    } catch (error) {
      console.error('Failed to load project details:', error);
      return null;
    }
  }

  async pauseProject(projectId) {
    try {
      await this.sendRequest('project.pause', { projectId });
      this.showToast('Project paused', 'info');
      this.loadProjects();
    } catch (error) {
      console.error('Failed to pause project:', error);
      this.showToast('Failed to pause project', 'error');
    }
  }

  async resumeProject(projectId) {
    try {
      await this.sendRequest('project.resume', { projectId });
      this.showToast('Project resumed', 'info');
      this.loadProjects();
    } catch (error) {
      console.error('Failed to resume project:', error);
      this.showToast('Failed to resume project', 'error');
    }
  }

  showProjectDetails(projectId) {
    this.loadProjectDetails(projectId).then(project => {
      if (project) {
        this.renderProjectModal(project);
      }
    });
  }

  // Rendering
  renderProjects() {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    const filteredProjects = Array.from(this.projects.values()).filter(project => {
      switch (this.currentFilter) {
        case 'active':
          return project.status === 'active' || project.status === 'paused';
        case 'completed':
          return project.status === 'completed';
        case 'all':
          return true;
        default:
          return true;
      }
    });

    if (filteredProjects.length === 0) {
      projectsList.innerHTML = `
        <div class="empty-state">
          <p>No ${this.currentFilter === 'all' ? '' : this.currentFilter + ' '}projects found.</p>
        </div>
      `;
      return;
    }

    projectsList.innerHTML = filteredProjects.map(project => `
      <div class="project-item" data-project-id="${project.id}" onclick="agentUI.showProjectDetails('${project.id}')">
        <div class="project-header">
          <div>
            <div class="project-title">${this.escapeHtml(project.goal || 'Untitled Project')}</div>
            <div class="project-status ${project.status}">${this.getStatusLabel(project.status)}</div>
          </div>
        </div>
        <div class="project-meta">
          ${project.startTime ? `Started: ${new Date(project.startTime).toLocaleString()}` : ''}
          ${project.endTime ? ` • Completed: ${new Date(project.endTime).toLocaleString()}` : ''}
        </div>
        ${project.progress !== undefined ? `
          <div class="project-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${project.progress * 100}%"></div>
            </div>
          </div>
        ` : ''}
        <div class="project-actions">
          ${project.status === 'active' ? `
            <button class="btn btn-secondary" onclick="event.stopPropagation(); agentUI.pauseProject('${project.id}')">
              ⏸️ Pause
            </button>
          ` : ''}
          ${project.status === 'paused' ? `
            <button class="btn btn-primary" onclick="event.stopPropagation(); agentUI.resumeProject('${project.id}')">
              ▶️ Resume
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  renderProjectModal(project) {
    const modal = document.getElementById('project-modal');
    const content = document.getElementById('modal-project-content');
    const title = document.getElementById('modal-project-title');
    const actions = document.getElementById('modal-actions');

    if (!modal || !content || !title || !actions) return;

    title.textContent = `Project: ${project.goal || 'Untitled'}`;
    
    content.innerHTML = `
      <div class="project-details">
        <div class="detail-section">
          <h4>Information</h4>
          <div class="status-item">
            <span class="label">Status:</span>
            <span class="project-status ${project.status}">${this.getStatusLabel(project.status)}</span>
          </div>
          <div class="status-item">
            <span class="label">Progress:</span>
            <span>${Math.round((project.progress || 0) * 100)}%</span>
          </div>
          ${project.currentTask ? `
            <div class="status-item">
              <span class="label">Current Task:</span>
              <span>${project.currentTask.goal}</span>
            </div>
          ` : ''}
        </div>
        
        ${project.currentTask?.subtasks ? `
          <div class="detail-section">
            <h4>Tasks</h4>
            <div class="task-list">
              ${project.currentTask.subtasks.map(task => `
                <div class="task-item">
                  <span>${this.escapeHtml(task.title || task.goal)}</span>
                  <span class="task-status ${task.status}">${this.getStatusLabel(task.status)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    actions.innerHTML = '';
    
    if (project.status === 'active') {
      actions.innerHTML += `
        <button class="btn btn-secondary" onclick="agentUI.pauseProject('${project.id}')">Pause</button>
      `;
    } else if (project.status === 'paused') {
      actions.innerHTML += `
        <button class="btn btn-primary" onclick="agentUI.resumeProject('${project.id}')">Resume</button>
      `;
    }
    
    actions.innerHTML += `
      <button class="btn btn-secondary" onclick="closeProjectModal()">Close</button>
    `;

    modal.classList.add('show');
  }

  // Status Updates
  async loadAgentStatus() {
    try {
      const status = await this.httpRequest('agent.status');
      this.updateAgentStatus({ data: status });
    } catch (error) {
      console.error('Failed to load agent status:', error);
    }
  }

  updateAgentStatus(message) {
    const status = message.data;
    if (!status) return;

    // Update connection status
    this.updateConnectionStatus('connected');
    
    // Update status text
    const statusText = document.getElementById('agent-status-text');
    if (statusText) {
      statusText.textContent = this.getStatusLabel(status.status);
    }

    // Update projects count
    const activeProjects = document.getElementById('active-projects');
    const completedProjects = document.getElementById('completed-projects');
    if (activeProjects) activeProjects.textContent = status.activeProjects || 0;
    if (completedProjects) completedProjects.textContent = status.completedProjects || 0;

    // Update metrics
    const tasksCompleted = document.getElementById('tasks-completed');
    const tasksFailed = document.getElementById('tasks-failed');
    const uptime = document.getElementById('uptime');
    const llmProvider = document.getElementById('llm-provider');
    
    if (tasksCompleted) tasksCompleted.textContent = status.metrics?.tasksCompleted || 0;
    if (tasksFailed) tasksFailed.textContent = status.metrics?.tasksFailed || 0;
    if (uptime) uptime.textContent = this.formatDuration(status.uptime || 0);
    if (llmProvider) llmProvider.textContent = status.llmStatus?.currentProvider || '-';
  }

  updateConnectionStatus(status) {
    const indicator = document.getElementById('connection-status');
    if (!indicator) return;
    
    indicator.className = `status-indicator ${status}`;
    indicator.title = status === 'connected' ? 'Connected' : 'Disconnected';
  }

  // Settings
  async openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Load current settings into form
    document.getElementById('llm-provider-select').value = this.settings.llmProvider;
    document.getElementById('lm-studio-url').value = this.settings.lmStudioUrl;
    document.getElementById('openrouter-api-key').value = this.settings.openRouterApiKey;
    document.getElementById('max-concurrent-tasks').value = this.settings.maxConcurrentTasks;
    document.getElementById('auto-cleanup').checked = this.settings.autoCleanup;

    modal.classList.add('show');
  }

  async saveSettings() {
    const form = document.getElementById('settings-form');
    const formData = new FormData(form);
    
    this.settings = {
      llmProvider: formData.get('llmProvider') || 'lmstudio',
      lmStudioUrl: formData.get('lmStudioUrl') || 'http://localhost:1234',
      openRouterApiKey: formData.get('openRouterApiKey') || '',
      maxConcurrentTasks: parseInt(formData.get('maxConcurrentTasks')) || 3,
      autoCleanup: formData.get('autoCleanup') === 'on'
    };

    try {
      // Send settings update to agent
      await this.sendRequest('config.update', {
        config: {
          llmConfig: {
            defaultProvider: this.settings.llmProvider,
            lmStudio: {
              baseUrl: this.settings.lmStudioUrl
            },
            openrouter: {
              apiKey: this.settings.openRouterApiKey || process.env.OPENROUTER_API_KEY
            }
          },
          maxConcurrentTasks: this.settings.maxConcurrentTasks,
          autoCleanup: this.settings.autoCleanup
        }
      });

      // Save to localStorage
      localStorage.setItem('agent_settings', JSON.stringify(this.settings));
      
      this.showToast('Settings saved successfully', 'success');
      closeSettingsModal();
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('agent_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // UI Helpers
  setProjectFilter(filter) {
    this.currentFilter = filter;
    
    // Update tab active state
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    
    this.renderProjects();
  }

  updateProjectCounts() {
    document.querySelectorAll('.tab').forEach(tab => {
      const filter = tab.dataset.filter;
      let count = 0;
      
      switch (filter) {
        case 'active':
          count = Array.from(this.projects.values())
            .filter(p => p.status === 'active' || p.status === 'paused')
            .length;
          break;
        case 'completed':
          count = Array.from(this.projects.values())
            .filter(p => p.status === 'completed')
            .length;
          break;
        case 'all':
          count = this.projects.size;
          break;
      }
      
      tab.textContent = `${this.capitalizeFirst(filter)} (${count})`;
    });
  }

  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => container.removeChild(toast));

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, duration);
  }

  getProjectStatusFromData(project) {
    if (project.endTime) {
      return 'completed';
    } else if (project.pauseTime) {
      return 'paused';
    } else {
      return 'active';
    }
  }

  getStatusLabel(status) {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  }

  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    return icons[type] || icons.info;
  }

  formatDuration(ms) {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}s`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}m`;
    } else if (ms < 86400000) {
      return `${Math.round(ms / 3600000)}h`;
    } else {
      return `${Math.round(ms / 86400000)}d`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Global functions for onclick handlers
window.agentUI = null;
window.closeProjectModal = () => {
  const modal = document.getElementById('project-modal');
  if (modal) modal.classList.remove('show');
};

window.closeSettingsModal = () => {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('show');
};

window.saveSettings = () => {
  if (window.agentUI) window.agentUI.saveSettings();
};

// Initialize both UI systems when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.agentUI = new AgentUI();
  window.chat = new ChatManager();
  
  // Show initial connection status
  this.updateConnectionStatus('connecting');
});
