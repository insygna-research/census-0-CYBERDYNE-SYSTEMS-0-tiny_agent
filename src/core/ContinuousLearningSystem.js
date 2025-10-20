import { v4 as uuidv4 } from 'uuid';

/**
 * Continuous Learning and Performance Optimization System
 *
 * Provides performance metrics tracking, tool usage optimization,
 * adaptive learning, and self-improving capabilities.
 */
export class ContinuousLearningSystem {
  constructor(memorySystem, llmClient, toolSystem) {
    this.memory = memorySystem;
    this.llm = llmClient;
    this.tools = toolSystem;

    // Performance tracking
    this.performanceMetrics = new Map();
    this.toolUsageStats = new Map();
    this.strategyEffectiveness = new Map();
    this.learningHistory = new Map();

    // Optimization state
    this.optimizationState = {
      lastOptimization: Date.now(),
      optimizationInterval: 3600000, // 1 hour
      performanceThreshold: 0.7, // 70% success rate threshold
      adaptationCount: 0,
      lastAdaptation: null
    };

    // Learning configuration
    this.config = {
      maxHistorySize: 1000,
      minSamplesForLearning: 10,
      adaptationSensitivity: 0.1,
      forgettingRate: 0.99, // per day
      explorationRate: 0.1 // 10% exploration vs exploitation
    };

    this._initializeMetrics();
  }

  /**
   * Record task execution for learning
   */
  async recordTaskExecution(taskData) {
    const executionId = uuidv4();
    const timestamp = Date.now();

    const executionRecord = {
      id: executionId,
      timestamp,
      task: taskData.task,
      tools: taskData.tools || [],
      strategy: taskData.strategy,
      context: taskData.context || {},
      outcome: {
        success: taskData.success,
        duration: taskData.duration || 0,
        quality: taskData.quality || 0.5,
        errors: taskData.errors || []
      },
      metrics: {
        efficiency: this._calculateEfficiency(taskData),
        effectiveness: taskData.success ? 1.0 : 0.0,
        resourceUsage: taskData.resourceUsage || {},
        userSatisfaction: taskData.userSatisfaction || 0.5
      },
      learning: {
        insights: [],
        adaptations: [],
        recommendations: []
      }
    };

    // Extract learning insights
    await this._extractLearningInsights(executionRecord);

    // Update performance metrics
    this._updatePerformanceMetrics(executionRecord);

    // Update tool usage statistics
    this._updateToolUsageStats(executionRecord);

    // Store in memory
    await this.memory.setLongTerm(`task_execution_${executionId}`, executionRecord, {
      importance: 0.6,
      tags: ['task_execution', taskData.success ? 'success' : 'failure', ...(taskData.tools || [])]
    });

    // Add to episodic memory
    await this.memory.addEpisode({
      type: 'task_execution',
      executionId,
      task: taskData.task,
      success: taskData.success,
      duration: taskData.duration,
      timestamp
    });

    this.learningHistory.set(executionId, executionRecord);

    // Check if optimization is needed
    await this._checkOptimizationNeed();

    return {
      executionId,
      insights: executionRecord.learning.insights,
      recommendations: executionRecord.learning.recommendations
    };
  }

  /**
   * Analyze performance trends and generate insights
   */
  async analyzePerformanceTrends(timeframe = 86400000) { // Default: last 24 hours
    const cutoffTime = Date.now() - timeframe;
    const recentExecutions = Array.from(this.learningHistory.values())
      .filter(record => record.timestamp > cutoffTime);

    if (recentExecutions.length < this.config.minSamplesForLearning) {
      return {
        insufficient: true,
        message: `Need at least ${this.config.minSamplesForLearning} samples for analysis`,
        current: recentExecutions.length
      };
    }

    try {
      const analysisPrompt = `Analyze these task execution records and provide performance insights and recommendations.

EXECUTION RECORDS:
${JSON.stringify(recentExecutions.slice(0, 20), null, 2)}

Provide analysis in JSON format:
{
  "overallPerformance": {
    "successRate": 0.0-1.0,
    "averageDuration": number,
    "qualityScore": 0.0-1.0,
    "efficiencyScore": 0.0-1.0
  },
  "trends": {
    "successTrend": "improving|stable|declining",
    "speedTrend": "faster|stable|slower",
    "qualityTrend": "improving|stable|declining"
  },
  "topPerformingTools": ["tool1", "tool2"],
  "problematicTools": ["tool1", "tool2"],
  "effectiveStrategies": ["strategy1", "strategy2"],
  "insights": ["insight1", "insight2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "optimizationOpportunities": ["opportunity1", "opportunity2"]
}`;

      const response = await this.llm.generate(analysisPrompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const analysis = JSON.parse(response.content);
      analysis.analyzedAt = Date.now();
      analysis.sampleSize = recentExecutions.length;
      analysis.timeframe = timeframe;

      // Store analysis in memory
      await this.memory.setLongTerm(`performance_analysis_${Date.now()}`, analysis, {
        importance: 0.8,
        tags: ['performance_analysis', 'trends', 'insights']
      });

      return analysis;

    } catch (error) {
      console.error('Performance analysis failed:', error);
      return this._generateFallbackAnalysis(recentExecutions);
    }
  }

  /**
   * Optimize tool selection and usage strategies
   */
  async optimizeToolStrategies() {
    const toolPerformance = await this._analyzeToolPerformance();
    const optimizationPrompt = `Based on this tool performance data, generate optimization strategies.

TOOL PERFORMANCE DATA:
${JSON.stringify(toolPerformance, null, 2)}

Generate optimization strategies in JSON format:
{
  "toolPriorities": {
    "tool1": {
      "priority": "high|medium|low",
      "reason": "Why this priority"
    }
  },
  "toolCombinations": [
    {
      "combination": ["tool1", "tool2"],
      "useCase": "When to use this combination",
      "expectedPerformance": 0.0-1.0
    }
  ],
  "parameterOptimizations": {
    "tool1": {
      "parameter": "value",
      "reason": "Why this optimization"
    }
  },
  "newToolIntegrations": ["tool1", "tool2"],
  "deprecatedTools": ["tool1"],
  "strategicRecommendations": ["recommendation1", "recommendation2"]
}`;

    try {
      const response = await this.llm.generate(optimizationPrompt, {
        temperature: 0.2,
        maxTokens: 1500
      });

      const optimization = JSON.parse(response.content);
      optimization.generatedAt = Date.now();
      optimization.basedOnDataSize = Object.keys(toolPerformance).length;

      // Store optimization strategies
      await this.memory.setLongTerm(`tool_optimization_${Date.now()}`, optimization, {
        importance: 0.9,
        tags: ['tool_optimization', 'strategy']
      });

      return optimization;

    } catch (error) {
      console.error('Tool optimization failed:', error);
      return { error: error.message, message: 'Optimization analysis failed' };
    }
  }

  /**
   * Generate adaptive learning recommendations
   */
  async generateLearningRecommendations() {
    const recentPerformance = await this.analyzePerformanceTrends();
    const toolAnalysis = await this._analyzeToolPerformance();

    const recommendationPrompt = `Generate specific learning recommendations based on performance analysis.

RECENT PERFORMANCE:
${JSON.stringify(recentPerformance, null, 2)}

TOOL ANALYSIS:
${JSON.stringify(toolAnalysis, null, 2)}

Generate recommendations in JSON format:
{
  "immediateActions": [
    {
      "action": "specific_action",
      "priority": "high|medium|low",
      "expectedImpact": 0.0-1.0,
      "effort": "low|medium|high",
      "description": "What to do and why"
    }
  ],
  "skillDevelopment": [
    {
      "skill": "skill_name",
      "currentLevel": 0.0-1.0,
      "targetLevel": 0.0-1.0,
      "practiceAreas": ["area1", "area2"]
    }
  ],
  "toolImprovements": [
    {
      "tool": "tool_name",
      "improvement": "specific_improvement",
      "method": "how_to_improve"
    }
  ],
  "strategyAdjustments": [
    {
      "strategy": "strategy_name",
      "adjustment": "what_to_change",
      "reason": "why_this_helps"
    }
  ],
  "longTermGoals": ["goal1", "goal2"],
  "successMetrics": ["metric1", "metric2"]
}`;

    try {
      const response = await this.llm.generate(recommendationPrompt, {
        temperature: 0.3,
        maxTokens: 1800
      });

      const recommendations = JSON.parse(response.content);
      recommendations.generatedAt = Date.now();
      recommendations.validUntil = Date.now() + (7 * 24 * 60 * 60 * 1000); // Valid for 1 week

      // Store recommendations
      await this.memory.setLongTerm(`learning_recommendations_${Date.now()}`, recommendations, {
        importance: 0.8,
        tags: ['learning_recommendations', 'improvement']
      });

      return recommendations;

    } catch (error) {
      console.error('Learning recommendations failed:', error);
      return { error: error.message, message: 'Recommendation generation failed' };
    }
  }

  /**
   * Adapt system behavior based on learning
   */
  async adaptSystemBehavior() {
    if (Date.now() - this.optimizationState.lastOptimization < this.optimizationState.optimizationInterval) {
      return { message: 'Optimization interval not reached', nextOptimization: this.optimizationState.lastOptimization + this.optimizationState.optimizationInterval };
    }

    try {
      // Analyze current performance
      const performanceAnalysis = await this.analyzePerformanceTrends();
      const toolOptimization = await this.optimizeToolStrategies();
      const recommendations = await this.generateLearningRecommendations();

      // Generate adaptation plan
      const adaptationPlan = await this._generateAdaptationPlan(performanceAnalysis, toolOptimization, recommendations);

      // Execute high-priority adaptations
      const executedAdaptations = await this._executeAdaptations(adaptationPlan);

      // Update optimization state
      this.optimizationState.lastOptimization = Date.now();
      this.optimizationState.adaptationCount++;
      this.optimizationState.lastAdaptation = executedAdaptations;

      // Store adaptation history
      await this.memory.addEpisode({
        type: 'system_adaptation',
        adaptationCount: this.optimizationState.adaptationCount,
        adaptations: executedAdaptations,
        performanceAnalysis,
        timestamp: Date.now()
      });

      return {
        success: true,
        adaptationCount: this.optimizationState.adaptationCount,
        executedAdaptations,
        nextOptimization: Date.now() + this.optimizationState.optimizationInterval,
        performanceImpact: this._estimatePerformanceImpact(executedAdaptations)
      };

    } catch (error) {
      console.error('System adaptation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract learning insights from execution record
   */
  async _extractLearningInsights(executionRecord) {
    if (!executionRecord.outcome.success) {
      // Extract failure insights
      const failureInsight = await this._analyzeFailure(executionRecord);
      executionRecord.learning.insights.push(failureInsight);
    }

    if (executionRecord.metrics.efficiency > 0.8) {
      // Extract efficiency insights
      const efficiencyInsight = await this._analyzeEfficiency(executionRecord);
      executionRecord.learning.insights.push(efficiencyInsight);
    }

    if (executionRecord.outcome.duration > 30000) { // > 30 seconds
      // Extract duration insights
      const durationInsight = await this._analyzeDuration(executionRecord);
      executionRecord.learning.insights.push(durationInsight);
    }
  }

  /**
   * Analyze failure patterns
   */
  async _analyzeFailure(executionRecord) {
    try {
      const analysisPrompt = `Analyze this task failure and extract learning insights.

FAILURE DATA:
${JSON.stringify(executionRecord, null, 2)}

Provide analysis in JSON format:
{
  "rootCause": "Primary cause of failure",
  "contributingFactors": ["factor1", "factor2"],
  "preventativeMeasures": ["measure1", "measure2"],
  "earlyWarningSigns": ["sign1", "sign2"],
  "recoveryStrategies": ["strategy1", "strategy2"],
  "learningValue": 0.0-1.0
}`;

      const response = await this.llm.generate(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 800
      });

      return {
        type: 'failure_analysis',
        ...JSON.parse(response.content),
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        type: 'failure_analysis',
        rootCause: 'Analysis failed',
        learningValue: 0.5,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyze high efficiency performance
   */
  async _analyzeEfficiency(executionRecord) {
    try {
      const analysisPrompt = `Analyze this high-efficiency task execution to identify success factors.

EXECUTION DATA:
${JSON.stringify(executionRecord, null, 2)}

Provide analysis in JSON format:
{
  "successFactors": ["factor1", "factor2"],
  "bestPractices": ["practice1", "practice2"],
  "reproducibleElements": ["element1", "element2"],
  "optimizationOpportunities": ["opportunity1", "opportunity2"],
  "knowledgeTransfer": ["transfer1", "transfer2"]
}`;

      const response = await this.llm.generate(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 600
      });

      return {
        type: 'efficiency_analysis',
        ...JSON.parse(response.content),
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        type: 'efficiency_analysis',
        successFactors: ['High efficiency detected'],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyze long duration tasks
   */
  async _analyzeDuration(executionRecord) {
    try {
      const analysisPrompt = `Analyze this long-duration task execution for optimization opportunities.

EXECUTION DATA:
${JSON.stringify(executionRecord, null, 2)}

Provide analysis in JSON format:
{
  "bottlenecks": ["bottleneck1", "bottleneck2"],
  "optimizationOpportunities": ["opportunity1", "opportunity2"],
  "parallelizationPossibilities": ["parallel1", "parallel2"],
  "cachingOpportunities": ["cache1", "cache2"],
  "processImprovements": ["improvement1", "improvement2"]
}`;

      const response = await this.llm.generate(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 600
      });

      return {
        type: 'duration_analysis',
        ...JSON.parse(response.content),
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        type: 'duration_analysis',
        bottlenecks: ['Analysis failed'],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Update performance metrics
   */
  _updatePerformanceMetrics(executionRecord) {
    const taskType = executionRecord.task.type || 'unknown';

    if (!this.performanceMetrics.has(taskType)) {
      this.performanceMetrics.set(taskType, {
        total: 0,
        success: 0,
        totalDuration: 0,
        totalQuality: 0,
        totalEfficiency: 0,
        lastUpdated: Date.now()
      });
    }

    const metrics = this.performanceMetrics.get(taskType);
    metrics.total++;
    if (executionRecord.outcome.success) metrics.success++;
    metrics.totalDuration += executionRecord.outcome.duration;
    metrics.totalQuality += executionRecord.metrics.quality;
    metrics.totalEfficiency += executionRecord.metrics.efficiency;
    metrics.lastUpdated = Date.now();
  }

  /**
   * Update tool usage statistics
   */
  _updateToolUsageStats(executionRecord) {
    executionRecord.tools.forEach(tool => {
      if (!this.toolUsageStats.has(tool)) {
        this.toolUsageStats.set(tool, {
          total: 0,
          success: 0,
          totalDuration: 0,
          averageQuality: 0,
          lastUsed: Date.now()
        });
      }

      const stats = this.toolUsageStats.get(tool);
      stats.total++;
      if (executionRecord.outcome.success) stats.success++;
      stats.totalDuration += executionRecord.outcome.duration;
      stats.averageQuality = (stats.averageQuality * (stats.total - 1) + executionRecord.metrics.quality) / stats.total;
      stats.lastUsed = Date.now();
    });
  }

  /**
   * Calculate task efficiency
   */
  _calculateEfficiency(taskData) {
    if (!taskData.duration || !taskData.success) return 0.0;

    // Simple efficiency calculation based on duration and success
    const expectedDuration = taskData.expectedDuration || 30000; // 30 seconds default
    const durationRatio = Math.min(expectedDuration / taskData.duration, 2.0);
    const successFactor = taskData.success ? 1.0 : 0.0;

    return Math.min(durationRatio * successFactor, 1.0);
  }

  /**
   * Check if optimization is needed
   */
  async _checkOptimizationNeed() {
    // Check overall performance
    let overallSuccessRate = 0;
    let totalExecutions = 0;

    for (const metrics of this.performanceMetrics.values()) {
      overallSuccessRate += metrics.success;
      totalExecutions += metrics.total;
    }

    if (totalExecutions > 0) {
      overallSuccessRate /= totalExecutions;

      if (overallSuccessRate < this.config.performanceThreshold && totalExecutions >= this.config.minSamplesForLearning) {
        await this.adaptSystemBehavior();
      }
    }
  }

  /**
   * Analyze tool performance
   */
  async _analyzeToolPerformance() {
    const toolPerformance = {};

    for (const [tool, stats] of this.toolUsageStats.entries()) {
      toolPerformance[tool] = {
        usage: stats.total,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
        averageDuration: stats.total > 0 ? stats.totalDuration / stats.total : 0,
        averageQuality: stats.averageQuality,
        lastUsed: stats.lastUsed,
        reliability: this._calculateReliability(stats),
        efficiency: this._calculateToolEfficiency(stats)
      };
    }

    return toolPerformance;
  }

  /**
   * Calculate tool reliability
   */
  _calculateReliability(stats) {
    if (stats.total < 10) return 0.5; // Insufficient data

    const recentUsage = Array.from(this.learningHistory.values())
      .filter(record => record.tools.includes(stats.tool))
      .filter(record => Date.now() - record.timestamp < 86400000); // Last 24 hours

    if (recentUsage.length < 5) return 0.6; // Insufficient recent data

    const recentSuccessRate = recentUsage.filter(record => record.outcome.success).length / recentUsage.length;
    return Math.max(recentSuccessRate, 0.1);
  }

  /**
   * Calculate tool efficiency
   */
  _calculateToolEfficiency(stats) {
    if (stats.totalDuration === 0) return 0.5;

    // Simple efficiency based on average duration and quality
    const durationScore = Math.min(30000 / (stats.totalDuration / stats.total), 1.0); // Prefer < 30s
    const qualityScore = stats.averageQuality;

    return (durationScore + qualityScore) / 2;
  }

  /**
   * Generate adaptation plan
   */
  async _generateAdaptationPlan(performanceAnalysis, toolOptimization, recommendations) {
    try {
      const planPrompt = `Generate a specific adaptation plan based on this analysis.

PERFORMANCE ANALYSIS:
${JSON.stringify(performanceAnalysis, null, 2)}

TOOL OPTIMIZATION:
${JSON.stringify(toolOptimization, null, 2)}

RECOMMENDATIONS:
${JSON.stringify(recommendations, null, 2)}

Generate adaptation plan in JSON format:
{
  "priority": "high|medium|low",
  "adaptations": [
    {
      "type": "tool_config|strategy|parameter|workflow",
      "target": "what_to_change",
      "change": "specific_change",
      "expectedImpact": 0.0-1.0,
      "implementationComplexity": "low|medium|high",
      "rollbackPlan": "how_to_rollback_if_needed"
    }
  ],
  "immediateActions": ["action1", "action2"],
  "monitoringMetrics": ["metric1", "metric2"],
  "successCriteria": ["criteria1", "criteria2"]
}`;

      const response = await this.llm.generate(planPrompt, {
        temperature: 0.2,
        maxTokens: 1500
      });

      return JSON.parse(response.content);

    } catch (error) {
      console.error('Adaptation planning failed:', error);
      return {
        priority: 'low',
        adaptations: [],
        immediateActions: ['Retry adaptation later'],
        monitoringMetrics: ['success_rate'],
        successCriteria: ['Improved performance']
      };
    }
  }

  /**
   * Execute adaptations
   */
  async _executeAdaptations(adaptationPlan) {
    const executed = [];

    for (const adaptation of adaptationPlan.adaptations) {
      try {
        const result = await this._executeSingleAdaptation(adaptation);
        executed.push({
          ...adaptation,
          executionResult: result,
          executedAt: Date.now()
        });
      } catch (error) {
        executed.push({
          ...adaptation,
          executionResult: { success: false, error: error.message },
          executedAt: Date.now()
        });
      }
    }

    return executed;
  }

  /**
   * Execute single adaptation
   */
  async _executeSingleAdaptation(adaptation) {
    switch (adaptation.type) {
      case 'tool_config':
        return await this._adaptToolConfiguration(adaptation);
      case 'strategy':
        return await this._adaptStrategy(adaptation);
      case 'parameter':
        return await this._adaptParameters(adaptation);
      case 'workflow':
        return await this._adaptWorkflow(adaptation);
      default:
        return { success: false, error: `Unknown adaptation type: ${adaptation.type}` };
    }
  }

  /**
   * Adapt tool configuration
   */
  async _adaptToolConfiguration(adaptation) {
    // This would interface with the tool system to adjust configurations
    return {
      success: true,
      message: `Tool configuration adapted for ${adaptation.target}`,
      oldValue: 'previous_config',
      newValue: adaptation.change
    };
  }

  /**
   * Adapt strategy
   */
  async _adaptStrategy(adaptation) {
    // This would adjust system strategies
    return {
      success: true,
      message: `Strategy adapted: ${adaptation.change}`,
      previousStrategy: adaptation.target,
      newStrategy: adaptation.change
    };
  }

  /**
   * Adapt parameters
   */
  async _adaptParameters(adaptation) {
    // This would adjust system parameters
    return {
      success: true,
      message: `Parameters adapted for ${adaptation.target}`,
      parameter: adaptation.target,
      oldValue: 'previous_value',
      newValue: adaptation.change
    };
  }

  /**
   * Adapt workflow
   */
  async _adaptWorkflow(adaptation) {
    // This would adjust system workflows
    return {
      success: true,
      message: `Workflow adapted: ${adaptation.change}`,
      workflow: adaptation.target,
      change: adaptation.change
    };
  }

  /**
   * Estimate performance impact of adaptations
   */
  _estimatePerformanceImpact(executedAdaptations) {
    const successfulAdaptations = executedAdaptations.filter(a => a.executionResult.success);
    const totalExpectedImpact = successfulAdaptations.reduce((sum, a) => sum + (a.expectedImpact || 0.1), 0);

    return {
      adaptationCount: successfulAdaptations.length,
      expectedImprovement: Math.min(totalExpectedImpact, 0.5), // Cap at 50% improvement
      confidence: Math.min(successfulAdaptations.length / executedAdaptations.length, 1.0),
      timeframe: '1-24 hours'
    };
  }

  /**
   * Generate fallback analysis
   */
  _generateFallbackAnalysis(recentExecutions) {
    const successCount = recentExecutions.filter(e => e.outcome.success).length;
    const totalDuration = recentExecutions.reduce((sum, e) => sum + e.outcome.duration, 0);

    return {
      overallPerformance: {
        successRate: successCount / recentExecutions.length,
        averageDuration: totalDuration / recentExecutions.length,
        qualityScore: 0.7, // Default
        efficiencyScore: 0.6 // Default
      },
      trends: {
        successTrend: 'stable',
        speedTrend: 'stable',
        qualityTrend: 'stable'
      },
      topPerformingTools: [],
      problematicTools: [],
      effectiveStrategies: [],
      insights: ['Limited data for analysis'],
      recommendations: ['Collect more data points'],
      optimizationOpportunities: []
    };
  }

  /**
   * Initialize metrics
   */
  _initializeMetrics() {
    console.log('Continuous Learning System initialized');
  }

  // Public interface
  getLearningStats() {
    return {
      totalExecutions: this.learningHistory.size,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      toolUsageStats: Object.fromEntries(this.toolUsageStats),
      optimizationState: this.optimizationState,
      lastAnalysis: this.lastAnalysisTime || null
    };
  }

  async cleanup() {
    // Clean up old learning history
    if (this.learningHistory.size > this.config.maxHistorySize) {
      const entries = Array.from(this.learningHistory.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.learningHistory = new Map(entries.slice(0, this.config.maxHistorySize));
    }

    // Clean up old performance metrics (older than 30 days)
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      if (metrics.lastUpdated < cutoffTime) {
        this.performanceMetrics.delete(key);
      }
    }
  }
}