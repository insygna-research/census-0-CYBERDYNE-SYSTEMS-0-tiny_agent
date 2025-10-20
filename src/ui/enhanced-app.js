/**
 * Enhanced Agent Application - Main Application Controller
 * Integrates all advanced UI components with enhanced agent capabilities
 */

class EnhancedAgentApp {
  constructor() {
    this.navigation = null;
    this.agent = null;
    this.ws = null;
    this.currentView = 'dashboard';
    this.projects = new Map();
    this.strategicPlans = new Map();
    this.deliverables = new Map();
    this.notifications = [];

    this.init();
  }

  async init() {
    try {
      // Initialize navigation system
      this.navigation = new UnifiedNavigation();

      // Initialize WebSocket connection
      this.connectWebSocket();

      // Initialize UI components
      this.initializeUI();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      // Start periodic updates
      this.startPeriodicUpdates();

      console.log('🚀 Enhanced Agent Application initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.showError('Application initialization failed', error);
    }
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        this.updateConnectionStatus('connected');
        this.loadAgentData();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.updateConnectionStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.updateConnectionStatus('error');
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'agent.status':
        this.updateAgentStatus(message.data);
        break;
      case 'project.created':
      case 'project.updated':
      case 'project.completed':
        this.handleProjectUpdate(message);
        break;
      case 'strategic_plan.created':
      case 'strategic_plan.updated':
        this.handleStrategicPlanUpdate(message);
        break;
      case 'deliverable.created':
      case 'deliverable.updated':
        this.handleDeliverableUpdate(message);
        break;
      case 'learning.completed':
        this.handleLearningUpdate(message);
        break;
      case 'error.recovery':
        this.handleErrorRecovery(message);
        break;
      case 'notification':
        this.addNotification(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  initializeUI() {
    // Initialize view containers
    this.initializeViews();

    // Setup quick actions
    this.setupQuickActions();

    // Initialize modals
    this.initializeModals();

    // Setup charts and visualizations
    this.initializeCharts();
  }

  initializeViews() {
    // Dashboard view
    this.initializeDashboardView();

    // Chat view
    this.initializeChatView();

    // Strategic planning view
    this.initializeStrategicView();

    // Memory lab view
    this.initializeMemoryView();
  }

  initializeDashboardView() {
    // Setup project cards
    this.setupProjectCards();

    // Setup cognitive metrics
    this.setupCognitiveMetrics();

    // Setup learning activity display
    this.setupLearningActivity();
  }

  initializeChatView() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendChatMessage();
      });
    }

    if (chatInput) {
      // Auto-resize textarea
      chatInput.addEventListener('input', () => {
        this.autoResizeTextarea(chatInput);
        this.updateSendButton();
      });

      // Handle keyboard shortcuts
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
  }

  initializeStrategicView() {
    // Setup strategic plan cards
    this.setupStrategicPlanCards();

    // Setup strategic metrics
    this.setupStrategicMetrics();
  }

  initializeMemoryView() {
    // Setup memory visualization
    this.setupMemoryVisualization();

    // Setup session management
    this.setupSessionManagement();

    // Setup memory analytics
    this.setupMemoryAnalytics();
  }

  setupEventListeners() {
    // View change events
    document.addEventListener('viewChanged', (e) => {
      this.handleViewChange(e.detail.view);
    });

    // Quick research event
    document.addEventListener('showQuickResearch', () => {
      this.showQuickResearchModal();
    });

    // Quick strategic planning event
    document.addEventListener('showQuickStrategic', () => {
      this.showQuickStrategicModal();
    });

    // Settings event
    document.addEventListener('showSettings', () => {
      this.showSettingsModal();
    });

    // Notifications event
    document.addEventListener('showNotifications', (e) => {
      this.showNotificationsModal(e.detail.notifications);
    });
  }

  async loadInitialData() {
    try {
      await Promise.all([
        this.loadAgentData(),
        this.loadProjects(),
        this.loadStrategicPlans(),
        this.loadDeliverables()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  async loadAgentData() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'agent.status' }));
    }
  }

  async loadProjects() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'projects.list' }));
    }
  }

  updateAgentStatus(status) {
    // Update navigation status
    if (this.navigation) {
      this.navigation.updateAgentStatus(status);
    }

    // Update dashboard metrics
    this.updateDashboardMetrics(status);

    // Update cognitive load visualization
    this.updateCognitiveLoad(status.cognitiveLoad || 0);
  }

  updateDashboardMetrics(status) {
    // Update basic metrics
    const agentState = document.getElementById('agent-state');
    if (agentState) {
      agentState.textContent = status.status || 'Ready';
    }

    const activeProjects = document.getElementById('active-projects');
    if (activeProjects) {
      activeProjects.textContent = status.activeProjects || 0;
    }

    // Update advanced metrics
    this.updateAdvancedMetrics(status);
  }

  updateAdvancedMetrics(status) {
    // Update learning cycles
    const learningCycles = status.learningCycles || 0;
    const learningElement = document.querySelector('.learning-metric .metric-number');
    if (learningElement) {
      learningElement.textContent = learningCycles;
    }

    // Update error recoveries
    const errorRecoveries = status.errorRecoveries || 0;
    const recoveryElement = document.querySelectorAll('.learning-metric .metric-number')[1];
    if (recoveryElement) {
      recoveryElement.textContent = errorRecoveries;
    }

    // Update deliverables
    const deliverables = status.deliverables || 0;
    const deliverableElement = document.querySelectorAll('.learning-metric .metric-number')[2];
    if (deliverableElement) {
      deliverableElement.textContent = deliverables;
    }
  }

  updateCognitiveLoad(load) {
    const cognitiveLoad = document.getElementById('cognitive-load');
    if (cognitiveLoad) {
      cognitiveLoad.style.width = `${Math.min(load, 100)}%`;
    }
  }

  handleProjectUpdate(message) {
    const project = message.data;
    this.projects.set(project.id, project);

    // Update UI based on current view
    if (this.currentView === 'dashboard') {
      this.updateProjectsList();
    }

    // Show notification
    this.showNotification(`Project ${message.type}: ${project.goal}`, 'info');
  }

  handleStrategicPlanUpdate(message) {
    const plan = message.data;
    this.strategicPlans.set(plan.id, plan);

    // Update UI
    if (this.currentView === 'strategic') {
      this.updateStrategicPlansList();
    }

    // Update navigation badge
    this.navigation.updateBadges({
      strategicPlans: this.strategicPlans.size
    });
  }

  handleDeliverableUpdate(message) {
    const deliverable = message.data;
    this.deliverables.set(deliverable.id, deliverable);

    // Show notification
    this.showNotification(`Deliverable ${message.type}: ${deliverable.type}`, 'success');
  }

  handleLearningUpdate(message) {
    const learning = message.data;

    // Update learning metrics
    this.updateLearningMetrics(learning);

    // Show subtle notification
    this.showNotification('Learning cycle completed', 'info', 3000);
  }

  handleErrorRecovery(message) {
    const recovery = message.data;

    // Update recovery status
    this.updateRecoveryStatus(recovery);

    // Show notification if significant
    if (recovery.success) {
      this.showNotification('Error recovery successful', 'success');
    }
  }

  updateProjectsList() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    if (this.projects.size === 0) {
      container.innerHTML = this.getEmptyState('projects');
      return;
    }

    const projectsHTML = Array.from(this.projects.values())
      .map(project => this.createProjectCard(project))
      .join('');

    container.innerHTML = projectsHTML;
  }

  createProjectCard(project) {
    return `
      <div class="project-card ${project.status}" data-project-id="${project.id}">
        <div class="project-header">
          <h3>${project.goal}</h3>
          <div class="project-status ${project.status}">
            ${this.getStatusIcon(project.status)}
            <span>${project.status}</span>
          </div>
        </div>
        <div class="project-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
          </div>
          <span class="progress-text">${project.progress || 0}% Complete</span>
        </div>
        <div class="project-metrics">
          <div class="metric">
            <span class="metric-label">Duration</span>
            <span class="metric-value">${this.formatDuration(project.duration || 0)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Tasks</span>
            <span class="metric-value">${project.tasksCompleted || 0}/${project.tasksTotal || 0}</span>
          </div>
        </div>
        <div class="project-actions">
          <button class="btn btn-ghost" onclick="app.viewProject('${project.id}')">
            View Details
          </button>
          ${project.status === 'active' ?
            `<button class="btn btn-ghost" onclick="app.pauseProject('${project.id}')">Pause</button>` :
            `<button class="btn btn-ghost" onclick="app.resumeProject('${project.id}')">Resume</button>`
          }
        </div>
      </div>
    `;
  }

  updateStrategicPlansList() {
    const container = document.getElementById('strategic-plans-container');
    if (!container) return;

    if (this.strategicPlans.size === 0) {
      container.innerHTML = this.getEmptyState('strategic');
      return;
    }

    const plansHTML = Array.from(this.strategicPlans.values())
      .map(plan => this.createStrategicPlanCard(plan))
      .join('');

    container.innerHTML = plansHTML;
  }

  createStrategicPlanCard(plan) {
    return `
      <div class="strategic-plan-card" data-plan-id="${plan.id}">
        <div class="plan-header">
          <h3>${plan.goal}</h3>
          <div class="plan-status ${plan.status}">
            <span class="status-badge">${plan.status}</span>
          </div>
        </div>
        <div class="plan-phases">
          <h4>Progress</h4>
          <div class="phases-timeline">
            ${plan.phases?.map((phase, index) => `
              <div class="phase ${phase.status}" data-phase-index="${index}">
                <div class="phase-indicator"></div>
                <div class="phase-info">
                  <span class="phase-title">${phase.title}</span>
                  <span class="phase-status">${phase.status}</span>
                </div>
              </div>
            `).join('') || '<p>No phases defined</p>'}
          </div>
        </div>
        <div class="plan-actions">
          <button class="btn btn-primary" onclick="app.executeStrategicPlan('${plan.id}')">
            Execute Plan
          </button>
          <button class="btn btn-ghost" onclick="app.viewStrategicPlan('${plan.id}')">
            View Details
          </button>
        </div>
      </div>
    `;
  }

  sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    // Add message to chat
    this.addChatMessage(message, 'user');

    // Clear input
    input.value = '';
    this.autoResizeTextarea(input);
    this.updateSendButton();

    // Send to agent
    this.sendToAgent({
      type: 'chat.message',
      message: message,
      timestamp: Date.now()
    });

    // Show typing indicator
    this.showTypingIndicator();
  }

  addChatMessage(message, sender, metadata = {}) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageHTML = `
      <div class="message-container ${sender}">
        <div class="message-avatar">
          <div class="avatar avatar-${sender}">
            ${sender === 'user' ? '👤' : '🤖'}
          </div>
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${sender === 'user' ? 'You' : 'Agent'}</span>
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
          </div>
          <div class="message-body">
            ${this.formatMessage(message)}
          </div>
          ${metadata.actions ? this.generateMessageActions(metadata.actions) : ''}
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'block';
    }
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  formatMessage(message) {
    // Basic markdown formatting
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  generateMessageActions(actions) {
    return `
      <div class="message-actions">
        ${actions.map(action => `
          <button class="btn btn-ghost action-btn" onclick="app.handleAction('${action.type}', '${action.data}')">
            ${action.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  updateSendButton() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.send-btn');

    if (sendBtn) {
      sendBtn.disabled = !input.value.trim();
    }
  }

  sendToAgent(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
      this.showError('Not connected to agent', new Error('WebSocket connection lost'));
    }
  }

  showNotification(message, type = 'info', duration = 5000) {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };

    this.notifications.unshift(notification);

    if (this.navigation) {
      this.navigation.addNotification(notification);
    }
  }

  showError(message, error) {
    console.error(message, error);
    this.showNotification(message, 'error');
  }

  // Quick Action Methods
  showQuickResearchModal() {
    // Implementation for quick research modal
    console.log('Show quick research modal');
  }

  showQuickStrategicModal() {
    // Implementation for quick strategic modal
    console.log('Show quick strategic modal');
  }

  showSettingsModal() {
    // Implementation for settings modal
    console.log('Show settings modal');
  }

  // Project Management Methods
  async startNewResearch() {
    const goal = prompt('Enter your research goal:');
    if (!goal) return;

    try {
      const response = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('Research started successfully', 'success');
        await this.loadProjects();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showError('Failed to start research', error);
    }
  }

  async createStrategicPlan() {
    const goal = prompt('Enter your strategic research goal:');
    if (!goal) return;

    try {
      const response = await fetch('/api/strategic/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('Strategic plan created', 'success');
        await this.loadStrategicPlans();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showError('Failed to create strategic plan', error);
    }
  }

  // View Management
  handleViewChange(view) {
    this.currentView = view;

    // Load view-specific data
    switch (view) {
      case 'dashboard':
        this.loadProjects();
        break;
      case 'strategic':
        this.loadStrategicPlans();
        break;
      case 'memory':
        this.loadMemoryData();
        break;
    }
  }

  // Utility Methods
  getStatusIcon(status) {
    const icons = {
      'active': '🟢',
      'paused': '⏸️',
      'completed': '✅',
      'failed': '❌',
      'planning': '📋',
      'executing': '⚡'
    };
    return icons[status] || '❓';
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getEmptyState(type) {
    const emptyStates = {
      projects: {
        icon: '🚀',
        title: 'No Active Projects',
        description: 'Start your first advanced research project to see it here',
        action: 'startNewResearch()',
        actionText: 'Start Research'
      },
      strategic: {
        icon: '📋',
        title: 'No Strategic Plans',
        description: 'Create your first strategic research plan to get started',
        action: 'createStrategicPlan()',
        actionText: 'Create Plan'
      }
    };

    const state = emptyStates[type] || emptyStates.projects;

    return `
      <div class="empty-state">
        <div class="empty-icon">${state.icon}</div>
        <h3>${state.title}</h3>
        <p>${state.description}</p>
        <button class="btn btn-primary" onclick="${state.action}">
          ${state.actionText}
        </button>
      </div>
    `;
  }

  // Periodic Updates
  startPeriodicUpdates() {
    // Update uptime every minute
    setInterval(() => {
      if (this.navigation) {
        this.navigation.updateUptime(Date.now() - (this.agent?.startTime || Date.now()));
      }
    }, 60000);

    // Refresh data every 30 seconds
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.loadAgentData();
      }
    }, 30000);
  }

  scheduleReconnect() {
    setTimeout(() => {
      this.connectWebSocket();
    }, 5000);
  }

  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = `status-dot ${status}`;
    }
  }

  // Chart Initialization
  initializeCharts() {
    // Initialize cognitive load chart
    this.initializeCognitiveChart();

    // Initialize memory usage chart
    this.initializeMemoryChart();

    // Initialize performance charts
    this.initializePerformanceCharts();
  }

  initializeCognitiveChart() {
    const canvas = document.getElementById('cognitive-chart');
    if (canvas && !this.cognitiveChart) {
      // Simple line chart implementation
      const ctx = canvas.getContext('2d');
      this.cognitiveChart = {
        ctx,
        data: [],
        maxPoints: 20
      };

      this.startCognitiveChartUpdates();
    }
  }

  startCognitiveChartUpdates() {
    setInterval(() => {
      if (this.cognitiveChart) {
        // Add new data point
        const load = Math.random() * 100;
        this.cognitiveChart.data.push(load);

        // Keep only last N points
        if (this.cognitiveChart.data.length > this.cognitiveChart.maxPoints) {
          this.cognitiveChart.data.shift();
        }

        // Redraw chart
        this.drawCognitiveChart();
      }
    }, 2000);
  }

  drawCognitiveChart() {
    const { ctx, canvas, data } = this.cognitiveChart;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw data line
    if (data.length > 1) {
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((value, index) => {
        const x = (width / (data.length - 1)) * index;
        const y = height - (value / 100) * height;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
      data.forEach((value, index) => {
        const x = (width / (data.length - 1)) * index;
        const y = height - (value / 100) * height;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // Memory and Performance Setup
  setupMemoryVisualization() {
    // Implementation for memory visualization
  }

  setupSessionManagement() {
    // Implementation for session management
  }

  setupMemoryAnalytics() {
    // Implementation for memory analytics
  }

  setupCognitiveMetrics() {
    // Implementation for cognitive metrics
  }

  setupLearningActivity() {
    // Implementation for learning activity display
  }

  setupProjectCards() {
    // Implementation for project cards
  }

  setupStrategicPlanCards() {
    // Implementation for strategic plan cards
  }

  setupStrategicMetrics() {
    // Implementation for strategic metrics
  }

  setupQuickActions() {
    // Implementation for quick actions
  }

  initializeModals() {
    // Implementation for modal system
  }

  loadStrategicPlans() {
    // Implementation for loading strategic plans
  }

  loadDeliverables() {
    // Implementation for loading deliverables
  }

  loadMemoryData() {
    // Implementation for loading memory data
  }

  updateLearningMetrics(learning) {
    // Implementation for updating learning metrics
  }

  updateRecoveryStatus(recovery) {
    // Implementation for updating recovery status
  }

  // Placeholder methods for future implementation
  viewProject(projectId) {
    console.log('View project:', projectId);
  }

  pauseProject(projectId) {
    console.log('Pause project:', projectId);
  }

  resumeProject(projectId) {
    console.log('Resume project:', projectId);
  }

  executeStrategicPlan(planId) {
    console.log('Execute strategic plan:', planId);
  }

  viewStrategicPlan(planId) {
    console.log('View strategic plan:', planId);
  }

  handleAction(actionType, actionData) {
    console.log('Handle action:', actionType, actionData);
  }

  attachFile() {
    console.log('Attach file');
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  sendSuggestion(suggestion) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = suggestion;
      this.updateSendButton();
      input.focus();
    }
  }

  addSuggestion(suggestion) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value += (input.value ? ' ' : '') + suggestion;
      this.updateSendButton();
      input.focus();
    }
  }

  clearChat() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      this.showNotification('Chat cleared', 'info');
    }
  }

  toggleChatSettings() {
    this.showSettingsModal();
  }

  compressMemory() {
    console.log('Compress memory');
    this.showNotification('Memory compression started', 'info');
  }

  showDeliverableCreator() {
    console.log('Show deliverable creator');
  }

  showMemoryLab() {
    this.navigation.switchView('memory');
  }

  showPerformanceMonitor() {
    this.navigation.switchView('performance');
  }

  showRecoveryCenter() {
    this.navigation.switchView('recovery');
  }

  filterProjects(filter) {
    console.log('Filter projects:', filter);
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EnhancedAgentApp();
});