import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { TavilyClient } from '../tavily/TavilyClient.js';

const execAsync = promisify(exec);

export class ToolSystem {
  constructor(config = {}) {
    this.config = {
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxWebContentLength: config.maxWebContentLength || 50000, // Reduced for token efficiency
      webSearchDelay: config.webSearchDelay || 1000,
      allowedDomains: config.allowedDomains || [],
      blockedDomains: config.blockedDomains || ['ads.', 'tracking.'],
      outputDirectory: config.outputDirectory || './agent_output',
      defaultResponseFormat: config.defaultResponseFormat || 'concise', // Token-efficient by default
      enableToolOptimization: config.enableToolOptimization !== false,
      tavilyApiKey: config.tavilyApiKey || process.env.TAVILY_API_KEY
    };

    // ANTHROPIC INSIGHT: Namespacing for clear tool boundaries
    this.namespacedTools = {
      file: {},
      web: {},
      tavily: {},
      analysis: {},
      system: {}
    };

    // Initialize Tavily client if API key is available
    if (this.config.tavilyApiKey) {
      this.tavilyClient = new TavilyClient(this.config.tavilyApiKey, {
        timeout: this.config.webSearchDelay * 30,
        maxRetries: 3
      });
    }

    this._initializeOptimizedTools();
  }

  // ANTHROPIC INSIGHT: Initialize with agent-optimized tool descriptions
  _initializeOptimizedTools() {
    // File Operations with clear boundaries
    this.addTool('file_read', {
      namespace: 'file',
      description: 'Read file contents efficiently. Always prefer this over file_list when you know the exact file path.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Absolute path to file' },
          responseFormat: { type: 'string', enum: ['concise', 'detailed'], description: 'Response verbosity (default: concise)' }
        },
        required: ['filePath']
      }
    });

    this.addTool('file_search', {
      namespace: 'file',
      description: 'Search for files and content. Use when you don\'t know exact file paths. Returns lightweight results.',
      parameters: {
        type: 'object',
        properties: {
          searchTerm: { type: 'string', description: 'Text to search for' },
          directory: { type: 'string', description: 'Directory to search (default: current)' },
          limit: { type: 'number', description: 'Max results to return' }
        },
        required: ['searchTerm']
      }
    });

    // Web Research with token-efficient responses
    this.addTool('web_search', {
      namespace: 'web',
      description: 'Search the web for information. Use broad, short queries first, then narrow down based on results.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query - keep short and broad initially' },
          maxResults: { type: 'number', description: 'Number of results (default: 10)' }
        },
        required: ['query']
      }
    });

    // Token-efficient content fetching
    this.addTool('web_fetch', {
      namespace: 'web',
      description: 'Fetch and extract key content from URLs. Automatically truncates for efficiency.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          extractSections: { type: 'array', description: 'Specific sections to extract (optional)' }
        },
        required: ['url']
      }
    });

    // TAVILY WEB SEARCH TOOLS
    if (this.tavilyClient) {
      // Main search tool
      this.addTool('search', {
        namespace: 'tavily',
        description: 'Advanced web search using Tavily API. Provides comprehensive results with answer extraction.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            searchDepth: { type: 'string', enum: ['basic', 'advanced'], description: 'Search depth (default: basic)' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)' },
            includeAnswer: { type: 'boolean', description: 'Include extracted answer (default: true)' },
            includeRawContent: { type: 'boolean', description: 'Include full page content (default: false)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' },
            days: { type: 'number', description: 'Filter results by last N days' }
          },
          required: ['query']
        }
      });

      // Quick search tool
      this.addTool('quick_search', {
        namespace: 'tavily',
        description: 'Fast web search with limited results for quick information gathering.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 5)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query']
        }
      });

      // Advanced search tool
      this.addTool('advanced_search', {
        namespace: 'tavily',
        description: 'Comprehensive web search with maximum detail and content extraction.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
            includeRawContent: { type: 'boolean', description: 'Include full page content (default: true)' },
            includeImages: { type: 'boolean', description: 'Include image results (default: true)' },
            includeImageDescriptions: { type: 'boolean', description: 'Include image descriptions (default: true)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' },
            days: { type: 'number', description: 'Filter results by last N days' }
          },
          required: ['query']
        }
      });

      // News search tool
      this.addTool('news_search', {
        namespace: 'tavily',
        description: 'Search for recent news articles and current events.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)' },
            days: { type: 'number', description: 'Filter by last N days (default: 7)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query']
        }
      });

      // Academic search tool
      this.addTool('academic_search', {
        namespace: 'tavily',
        description: 'Search for scholarly articles, research papers, and academic content.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 15)' },
            includeRawContent: { type: 'boolean', description: 'Include full paper content (default: true)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query']
        }
      });

      // Image search tool
      this.addTool('image_search', {
        namespace: 'tavily',
        description: 'Search for images with descriptions and metadata.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)' },
            includeImageDescriptions: { type: 'boolean', description: 'Include image descriptions (default: true)' },
            includeImageRawData: { type: 'boolean', description: 'Include raw image data (default: false)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query']
        }
      });

      // Video search tool
      this.addTool('video_search', {
        namespace: 'tavily',
        description: 'Search for videos from platforms like YouTube, Vimeo, etc.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query']
        }
      });

      // Answer extraction tool
      this.addTool('extract_answer', {
        namespace: 'tavily',
        description: 'Extract specific answers to questions from web content.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Question or query to answer' },
            maxResults: { type: 'number', description: 'Maximum sources to consider (default: 5)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query']
        }
      });

      // URL crawling tool
      this.addTool('crawl_urls', {
        namespace: 'tavily',
        description: 'Crawl specific URLs to extract their content.',
        parameters: {
          type: 'object',
          properties: {
            urls: { type: 'array', items: { type: 'string' }, description: 'URLs to crawl' },
            includeRawContent: { type: 'boolean', description: 'Include full page content (default: false)' },
            includeHtml: { type: 'boolean', description: 'Include raw HTML (default: false)' },
            includeScreenshot: { type: 'boolean', description: 'Include page screenshots (default: false)' }
          },
          required: ['urls']
        }
      });

      // Multi-search tool
      this.addTool('multi_search', {
        namespace: 'tavily',
        description: 'Perform multiple searches in parallel for different queries or search types.',
        parameters: {
          type: 'object',
          properties: {
            searches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' },
                  type: { type: 'string', enum: ['search', 'quick', 'advanced', 'news', 'academic', 'image', 'video', 'answer'], description: 'Search type' }
                },
                required: ['query']
              },
              description: 'Array of search objects with query and type'
            },
            maxResults: { type: 'number', description: 'Default maximum results per search' }
          },
          required: ['searches']
        }
      });

      // Search suggestions tool
      this.addTool('get_suggestions', {
        namespace: 'tavily',
        description: 'Get search suggestions and related queries for a given term.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Base query to get suggestions for' }
          },
          required: ['query']
        }
      });

      // Location-based search tool
      this.addTool('location_search', {
        namespace: 'tavily',
        description: 'Search for location-specific information and results.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            location: { type: 'string', description: 'Location to include in search' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)' },
            includeDomains: { type: 'array', items: { type: 'string' }, description: 'Include specific domains' },
            excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Exclude specific domains' }
          },
          required: ['query', 'location']
        }
      });
    }
  }

  // ANTHROPIC INSIGHT: Tool registration with namespace management
  addTool(name, definition) {
    if (!definition.namespace || !this.namespacedTools[definition.namespace]) {
      throw new Error(`Invalid namespace or missing namespace in definition`);
    }
    
    // ANTHROPIC INSIGHT: Optimize tool names for agent understanding
    const toolName = `${definition.namespace}_${name}`;
    this.namespacedTools[definition.namespace][name] = definition;
    
    return toolName;
  }

  // ANTHROPIC INSIGHT: Token-efficient response formats
  async _formatToolResponse(toolName, data, format = 'concise') {
    switch (format) {
      case 'concise':
        return this._formatConciseResponse(toolName, data);
      case 'detailed':
        return this._formatDetailedResponse(toolName, data);
      default:
        return this._formatConciseResponse(toolName, data);
    }
  }

  _formatConciseResponse(toolName, data) {
    // Return only the most relevant information, avoiding technical IDs
    const formatted = {
      tool: toolName,
      success: data.success || false,
      ...(data.success ? {
        result: this._extractConciseResult(data)
      } : {
        error: data.error || 'Unknown error'
      })
    };

    // Include helpful context only for successful operations
    if (data.success && data.metadata) {
      formatted.context = {
        timestamp: data.metadata.timestamp || new Date().toISOString()
      };
    }

    return formatted;
  }

  _formatDetailedResponse(toolName, data) {
    // Include technical details for subsequent tool calls
    return {
      tool: toolName,
      success: data.success || false,
      metadata: data.metadata || {},
      ...(data.success ? {
        result: data.content || data.results || data.success
      } : {
        error: data.error || 'Unknown error'
      })
    };
  }

  _extractConciseResult(data) {
    if (data.metadata?.size && data.content) {
      // For file operations, return content with size info
      const truncated = data.content.length > 2000 
        ? data.content.substring(0, 2000) + '... (truncated)'
        : data.content;
      
      return {
        content: truncated,
        size: `${Math.round(data.metadata.size / 1024)}KB`,
        type: data.metadata.type || 'text'
      };
    }

    // For other operations, return the most relevant field
    return data.content || data.results || data.success || null;
  }

  // ANTHROPIC INSIGHT: Error messages that guide agent behavior
  _createGuidedError(error, toolName, suggestions = []) {
    const guidedError = {
      error: error.message || 'Tool operation failed',
      tool: toolName,
      suggestions: suggestions.length > 0 ? suggestions : this._getDefaultSuggestions(toolName),
      troubleshooting: 'Check inputs and try alternative parameters'
    };

    return guidedError;
  }

  _getDefaultSuggestions(toolName) {
    const suggestions = {
      file: ['Check file path exists and is accessible', 'Verify file format is supported'],
      web: ['Check URL is accessible', 'Try with broader search terms', 'Verify internet connectivity'],
      analysis: ['Check input data format', 'Try with simpler queries first'],
      system: ['Verify permissions', 'Check system status']
    };

    const namespace = toolName.split('_')[0];
    return suggestions[namespace] || ['Verify inputs and parameters'];
  }

  // FILE OPERATIONS TOOLS

  // ANTHROPIC INSIGHT: Enhanced file operations with token efficiency
  async readFile(filePath, options = {}) {
    try {
      const stats = await stat(filePath);
      
      if (stats.size > this.config.maxFileSize) {
        const error = new Error(`File size ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds limit`);
        return this._createGuidedError(error, 'file_read', [
          'Try with a smaller file',
          'Use file_search to find specific sections'
        ]);
      }

      const content = await readFile(filePath, 'utf8');
      const extension = extname(filePath);
      
      // Token-efficient response format
      const responseFormat = options.responseFormat || this.config.defaultResponseFormat;
      const response = this._formatToolResponse('file_read', {
        success: true,
        content,
        metadata: {
          size: stats.size,
          modified: stats.mtime,
          path: filePath,
          extension,
          type: this._getFileType(extension)
        }
      }, responseFormat);
      
      return response;
    } catch (error) {
      return this._createGuidedError(error, 'file_read');
    }
  }

  _getFileType(ext) {
    const types = {
      '.js': 'javascript', '.ts': 'typescript', '.py': 'python',
      '.md': 'markdown', '.json': 'json', '.xml': 'xml',
      '.txt': 'text', '.csv': 'csv'
    };
    return types[ext] || 'text';
  }

  async writeFile(filePath, content, options = {}) {
    try {
      // Create directory if it doesn't exist
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });

      await writeFile(filePath, content, 'utf8');
      const stats = await stat(filePath);

      return {
        success: true,
        metadata: {
          size: stats.size,
          created: stats.mtime,
          path: filePath
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async editFile(filePath, operations, options = {}) {
    try {
      const readResult = await this.readFile(filePath);
      if (!readResult.success) {
        return readResult;
      }

      let content = readResult.content;
      let modified = false;

      // Apply operations
      for (const op of operations) {
        switch (op.type) {
          case 'replace':
            const oldStr = op.oldText;
            const newStr = op.newText;
            if (content.includes(oldStr)) {
              content = content.replace(oldStr, newStr);
              modified = true;
            }
            break;
            
          case 'insert':
            const insertText = op.text;
            const position = op.position || 'end';
            if (position === 'start') {
              content = insertText + content;
            } else if (position === 'end') {
              content = content + insertText;
            } else if (typeof position === 'number') {
              content = content.slice(0, position) + insertText + content.slice(position);
            }
            modified = true;
            break;
            
          case 'delete':
            const deleteText = op.text;
            content = content.replace(deleteText, '');
            modified = true;
            break;
        }
      }

      if (modified) {
        await writeFile(filePath, content, 'utf8');
        return {
          success: true,
          operations: operations.length,
          content,
          message: `Applied ${operations.length} operations successfully`
        };
      } else {
        return {
          success: true,
          operations: 0,
          content,
          message: 'No operations were applied'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async listDirectory(dirPath, options = {}) {
    try {
      const items = await readdir(dirPath);
      const recursive = options.recursive || false;
      const includeHidden = options.includeHidden || false;
      const pattern = options.pattern;

      const results = [];

      if (recursive) {
        for (const item of items) {
          const itemPath = join(dirPath, item);
          const stats = await stat(itemPath);
          
          if (stats.isDirectory()) {
            const subdirResults = await this.listDirectory(itemPath, options);
            results.push(...subdirResults);
          } else {
            if (!item.startsWith('.') || includeHidden) {
              if (!pattern || item.includes(pattern)) {
                results.push({
                  name: item,
                  path: itemPath,
                  type: 'file',
                  size: stats.size,
                  modified: stats.mtime
                });
              }
            }
          }
        }
      } else {
        for (const item of items) {
          const itemPath = join(dirPath, item);
          const stats = await stat(itemPath);
          
          if (!item.startsWith('.') || includeHidden) {
            if (!pattern || item.includes(pattern)) {
              results.push({
                name: item,
                path: itemPath,
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.isFile() ? stats.size : null,
                modified: stats.mtime
              });
            }
          }
        }
      }

      return {
        success: true,
        results,
        path: dirPath,
        count: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // WEB RESEARCH TOOLS

  async webSearch(query, options = {}) {
    try {
      // Add small delay to avoid hitting rate limits
      await this._delay(this.config.webSearchDelay);

      const searchUrl = this._buildSearchUrl(query, options);
      
      const response = await axios.get(searchUrl, {
        timeout: options.timeout || 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TinyResearchAgent/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      return await this._parseSearchResults(response.data, options);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.response?.status
      };
    }
  }

  async fetchUrl(url, options = {}) {
    try {
      if (!this._isUrlAllowed(url)) {
        return {
          success: false,
          error: 'URL not allowed by domain restrictions'
        };
      }

      const response = await axios.get(url, {
        timeout: options.timeout || 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TinyResearchAgent/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract main content
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      
      // Remove script and style tags
      $('script, style, nav, header, footer, aside').remove();
      
      // Extract main content text
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      
      // Limit content length
      const content = bodyText.length > this.config.maxWebContentLength
        ? bodyText.substring(0, this.config.maxWebContentLength) + '...'
        : bodyText;

      return {
        success: true,
        url,
        title,
        description,
        content,
        metadata: {
          statusCode: response.status,
          contentType: response.headers['content-type'],
          contentLength: content.length,
          fetchTime: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.response?.status,
        url
      };
    }
  }

  // ANALYSIS AND PROCESSING TOOLS

  async analyzeText(text, options = {}) {
    const analysis = {
      stats: {
        charCount: text.length,
        wordCount: text.split(/\s+/).length,
        sentenceCount: text.split(/[.!?]+/).length,
        paragraphCount: text.split(/\n\n+/).length
      },
      patterns: {},
      summary: ''
    };

    // Extract key patterns
    if (options.extractUrls) {
      analysis.patterns.urls = text.match(/https?:\/\/[^\s]+/g) || [];
    }

    if (options.extractEmails) {
      analysis.patterns.emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    }

    if (options.extractNumbers) {
      analysis.patterns.numbers = text.match(/\b\d+\.?\d*\b/g) || [];
    }

    // Generate basic summary (first few sentences)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    analysis.summary = sentences.slice(0, 3).join('. ') + '.';

    return {
      success: true,
      analysis
    };
  }

  async fileSearch(searchTerm, directory, options = {}) {
    try {
      const filePattern = options.filePattern || '*';
      const caseSensitive = options.caseSensitive || false;
      const includeContent = options.includeContent || false;

      const searchCommand = caseSensitive 
        ? `rg "${searchTerm}" "${directory}" --type-add 'custom:*' -t custom ${includeContent ? '-A 2 -B 2' : ''}`
        : `rg -i "${searchTerm}" "${directory}" --type-add 'custom:*' -t custom ${includeContent ? '-A 2 -B 2' : ''}`;

      const { stdout, stderr } = await execAsync(searchCommand);
      
      if (stderr && !stderr.includes('No matches found')) {
        throw new Error(`Search command failed: ${stderr}`);
      }

      const lines = stdout.split('\n').filter(line => line.trim());
      const results = [];

      // Parse ripgrep output
      for (const line of lines) {
        const match = line.match(/^([^:]+):(\d+):?(.*)?$/);
        if (match) {
          const [, filePath, lineNumber, content] = match;
          results.push({
            file: filePath,
            line: parseInt(lineNumber),
            content: content || '',
            match: searchTerm
          });
        } else if (line && !line.includes('Binary file')) {
          // Add file name only for file matches
          results.push({
            file: line,
            match: searchTerm
          });
        }
      }

      return {
        success: true,
        results,
        count: results.length,
        searchTerm: searchTerm,
        directory: directory
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        searchTerm: searchTerm,
        directory: directory
      };
    }
  }

  // UTILITY METHODS

  // ANTHROPIC INSIGHT: Get tools organized by namespace with purpose descriptions
  getToolList() {
    const organized = {
      file: {
        tools: Object.keys(this.namespacedTools.file),
        description: 'File operations for reading, writing, and searching files efficiently'
      },
      web: {
        tools: Object.keys(this.namespacedTools.web),
        description: 'Web research tools for searching and fetching online content'
      },
      tavily: {
        tools: Object.keys(this.namespacedTools.tavily),
        description: 'Tavily AI-powered web search tools with advanced filtering and content extraction',
        available: !!this.tavilyClient
      },
      analysis: {
        tools: Object.keys(this.namespacedTools.analysis),
        description: 'Analysis tools for processing and extracting insights from data'
      },
      system: {
        tools: Object.keys(this.namespacedTools.system),
        description: 'System tools for agent coordination and state management'
      }
    };

    return organized;
  }

  // ANTHROPIC INSIGHT: Get detailed tool descriptions for agent understanding
  getToolDefinitions() {
    const allTools = [];
    
    for (const [namespace, tools] of Object.entries(this.namespacedTools)) {
      for (const [name, definition] of Object.entries(tools)) {
        allTools.push({
          name: `${namespace}_${name}`,
          namespace,
          description: definition.description,
          parameters: definition.parameters,
          heuristics: this._getToolHeuristics(namespace, name)
        });
      }
    }
    
    return allTools;
  }

  _getToolHeuristics(namespace, toolName) {
    const heuristics = {
      file: {
        file_read: 'Prefer when you know exact file path. Use concise format for quick reads, detailed for subsequent operations.',
        file_search: 'Use when file path unknown or searching content. Returns lightweight results for navigation.',
        file_write: 'Always verify directory exists. Use for creating reports, code, or configuration files.',
        file_edit: 'Use for targeted changes. Specify exact text to replace for precision.'
      },
      web: {
        web_search: 'Start with broad, short queries. Narrow down based on results before fetching specific content.',
        web_fetch: 'Use after web_search identifies relevant URLs. Automatically limits content length for efficiency.'
      },
      tavily: {
        search: 'Use for comprehensive web searches with answer extraction. Good for research and fact-checking.',
        quick_search: 'Use for fast information gathering when you need quick results with minimal detail.',
        advanced_search: 'Use when you need maximum detail, including images and full content extraction.',
        news_search: 'Use for recent news and current events. Automatically filters for recent content.',
        academic_search: 'Use for scholarly articles and research papers. Targets academic domains.',
        image_search: 'Use when you need visual content or images with descriptions.',
        video_search: 'Use for video content from platforms like YouTube and Vimeo.',
        extract_answer: 'Use when you need specific answers to questions from web content.',
        crawl_urls: 'Use when you need to extract content from specific known URLs.',
        multi_search: 'Use for complex research requiring multiple search types simultaneously.',
        get_suggestions: 'Use to find related search terms and expand your research scope.',
        location_search: 'Use when location-specific information is required.'
      },
      analysis: {
        analyze_text: 'Use for extracting patterns, statistics, and key information from text content.',
        file_search: 'Combines file search with content analysis. Use when searching for specific terms across files.'
      },
      system: {
        system_status: 'Check system health and capabilities before starting complex operations.',
        system_optimize: 'Use when performance issues detected or context window approaching limits.'
      }
    };

    return heuristics[namespace]?.[toolName] || 'Use as described in tool definition.';
  }

  getToolDescription(toolName) {
    const descriptions = {
      readFile: 'Read file contents with metadata',
      writeFile: 'Write content to file with directory creation',
      editFile: 'Apply multiple editing operations to a file',
      listDirectory: 'List files and directories with filtering options',
      webSearch: 'Search the web with customizable parameters',
      fetchUrl: 'Fetch and extract content from web pages',
      analyzeText: 'Analyze text for patterns, statistics, and summaries',
      fileSearch: 'Search files and directories for text patterns',
      // Tavily tools
      tavilySearch: 'Advanced web search using Tavily AI with answer extraction',
      tavilyQuickSearch: 'Fast web search for quick information gathering',
      tavilyAdvancedSearch: 'Comprehensive search with maximum detail and content',
      tavilyNewsSearch: 'Search for recent news articles and current events',
      tavilyAcademicSearch: 'Search for scholarly articles and research papers',
      tavilyImageSearch: 'Search for images with descriptions and metadata',
      tavilyVideoSearch: 'Search for videos from major platforms',
      tavilyExtractAnswer: 'Extract specific answers to questions from web content',
      tavilyCrawlUrls: 'Crawl specific URLs to extract their content',
      tavilyMultiSearch: 'Perform multiple searches in parallel',
      tavilyGetSuggestions: 'Get search suggestions and related queries',
      tavilyLocationSearch: 'Search for location-specific information'
    };
    return descriptions[toolName] || 'Unknown tool';
  }

  // PRIVATE METHODS

  _isUrlAllowed(url) {
    const hostname = new URL(url).hostname;
    
    // Check blocked domains
    for (const blocked of this.config.blockedDomains) {
      if (hostname.includes(blocked)) {
        return false;
      }
    }

    // Check allowed domains (if specified)
    if (this.config.allowedDomains.length > 0) {
      for (const allowed of this.config.allowedDomains) {
        if (hostname.includes(allowed)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  _buildSearchUrl(query, options = {}) {
    // Use DuckDuckGo for search (no API key required)
    const searchParams = new URLSearchParams({
      q: query,
      kl: options.language || 'en-us',
      num: options.maxResults || 10
    });

    return `https://duckduckgo.com/html/?${searchParams}`;
  }

  async _parseSearchResults(html, options = {}) {
    const $ = cheerio.load(html);
    const results = [];
    const maxResults = options.maxResults || 10;

    $('.result').each((index, element) => {
      if (index >= maxResults) return false;

      const $result = $(element);
      const title = $result.find('.result__title a').text().trim();
      const url = $result.find('.result__title a').attr('href');
      const snippet = $result.find('.result__snippet').text().trim();

      if (title && url) {
        results.push({
          title,
          url: this._cleanUrl(url),
          snippet,
          index: index + 1
        });
      }
    });

    return {
      success: true,
      results,
      count: results.length,
      query: options.query || 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  _cleanUrl(url) {
    // Remove DuckDuckGo redirect wrapper
    const match = url.match(/uddg=(.+)$/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return url;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // TAVILY SEARCH IMPLEMENTATIONS

  async tavilySearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.search(query, options);
      return this._formatToolResponse('tavily_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_search', [
        'Check your Tavily API key is valid',
        'Verify the search query is properly formatted',
        'Try with a simpler search query'
      ]);
    }
  }

  async tavilyQuickSearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.quickSearch(query, options);
      return this._formatToolResponse('tavily_quick_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_quick_search', [
        'Check your Tavily API key is valid',
        'Verify the search query is properly formatted'
      ]);
    }
  }

  async tavilyAdvancedSearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.advancedSearch(query, options);
      return this._formatToolResponse('tavily_advanced_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_advanced_search', [
        'Check your Tavily API key is valid',
        'Consider reducing maxResults or includeRawContent options',
        'Verify search query is not too complex'
      ]);
    }
  }

  async tavilyNewsSearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.newsSearch(query, options);
      return this._formatToolResponse('tavily_news_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_news_search', [
        'Check your Tavily API key is valid',
        'Try with broader news-related terms',
        'Check if the topic has recent news coverage'
      ]);
    }
  }

  async tavilyAcademicSearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.academicSearch(query, options);
      return this._formatToolResponse('tavily_academic_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_academic_search', [
        'Check your Tavily API key is valid',
        'Use academic or technical terminology',
        'Try searching for specific research topics or papers'
      ]);
    }
  }

  async tavilyImageSearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.imageSearch(query, options);
      return this._formatToolResponse('tavily_image_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_image_search', [
        'Check your Tavily API key is valid',
        'Use descriptive image-related keywords',
        'Try more visual or descriptive search terms'
      ]);
    }
  }

  async tavilyVideoSearch(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.videoSearch(query, options);
      return this._formatToolResponse('tavily_video_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_video_search', [
        'Check your Tavily API key is valid',
        'Use video or tutorial-related keywords',
        'Try searching for specific video topics'
      ]);
    }
  }

  async tavilyExtractAnswer(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.extractAnswer(query, options);
      return this._formatToolResponse('tavily_extract_answer', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_extract_answer', [
        'Check your Tavily API key is valid',
        'Phrase your query as a clear question',
        'Try simpler or more specific questions'
      ]);
    }
  }

  async tavilyCrawlUrls(urls, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.crawlUrls(urls, options);
      return this._formatToolResponse('tavily_crawl_urls', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_crawl_urls', [
        'Check your Tavily API key is valid',
        'Verify all URLs are accessible and properly formatted',
        'Try with fewer URLs or simpler content extraction options'
      ]);
    }
  }

  async tavilyMultiSearch(searches, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.multiSearch(searches, options);
      return this._formatToolResponse('tavily_multi_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_multi_search', [
        'Check your Tavily API key is valid',
        'Verify all search queries are properly formatted',
        'Try with fewer simultaneous searches'
      ]);
    }
  }

  async tavilyGetSuggestions(query, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.getSuggestions(query, options);
      return this._formatToolResponse('tavily_get_suggestions', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_get_suggestions', [
        'Check your Tavily API key is valid',
        'Try with simpler base queries'
      ]);
    }
  }

  async tavilyLocationSearch(query, location, options = {}) {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.locationSearch(query, location, options);
      return this._formatToolResponse('tavily_location_search', result, options.responseFormat);
    } catch (error) {
      return this._createGuidedError(error, 'tavily_location_search', [
        'Check your Tavily API key is valid',
        'Verify the location is specified correctly',
        'Try with more general location terms'
      ]);
    }
  }

  // Test Tavily connection
  async testTavilyConnection() {
    if (!this.tavilyClient) {
      return {
        success: false,
        error: 'Tavily client not initialized. Please provide a valid API key.',
        code: 'TAVILY_NOT_INITIALIZED'
      };
    }

    try {
      const result = await this.tavilyClient.testConnection();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'TAVILY_CONNECTION_FAILED'
      };
    }
  }
}
