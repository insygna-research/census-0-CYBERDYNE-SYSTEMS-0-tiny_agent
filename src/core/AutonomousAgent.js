import { MemorySystem } from '../memory/MemorySystem.js';
import { TaskManager } from './TaskManager.js';
import { LLMClient } from '../llm/LLMClient.js';
import { ToolSystem } from '../tools/ToolSystem.js';
import { ReportGenerator } from './ReportGenerator.js';
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
    this.memory = new MemorySystem(this.config.memoryOptions);
    this.llmClient = new LLMClient(config.llmConfig || {});
    this.tools = new ToolSystem(config.toolConfig || {});
    this.taskManager = new TaskManager(this.memory, this.llmClient);
    this.reportGenerator = new ReportGenerator(this.memory, this.tools);

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
      uptime: Date.now()
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
      
      // Decompose task into actionable steps
      this._emit('task.start', { goal, projectId });
      
      const taskPlan = await this.taskManager.decomposeTask(goal, {
        projectId,
        config: options
      });

      // Execute research plan
      const results = await this._executeResearchPlan(taskPlan, projectId);

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
        metadata: report.metadata
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
      llmStatus: this.llmClient.getStats()
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

    // Error handling
    this.on('error', ({ error }) => {
      console.error('Agent Error:', error);
      if (this.config.errorCallback) {
        this.config.errorCallback(error);
      }
    });

    // Progress tracking
    this.on('subtask.completed', ({ subtask }) => {
      console.log(`✅ Completed: ${subtask.title}`);
    });

    this.on('subtask.failed', ({ subtask, error }) => {
      console.log(`❌ Failed: ${subtask.title} - ${error}`);
    });
  }
}
