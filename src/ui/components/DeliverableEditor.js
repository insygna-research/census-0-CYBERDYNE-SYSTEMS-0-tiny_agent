/**
 * Interactive Deliverable Editor - Professional Report Creation System
 * Provides real-time editing, live preview, collaboration features, and multi-format export
 */

class DeliverableEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      autoSave: true,
      autoSaveInterval: 30000,
      enableCollaboration: true,
      enableLivePreview: true,
      ...options
    };

    this.deliverable = null;
    this.editor = null;
    this.preview = null;
    this.toolbar = null;
    this.collaborators = new Map();
    this.editHistory = [];
    this.currentHistoryIndex = -1;
    this.isDirty = false;
    this.autoSaveTimer = null;

    this.init();
  }

  init() {
    this.createEditorInterface();
    this.setupEventListeners();
    this.initializeEditor();
    this.setupToolbar();
    this.startAutoSave();
  }

  createEditorInterface() {
    const editorHTML = `
      <div class="deliverable-editor">
        <!-- Editor Header -->
        <div class="editor-header">
          <div class="editor-title">
            <input type="text" id="deliverable-title" class="title-input" placeholder="Enter deliverable title...">
            <div class="editor-meta">
              <select id="deliverable-template" class="template-select">
                <option value="">Custom</option>
                <option value="executive-summary">Executive Summary</option>
                <option value="technical-report">Technical Report</option>
                <option value="research-analysis">Research Analysis</option>
                <option value="market-research">Market Research</option>
                <option value="academic-paper">Academic Paper</option>
              </select>
              <span class="word-count" id="word-count">0 words</span>
              <span class="save-status" id="save-status">Saved</span>
            </div>
          </div>
          <div class="editor-actions">
            <button class="btn btn-ghost" onclick="editor.togglePreview()" title="Toggle Preview">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="btn btn-ghost" onclick="editor.shareDeliverable()" title="Share">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="btn btn-primary" onclick="editor.exportDeliverable()" title="Export">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
              </svg>
              Export
            </button>
          </div>
        </div>

        <!-- Editor Toolbar -->
        <div class="editor-toolbar" id="editor-toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editor.formatText('bold')" title="Bold (Ctrl+B)">
              <strong>B</strong>
            </button>
            <button class="toolbar-btn" onclick="editor.formatText('italic')" title="Italic (Ctrl+I)">
              <em>I</em>
            </button>
            <button class="toolbar-btn" onclick="editor.formatText('underline')" title="Underline (Ctrl+U)">
              <u>U</u>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editor.insertHeading(1)" title="Heading 1">H1</button>
            <button class="toolbar-btn" onclick="editor.insertHeading(2)" title="Heading 2">H2</button>
            <button class="toolbar-btn" onclick="editor.insertHeading(3)" title="Heading 3">H3</button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editor.insertList('bullet')" title="Bullet List">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="toolbar-btn" onclick="editor.insertList('numbered')" title="Numbered List">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <line x1="10" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>
                <line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2"/>
                <path d="M4 6h1v4M4 10h1v4M4 14h1v4" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editor.insertLink()" title="Insert Link">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="toolbar-btn" onclick="editor.insertImage()" title="Insert Image">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="toolbar-btn" onclick="editor.insertTable()" title="Insert Table">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="21" x2="9" y2="9" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editor.insertCodeBlock()" title="Code Block">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <polyline points="16,18 22,12 16,6" stroke="currentColor" stroke-width="2"/>
                <polyline points="8,6 2,12 8,18" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="toolbar-btn" onclick="editor.insertQuote()" title="Quote">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M3 21c3 0 7-1 7-8V4c0-1-4-1-7-1" stroke="currentColor" stroke-width="2"/>
                <path d="M14 21c3 0 7-1 7-8V4c0-1-4-1-7-1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editor.enhanceWithAI()" title="AI Enhancement">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="2"/>
              </svg>
              AI
            </button>
            <button class="toolbar-btn" onclick="editor.addInteractiveElement()" title="Add Interactive Element">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Editor Content Area -->
        <div class="editor-content">
          <!-- Editor Panel -->
          <div class="editor-panel" id="editor-panel">
            <div class="editor-container">
              <div class="editor-wrapper">
                <textarea
                  id="deliverable-editor"
                  class="editor-textarea"
                  placeholder="Start writing your deliverable..."
                  spellcheck="true"
                ></textarea>
              </div>
            </div>

            <!-- Editor Footer -->
            <div class="editor-footer">
              <div class="editor-stats">
                <span class="stat">Lines: <span id="line-count">0</span></span>
                <span class="stat">Characters: <span id="char-count">0</span></span>
                <span class="stat">Reading time: <span id="reading-time">0 min</span></span>
              </div>
              <div class="editor-history">
                <button class="btn btn-ghost" onclick="editor.undo()" title="Undo (Ctrl+Z)" disabled>
                  <svg class="btn-icon" viewBox="0 0 24 24">
                    <path d="M3 7v6h6" stroke="currentColor" stroke-width="2"/>
                    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button class="btn btn-ghost" onclick="editor.redo()" title="Redo (Ctrl+Y)" disabled>
                  <svg class="btn-icon" viewBox="0 0 24 24">
                    <path d="M21 7v6h-6" stroke="currentColor" stroke-width="2"/>
                    <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Preview Panel -->
          <div class="preview-panel" id="preview-panel" style="display: none;">
            <div class="preview-header">
              <h3>Live Preview</h3>
              <div class="preview-controls">
                <select id="preview-theme" class="theme-select">
                  <option value="default">Default</option>
                  <option value="academic">Academic</option>
                  <option value="business">Business</option>
                  <option value="technical">Technical</option>
                </select>
                <button class="btn btn-ghost" onclick="editor.printPreview()" title="Print">
                  <svg class="btn-icon" viewBox="0 0 24 24">
                    <polyline points="6,9 6,2 18,2 18,9" stroke="currentColor" stroke-width="2"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="preview-content">
              <div id="preview-render" class="preview-render"></div>
            </div>
          </div>
        </div>

        <!-- Collaboration Panel -->
        <div class="collaboration-panel" id="collaboration-panel" style="display: none;">
          <div class="collaboration-header">
            <h3>Collaboration</h3>
            <button class="btn btn-primary" onclick="editor.inviteCollaborator()">
              Invite
            </button>
          </div>
          <div class="collaboration-content">
            <div class="active-collaborators" id="active-collaborators">
              <h4>Active Now</h4>
              <div class="collaborators-list">
                <!-- Active collaborators will be listed here -->
              </div>
            </div>
            <div class="collaboration-history">
              <h4>Recent Activity</h4>
              <div class="activity-list" id="activity-list">
                <!-- Activity timeline will be shown here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = editorHTML;
  }

  setupEventListeners() {
    // Editor input events
    const editor = document.getElementById('deliverable-editor');
    if (editor) {
      editor.addEventListener('input', () => this.handleEditorInput());
      editor.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
      editor.addEventListener('scroll', () => this.syncScroll());
    }

    // Title input
    const titleInput = document.getElementById('deliverable-title');
    if (titleInput) {
      titleInput.addEventListener('input', () => this.handleTitleChange());
    }

    // Template selection
    const templateSelect = document.getElementById('deliverable-template');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => this.applyTemplate(e.target.value));
    }

    // Window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  initializeEditor() {
    const editorElement = document.getElementById('deliverable-editor');
    if (editorElement) {
      this.editor = editorElement;

      // Set up CodeMirror or similar advanced editor
      this.setupAdvancedEditor();
    }
  }

  setupAdvancedEditor() {
    // For now, we'll use the textarea with enhancements
    // In a real implementation, you might integrate CodeMirror, TinyMCE, or similar
    this.enhanceTextarea();
  }

  enhanceTextarea() {
    if (!this.editor) return;

    // Add tab support
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + '  ' + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
        this.handleEditorInput();
      }
    });
  }

  setupToolbar() {
    // Initialize toolbar tooltips and functionality
    this.toolbar = document.getElementById('editor-toolbar');

    // Make toolbar draggable
    this.makeToolbarDraggable();
  }

  makeToolbarDraggable() {
    if (!this.toolbar) return;

    let isDragging = false;
    let startY = 0;
    let startTop = 0;

    const dragHandle = this.toolbar.querySelector('.editor-toolbar-drag-handle');
    const handle = dragHandle || this.toolbar;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startTop = this.toolbar.offsetTop;
      handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      e.preventDefault();
      const deltaY = e.clientY - startY;
      this.toolbar.style.position = 'absolute';
      this.toolbar.style.top = `${startTop + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      if (handle) {
        handle.style.cursor = 'grab';
      }
    });
  }

  handleEditorInput() {
    if (!this.editor) return;

    this.isDirty = true;
    this.updateWordCount();
    this.updateStats();
    this.updateSaveStatus('Editing...');
    this.addToHistory();

    if (this.options.enableLivePreview) {
      this.updatePreview();
    }

    if (this.options.autoSave) {
      this.scheduleAutoSave();
    }
  }

  handleKeyboardShortcuts(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          this.formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          this.formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          this.formatText('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 's':
          e.preventDefault();
          this.saveDeliverable();
          break;
      }
    }
  }

  updateWordCount() {
    if (!this.editor) return;

    const text = this.editor.value;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;

    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement) {
      wordCountElement.textContent = `${words} words`;
    }
  }

  updateStats() {
    if (!this.editor) return;

    const text = this.editor.value;
    const lines = text.split('\n').length;
    const chars = text.length;
    const readingTime = Math.ceil(words / 200); // 200 words per minute

    document.getElementById('line-count').textContent = lines;
    document.getElementById('char-count').textContent = chars;
    document.getElementById('reading-time').textContent = `${readingTime} min`;
  }

  updateSaveStatus(status) {
    const saveStatusElement = document.getElementById('save-status');
    if (saveStatusElement) {
      saveStatusElement.textContent = status;
      saveStatusElement.className = `save-status ${status.toLowerCase()}`;
    }
  }

  updatePreview() {
    const previewElement = document.getElementById('preview-render');
    if (!previewElement || !this.editor) return;

    const content = this.editor.value;
    const html = this.markdownToHTML(content);
    previewElement.innerHTML = html;
  }

  markdownToHTML(markdown) {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^\* (.+)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.+)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  formatText(format) {
    if (!this.editor) return;

    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const selectedText = this.editor.value.substring(start, end);
    let formattedText = selectedText;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
    }

    this.editor.value =
      this.editor.value.substring(0, start) +
      formattedText +
      this.editor.value.substring(end);

    this.editor.selectionStart = start;
    this.editor.selectionEnd = start + formattedText.length;
    this.editor.focus();

    this.handleEditorInput();
  }

  insertHeading(level) {
    if (!this.editor) return;

    const heading = '#'.repeat(level) + ' ';
    this.insertAtCursor(heading);
  }

  insertList(type) {
    if (!this.editor) return;

    const marker = type === 'bullet' ? '- ' : '1. ';
    this.insertAtCursor(marker);
  }

  insertLink() {
    const url = prompt('Enter URL:');
    const text = prompt('Enter link text:');

    if (url && text) {
      this.insertAtCursor(`[${text}](${url})`);
    }
  }

  insertImage() {
    const url = prompt('Enter image URL:');
    const alt = prompt('Enter alt text:');

    if (url) {
      this.insertAtCursor(`![${alt || ''}](${url})`);
    }
  }

  insertTable() {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');

    if (rows && cols) {
      let table = '\n';
      for (let i = 0; i < parseInt(rows); i++) {
        table += '|';
        for (let j = 0; j < parseInt(cols); j++) {
          table += ' Cell |';
        }
        table += '\n';
      }
      this.insertAtCursor(table);
    }
  }

  insertCodeBlock() {
    const language = prompt('Enter language (optional):', '');
    this.insertAtCursor(`\`\`\n${language || ''}\n\`\`\n`);
  }

  insertQuote() {
    this.insertAtCursor('> ');
  }

  insertAtCursor(text) {
    if (!this.editor) return;

    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;

    this.editor.value =
      this.editor.value.substring(0, start) +
      text +
      this.editor.value.substring(end);

    this.editor.selectionStart = this.editor.selectionEnd = start + text.length;
    this.editor.focus();

    this.handleEditorInput();
  }

  enhanceWithAI() {
    if (!this.editor) return;

    const selectedText = this.editor.value.substring(
      this.editor.selectionStart,
      this.editor.selectionEnd
    );

    if (!selectedText.trim()) {
      this.showNotification('Please select text to enhance', 'warning');
      return;
    }

    this.showNotification('AI enhancement in progress...', 'info');

    // Simulate AI enhancement
    setTimeout(() => {
      const enhanced = this.simulateAIEnhancement(selectedText);

      this.editor.value =
        this.editor.value.substring(0, this.editor.selectionStart) +
        enhanced +
        this.editor.value.substring(this.editor.selectionEnd);

      this.showNotification('Text enhanced with AI', 'success');
      this.handleEditorInput();
    }, 2000);
  }

  simulateAIEnhancement(text) {
    // Simple enhancement simulation
    const enhancements = [
      text.replace(/\b(good)\b/gi, 'excellent'),
      text.replace(/\b(bad)\b/gi, 'suboptimal'),
      text.replace(/\b(some)\b/gi, 'several notable'),
      text.replace(/\b(thing)\b/gi, 'element'),
    ];

    return enhancements[Math.floor(Math.random() * enhancements.length)];
  }

  addInteractiveElement() {
    // Show modal for selecting interactive element type
    this.showInteractiveElementModal();
  }

  showInteractiveElementModal() {
    // Implementation for interactive element selection modal
    this.showNotification('Interactive elements coming soon', 'info');
  }

  togglePreview() {
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    if (editorPanel && previewPanel) {
      const isPreviewVisible = previewPanel.style.display !== 'none';

      if (isPreviewVisible) {
        previewPanel.style.display = 'none';
        editorPanel.style.display = 'block';
      } else {
        previewPanel.style.display = 'block';
        editorPanel.style.display = 'none';
        this.updatePreview();
      }
    }
  }

  addToHistory() {
    if (!this.editor) return;

    const content = this.editor.value;

    // Remove any history after current index
    this.editHistory = this.editHistory.slice(0, this.currentHistoryIndex + 1);

    // Add new state
    this.editHistory.push({
      content,
      timestamp: Date.now(),
      cursor: this.editor.selectionStart
    });

    this.currentHistoryIndex++;

    // Limit history size
    if (this.editHistory.length > 100) {
      this.editHistory.shift();
      this.currentHistoryIndex--;
    }

    this.updateHistoryButtons();
  }

  updateHistoryButtons() {
    const undoBtn = document.querySelector('.editor-history button:first-child');
    const redoBtn = document.querySelector('.editor-history button:last-child');

    if (undoBtn) {
      undoBtn.disabled = this.currentHistoryIndex <= 0;
    }

    if (redoBtn) {
      redoBtn.disabled = this.currentHistoryIndex >= this.editHistory.length - 1;
    }
  }

  undo() {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      const state = this.editHistory[this.currentHistoryIndex];

      this.editor.value = state.content;
      this.editor.selectionStart = this.editor.selectionEnd = state.cursor;
      this.editor.focus();

      this.updateWordCount();
      this.updateStats();
      this.updateHistoryButtons();
    }
  }

  redo() {
    if (this.currentHistoryIndex < this.editHistory.length - 1) {
      this.currentHistoryIndex++;
      const state = this.editHistory[this.currentHistoryIndex];

      this.editor.value = state.content;
      this.editor.selectionStart = this.editor.selectionEnd = state.cursor;
      this.editor.focus();

      this.updateWordCount();
      this.updateStats();
      this.updateHistoryButtons();
    }
  }

  applyTemplate(templateName) {
    const templates = {
      'executive-summary': this.getExecutiveSummaryTemplate(),
      'technical-report': this.getTechnicalReportTemplate(),
      'research-analysis': this.getResearchAnalysisTemplate(),
      'market-research': this.getMarketResearchTemplate(),
      'academic-paper': this.getAcademicPaperTemplate()
    };

    const template = templates[templateName];
    if (template && this.editor) {
      this.editor.value = template;
      this.handleEditorInput();
    }
  }

  getExecutiveSummaryTemplate() {
    return `# Executive Summary

## Overview
[Brief overview of the document]

## Key Findings
- [Key finding 1]
- [Key finding 2]
- [Key finding 3]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Conclusion
[Concluding statement]`;
  }

  getTechnicalReportTemplate() {
    return `# Technical Report

## Abstract
[Brief abstract of the technical work]

## Introduction
[Introduction to the technical problem or solution]

## Methodology
[Description of the methods used]

## Results
[Technical results and data]

## Discussion
[Analysis of the results]

## Conclusion
[Technical conclusions]`;
  }

  getResearchAnalysisTemplate() {
    return `# Research Analysis

## Research Question
[Clear statement of the research question]

## Methodology
[Research methodology description]

## Findings
[Key research findings]

## Analysis
[In-depth analysis of findings]

## Implications
[Implications of the research]

## Limitations
[Research limitations]

## Future Work
[Suggestions for future research]`;
  }

  getMarketResearchTemplate() {
    return `# Market Research Report

## Executive Summary
[Executive summary of market research]

## Market Overview
[Overview of the market landscape]

## Target Market
[Description of target market]

## Competitive Analysis
[Analysis of key competitors]

## Market Trends
[Current market trends]

## Opportunities
[Market opportunities identified]

## Recommendations
[Strategic recommendations]

## Conclusion
[Market conclusions]`;
  }

  getAcademicPaperTemplate() {
    return `# Title

## Abstract
[Abstract of the paper]

## Introduction
[Introduction to the academic work]

## Literature Review
[Review of relevant literature]

## Methodology
[Research methodology]

## Results
[Research results]

## Discussion
[Discussion of results]

## Conclusion
[Conclusions]

## References
[Academic references]`;
  }

  // Auto-save functionality
  startAutoSave() {
    if (this.options.autoSave) {
      this.autoSaveTimer = setInterval(() => {
        if (this.isDirty) {
          this.saveDeliverable();
        }
      }, this.options.autoSaveInterval);
    }
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      if (this.isDirty) {
        this.saveDeliverable();
      }
    }, 2000); // Save 2 seconds after last change
  }

  async saveDeliverable() {
    if (!this.editor) return;

    try {
      const content = this.editor.value;
      const title = document.getElementById('deliverable-title').value || 'Untitled';

      // Save to server
      const response = await fetch('/api/deliverables/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          id: this.deliverable?.id
        })
      });

      const result = await response.json();

      if (result.success) {
        this.deliverable = result.deliverable;
        this.isDirty = false;
        this.updateSaveStatus('Saved');
        this.showNotification('Deliverable saved successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showError('Failed to save deliverable', error);
      this.updateSaveStatus('Save failed');
    }
  }

  exportDeliverable() {
    this.showExportModal();
  }

  showExportModal() {
    // Implementation for export modal
    this.showNotification('Export functionality coming soon', 'info');
  }

  shareDeliverable() {
    if (!this.deliverable) {
      this.showNotification('Please save the deliverable first', 'warning');
      return;
    }

    // Generate shareable link
    const shareUrl = `${window.location.origin}/deliverable/${this.deliverable.id}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showNotification('Share link copied to clipboard', 'success');
    }).catch(() => {
      this.showNotification('Failed to copy link', 'error');
    });
  }

  showNotification(message, type = 'info', duration = 3000) {
    // Use the main app's notification system if available
    if (window.app && window.app.showNotification) {
      window.app.showNotification(message, type, duration);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  showError(message, error) {
    console.error(message, error);
    this.showNotification(message, 'error');
  }

  handleResize() {
    // Handle responsive layout changes
    this.adjustLayout();
  }

  adjustLayout() {
    // Adjust editor and preview panels based on screen size
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Stack panels on mobile
      const editorPanel = document.getElementById('editor-panel');
      const previewPanel = document.getElementById('preview-panel');

      if (editorPanel && previewPanel) {
        if (previewPanel.style.display !== 'none') {
          editorPanel.style.display = 'none';
        }
      }
    }
  }

  syncScroll() {
    // Sync scroll between editor and preview if side-by-side
    // Implementation for scroll synchronization
  }

  // Public API methods
  loadDeliverable(deliverableId) {
    // Load existing deliverable
    fetch(`/api/deliverables/${deliverableId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.deliverable = data.deliverable;
          this.populateEditor(data.deliverable);
        }
      })
      .catch(error => {
        this.showError('Failed to load deliverable', error);
      });
  }

  populateEditor(deliverable) {
    const titleInput = document.getElementById('deliverable-title');
    const templateSelect = document.getElementById('deliverable-template');

    if (titleInput) {
      titleInput.value = deliverable.title;
    }

    if (templateSelect && deliverable.template) {
      templateSelect.value = deliverable.template;
    }

    if (this.editor) {
      this.editor.value = deliverable.content;
      this.handleEditorInput();
    }
  }

  newDeliverable() {
    this.deliverable = null;

    const titleInput = document.getElementById('deliverable-title');
    const templateSelect = document.getElementById('deliverable-template');

    if (titleInput) {
      titleInput.value = '';
      titleInput.focus();
    }

    if (templateSelect) {
      templateSelect.value = '';
    }

    if (this.editor) {
      this.editor.value = '';
      this.handleEditorInput();
    }
  }

  // Cleanup
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Remove event listeners
    // ... cleanup code
  }
}

// Export for global use
window.DeliverableEditor = DeliverableEditor;