class ChatManager {
  constructor() {
    this.ws = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectDelay = 2000;
    this.messageHandlers = new Map();
    this.listeners = new Map();
    this.currentFilter = 'active';
    this.projects = new Map();
    this.settings = {
      llmProvider: 'lmstudio',
      lmStudioUrl: 'http://localhost:1234',
      lmStudioModel: 'ibm/granite-4-h-micro',
      openRouterApiKey: '',
      maxConcurrentTasks: 3,
      autoCleanup: true,
      responseTimeout: 30000
    };
    
    this.status = 'disconnected';
    this.messageIdCounter = 0;
    this._init();
  }

  _init() {
    this.setupMessageHandlers();
    this.connectWebSocket();
    this.loadSettings();
    this.emit('initialized');
  }

  // WebSocket Connection Management
  connectWebSocket() {
    const wsUrl = this._getWebSocketUrl();
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionAttempts = 0;
        this.updateConnectionStatus('connected');
        this.status = 'connected';
        this.emit('connected');
        
        // Load initial data
        this.loadAgentStatus();
        this.loadProjects();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
          this.showToast('Message format error', 'error');
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.updateConnectionStatus('disconnected');
        this.status = 'disconnected';
        this.emit('disconnected');
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showToast('Connection error', 'error');
        if (this.connectionAttempts === this.maxConnectionAttempts) {
          this.emit('connection_failed');
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.showToast('Failed to create connection', 'error');
    }
  }

  scheduleReconnect() {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      console.log(`Scheduling reconnection attempt ${this.connectionAttempts}`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay * this.connectionAttempts);
    } else {
      this.emit('max_retries_exceeded');
      this.showToast('Unable to connect to agent', 'error');
    }
  }

  _getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  // Message Handling
  handleWebSocketMessage(message) {
    if (this.messageHandlers.has(message.type)) {
      this.messageHandlers.get(message.type)(message);
    } else {
      console.warn('Unknown message type:', message.type);
    }
  }

  setupMessageHandlers() {
    this.messageHandlers.set('chat.message', (message) => {
      this.handleChatMessage(message);
    });
    
    this.messageHandlers.set('chat.typing', (message) => {
      this.handleTypingIndicator(message.data.active);
    });
    
    this.messageHandlers.set('chat.status', (message) => {
      this.handleStatusUpdate(message.data);
    });
    
    this.messageHandlers.set('chat.error', (message) => {
      this.handleChatError(message.error);
    });

    this.messageHandlers.set('chat.stream', (message) => {
      this.handleStreamMessage(message);
    });

    this.messageHandlers.set('system.notification', (message) => {
      this.handleSystemNotification(message);
    });
  }

  // Chat Message Handling
  async handleChatMessage(message) {
    try {
      // Route to chat app's displayMessage method
      if (window.chatApp && window.chatApp.displayMessage) {
        window.chatApp.displayMessage(message.data);
      } else {
        console.warn('Chat app not available to display message');
      }
      
      this.emit('message_received', message);
    } catch (error) {
      console.error('Error handling chat message:', error);
      this.showToast('Failed to display message', 'error');
    }
  }

  handleTypingIndicator(active) {
    const indicator = document.getElementById('typing-indicator');
    if (active) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  }

  handleStatusUpdate(statusData) {
    console.log('Agent status update:', statusData);
    // Update status display if needed
  }

  handleChatError(error) {
    console.error('Chat error:', error);
    this.showToast(error.message || 'Chat error occurred', 'error');
  }

  handleStreamMessage(streamData) {
    // Find the target message by ID
    const messageElement = document.querySelector(`[data-message-id="${streamData.messageId}"]`);
    if (messageElement) {
      const contentElement = messageElement.querySelector('.message-body');
      const statusElement = messageElement.querySelector('.message-status');
      
      if (statusElement) {
        statusElement.className = 'message-status typing';
        statusElement.textContent = 'Typing...';
      }
    }
  }

  handleSystemNotification(notification) {
    this.renderSystemMessage(notification);
  }

  // Message Rendering
  renderMessage(messageData) {
    const template = this._getMessageTemplate(messageData.type);
    const container = template.content.cloneNode(true);
    
    // Set message attributes
    if (messageData.id) {
      container.dataset.messageId = messageData.id;
    }
    
    // Set avatar and sender info
    const avatar = container.querySelector(messageData.type === 'agent' ? '.avatar-agent' : '.avatar-user');
    const sender = container.querySelector('.message-sender');
    const time = container.querySelector('.message-time');
    
    if (avatar) {
      avatar.className = `avatar avatar-${messageData.type}`;
      avatar.textContent = messageData.type === 'agent' ? '🤖' : '👤';
    }
    
    if (sender) {
      sender.textContent = messageData.sender || (messageData.type === 'agent' ? 'Agent' : 'You');
    }
    
    if (time) {
      time.textContent = messageData.timestamp || this._formatTime(new Date());
    }
    
    // Set status if present
    const status = container.querySelector('.message-status');
    if (status && messageData.status) {
      status.className = `message-status ${messageData.status}`;
      status.textContent = this._formatStatus(messageData.status);
    }
    
    // Set message content
    const body = container.querySelector('.message-body');
    const bodyText = messageData.content || '';
    
    if (body) {
      // Handle different content types
      if (messageData.contentType === 'markdown') {
        body.innerHTML = this._parseMarkdown(bodyText);
      } else {
        // Escape HTML for user messages, allow formatting for agent messages
        if (messageData.type === 'agent') {
          body.innerHTML = this.parseWithFormatting(bodyText);
        } else {
          body.textContent = bodyText;
        }
      }
    }
    
    // Set actions
    const copyBtn = container.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.onclick = () => this.copyMessageContent(container);
    }
    
    return container;
  }

  renderSystemMessage(notification) {
    const template = document.getElementById('system-message-template');
    const container = template.content.cloneNode(true);
    
    const typeBadge = container.querySelector('.type-badge');
    const time = container.querySelector('.message-time');
    
    if (typeBadge) {
      typeBadge.textContent = notification.level || 'info';
      typeBadge.className = `type-badge ${notification.level}`;
    }
    
    if (time) {
      time.textContent = this._formatTime(new Date());
    }
    
    const body = container.querySelector('.message-body');
    body.textContent = notification.message || '';
    
    return container;
  }

  _getMessageTemplate(type) {
    if (type === 'system') {
      return document.getElementById('system-message-template');
    }
    return document.getElementById('message-template');
  }

  _parseMarkdown(text) {
    // Basic markdown parsing (in production, use a proper markdown parser)
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/# (.*?)$/gm, '<h4>$1</h4>')
      .replace(/## (.*?)$/gm, '<h3>$1</h3>')
      .replace(/### (.*?)$/gm, '<h2>$1</h2>')
      .replace(/(.*?)(https?:\/\/[^\s]+)$/g, '<a href="$2" target="_blank">$1</a>');
  }

  parseWithFormatting(text) {
    // Simple HTML parsing for agent responses
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br>')
      .replace(/\n/g, '<br>');
  }

  _formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  _formatStatus(status) {
    switch (status) {
      case 'thinking':
        return 'Thinking...';
      case 'researching':
        return 'Researching...';
      case 'analyzing':
        return 'Analyzing...';
      case 'generating':
        return 'Generating response...';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  copyMessageContent(messageContainer) {
    const content = messageContainer.querySelector('.message-body');
    if (content) {
      const textContent = content.textContent || '';
      navigator.clipboard.writeText(textContent);
      this.showToast('Message copied to clipboard', 'success');
      
      // Visual feedback
      messageContainer.style.opacity = '0.5';
      setTimeout(() => {
        messageContainer.style.opacity = '1';
      }, 200);
    }
  }

  // Input Management
  clearInput() {
    const input = document.getElementById('message-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  addToInput(text) {
    const input = document.getElementById('message-input');
    if (input) {
      input.value += text;
      input.focus();
    }
  }

  // Toast Notifications
  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this._getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, duration);
    
    // Add close handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.parentElement.removeChild(toast);
      });
    }
  }

  _getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
      thinking: '💭',
      researching: '🔍',
      analyzing: '🔬',
      generating: '⚡'
    };
    return icons[type] || icons.info;
  }

  // Settings Management
  loadSettings() {
    try {
      const saved = localStorage.getItem('chat_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
      this.applySettings();
      this.emit('settings_loaded');
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showToast('Failed to load settings', 'error');
    }
  }

  async saveSettings() {
    try {
      // Validate LM Studio connection if selected
      if (this.settings.llmProvider === 'lmstudio') {
        const lmStudioStatus = await this.testConnection('lmstudio');
        if (!lmStudioStatus.success) {
          throw new Error('LM Studio connection failed');
        }
      }
      
      localStorage.setItem('chat_settings', JSON.stringify(this.settings));
      this.applySettings();
      this.showToast('Settings saved successfully', 'success');
      this.emit('settings_saved');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings', 'error');
      return false;
    }
  }

  applySettings() {
    // Update UI elements
    const providerSelect = document.getElementById('llm-provider-select');
    if (providerSelect) {
      providerSelect.value = this.settings.llmProvider;
      this.toggleProviderSettings();
    }
    
    const lmStudioUrl = document.getElementById('lm-studio-url');
    if (lmStudioUrl) {
      lmStudioUrl.value = this.settings.lmStudioUrl;
    }
    
    const openRouterKey = document.getElementById('openrouter-api-key');
    if (openRouterKey) {
      openRouterKey.value = this.settings.openRouterApiKey;
    }
    
    const maxConcurrent = document.getElementById('max-concurrent-tasks');
    if (maxConcurrent) {
      maxConcurrent.value = this.settings.maxConcurrentTasks;
    }
    
    const autoCleanup = document.getElementById('auto-cleanup');
    if (autoCleanup) {
      autoCleanup.checked = this.settings.autoCleanup;
    }
    
    this.emit('settings_applied');
  }

  toggleProviderSettings() {
    const lmStudioSettings = document.getElementById('lmstudio-settings');
    const openRouterSettings = document.getElementById('openrouter-settings');
    
    if (this.settings.llmProvider === 'lmstudio') {
      lmStudioSettings.classList.remove('hidden');
      openRouterSettings.classList.add('hidden');
    } else {
      lmStudioSettings.classList.add('hidden');
      openRouterSettings.classList.remove('hidden');
    }
  }

  async testConnection(provider) {
    try {
      let endpoint;
      
      if (provider === 'lmstudio') {
        endpoint = `${this.settings.lmStudioUrl}/v1/models`;
      } else if (provider === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/models';
        // Would need API key in headers
        const headers = this.settings.openRouterApiKey ? {
          'Authorization': `Bearer ${this.settings.openRouterApiKey}`
        } : {};
        
        const response = await fetch(endpoint, { headers });
        return response.status === 200;
      }
      
      return { success: true, provider };
    } catch (error) {
      console.error(`Connection test failed for ${provider}:`, error);
      return { success: false, provider, error: error.message };
    }
  }

  // Loading Functions
  async loadAgentStatus() {
    try {
      const response = await this.sendRequest('agent.status');
      if (response.success) {
        this.updateAgentStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load agent status:', error);
      this.showToast('Unable to connect to agent', 'error');
    }
  }

  async loadProjects() {
    try {
      const response = await this.sendRequest('projects.list');
      if (response.success) {
        this.projects.clear();
        this.renderProjects(response.data);
        this.emit('projects_loaded', response.data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showToast('Unable to load projects', 'error');
      this.renderProjects({ active: [], completed: [] });
    }
  }

  // UI Updates
  updateConnectionStatus(connectionStatus) {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.className = `connection-indicator ${connectionStatus}`;
      console.log(`Connection status: ${connectionStatus}`);
    }
    
    const statusText = document.querySelector('.status-text');
    if (statusText) {
      switch (connectionStatus) {
        case 'connected':
          statusText.textContent = 'Connected';
          break;
        case 'connecting':
          statusText.textContent = 'Connecting...';
          break;
        case 'disconnected':
          statusText.textContent = 'Disconnected';
          break;
        default:
          statusText.textContent = 'Unknown';
      }
    }
  }

  updateAgentStatus(statusData) {
    // Update connection and provider info
    const agentProvider = document.getElementById('llm-provider');
    if (agentProvider && statusData.llmStatus) {
      agentProvider.textContent = statusData.llmStatus.currentProvider || '-';
    }

    // Update connection status
    if (statusData.status === 'ready') {
      this.updateConnectionStatus('connected');
    }
    
    // Update metrics
    const tasksCompleted = document.getElementById('tasks-completed');
    const tasksFailed = document.getElementById('tasks-failed');
    const uptime = document.getElementById('uptime');
    
    if (tasksCompleted) {
      tasksCompleted.textContent = statusData.metrics.tasksCompleted || 0;
    }
    if (tasksFailed) {
      tasksFailed.textContent = statusData.metrics.tasksFailed || 0;
    }
    if (uptime) {
      uptime.textContent = this._formatDuration(statusData.uptime || 0);
    }

    // Update project counts
    if (statusData.activeProjects !== undefined) {
      document.getElementById('active-projects').textContent = statusData.activeProjects || 0;
    }
    if (statusData.completedProjects !== undefined) {
      document.getElementById('completed-projects').textContent = statusData.completedProjects || 0;
    }
  }

  _formatDuration(ms) {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}m`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}h`;
    } else {
      return `${Math.round(ms / 86400000)}d`;
    }
  }

  // Project Management
  renderProjects(projectsData) {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    projectsList.innerHTML = '';
    
    const mergedProjects = [
      ...(projectsData.active || []),
      ...(projectsData.completed || [])
    ];

    if (mergedProjects.length === 0) {
      projectsList.innerHTML = '<div class="empty-state"><p>No research projects yet. Start your first conversation!</p></div>';
      return;
    }

    projectsList.innerHTML = mergedProjects.map(project => `
      <div class="project-item" data-project-id="${project.id}" onclick="chat.showProjectDetails('${project.id}')">
        <div class="project-header">
          <div>
            <div class="project-title">${this.escapeHtml(project.goal || 'Untitled')}</div>
            <div class="project-status ${project.status}">${this._getStatusLabel(project.status)}</div>
          </div>
          <div class="project-meta">
            <span>${this._formatDate(project.startTime)}</span>
            ${project.endTime ? `<span>• Ended: ${this._formatDate(project.endTime)}</span>` : ''}
          </div>
        </div>
        <div class="project-progress">
          ${project.progress ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${project.progress * 100}%"></div>
            </div>
          ` : ''}
        </div>
        <div class="project-actions">
          ${project.status === 'active' ? `
            <button class="btn btn-secondary" onclick="chat.pauseProject('${project.id}')">⏸️ Pause</button>
          ` : ''}
          ${project.status === 'paused' ? `
            <button class="btn btn-primary" onclick="chat.resumeProject('${project.id}')">▶️ Resume</button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  _getStatusLabel(status) {
    const labels = {
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed' 
    };
    return labels[status] || 'Unknown';
  }

  _formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _formatDuration(ms) {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}m`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}h`;
    } else {
      return `${Math.round(ms / 86400000)}d`;
    }
  }

  // Event Management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners && this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Request Helper (communicates with backend)
  async sendRequest(type, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const requestId = Date.now().toString();
    
    this.ws.send(JSON.stringify({
      type, 
      id: requestId, 
      data
    }));

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.settings.responseTimeout);

      const cleanupTimeout = () => clearTimeout(timeoutId);

      const checkHandler = (event) => {
        if (event.type === 'response' && event.id === requestId) {
          cleanupTimeout();
          removeHandler();
          return event.data.success ? resolve(event.data) : reject(new Error(event.data.error));
        }
      };

      this.ws.addEventListener('message', checkHandler);

      const errorHandler = (event) => {
        cleanupTimeout();
        removeHandler();
        reject(new Error('WebSocket error'));
      };

      const removeHandler = () => {
        this.ws.removeEventListener('message', checkHandler);
        this.ws.removeEventListener('error', errorHandler);
        this.ws.removeEventListener('close', checkHandler);
      };
    });
  }

  // File Upload Handling
  async initiateFileUpload(file) {
    try {
      const preview = this.createFilePreview(file);
      
      const uploadModal = document.getElementById('upload-modal');
      if (uploadModal) {
        uploadModal.classList.add('show');
        const uploadSubmit = document.getElementById('upload-submit-btn');
        if (uploadSubmit) {
          uploadSubmit.onclick = () => this.submitFileUpload(file);
        }
      }
    } catch (error) {
      console.error('Failed to initiate file upload:', error);
      this.showToast('Failed to prepare file upload', 'error');
    }
  }

  createFilePreview(file) {
    const preview = document.getElementById('upload-preview');
    if (!preview) return;
    
    const fileIcon = this.getFileIcon(file.type);
    
    preview.innerHTML = `
      <div class="file-icon">${fileIcon}</div>
      <div class="file-name">${file.name}</div>
      <div class="file-size">${this.formatFileSize(file.size)}</div>
    `;
    
    const uploadModal = document.getElementById('upload-modal');
    const uploadSubmit = document.getElementById('upload-submit-btn');
    
    if (uploadModal && uploadSubmit) {
      uploadSubmit.disabled = false;
    }
    
    return preview;
  }

  getFileIcon(mimeType) {
    const icons = {
      'text/plain': '📄',
      'text/html': '📜',
      'application/json': '📋',
      'application/pdf': '📄',
      'application/vnd.ms-word': '📄',
      'application/msword': '📄',
      'text/markdown': '📝',
      'text/x-python': '🐍',
      'text/x-javascript': '📄',
      'image/png': '🖼️',
      'image/jpeg': '🖼️',
      'image/gif': '🖼️',
      'image/svg': '🎨️',
      'application/postscript': '📜',
      'application/json': '📋',
      'text/x-typescript': '📜'
    };
    
    return icons[mimeType.toLowerCase()] || '📄';
  }

  formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  }

  async submitFileUpload(file) {
    try {
      const uploadModal = document.getElementById('upload-modal');
      const uploadSubmit = document.getElementById('upload-submit-btn');
      const uploadProgress = document.getElementById('upload-progress');
      const uploadText = uploadProgress?.querySelector('.progress-text');
      const progressBar = uploadProgress?.querySelector('.progress-fill');
      
      if (uploadSubmit) {
        uploadSubmit.disabled = true;
        uploadSubmit.innerHTML = 'Uploading...';
      }
      
      uploadModal.classList.add('hidden');
      uploadProgress.classList.remove('hidden');
      
      // Create FormData and upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.sendRequest('chat.upload', { file });
      
      if (response.success) {
        this.showToast('File uploaded successfully', 'success');
        this.renderUploadSuccess(response.data);
        if (response.data.message) {
          this.addAgentMessage(response.data.message);
        }
      } else {
        this.showToast('File upload failed', 'error');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      this.showToast('File upload failed', 'error');
    } finally {
      // Reset UI
      uploadModal.classList.remove('show');
      uploadProgress.classList.add('hidden');
      this.clearUploadProgress();
    }
  }

  renderUploadSuccess(result) {
    const preview = document.getElementById('upload-preview');
    if (preview) {
      preview.innerHTML = `
        <div class="success-icon">✅</div>
        <div class="success-message">
          <h4>Upload Complete!</h4>
          <p>${result.message}</p>
        </div>
      `;
    }
  }

  addAgentMessage(message) {
    const chatHistory = document.querySelector('.message-list');
    if (!chatHistory) return;

    const messageData = {
      id: this.generateMessageId(),
      type: 'agent',
      sender: 'Agent',
      content: message,
      timestamp: new Date().toISOString()
    };

    const messageElement = this.renderMessage(messageData);
    messageElement.classList.add('agent');
    
    chatHistory.appendChild(messageElement);
    this.scrollToBottom();
    this.emit('agent_message', messageData);
  }

  generateMessageId() {
    return ++this.messageIdCounter;
  }

  // UI Helper Functions
  scrollToBottom() {
    const messageList = document.querySelector('.message-list');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  clearChat() {
    const messageList = document.getElementById('message-list');
    if (messageList) {
      messageList.innerHTML = '';
      this.emit('chat_cleared');
    }
  }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chat = new ChatManager();
});
