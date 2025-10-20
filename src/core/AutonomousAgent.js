import { MemorySystem } from '../memory/MemorySystem.js';
import { AdvancedMemoryManager } from '../memory/AdvancedMemoryManager.js';
import { TaskManager } from './TaskManager.js';
import { StrategicPlanner } from './StrategicPlanner.js';
import { LLMClient } from '../llm/LLMClient.js';
import { ToolSystem } from '../tools/ToolSystem.js';
import { ReportGenerator } from './ReportGenerator.js';
import { AdvancedDeliverableSystem } from './AdvancedDeliverableSystem.js';
import { SubagentOrchestrator } from './SubagentOrchestrator.js';
import { ErrorRecoverySystem } from './ErrorRecoverySystem.js';
import { ContinuousLearningSystem } from './ContinuousLearningSystem.js';
import { v4 as uuidv4 } from 'uuid';

export class AutonomousAgent {
  constructor(config = {}) {
    this.agentId = uuidv4();
    this.config = {
      ...config,
      workDirectory: config.workDirectory || './agent_workspace',
      maxConcurrentTasks: config.maxConcurrentTasks || 3,
      autoCleanup: config.autoCleanup !== false,
      memoryOptions: config.memoryOptions || {}
    };

    // Initialize core systems
    this.memory = new MemorySystem({...this.config.memoryOptions, llmClient: null});
    this.llmClient = new LLMClient(config.llmConfig || {});
    this.tools = new ToolSystem(config.toolConfig || {});
    this.taskManager = new TaskManager(this.memory, this.llmClient);
    this.reportGenerator = new ReportGenerator(this.memory, this.tools);

    // ANTHROPIC INSIGHT: Initialize advanced systems for long-horizon autonomy
    this.advancedMemory = new AdvancedMemoryManager(this.memory, this.llmClient);
    this.strategicPlanner = new StrategicPlanner(this.memory, this.llmClient);
    this.deliverableSystem = new AdvancedDeliverableSystem(this.memory, this.tools, this.llmClient);
    this.errorRecovery = new ErrorRecoverySystem(this.memory, this.llmClient, this.tools);
    this.continuousLearning = new ContinuousLearningSystem(this.memory, this.llmClient, this.tools);

    // Initialize subagent orchestrator for parallel execution
    this.subagentOrchestrator = new SubagentOrchestrator(this.memory, this.llmClient, this.tools);

    // Set up memory system access to LLM for advanced features
    this.memory.llmClient = this.llmClient;
    this.advancedMemory.llmClient = this.llmClient;

    // Agent state
    this.status = 'ready';
    this.activeProjects = new Map();
    this.completedProjects = new Map();
    this.currentTaskId = null;
    this.eventListeners = new Map();
    
    // Performance metrics
    this.metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalProcessingTime: 0,
      memoryUsage: 0,
      uptime: Date.now(),
      subagentSessions: 0,
      parallelExecutions: 0,
      strategicPlansCreated: 0,
      errorRecoveriesHandled: 0,
      learningCyclesCompleted: 0,
      deliverablesGenerated: 0
    };

    // Initialize event handlers
    this._initializeEventHandlers();
  }

  // MAIN RESEARCH EXECUTION

  async startResearch(goal, options = {}) {
    try {
      this._setStatus('researching');
      
      // Create project context
      const projectId = uuidv4();
      const project = {
        id: projectId,
        goal: goal,
        status: 'active',
        startTime: Date.now(),
        config: options,
        metadata: {
          agentId: this.agentId,
          version: '1.0.0',
          workDirectory: this.config.workDirectory
        }
      };

      this.activeProjects.set(projectId, project);

      // Store initial context
      this.memory.setShortTerm(`project_${projectId}`, project, 86400000);
      
      // ANTHROPIC INSIGHT: Choose between solo and multi-agent approach based on complexity
      this._emit('task.start', { goal, projectId });
      
      let results;
      const taskComplexity = this._assessTaskComplexity(goal, options);
      
      if (taskComplexity.useMultiAgent && options.allowMultiAgent !== false) {
        console.log(`🚀 Using multi-agent approach for complex task: ${goal}`);
        results = await this._executeMultiAgentResearch(goal, options, projectId);
        this.metrics.parallelExecutions++;
      } else {
        console.log(`🎯 Using solo agent approach for task: ${goal}`);
        results = await this._executeSoloResearch(goal, options, projectId);
      }

      // Generate comprehensive report
      const report = await this.reportGenerator.generateResearchReport(
        this.currentTaskId, 
        {
          format: options.reportFormat || 'markdown',
          includeDetailed: options.includeDetailed !== false
        }
      );

      // Complete project
      await this._completeProject(projectId, results, report);

      this._setStatus('ready');
      
      return {
        success: true,
        projectId,
        goal,
        results,
        report: report.report,
        metadata: report.metadata,
        approach: taskComplexity.useMultiAgent ? 'multi-agent' : 'solo-agent'
      };

    } catch (error) {
      console.error('Research execution failed:', error);
      this._setStatus('error');
      this._emit('error', { goal, error: error.message });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ANTHROPIC INSIGHT: Multi-agent research using subagent orchestrator
  async _executeMultiAgentResearch(goal, options, projectId) {
    const context = {
      projectId,
      workspace: this.config.workDirectory,
      toolsAvailable: this.tools.getToolDefinitions(),
      startTime: Date.now()
    };

    // Execute parallel research with subagents
    const result = await this.subagentOrchestrator.orchestrateResearch(goal, context);
    
    if (!result.success) {
      throw new Error(`Multi-agent research failed: ${result.error}`);
    }

    // Store multi-agent session in memory
    await this.memory.setLongTerm(`multiagent_session_${result.sessionId}`, {
      sessionId: result.sessionId,
      goal,
      synthesis: result.synthesis,
      subagentCount: result.subagentCount,
      executionTime: result.executionTime
    }, {
      importance: 0.9,
      tags: ['multiagent_research', 'session']
    });

    this.metrics.subagentSessions++;

    // Create notes from synthesis for context
    if (result.synthesis.key_themes) {
      await this.memory.createNote({
        title: `Research: ${goal}`,
        content: result.synthesis.executive_summary,
        themes: result.synthesis.key_themes,
        confidence: result.synthesis.confidence_assessment?.overall || 0.7,
        tags: ['research', goal.toLowerCase().split(' ').slice(0, 3)],
        linkedEpisodes: [`multiagent_session_${result.sessionId}`]
      });
    }

    return {
      type: 'multi-agent',
      session: result.sessionId,
      synthesis: result.synthesis,
      subagentCount: result.subagentCount,
      executionStats: result.executionTime
    };
  }

  // Fallback solo-agent research (original approach)
  async _executeSoloResearch(goal, options, projectId) {
    // Decompose task into actionable steps
    const taskPlan = await this.taskManager.decomposeTask(goal, {
      projectId,
      config: options
    });

    // Execute research plan
    const results = await this._executeResearchPlan(taskPlan, projectId);

    return {
      type: 'solo-agent',
      executionPlan: taskPlan,
      implementation: results
    };
  }

  // ANTHROPIC INSIGHT: Task complexity assessment for agent selection
  _assessTaskComplexity(goal, options) {
    const complexityIndicators = {
      keywords: ['research', 'analyze', 'compare', 'investigate', 'comprehensive', 'multiple', 'various'],
      questionCount: (goal.match(/\?/g) || []).length,
      hasMultipleParts: goal.includes('and') || goal.includes('or') || goal.includes(',') || goal.includes(';'),
      length: goal.length,
      breadthTerms: ['all', 'everything', 'complete', 'comprehensive', 'across', 'entire']
    };

    let complexityScore = 0;
    
    // Calculate complexity score
    complexityIndicators.keywords.forEach(keyword => {
      if (goal.toLowerCase().includes(keyword)) complexityScore += 2;
    });
    
    complexityScore += complexityIndicators.questionCount * 1.5;
    complexityScore += complexityIndicators.hasMultipleParts ? 1 : 0;
    complexityScore += goal.length > 100 ? 1 : 0;
    complexityScore += complexityIndicators.breadthTerms.some(term => 
      goal.toLowerCase().includes(term)) ? 2 : 0;

    // Decision algorithm
    const useMultiAgent = complexityScore >= 3 && options.forceSoloAgent !== true;
    
    return {
      score: complexityScore,
      useMultiAgent,
      reasons: useMultiAgent ? [
        'Complex research task',
        'Multiple aspects to investigate',
        'Benefits from parallel exploration'
      ] : [
        'Focused task suitable for single agent',
        'More efficient for simple objectives'
      ]
    };
  }

  // CONTINUOUS RESEARCH MODE

  async startContinuousMode(researchGoals, options = {}) {
    this._setStatus('continuous');
    
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      goals: researchGoals,
      status: 'active',
      startTime: Date.now(),
      currentIndex: 0,
      completedGoals: []
    };

    this.memory.setShortTerm(`continuous_session_${sessionId}`, session);

    try {
      while (session.currentIndex < researchGoals.length) {
        const goal = researchGoals[session.currentIndex];
        
        this._emit('continuous.goal.start', { goal, sessionId });
        
        const result = await this.startResearch(goal, {
          ...options,
          sessionId
        });

        session.completedGoals.push({
          goal,
          result,
          completedAt: Date.now()
        });

        session.currentIndex++;
        this.memory.setShortTerm(`continuous_session_${sessionId}`, session);
        
        // Check for stop conditions
        if (options.maxGoals && session.completedGoals.length >= options.maxGoals) {
          break;
        }

        if (options.stopOnError && !result.success) {
          break;
        }
      }

      // Generate session summary
      const sessionSummary = await this._generateSessionSummary(session);
      
      return {
        success: true,
        sessionId,
        summary: sessionSummary,
        completedGoals: session.completedGoals
      };

    } finally {
      this._setStatus('ready');
    }
  }

  // PROJECT MANAGEMENT

  async pauseProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project) return false;

    project.status = 'paused';
    project.pauseTime = Date.now();
    
    // Save current state
    const activeTaskId = this.currentTaskId;
    if (activeTaskId) {
      const task = this.memory.getShortTerm(`task_${activeTaskId}`);
      project.savedState = {
        taskId: activeTaskId,
        task: task,
        timestamp: Date.now()
      };
    }

    this.memory.setLongTerm(`paused_project_${projectId}`, project);
    this.activeProjects.delete(projectId);
    
    return true;
  }

  async resumeProject(projectId) {
    const savedProject = this.memory.getLongTerm(`paused_project_${projectId}`);
    if (!savedProject) {
      throw new Error(`Paused project ${projectId} not found`);
    }

    // Restore project state
    savedProject.status = 'active';
    savedProject.resumeTime = Date.now();
    savedProject.pausedDuration = savedProject.resumeTime - savedProject.pauseTime;
    
    this.activeProjects.set(projectId, savedProject);

    // Resume task if one was active
    if (savedProject.savedState?.taskId) {
      await this.taskManager.resumeTask(
        savedProject.savedState.taskId,
        savedProject.savedState.task
      );
      this.currentTaskId = savedProject.savedState.taskId;
    }

    return {
      success: true,
      projectId,
      resumedAt: savedProject.resumeTime
    };
  }

  // AGENT STATUS AND MONITORING

  getStatus() {
    return {
      agentId: this.agentId,
      status: this.status,
      currentTask: this.currentTaskId,
      activeProjects: this.activeProjects.size,
      completedProjects: this.completedProjects.size,
      uptime: Date.now() - this.metrics.uptime,
      metrics: this.metrics,
      memory: this.memory.getStats(),
      llmStatus: this.llmClient.getStats(),
      subagentStatus: this.subagentOrchestrator.getStats(),
      capabilities: {
        multiAgent: true,
        contextEngineering: true,
        toolOptimization: true,
        structuredNotes: true
      }
    };
  }

  getProjectStatus(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project) {
      const completed = this.completedProjects.get(projectId);
      return completed || null;
    }

    const taskStatus = this.currentTaskId ? 
      this.taskManager.getTaskStatus(this.currentTaskId) : null;

    return {
      ...project,
      currentTask: taskStatus,
      progress: this._calculateProjectProgress(project)
    };
  }

  // CONFIGURATION MANAGEMENT

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configs
    if (newConfig.memoryOptions) {
      // Memory system would need reinitialization in real implementation
      console.log('Memory configuration updated');
    }
    
    if (newConfig.llmConfig) {
      this.llmClient = new LLMClient(newConfig.llmConfig);
    }
    
    if (newConfig.toolConfig) {
      this.tools = new ToolSystem(newConfig.toolConfig);
    }

    this._emit('config.updated', { newConfig });
  }

  // EVENT HANDLING

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // CLEANUP

  async shutdown() {
    this._setStatus('shutting_down');
    
    // Pause active tasks
    for (const [projectId] of this.activeProjects) {
      await this.pauseProject(projectId);
    }
    
    // Cleanup memory
    if (this.config.autoCleanup) {
      this.memory.cleanup();
    }
    
    this._setStatus('shutdown');
    this._emit('shutdown', { agentId: this.agentId });
  }

  // PRIVATE METHODS

  async _executeResearchPlan(taskPlan, projectId) {
    const results = [];
    
    for (const subtask of taskPlan.subtasks) {
      this._emit('subtask.start', { subtask, projectId });
      
      try {
        const taskResult = await this.taskManager.executeTask(subtask.id, {
          projectId,
          goal: taskPlan.goal
        });
        
        results.push({
          subtaskId: subtask.id,
          title: subtask.title,
          success: true,
          result: taskResult
        });
        
        this._emit('subtask.completed', { subtask, projectId, result: taskResult });
        
      } catch (error) {
        results.push({
          subtaskId: subtask.id,
          title: subtask.title,
          success: false,
          error: error.message
        });
        
        this._emit('subtask.failed', { subtask, projectId, error: error.message });
        
        // Continue execution unless critical error
        if (error.critical) {
          throw error;
        }
      }
    }

    return results;
  }

  async _completeProject(projectId, results, report) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;

    project.status = 'completed';
    project.endTime = Date.now();
    project.duration = project.endTime - project.startTime;
    project.results = results;
    project.report = report;

    // Move to completed projects
    this.completedProjects.set(projectId, project);
    this.activeProjects.delete(projectId);

    // Store final results
    this.memory.setLongTerm(`completed_project_${projectId}`, {
      project,
      results,
      report
    }, {
      importance: 0.9,
      tags: ['completed_project', project.goal.split(' ')[0]]
    });

    // Add to agent episodic memory
    this.memory.addEpisode({
      type: 'project_completion',
      projectId: projectId,
      goal: project.goal,
      results: results,
      startTime: project.startTime,
      endTime: project.endTime,
      success: true,
      metrics: {
        taskCount: results.length,
        successRate: results.filter(r => r.success).length / results.length,
        duration: project.duration
      }
    });

    // Update metrics
    this._updateMetrics(project, results);

    this._emit('project.completed', { projectId, project, success: true });
  }

  async _generateSessionSummary(session) {
    const completedGoals = session.completedGoals;
    const successfulGoals = completedGoals.filter(g => g.result.success);
    
    return {
      sessionId: session.id,
      goals: {
        total: session.goals.length,
        completed: completedGoals.length,
        successful: successfulGoals.length,
        failed: completedGoals.filter(g => !g.result.success).length
      },
      duration: Date.now() - session.startTime,
      averageTimePerGoal: completedGoals.length > 0 ? 
        (Date.now() - session.startTime) / completedGoals.length : 0,
      successRate: completedGoals.length > 0 ? 
        successfulGoals.length / completedGoals.length : 0
    };
  }

  _calculateProjectProgress(project) {
    if (!project.subtasks) return 0;
    
    const completed = project.subtasks.filter(st => st.status === 'completed').length;
    return project.subtasks.length > 0 ? completed / project.subtasks.length : 0;
  }

  _updateMetrics(project, results) {
    this.metrics.tasksCompleted += results.filter(r => r.success).length;
    this.metrics.tasksFailed += results.filter(r => !r.success).length;
    this.metrics.totalProcessingTime += project.duration || 0;
    this.metrics.memoryUsage = this.memory.getStats().totalMemoryUsage;
  }

  _setStatus(status) {
    this.status = status;
    this._emit('status.changed', { status, timestamp: Date.now() });
  }

  _emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event listener error for ${event}:`, error);
        }
      }
    }
  }

  _initializeEventHandlers() {
    // Automatic cleanup on task completion
    this.on('task.completed', () => {
      if (this.config.autoCleanup) {
        setTimeout(() => this.memory.cleanup(), 5000);
      }
    });

    // Error handling with advanced recovery
    this.on('error', async ({ error, context }) => {
      console.error('Agent Error:', error);

      // Handle error with advanced recovery system
      try {
        const recovery = await this.errorRecovery.handleError(error, context);
        this.metrics.errorRecoveriesHandled++;

        console.log(`🔄 Error recovery attempted: ${recovery.strategy.name}`);

        // Store learning from error
        await this.continuousLearning.recordTaskExecution({
          task: context.task || 'unknown',
          success: recovery.result.success,
          duration: recovery.result.duration || 0,
          errors: [error.message],
          context: { ...context, recovery: recovery.strategy.name }
        });

      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError);
        if (this.config.errorCallback) {
          this.config.errorCallback(error);
        }
      }
    });

    // Progress tracking
    this.on('subtask.completed', ({ subtask }) => {
      console.log(`✅ Completed: ${subtask.title}`);
    });

    this.on('subtask.failed', ({ subtask, error }) => {
      console.log(`❌ Failed: ${subtask.title} - ${error}`);
    });

    // Learning events
    this.on('task.completed', async (data) => {
      await this.continuousLearning.recordTaskExecution({
        task: data.task || 'completed_task',
        success: true,
        duration: data.duration || 0,
        tools: data.tools || [],
        context: data.context || {}
      });
    });

    // Strategic planning events
    this.on('strategic_plan.created', (data) => {
      this.metrics.strategicPlansCreated++;
      console.log(`📋 Strategic plan created: ${data.planId}`);
    });

    // Deliverable events
    this.on('deliverable.generated', (data) => {
      this.metrics.deliverablesGenerated++;
      console.log(`📄 Deliverable generated: ${data.deliverableId}`);
    });
  }

  // ENHANCED LONG-HORIZON METHODS

  /**
   * Create strategic plan for complex research goals
   */
  async createStrategicPlan(goal, options = {}) {
    try {
      this._setStatus('planning');

      const result = await this.strategicPlanner.createStrategicPlan(goal, {
        ...options,
        agentId: this.agentId,
        toolsAvailable: this.tools.getToolDefinitions(),
        workspace: this.config.workDirectory
      });

      if (result.success) {
        this._emit('strategic_plan.created', {
          planId: result.planId,
          goal,
          summary: result.summary
        });
      }

      this._setStatus('ready');
      return result;

    } catch (error) {
      this._setStatus('error');
      this._emit('error', { error, context: { operation: 'create_strategic_plan', goal } });
      throw error;
    }
  }

  /**
   * Execute strategic plan with adaptive management
   */
  async executeStrategicPlan(planId, options = {}) {
    try {
      this._setStatus('executing_strategic_plan');

      const phases = [];
      let currentPhase = await this.strategicPlanner.executeNextPhase(planId, {
        ...options,
        agentContext: this.getContext()
      });

      while (currentPhase && !currentPhase.completed) {
        phases.push(currentPhase);

        // Execute phase with error handling
        try {
          // Integrate with existing task execution system
          const phaseResult = await this._executePhaseWithRecovery(currentPhase, planId);
          currentPhase = phaseResult.nextPhase;

        } catch (phaseError) {
          console.error(`Phase execution failed:`, phaseError);
          // Continue to next phase or stop based on error severity
          if (currentPhase.critical) {
            throw phaseError;
          }
          currentPhase = await this.strategicPlanner.executeNextPhase(planId, {
            ...options,
            skipFailed: true
          });
        }
      }

      this._setStatus('ready');
      return {
        success: true,
        planId,
        phases,
        completed: true
      };

    } catch (error) {
      this._setStatus('error');
      this._emit('error', { error, context: { operation: 'execute_strategic_plan', planId } });
      throw error;
    }
  }

  /**
   * Create interactive deliverable
   */
  async createInteractiveDeliverable(projectId, options = {}) {
    try {
      const result = await this.deliverableSystem.createInteractiveDeliverable(projectId, {
        ...options,
        agentId: this.agentId,
        context: this.getContext()
      });

      if (result.success) {
        this._emit('deliverable.generated', {
          deliverableId: result.deliverableId,
          projectId,
          type: options.type || 'research_report'
        });
      }

      return result;

    } catch (error) {
      this._emit('error', { error, context: { operation: 'create_deliverable', projectId } });
      throw error;
    }
  }

  /**
   * Edit deliverable interactively
   */
  async editDeliverable(deliverableId, edits, options = {}) {
    try {
      return await this.deliverableSystem.editDeliverableSection(
        deliverableId,
        edits.sectionId,
        edits,
        options
      );

    } catch (error) {
      this._emit('error', { error, context: { operation: 'edit_deliverable', deliverableId } });
      throw error;
    }
  }

  /**
   * Export deliverable in multiple formats
   */
  async exportDeliverable(deliverableId, format, options = {}) {
    try {
      return await this.deliverableSystem.exportDeliverable(
        deliverableId,
        format,
        {
          ...options,
        agentId: this.agentId
        }
      );

    } catch (error) {
      this._emit('error', { error, context: { operation: 'export_deliverable', deliverableId, format } });
      throw error;
    }
  }

  /**
   * Get comprehensive agent status including advanced systems
   */
  getAdvancedStatus() {
    const baseStatus = this.getStatus();

    return {
      ...baseStatus,
      advancedSystems: {
        advancedMemory: this.advancedMemory.getMemoryStats(),
        strategicPlanner: this.strategicPlanner.getActivePlans(),
        errorRecovery: this.errorRecovery.getErrorStats(),
        continuousLearning: this.continuousLearning.getLearningStats(),
        deliverableSystem: {
          activeDeliverables: this.deliverableSystem.getActiveDeliverables(),
          availableTemplates: this.deliverableSystem.getAvailableTemplates(),
          exportFormats: this.deliverableSystem.getAvailableExportFormats()
        }
      },
      enhancedMetrics: this.metrics
    };
  }

  /**
   * Adapt system behavior based on learning
   */
  async adaptSystemBehavior() {
    try {
      this._setStatus('adapting');

      const result = await this.continuousLearning.adaptSystemBehavior();

      if (result.success) {
        this.metrics.learningCyclesCompleted++;
        console.log(`🧠 System adaptation completed: ${result.executedAdaptations.length} adaptations`);
      }

      this._setStatus('ready');
      return result;

    } catch (error) {
      this._setStatus('error');
      this._emit('error', { error, context: { operation: 'adapt_system_behavior' } });
      throw error;
    }
  }

  /**
   * Retrieve enhanced context with semantic understanding
   */
  async retrieveEnhancedContext(query, options = {}) {
    try {
      return await this.advancedMemory.retrieveWithContext(query, {
        ...options,
        agentId: this.agentId,
        currentProjects: Array.from(this.activeProjects.keys())
      });

    } catch (error) {
      console.error('Enhanced context retrieval failed:', error);
      // Fallback to base memory
      return this.memory.retrieveContext(query, options);
    }
  }

  /**
   * Create persistent session memory
   */
  async createSessionMemory(sessionId, goal, context = {}) {
    try {
      return await this.advancedMemory.createSessionMemory(sessionId, goal, {
        ...context,
        agentId: this.agentId,
        activeProjects: this.activeProjects.size,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Session memory creation failed:', error);
      throw error;
    }
  }

  /**
   * Update session memory with learning
   */
  async updateSessionMemory(sessionId, experience) {
    try {
      return await this.advancedMemory.updateSessionMemory(sessionId, {
        ...experience,
        agentId: this.agentId
      });

    } catch (error) {
      console.error('Session memory update failed:', error);
      return false;
    }
  }

  // Helper methods for enhanced capabilities
  async _executePhaseWithRecovery(phase, planId) {
    try {
      // This would integrate with the existing task execution system
      // with error recovery built in
      const executionData = {
        task: phase.phase?.title || 'strategic_phase',
        success: true,
        duration: Date.now(),
        tools: phase.phase?.tasks?.map(t => t.type) || [],
        context: { planId, phaseId: phase.phase?.id }
      };

      // Record execution for learning
      await this.continuousLearning.recordTaskExecution(executionData);

      return {
        success: true,
        phase: phase,
        nextPhase: null // Would be determined by strategic planner
      };

    } catch (error) {
      // Use error recovery system
      const recovery = await this.errorRecovery.handleError(error, {
        operation: 'execute_phase',
        phase,
        planId
      });

      return {
        success: recovery.result.success,
        phase,
        error,
        recovery: recovery.strategy.name,
        nextPhase: null
      };
    }
  }

  getContext() {
    return {
      agentId: this.agentId,
      status: this.status,
      activeProjects: this.activeProjects.size,
      completedProjects: this.completedProjects.size,
      uptime: Date.now() - this.metrics.uptime,
      memoryUsage: this.memory.getStats(),
      toolsAvailable: this.tools.getToolDefinitions()
    };
  }
}
