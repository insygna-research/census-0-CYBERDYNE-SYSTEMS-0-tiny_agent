import axios from 'axios';

/**
 * TavilyClient - Comprehensive Tavily Web Search API Client
 *
 * Provides access to all Tavily search capabilities including:
 * - Web search with advanced filtering
 * - News search
 * - Academic search
 * - Image search
 * - Video search
 * - Answer extraction
 * - Source crawling
 */
export class TavilyClient {
  constructor(apiKey, config = {}) {
    if (!apiKey) {
      throw new Error('Tavily API key is required');
    }

    this.apiKey = apiKey;
    this.baseURL = config.baseURL || 'https://api.tavily.com';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;

    // Initialize axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TinyAgent/1.0'
      }
    });

    // Add request interceptor for API key
    this.client.interceptors.request.use(
      (config) => {
        config.headers['Authorization'] = `Bearer ${this.apiKey}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (this.shouldRetry(error) && error.config.__retryCount < this.maxRetries) {
          error.config.__retryCount = (error.config.__retryCount || 0) + 1;
          await this.delay(this.retryDelay * error.config.__retryCount);
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Main web search endpoint
   */
  async search(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: options.searchDepth || 'basic', // 'basic' or 'advanced'
      include_answer: options.includeAnswer !== false,
      include_raw_content: options.includeRawContent || false,
      max_results: options.maxResults || 10,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || [],
      days: options.days, // Filter results by last N days
      include_images: options.includeImages || false,
      include_image_descriptions: options.includeImageDescriptions || false,
      include_image_raw_data: options.includeImageRawData || false,
      include_urls: options.includeUrls || true,
      include_html: options.includeHtml || false
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'search');
    } catch (error) {
      throw this.handleAPIError(error, 'search');
    }
  }

  /**
   * Quick search for fast results
   */
  async quickSearch(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: 'basic',
      include_answer: false,
      include_raw_content: false,
      max_results: options.maxResults || 5,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'quickSearch');
    } catch (error) {
      throw this.handleAPIError(error, 'quickSearch');
    }
  }

  /**
   * Advanced search with comprehensive results
   */
  async advancedSearch(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: 'advanced',
      include_answer: options.includeAnswer !== false,
      include_raw_content: options.includeRawContent === true,
      max_results: options.maxResults || 20,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || [],
      days: options.days,
      include_images: options.includeImages === true,
      include_image_descriptions: options.includeImageDescriptions === true,
      include_image_raw_data: options.includeImageRawData || false,
      include_urls: options.includeUrls || true,
      include_html: options.includeHtml || false
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'advancedSearch');
    } catch (error) {
      throw this.handleAPIError(error, 'advancedSearch');
    }
  }

  /**
   * News search - specialized for recent news articles
   */
  async newsSearch(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: options.searchDepth || 'basic',
      include_answer: options.includeAnswer !== false,
      include_raw_content: options.includeRawContent || false,
      max_results: options.maxResults || 10,
      days: options.days || 7, // Default to last 7 days for news
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'newsSearch');
    } catch (error) {
      throw this.handleAPIError(error, 'newsSearch');
    }
  }

  /**
   * Academic search - specialized for scholarly content
   */
  async academicSearch(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: 'advanced',
      include_answer: options.includeAnswer !== false,
      include_raw_content: options.includeRawContent === true,
      max_results: options.maxResults || 15,
      include_domains: options.includeDomains || [
        'scholar.google.com',
        'arxiv.org',
        'researchgate.net',
        'pubmed.ncbi.nlm.nih.gov',
        'acm.org',
        'ieeexplore.ieee.org'
      ],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'academicSearch');
    } catch (error) {
      throw this.handleAPIError(error, 'academicSearch');
    }
  }

  /**
   * Image search - specialized for image content
   */
  async imageSearch(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: options.searchDepth || 'basic',
      include_answer: false,
      include_raw_content: false,
      max_results: options.maxResults || 10,
      include_images: true,
      include_image_descriptions: options.includeImageDescriptions !== false,
      include_image_raw_data: options.includeImageRawData || false,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'imageSearch');
    } catch (error) {
      throw this.handleAPIError(error, 'imageSearch');
    }
  }

  /**
   * Video search - specialized for video content
   */
  async videoSearch(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: options.searchDepth || 'basic',
      include_answer: false,
      include_raw_content: false,
      max_results: options.maxResults || 10,
      include_domains: options.includeDomains || [
        'youtube.com',
        'vimeo.com',
        'dailymotion.com'
      ],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return this.formatSearchResponse(response.data, 'videoSearch');
    } catch (error) {
      throw this.handleAPIError(error, 'videoSearch');
    }
  }

  /**
   * Extract specific answer from web content
   */
  async extractAnswer(query, options = {}) {
    const payload = {
      api_key: this.apiKey,
      query: query,
      search_depth: options.searchDepth || 'advanced',
      include_answer: true,
      include_raw_content: false,
      max_results: options.maxResults || 5,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return {
        success: true,
        type: 'answer',
        query: query,
        answer: response.data.answer || null,
        sources: response.data.results || [],
        confidence: this.calculateAnswerConfidence(response.data),
        metadata: {
          searchTime: response.data.search_time || 0,
          responseTime: response.data.response_time || 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw this.handleAPIError(error, 'extractAnswer');
    }
  }

  /**
   * Crawl specific URLs for content
   */
  async crawlUrls(urls, options = {}) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    const payload = {
      api_key: this.apiKey,
      urls: urls,
      include_raw_content: options.includeRawContent === true,
      include_html: options.includeHtml || false,
      include_screenshot: options.includeScreenshot || false,
      max_results: options.maxResults || urls.length
    };

    try {
      const response = await this.client.post('/crawl', payload);
      return {
        success: true,
        type: 'crawl',
        urls: urls,
        results: response.data.results || [],
        metadata: {
          crawlTime: response.data.crawl_time || 0,
          responseTime: response.data.response_time || 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw this.handleAPIError(error, 'crawlUrls');
    }
  }

  /**
   * Multi-search - perform multiple searches in parallel
   */
  async multiSearch(searches, options = {}) {
    const promises = searches.map(({ query, type = 'search', ...searchOptions }) => {
      switch (type) {
        case 'quick':
          return this.quickSearch(query, { ...options, ...searchOptions });
        case 'advanced':
          return this.advancedSearch(query, { ...options, ...searchOptions });
        case 'news':
          return this.newsSearch(query, { ...options, ...searchOptions });
        case 'academic':
          return this.academicSearch(query, { ...options, ...searchOptions });
        case 'image':
          return this.imageSearch(query, { ...options, ...searchOptions });
        case 'video':
          return this.videoSearch(query, { ...options, ...searchOptions });
        case 'answer':
          return this.extractAnswer(query, { ...options, ...searchOptions });
        default:
          return this.search(query, { ...options, ...searchOptions });
      }
    });

    try {
      const results = await Promise.allSettled(promises);
      return {
        success: true,
        type: 'multiSearch',
        queries: searches.map(s => s.query),
        results: results.map((result, index) => ({
          query: searches[index].query,
          type: searches[index].type || 'search',
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        })),
        metadata: {
          totalSearches: searches.length,
          successful: results.filter(r => r.status === 'fulfilled').length,
          failed: results.filter(r => r.status === 'rejected').length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw this.handleAPIError(error, 'multiSearch');
    }
  }

  /**
   * Get search suggestions for a query
   */
  async getSuggestions(query, options = {}) {
    try {
      // Perform a quick search and extract query variations from results
      const quickResult = await this.quickSearch(query, { maxResults: 3 });

      const suggestions = [query];

      // Extract related terms from titles and snippets
      if (quickResult.results) {
        quickResult.results.forEach(result => {
          if (result.title && result.title !== query) {
            suggestions.push(result.title);
          }
          if (result.snippet) {
            // Extract key phrases from snippet
            const words = result.snippet.split(' ').filter(word => word.length > 3);
            if (words.length > 0) {
              suggestions.push(words.slice(0, 3).join(' '));
            }
          }
        });
      }

      return {
        success: true,
        type: 'suggestions',
        query: query,
        suggestions: [...new Set(suggestions)].slice(0, 8), // Remove duplicates and limit to 8
        metadata: {
          count: suggestions.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw this.handleAPIError(error, 'getSuggestions');
    }
  }

  /**
   * Search with location-based filtering
   */
  async locationSearch(query, location, options = {}) {
    const locationQuery = `${query} ${location}`;
    const payload = {
      api_key: this.apiKey,
      query: locationQuery,
      search_depth: options.searchDepth || 'basic',
      include_answer: options.includeAnswer !== false,
      include_raw_content: options.includeRawContent || false,
      max_results: options.maxResults || 10,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || []
    };

    try {
      const response = await this.client.post('/search', payload);
      return {
        ...this.formatSearchResponse(response.data, 'locationSearch'),
        location: location,
        originalQuery: query
      };
    } catch (error) {
      throw this.handleAPIError(error, 'locationSearch');
    }
  }

  /**
   * Format search responses consistently
   */
  formatSearchResponse(data, searchType) {
    return {
      success: true,
      type: searchType,
      query: data.query || 'unknown',
      answer: data.answer || null,
      results: data.results || [],
      images: data.images || [],
      metadata: {
        searchTime: data.search_time || 0,
        responseTime: data.response_time || 0,
        resultCount: (data.results || []).length,
        imageCount: (data.images || []).length,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate confidence score for extracted answers
   */
  calculateAnswerConfidence(data) {
    if (!data.answer) return 0;

    let confidence = 0.5; // Base confidence

    // Boost confidence based on source quality and quantity
    if (data.results && data.results.length > 0) {
      confidence += Math.min(data.results.length * 0.1, 0.3);
    }

    // Check if answer cites sources
    if (data.answer.includes('According to') || data.answer.includes('Source')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Handle API errors consistently
   */
  handleAPIError(error, operation) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          return new Error(`Authentication failed for ${operation}. Please check your API key.`);
        case 429:
          return new Error(`Rate limit exceeded for ${operation}. Please try again later.`);
        case 400:
          return new Error(`Bad request for ${operation}: ${data?.detail?.error || 'Invalid parameters'}`);
        case 500:
          return new Error(`Server error during ${operation}. Please try again later.`);
        default:
          return new Error(`API error during ${operation}: ${data?.detail?.error || 'Unknown error'}`);
      }
    } else if (error.request) {
      return new Error(`Network error during ${operation}. Please check your internet connection.`);
    } else {
      return new Error(`Unexpected error during ${operation}: ${error.message}`);
    }
  }

  /**
   * Determine if request should be retried
   */
  shouldRetry(error) {
    if (!error.response) return true; // Network errors

    const status = error.response.status;
    return status === 429 || status >= 500; // Rate limit or server errors
  }

  /**
   * Helper function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const result = await this.quickSearch('test', { maxResults: 1 });
      return {
        success: true,
        message: 'Tavily API connection successful',
        latency: result.metadata?.responseTime || 0
      };
    } catch (error) {
      return {
        success: false,
        message: `Tavily API connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get API usage information (if available)
   */
  async getUsage() {
    try {
      // Note: This would need to be implemented by Tavily API
      // For now, return a placeholder
      return {
        success: true,
        message: 'Usage information not yet available from Tavily API',
        note: 'Contact Tavily support for usage tracking'
      };
    } catch (error) {
      throw this.handleAPIError(error, 'getUsage');
    }
  }
}

export default TavilyClient;