import { v4 as uuidv4 } from 'uuid';

/**
 * Advanced Error Recovery and Adaptation System
 *
 * Provides intelligent error classification, recovery strategies,
 * adaptive tool selection, and self-healing capabilities.
 */
export class ErrorRecoverySystem {
  constructor(memorySystem, llmClient, toolSystem) {
    this.memory = memorySystem;
    this.llm = llmClient;
    this.tools = toolSystem;
    this.errorHistory = new Map();
    this.recoveryStrategies = new Map();
    this.adaptationRules = new Map();
    this.performanceMetrics = new Map();

    this._initializeRecoveryStrategies();
    this._initializeAdaptationRules();
  }

  /**
   * Main error handling interface
   */
  async handleError(error, context = {}) {
    const errorId = uuidv4();

    try {
      // Classify error
      const classification = await this._classifyError(error, context);

      // Generate recovery strategy
      const strategy = await this._selectRecoveryStrategy(classification, context);

      // Attempt recovery
      const recoveryResult = await this._executeRecovery(errorId, error, strategy, context);

      // Learn from the error and recovery
      await this._learnFromError(errorId, error, classification, strategy, recoveryResult);

      return {
        errorId,
        classification,
        strategy,
        result: recoveryResult,
        recommendations: this._generateRecommendations(classification, recoveryResult)
      };

    } catch (recoveryError) {
      // Fallback recovery when recovery system fails
      return await this._fallbackRecovery(errorId, error, context, recoveryError);
    }
  }

  /**
   * Intelligent error classification
   */
  async _classifyError(error, context) {
    const classificationPrompt = `Classify this error and provide analysis for intelligent recovery.

ERROR: ${error.message}
STACK TRACE: ${error.stack}
ERROR CODE: ${error.code || 'N/A'}
CONTEXT: ${JSON.stringify(context, null, 2)}

Provide classification in JSON format:
{
  "category": "network|api|tool|memory|logic|permission|timeout|format|unknown",
  "severity": "low|medium|high|critical",
  "recoverable": true|false,
  "rootCause": "Analysis of what caused the error",
  "affectedComponents": ["component1", "component2"],
  "impact": "Description of error impact",
  "immediateActions": ["action1", "action2"],
  "likelihood": "rare|occasional|frequent|very_frequent"
}`;

    try {
      const response = await this.llm.generate(classificationPrompt, {
        temperature: 0.2,
        maxTokens: 1000
      });

      const classification = JSON.parse(response.content);
      classification.timestamp = Date.now();
      classification.context = context;

      return classification;

    } catch (classificationError) {
      // Fallback classification
      return this._fallbackClassification(error, context);
    }
  }

  /**
   * Select appropriate recovery strategy
   */
  async _selectRecoveryStrategy(classification, context) {
    const baseStrategy = this.recoveryStrategies.get(classification.category);
    if (!baseStrategy) {
      return await this._generateAdaptiveStrategy(classification, context);
    }

    // Adapt strategy based on context and history
    const adaptedStrategy = await this._adaptStrategy(baseStrategy, classification, context);

    return {
      ...adaptedStrategy,
      id: uuidv4(),
      selectedAt: Date.now(),
      confidence: this._calculateStrategyConfidence(adaptedStrategy, classification)
    };
  }

  /**
   * Execute recovery strategy
   */
  async _executeRecovery(errorId, error, strategy, context) {
    const recoveryStart = Date.now();

    try {
      let result = {
        success: false,
        method: 'unknown',
        attempts: 0,
        duration: 0,
        details: {}
      };

      // Execute strategy steps in order
      for (const step of strategy.steps) {
        result.attempts++;

        const stepResult = await this._executeRecoveryStep(step, error, context);
        result.details[step.name] = stepResult;

        if (stepResult.success) {
          result.success = true;
          result.method = step.name;
          break;
        }

        // If step has conditions for continuing, check them
        if (step.continueOnFailure && stepResult.shouldContinue) {
          continue;
        } else if (!step.continueOnFailure) {
          break;
        }
      }

      result.duration = Date.now() - recoveryStart;

      return result;

    } catch (recoveryError) {
      return {
        success: false,
        method: 'execution_failed',
        attempts: strategy.steps.length,
        duration: Date.now() - recoveryStart,
        error: recoveryError.message,
        details: {}
      };
    }
  }

  /**
   * Execute individual recovery step
   */
  async _executeRecoveryStep(step, error, context) {
    switch (step.type) {
      case 'retry':
        return await this._executeRetry(step, error, context);

      case 'fallback':
        return await this._executeFallback(step, error, context);

      case 'alternative_tool':
        return await this._executeAlternativeTool(step, error, context);

      case 'parameter_adjustment':
        return await this._executeParameterAdjustment(step, error, context);

      case 'resource_cleanup':
        return await this._executeResourceCleanup(step, error, context);

      case 'context_refresh':
        return await this._executeContextRefresh(step, error, context);

      case 'wait_and_retry':
        return await this._executeWaitAndRetry(step, error, context);

      default:
        return {
          success: false,
          method: 'unknown_step_type',
          message: `Unknown recovery step type: ${step.type}`
        };
    }
  }

  /**
   * Retry execution with exponential backoff
   */
  async _executeRetry(step, error, context) {
    const maxRetries = step.maxRetries || 3;
    const baseDelay = step.baseDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait with exponential backoff
        if (attempt > 1) {
          await this._delay(baseDelay * Math.pow(2, attempt - 1));
        }

        // Attempt to retry the original operation
        const result = await this._retryOriginalOperation(context);

        return {
          success: true,
          method: 'retry',
          attempt,
          result,
          message: `Retry successful on attempt ${attempt}`
        };

      } catch (retryError) {
        if (attempt === maxRetries) {
          return {
            success: false,
            method: 'retry',
            attempts: maxRetries,
            lastError: retryError.message,
            message: `All ${maxRetries} retry attempts failed`
          };
        }
      }
    }
  }

  /**
   * Fallback to alternative method
   */
  async _executeFallback(step, error, context) {
    try {
      const fallbackMethod = step.fallbackMethod;
      const fallbackResult = await this._executeFallbackMethod(fallbackMethod, context);

      return {
        success: true,
        method: 'fallback',
        fallbackMethod,
        result: fallbackResult,
        message: `Successfully used fallback: ${fallbackMethod}`
      };

    } catch (fallbackError) {
      return {
        success: false,
        method: 'fallback',
        error: fallbackError.message,
        message: `Fallback method failed: ${fallbackError.message}`
      };
    }
  }

  /**
   * Switch to alternative tool
   */
  async _executeAlternativeTool(step, error, context) {
    try {
      const alternativeTool = step.alternativeTool;
      const toolResult = await this.tools.useAlternative(alternativeTool, context);

      return {
        success: true,
        method: 'alternative_tool',
        alternativeTool,
        result: toolResult,
        message: `Successfully used alternative tool: ${alternativeTool}`
      };

    } catch (toolError) {
      return {
        success: false,
        method: 'alternative_tool',
        error: toolError.message,
        message: `Alternative tool failed: ${toolError.message}`
      };
    }
  }

  /**
   * Adjust parameters and retry
   */
  async _executeParameterAdjustment(step, error, context) {
    try {
      const adjustments = step.adjustments || {};
      const adjustedContext = this._applyParameterAdjustments(context, adjustments);

      const result = await this._retryOriginalOperation(adjustedContext);

      return {
        success: true,
        method: 'parameter_adjustment',
        adjustments,
        result,
        message: 'Successfully retried with adjusted parameters'
      };

    } catch (adjustmentError) {
      return {
        success: false,
        method: 'parameter_adjustment',
        error: adjustmentError.message,
        message: 'Parameter adjustment did not resolve the issue'
      };
    }
  }

  /**
   * Clean up resources and retry
   */
  async _executeResourceCleanup(step, error, context) {
    try {
      // Clear caches, reset connections, etc.
      await this._performResourceCleanup(step.cleanupActions || []);

      // Retry the original operation
      const result = await this._retryOriginalOperation(context);

      return {
        success: true,
        method: 'resource_cleanup',
        cleanupActions: step.cleanupActions || [],
        result,
        message: 'Resource cleanup successful, operation completed'
      };

    } catch (cleanupError) {
      return {
        success: false,
        method: 'resource_cleanup',
        error: cleanupError.message,
        message: 'Resource cleanup did not resolve the issue'
      };
    }
  }

  /**
   * Refresh context and retry
   */
  async _executeContextRefresh(step, error, context) {
    try {
      // Refresh context from memory
      const refreshedContext = await this._refreshContext(context);

      // Retry with refreshed context
      const result = await this._retryOriginalOperation(refreshedContext);

      return {
        success: true,
        method: 'context_refresh',
        refreshedContext,
        result,
        message: 'Context refresh successful, operation completed'
      };

    } catch (refreshError) {
      return {
        success: false,
        method: 'context_refresh',
        error: refreshError.message,
        message: 'Context refresh did not resolve the issue'
      };
    }
  }

  /**
   * Wait and retry with delay
   */
  async _executeWaitAndRetry(step, error, context) {
    try {
      const waitTime = step.waitTime || 5000;
      await this._delay(waitTime);

      const result = await this._retryOriginalOperation(context);

      return {
        success: true,
        method: 'wait_and_retry',
        waitTime,
        result,
        message: `Waited ${waitTime}ms and successfully retried`
      };

    } catch (waitError) {
      return {
        success: false,
        method: 'wait_and_retry',
        error: waitError.message,
        message: 'Wait and retry did not resolve the issue'
      };
    }
  }

  /**
   * Learn from error and recovery outcome
   */
  async _learnFromError(errorId, error, classification, strategy, recoveryResult) {
    const learningData = {
      errorId,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      classification,
      strategy: {
        id: strategy.id,
        category: strategy.category,
        confidence: strategy.confidence
      },
      recovery: recoveryResult,
      timestamp: Date.now()
    };

    // Store in error history
    this.errorHistory.set(errorId, learningData);

    // Store in long-term memory
    await this.memory.setLongTerm(`error_learning_${errorId}`, learningData, {
      importance: 0.7,
      tags: ['error_learning', classification.category, classification.severity]
    });

    // Update performance metrics
    this._updatePerformanceMetrics(classification.category, recoveryResult.success);

    // Adapt recovery strategies based on outcome
    await this._adaptRecoveryStrategies(classification, strategy, recoveryResult);

    // Add to episodic memory
    await this.memory.addEpisode({
      type: 'error_recovery',
      errorId,
      classification,
      strategy: strategy.id,
      success: recoveryResult.success,
      timestamp: Date.now()
    });
  }

  /**
   * Adapt recovery strategies based on outcomes
   */
  async _adaptRecoveryStrategies(classification, strategy, recoveryResult) {
    const category = classification.category;
    const currentStrategy = this.recoveryStrategies.get(category);

    if (!currentStrategy) return;

    // Update success rate for this strategy
    const metrics = this.performanceMetrics.get(category) || { success: 0, total: 0 };
    metrics.total++;
    if (recoveryResult.success) {
      metrics.success++;
    }
    this.performanceMetrics.set(category, metrics);

    // If success rate is low, generate new adaptive strategy
    const successRate = metrics.success / metrics.total;
    if (successRate < 0.3 && metrics.total > 5) {
      await this._generateNewStrategy(category, classification, metrics);
    }
  }

  /**
   * Generate new adaptive strategy for low-performing error types
   */
  async _generateNewStrategy(category, classification, metrics) {
    const strategyPrompt = `Generate a new recovery strategy for this error type based on past performance.

ERROR CATEGORY: ${category}
CLASSIFICATION: ${JSON.stringify(classification, null, 2)}
PERFORMANCE: Success rate ${((metrics.success / metrics.total) * 100).toFixed(1)}% (${metrics.success}/${metrics.total})

Generate adaptive strategy in JSON format:
{
  "name": "strategy_name",
  "description": "Strategy description",
  "steps": [
    {
      "name": "step_name",
      "type": "retry|fallback|alternative_tool|parameter_adjustment",
      "description": "What this step does",
      "priority": 1,
      "conditions": "When to use this step",
      "parameters": {}
    }
  ],
  "expectedSuccessRate": 0.0-1.0,
  "adaptationLogic": "How this strategy adapts to different situations"
}`;

    try {
      const response = await this.llm.generate(strategyPrompt, {
        temperature: 0.4,
        maxTokens: 1500
      });

      const newStrategy = JSON.parse(response.content);
      newStrategy.adaptive = true;
      newStrategy.createdAt = Date.now();
      newStrategy.performanceMetrics = { success: 0, total: 0 };

      this.recoveryStrategies.set(category, newStrategy);

      await this.memory.setLongTerm(`adaptive_strategy_${category}`, newStrategy, {
        importance: 0.8,
        tags: ['adaptive_strategy', category]
      });

    } catch (error) {
      console.warn('Failed to generate adaptive strategy:', error.message);
    }
  }

  /**
   * Initialize default recovery strategies
   */
  _initializeRecoveryStrategies() {
    this.recoveryStrategies.set('network', {
      name: 'network_error_recovery',
      category: 'network',
      steps: [
        {
          name: 'retry_with_backoff',
          type: 'retry',
          description: 'Retry with exponential backoff',
          priority: 1,
          maxRetries: 3,
          baseDelay: 1000,
          continueOnFailure: true
        },
        {
          name: 'alternative_endpoint',
          type: 'fallback',
          description: 'Try alternative endpoint or service',
          priority: 2,
          fallbackMethod: 'alternative_service'
        },
        {
          name: 'wait_and_retry',
          type: 'wait_and_retry',
          description: 'Wait longer and retry once more',
          priority: 3,
          waitTime: 10000
        }
      ],
      expectedSuccessRate: 0.7
    });

    this.recoveryStrategies.set('tool', {
      name: 'tool_error_recovery',
      category: 'tool',
      steps: [
        {
          name: 'alternative_tool',
          type: 'alternative_tool',
          description: 'Switch to alternative tool',
          priority: 1,
          alternativeTool: 'fallback_tool'
        },
        {
          name: 'parameter_adjustment',
          type: 'parameter_adjustment',
          description: 'Adjust tool parameters',
          priority: 2,
          adjustments: { timeout: 30000, retries: 1 }
        },
        {
          name: 'resource_cleanup',
          type: 'resource_cleanup',
          description: 'Clean up tool resources',
          priority: 3,
          cleanupActions: ['clear_cache', 'reset_connection']
        }
      ],
      expectedSuccessRate: 0.8
    });

    this.recoveryStrategies.set('api', {
      name: 'api_error_recovery',
      category: 'api',
      steps: [
        {
          name: 'retry_with_auth_refresh',
          type: 'retry',
          description: 'Retry with refreshed authentication',
          priority: 1,
          maxRetries: 2,
          baseDelay: 2000
        },
        {
          name: 'parameter_adjustment',
          type: 'parameter_adjustment',
          description: 'Adjust API parameters',
          priority: 2,
          adjustments: { timeout: 60000, retries: 1 }
        },
        {
          name: 'fallback_api',
          type: 'fallback',
          description: 'Use alternative API endpoint',
          priority: 3,
          fallbackMethod: 'alternative_api'
        }
      ],
      expectedSuccessRate: 0.6
    });

    this.recoveryStrategies.set('memory', {
      name: 'memory_error_recovery',
      category: 'memory',
      steps: [
        {
          name: 'resource_cleanup',
          type: 'resource_cleanup',
          description: 'Clean up memory resources',
          priority: 1,
          cleanupActions: ['clear_cache', 'compress_memory']
        },
        {
          name: 'context_refresh',
          type: 'context_refresh',
          description: 'Refresh context from long-term memory',
          priority: 2
        },
        {
          name: 'fallback_storage',
          type: 'fallback',
          description: 'Use fallback storage method',
          priority: 3,
          fallbackMethod: 'simple_storage'
        }
      ],
      expectedSuccessRate: 0.9
    });
  }

  /**
   * Initialize adaptation rules
   */
  _initializeAdaptationRules() {
    this.adaptationRules.set('high_failure_rate', {
      condition: (category) => {
        const metrics = this.performanceMetrics.get(category);
        return metrics && metrics.total > 10 && (metrics.success / metrics.total) < 0.3;
      },
      action: 'generate_new_strategy'
    });

    this.adaptationRules.set('frequent_retries', {
      condition: (category) => {
        const recentErrors = Array.from(this.errorHistory.values())
          .filter(e => e.classification.category === category)
          .filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
        return recentErrors.length > 5;
      },
      action: 'increase_delays'
    });
  }

  // Helper methods
  async _fallbackClassification(error, context) {
    const message = error.message.toLowerCase();

    let category = 'unknown';
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      category = 'network';
    } else if (message.includes('api') || message.includes('endpoint')) {
      category = 'api';
    } else if (message.includes('tool') || message.includes('file')) {
      category = 'tool';
    } else if (message.includes('memory') || message.includes('storage')) {
      category = 'memory';
    }

    return {
      category,
      severity: 'medium',
      recoverable: true,
      rootCause: 'Unable to classify error precisely',
      affectedComponents: ['unknown'],
      impact: 'Unknown impact',
      immediateActions: ['Retry operation'],
      likelihood: 'occasional'
    };
  }

  async _generateAdaptiveStrategy(classification, context) {
    return {
      name: 'adaptive_recovery',
      category: classification.category,
      steps: [
        {
          name: 'generic_retry',
          type: 'retry',
          description: 'Generic retry with backoff',
          priority: 1,
          maxRetries: 2,
          baseDelay: 2000
        }
      ],
      expectedSuccessRate: 0.5,
      adaptive: true
    };
  }

  async _adaptStrategy(baseStrategy, classification, context) {
    // Simple adaptation logic - can be made more sophisticated
    const adapted = { ...baseStrategy };

    // Adjust based on severity
    if (classification.severity === 'critical') {
      adapted.steps.unshift({
        name: 'immediate_notification',
        type: 'fallback',
        description: 'Notify user of critical error',
        priority: 0,
        fallbackMethod: 'user_notification'
      });
    }

    return adapted;
  }

  _calculateStrategyConfidence(strategy, classification) {
    // Base confidence on strategy performance
    const metrics = this.performanceMetrics.get(classification.category);
    if (metrics && metrics.total > 0) {
      return metrics.success / metrics.total;
    }
    return strategy.expectedSuccessRate || 0.5;
  }

  async _fallbackRecovery(errorId, error, context, recoveryError) {
    return {
      errorId,
      classification: { category: 'unknown', severity: 'high', recoverable: false },
      strategy: { name: 'fallback_recovery', steps: [] },
      result: {
        success: false,
        method: 'fallback_recovery',
        error: recoveryError.message,
        message: 'Both error and recovery system failed'
      },
      recommendations: ['Restart the operation', 'Check system status', 'Contact support if issue persists']
    };
  }

  _generateRecommendations(classification, recoveryResult) {
    const recommendations = [];

    if (!recoveryResult.success) {
      recommendations.push('Consider escalating to manual intervention');
    }

    if (classification.severity === 'high' || classification.severity === 'critical') {
      recommendations.push('Monitor system health closely');
    }

    if (classification.likelihood === 'frequent' || classification.likelihood === 'very_frequent') {
      recommendations.push('Investigate root cause to prevent recurrence');
    }

    return recommendations;
  }

  async _retryOriginalOperation(context) {
    // This would interface with the original operation that failed
    // For now, return a placeholder
    throw new Error('Original operation retry not implemented');
  }

  async _executeFallbackMethod(method, context) {
    // Execute fallback method based on method name
    return { success: true, method, result: 'Fallback executed' };
  }

  _applyParameterAdjustments(context, adjustments) {
    return { ...context, ...adjustments };
  }

  async _performResourceCleanup(actions) {
    // Perform cleanup actions like clearing caches, resetting connections
    for (const action of actions) {
      switch (action) {
        case 'clear_cache':
          // Clear relevant caches
          break;
        case 'reset_connection':
          // Reset connections
          break;
        case 'compress_memory':
          // Compress memory
          break;
      }
    }
  }

  async _refreshContext(context) {
    // Refresh context from memory or other sources
    return { ...context, refreshed: true, refreshTime: Date.now() };
  }

  _updatePerformanceMetrics(category, success) {
    const metrics = this.performanceMetrics.get(category) || { success: 0, total: 0 };
    metrics.total++;
    if (success) metrics.success++;
    this.performanceMetrics.set(category, metrics);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public interface
  getErrorStats() {
    const stats = {
      totalErrors: this.errorHistory.size,
      categoryStats: {},
      performanceMetrics: {},
      recentErrors: []
    };

    // Category statistics
    for (const [category, metrics] of this.performanceMetrics.entries()) {
      stats.performanceMetrics[category] = {
        ...metrics,
        successRate: metrics.total > 0 ? metrics.success / metrics.total : 0
      };
    }

    // Recent errors (last hour)
    const oneHourAgo = Date.now() - 3600000;
    stats.recentErrors = Array.from(this.errorHistory.values())
      .filter(error => error.timestamp > oneHourAgo)
      .slice(0, 10);

    return stats;
  }

  async cleanup() {
    // Clean up old error history (keep last 1000 errors)
    if (this.errorHistory.size > 1000) {
      const entries = Array.from(this.errorHistory.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.errorHistory = new Map(entries.slice(0, 1000));
    }
  }
}