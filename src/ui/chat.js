// Chat Application - Integrates ChatManager with AgentUI
class ChatApplication {
  constructor() {
    this.chatManager = null;
    this.eventHandlers = new Map();
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeChat());
    } else {
      this.initializeChat();
    }
  }

  initializeChat() {
    // Check if ChatManager was initialized
    if (!window.chat) {
      console.error('ChatManager not initialized');
      return;
    }

    this.chatManager = window.chat;
    this.setupEventListeners();
    this.setupChatEventHandlers();
    this.setupGlobalFunctions();
  }

  setupEventListeners() {
    // Form submission handler
    const form = document.getElementById('chat-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(e);
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.openSettingsModal();
      });
    }

    // Clear chat button
    const clearBtn = document.getElementById('clear-chat-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearChat();
      });
    }

    // File input change handler
    const fileUploadBtn = document.getElementById('file-upload-btn');
    const fileInput = document.getElementById('file-input');
    if (fileUploadBtn && fileInput) {
      fileUploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelect(Array.from(e.target.files));
        }
      });
    }

    // Message input interactions
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      // Handle Enter for send, Shift+Enter for new line
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (messageInput.value.trim()) {
            this.submitMessage();
          }
        }
      });

      // Auto-resize textarea
      messageInput.addEventListener('input', () => {
        this.autoResizeTextarea();
        this.updateSendButton();
      });

      messageInput.addEventListener('focus', () => {
        this.clearInputHint();
      });
    }

    // Settings provider select toggle
    const providerSelect = document.getElementById('llm-provider-select');
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        if (this.chatManager) {
          this.chatManager.settings.llmProvider = e.target.value;
          this.chatManager.toggleProviderSettings();
        }
      });
    }

    // Test connection button
    const testBtn = document.getElementById('test-connection-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testConnectionWithTimeout();
      });
    }
  }

  setupChatEventHandlers() {
    // Chat Manager Events
    if (this.chatManager) {
      this.chatManager.on('connected', () => {
        console.log('Connected to Tiny Autonomous Research Agent!');
        this.showToast('Connected! How can I help you research today?', 'success');
        this.updateConnectionStatus('connected');
      });

      this.chatManager.on('disconnected', () => {
        console.log('Disconnected from agent');
        this.showToast('Connection lost. Reconnecting...', 'warning');
        this.updateConnectionStatus('disconnected');
      });

      this.chatManager.on('max_retries_exceeded', () => {
        console.error('Maximum reconnection attempts failed');
        this.showToast('Could not connect to agent', 'error');
        this.showConnectionError();
      });

      this.chatManager.on('message_received', (message) => {
        console.log('Message received:', message);
      });

      this.chatManager.on('settings_saved', () => {
        this.closeSettingsModal();
      });

      this.chatManager.on('chat_cleared', () => {
        console.log('Chat history cleared');
        this.showToast('Chat history cleared', 'info');
      });

      this.chatManager.on('agent_message', (message) => {
        console.log("🤖 Agent:", message.content.substring(0, 100) + '...');
      });
    }
  }

  setupGlobalFunctions() {
    // Make functions globally available
    window.openSettingsModal = this.openSettingsModal.bind(this);
    window.closeSettingsModal = this.closeSettingsModal.bind(this);
    window.closeUploadModal = this.closeUploadModal.bind(this);
    window.saveSettings = this.saveSettings.bind(this);
    window.submitMessage = this.submitMessage.bind(this);
    window.showToast = this.showToast.bind(this);
  }

  // Form Submission
  async handleFormSubmit(e) {
    if (e) e.preventDefault();
    
    const input = document.getElementById('message-input');
    const message = input?.value?.trim();
    
    if (!message) {
      this.showToast('Please enter a message', 'warning');
      return;
    }

    // Disable input during send
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
    }

    try {
      // Clear input immediately for better UX
      const messageToSend = message;
      input.value = '';
      this.autoResizeTextarea();
      
      // Send message via WebSocket
      if (this.chatManager && this.chatManager.ws && this.chatManager.ws.readyState === WebSocket.OPEN) {
        this.chatManager.ws.send(JSON.stringify({
          type: 'chat.message',
          data: {
            content: messageToSend,
            sender: 'user',
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        this.showToast('Not connected to agent', 'error');
        // Restore message on error
        input.value = messageToSend;
      }

    } catch (error) {
      console.error('Form submission error:', error);
      this.showToast('Failed to send message', 'error');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
      }
    }
  }

  async submitMessage() {
    return await this.handleFormSubmit();
  }

  // Message Rendering - Single method for all messages
  displayMessage(messageData) {
    const messageList = document.getElementById('message-list');
    if (!messageList) return;

    const messageEl = document.createElement('div');
    const isUser = messageData.type === 'user';
    messageEl.className = `message-container ${messageData.type}`;
    
    const avatarEmoji = isUser ? '👤' : '🤖';
    const contentHtml = isUser ? this.escapeHtml(messageData.content) : this.parseMarkdown(messageData.content);
    const escapedContent = messageData.content.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-avatar">
          <div class="avatar avatar-${messageData.type}">${avatarEmoji}</div>
        </div>
        <div>
          <div class="message-header">
            <span class="message-sender">${messageData.sender || (isUser ? 'You' : 'Agent')}</span>
            <span class="message-time">${this.formatTime(new Date(messageData.timestamp))}</span>
          </div>
          <div class="message-body">${contentHtml}</div>
          ${!isUser ? `
            <div class="message-actions">
              <button class="btn btn-ghost copy-btn" onclick="navigator.clipboard.writeText('${escapedContent}'); window.chatApp.showToast('Copied!', 'success', 2000)">📋</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    messageList.appendChild(messageEl);
    this.scrollToBottom();
  }

  showTypingIndicator(show) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      if (show) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    }
  }

  // Modal Management
  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal && !modal.classList.contains('show')) {
      // Load current settings
      if (this.chatManager) {
        const settings = this.chatManager.settings;
        document.getElementById('llm-provider-select').value = settings.llmProvider;
        document.getElementById('lm-studio-url').value = settings.lmStudioUrl;
        document.getElementById('openrouter-api-key').value = settings.openRouterApiKey || '';
        document.getElementById('max-concurrent-tasks').value = settings.maxConcurrentTasks;
        document.getElementById('auto-cleanup').checked = settings.autoCleanup;
        
        this.chatManager.toggleProviderSettings();
      }
      
      modal.classList.add('show');
    }
  }

  closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  async saveSettings() {
    if (!this.chatManager) return;

    const settings = {
      llmProvider: document.getElementById('llm-provider-select').value,
      lmStudioUrl: document.getElementById('lm-studio-url').value,
      openRouterApiKey: document.getElementById('openrouter-api-key').value,
      maxConcurrentTasks: parseInt(document.getElementById('max-concurrent-tasks').value),
      autoCleanup: document.getElementById('auto-cleanup').checked
    };

    this.chatManager.settings = { ...this.chatManager.settings, ...settings };
    
    const success = await this.chatManager.saveSettings();
    if (success) {
      this.closeSettingsModal();
    }
  }

  testConnectionWithTimeout() {
    const statusInfo = document.getElementById('connection-status-info');
    const testBtn = document.getElementById('test-connection-btn');
    
    if (statusInfo && testBtn) {
      statusInfo.innerHTML = '<span>Testing connection...</span>';
      testBtn.disabled = true;
      
      setTimeout(async () => {
        try {
          if (this.chatManager) {
            const provider = this.chatManager.settings.llmProvider;
            const testResult = await this.chatManager.testConnection(provider);
            
            if (testResult.success) {
              statusInfo.innerHTML = '<span style="color: #10b981;">✅ Connection successful!</span>';
            } else {
              statusInfo.innerHTML = '<span style="color: #ef4444;">❌ Connection failed: ' + (testResult.error || 'Unknown error') + '</span>';
            }
          }
          testBtn.disabled = false;
        } catch (error) {
          statusInfo.innerHTML = '<span style="color: #ef4444;">⚠️ Connection test failed: ' + error.message + '</span>';
          testBtn.disabled = false;
        }
      }, 1000);
    }
  }

  // File Upload
  handleFileSelect(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    this.showToast(`File selected: ${file.name}`, 'info');
    
    // Show upload modal if it exists
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal && this.chatManager) {
      this.chatManager.initiateFileUpload(file);
    }
  }

  // UI Helpers
  clearChat() {
    const messageList = document.getElementById('message-list');
    if (messageList) {
      messageList.innerHTML = '';
      if (this.chatManager) {
        this.chatManager.emit('chat_cleared');
      }
    }
  }

  clearInputHint() {
    const helper = document.querySelector('.input-helper');
    if (helper) {
      helper.style.opacity = '0.6';
    }
  }

  autoResizeTextarea() {
    const input = document.getElementById('message-input');
    if (input) {
      input.style.height = 'auto';
      const scrollHeight = input.scrollHeight;
      const maxHeight = 120;
      
      if (scrollHeight < maxHeight) {
        input.style.height = scrollHeight + 'px';
      } else {
        input.style.height = maxHeight + 'px';
      }
    }
  }

  updateSendButton() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (input && sendBtn) {
      sendBtn.disabled = !input.value.trim();
    }
  }

  updateConnectionStatus(status) {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
      switch (status) {
        case 'connected':
          statusText.textContent = 'Connected';
          statusText.style.color = '#10b981';
          break;
        case 'connecting':
          statusText.textContent = 'Connecting...';
          statusText.style.color = '#f59e0b';
          break;
        case 'disconnected':
          statusText.textContent = 'Disconnected';
          statusText.style.color = '#ef4444';
          break;
        default:
          statusText.textContent = 'Unknown';
          statusText.style.color = '#6b7280';
      }
    }
  }

  showConnectionError() {
    const messageList = document.getElementById('message-list');
    if (messageList) {
      const errorEl = document.createElement('div');
      errorEl.className = 'message-container system';
      errorEl.innerHTML = `
        <div class="message-content system-content">
          <div class="message-header">
            <span class="type-badge error">Error</span>
          </div>
          <div class="message-body">
            Unable to connect to the agent. Please check that the server is running and try refreshing the page.
          </div>
        </div>
      `;
      messageList.appendChild(errorEl);
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    const messageList = document.getElementById('message-list');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  showToast(message, type = 'info', duration = 5000) {
    if (this.chatManager) {
      this.chatManager.showToast(message, type, duration);
    }
  }

  // Formatting Helpers
  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  parseMarkdown(text) {
    // Basic markdown parsing
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatApplication();
});
