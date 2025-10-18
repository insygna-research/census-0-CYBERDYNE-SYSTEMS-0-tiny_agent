import axios from 'axios';

export class LLMClient {
  constructor(config = {}) {
    this.config = {
      defaultProvider: config.defaultProvider || 'lmstudio',
      lmStudio: {
        baseUrl: config.lmStudio?.baseUrl || 'http://localhost:1234',
        model: config.lmStudio?.model || 'default',
        timeout: config.lmStudio?.timeout || 30000
      },
      openrouter: {
        apiKey: config.openrouter?.apiKey || process.env.OPENROUTER_API_KEY,
        baseUrl: config.openrouter?.baseUrl || 'https://openrouter.ai/api/v1',
        model: config.openrouter?.model || 'anthropic/claude-3.5-sonnet',
        timeout: config.openrouter?.timeout || 60000
      },
      fallback: config.fallback !== false,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    };

    this.currentProvider = this.config.defaultProvider;
    this.requestCache = new Map();
    this.rateLimits = new Map();
  }

  // Main generation method
  async generate(prompt, options = {}) {
    const generationOptions = {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 4000,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop,
      stream: options.stream || false,
      provider: options.provider || this.currentProvider,
      ...options
    };

    try {
      // Try primary provider first
      const result = await this._attemptGeneration(prompt, generationOptions);
      
      // Cache successful results
      this._cachePrompt(prompt, generationOptions, result);
      
      return result;
      
    } catch (error) {
      console.error(`Primary provider ${generationOptions.provider} failed:`, error.message);
      
      // Try fallback if enabled
      if (this.config.fallback) {
        const fallbackProvider = this._getFallbackProvider(generationOptions.provider);
        if (fallbackProvider) {
          console.log(`Falling back to provider: ${fallbackProvider}`);
          generationOptions.provider = fallbackProvider;
          
          try {
            return await this._attemptGeneration(prompt, generationOptions);
          } catch (fallbackError) {
            console.error('Fallback provider also failed:', fallbackError.message);
          }
        }
      }
      
      throw error;
    }
  }

  // Streamed generation for real-time responses
  async *generateStream(prompt, options = {}) {
    const streamOptions = { ...options, stream: true };
    
    try {
      const response = await this._attemptGeneration(prompt, streamOptions);
      
      if (response.stream) {
        for await (const chunk of response.content) {
          yield chunk;
        }
      } else {
        yield response;
      }
      
    } catch (error) {
      console.error('Stream generation failed:', error);
      throw error;
    }
  }

  // Check if provider is available
  async checkProviderStatus(provider = this.currentProvider) {
    try {
      switch (provider) {
        case 'lmstudio':
          return await this._checkLMStudio();
        case 'openrouter':
          return await this._checkOpenRouter();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Provider health check failed for ${provider}:`, error);
      return false;
    }
  }

  // Get available models from provider
  async getAvailableModels(provider = this.currentProvider) {
    try {
      switch (provider) {
        case 'lmstudio':
          const lmStudioModels = await this._getLMStudioModels();
          return lmStudioModels;
        case 'openrouter':
          const openRouterModels = await this._getOpenRouterModels();
          return openRouterModels;
        default:
          return [];
      }
    } catch (error) {
      console.error(`Failed to get models for provider ${provider}:`, error);
      return [];
    }
  }

  // Switch active provider
  setProvider(provider) {
    if (['lmstudio', 'openrouter'].includes(provider)) {
      this.currentProvider = provider;
      console.log(`Switched to provider: ${provider}`);
    } else {
      throw new Error(`Invalid provider: ${provider}`);
    }
  }

  // Clear cache
  clearCache() {
    this.requestCache.clear();
  }

  // Get usage statistics
  getStats() {
    return {
      currentProvider: this.currentProvider,
      cacheSize: this.requestCache.size,
      rateLimits: Object.fromEntries(this.rateLimits),
      providers: {
        lmstudio: this.config.lmStudio.baseUrl,
        openrouter: this.config.openrouter.model
      }
    };
  }

  // PRIVATE METHODS

  async _attemptGeneration(prompt, options, attempts = 0) {
    const maxRetries = options.maxRetries || this.config.maxRetries;
    
    try {
      switch (options.provider) {
        case 'lmstudio':
          return await this._generateWithLMStudio(prompt, options);
        case 'openrouter':
          return await this._generateWithOpenRouter(prompt, options);
        default:
          throw new Error(`Unknown provider: ${options.provider}`);
      }
      
    } catch (error) {
      if (attempts < maxRetries && this._shouldRetry(error)) {
        console.log(`Retry attempt ${attempts + 1} for ${options.provider}`);
        await this._delay(this.config.retryDelay * (attempts + 1));
        return this._attemptGeneration(prompt, options, attempts + 1);
      }
      throw error;
    }
  }

  async _generateWithLMStudio(prompt, options) {
    const url = `${this.config.lmStudio.baseUrl}/v1/chat/completions`;
    
    // Use the configured model or fall back to options
    const modelName = options.model || this.config.lmStudio.model || 'ibm/granite-4-h-micro';
    
    const response = await axios.post(url, {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      top_p: options.topP || 0.9,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0,
      stop: options.stop,
      stream: options.stream || false
    }, {
      timeout: this.config.lmStudio.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (options.stream) {
      return {
        provider: 'lmstudio',
        model: response.data.model,
        stream: true,
        content: this._parseStreamResponse(response.data)
      };
    }

    return {
      provider: 'lmstudio',
      model: response.data.model,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      finishReason: response.data.choices[0].finish_reason
    };
  }

  async _generateWithOpenRouter(prompt, options) {
    const url = `${this.config.openrouter.baseUrl}/chat/completions`;
    
    const response = await axios.post(url, {
      model: options.model || this.config.openrouter.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: options.stream
    }, {
      timeout: this.config.openrouter.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tiny-agent.local',
        'X-Title': 'Tiny Autonomous Research Agent'
      }
    });

    if (options.stream) {
      return {
        provider: 'openrouter',
        model: response.data.model,
        stream: true,
        content: this._parseStreamResponse(response.data)
      };
    }

    return {
      provider: 'openrouter',
      model: response.data.model,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      finishReason: response.data.choices[0].finish_reason
    };
  }

  async _checkLMStudio() {
    try {
      const response = await axios.get(
        `${this.config.lmStudio.baseUrl}/v1/models`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async _checkOpenRouter() {
    try {
      const response = await axios.get(
        `${this.config.openrouter.baseUrl}/models`,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.config.openrouter.apiKey}`
          }
        }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async _getLMStudioModels() {
    try {
      const response = await axios.get(
        `${this.config.lmStudio.baseUrl}/v1/models`
      );
      return response.data.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: 'lmstudio'
      }));
    } catch (error) {
      console.error('Failed to get LM Studio models:', error);
      return [];
    }
  }

  async _getOpenRouterModels() {
    try {
      const response = await axios.get(
        `${this.config.openrouter.baseUrl}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.openrouter.apiKey}`
          }
        }
      );
      return response.data.data.map(model => ({
        id: model.id,
        name: model.id,
        description: model.description,
        pricing: model.pricing,
        provider: 'openrouter'
      }));
    } catch (error) {
      console.error('Failed to get OpenRouter models:', error);
      return [];
    }
  }

  _getFallbackProvider(currentProvider) {
    const providers = ['lmstudio', 'openrouter'];
    const currentIndex = providers.indexOf(currentProvider);
    return providers[(currentIndex + 1) % providers.length];
  }

  _shouldRetry(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    if (error.response?.status >= 500) {
      return true;
    }
    if (error.response?.status === 429) {
      return true; // Rate limited
    }
    return false;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _parseStreamResponse(response) {
    // Parse streaming response chunks
    async function* parseChunks() {
      // This would implement actual streaming parsing
      yield response.choices[0].message.content;
    }
    return parseChunks();
  }

  _cachePrompt(prompt, options, result) {
    const cacheKey = this._generateCacheKey(prompt, options);
    this.requestCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      prompt,
      options
    });

    // Limit cache size
    if (this.requestCache.size > 1000) {
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }
  }

  _generateCacheKey(prompt, options) {
    const keyData = {
      prompt: prompt.substring(0, 200), // Limit prompt length for cache
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      // Exclude sensitive info like API keys
    };
    return btoa(JSON.stringify(keyData));
  }
}
