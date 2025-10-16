import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import * as cheerio from 'cheerio';

const execAsync = promisify(exec);

export class ToolSystem {
  constructor(config = {}) {
    this.config = {
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxWebContentLength: config.maxWebContentLength || 100000,
      webSearchDelay: config.webSearchDelay || 1000,
      allowedDomains: config.allowedDomains || [],
      blockedDomains: config.blockedDomains || ['ads.', 'tracking.'],
      outputDirectory: config.outputDirectory || './agent_output'
    };
  }

  // FILE OPERATIONS TOOLS

  async readFile(filePath, options = {}) {
    try {
      const stats = await stat(filePath);
      
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds limit`);
      }

      const content = await readFile(filePath, 'utf8');
      const extension = extname(filePath);
      
      return {
        success: true,
        content,
        metadata: {
          size: stats.size,
          modified: stats.mtime,
          path: filePath,
          extension,
          encoding: 'utf8'
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

  getToolList() {
    return {
      file: ['readFile', 'writeFile', 'editFile', 'listDirectory'],
      web: ['webSearch', 'fetchUrl'],
      analysis: ['analyzeText', 'fileSearch']
    };
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
      fileSearch: 'Search files and directories for text patterns'
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
}
