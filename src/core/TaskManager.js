import { v4 as uuidv4 } from 'uuid';

export class TaskManager {
  constructor(memorySystem, llmClient) {
    this.memorySystem = memorySystem;
    this.llmClient = llmClient;
    this.activeTasks = new Map();
    this.taskQueue = [];
    this.taskDependencies = new Map();
    this.completedTasks = new Map();
    this.maxConcurrency = 3;
  }

  // Main task decomposition and planning
  async decomposeTask(goal, context = {}) {
    const decompositionPrompt = this._buildDecompositionPrompt(goal, context);
    
    try {
      const response = await this.llmClient.generate(decompositionPrompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const plan = this._parseTaskPlan(response.content);
      return await this._createTaskStructure(goal, plan, context);
    } catch (error) {
      console.error('Task decomposition failed:', error);
      return this._createFallbackTask(goal, context);
    }
  }

  // Task execution orchestration
  async executeTask(taskId, input = {}) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Set task to in_progress
    task.status = 'in_progress';
    task.startTime = Date.now();
    task.progress = 0;

    try {
      // Check dependencies
      await this._checkDependencies(task);

      // Execute based on task type
      let result;
      switch (task.type) {
        case 'research':
          result = await this._executeResearchTask(task, input);
          break;
        case 'file_operation':
          result = await this._executeFileTask(task, input);
          break;
        case 'web_search':
          result = await this._executeWebSearchTask(task, input);
          break;
        case 'report_generation':
          result = await this._executeReportTask(task, input);
          break;
        case 'analysis':
          result = await this._executeAnalysisTask(task, input);
          break;
        default:
          result = await this._executeGenericTask(task, input);
      }

      // Complete the task
      await this._completeTask(taskId, result);
      return result;

    } catch (error) {
      await this._failTask(taskId, error);
      throw error;
    }
  }

  // Resume task from saved state
  async resumeTask(taskId, savedState) {
    const task = this._restoreTaskFromState(savedState);
    this.activeTasks.set(taskId, task);
    
    // Restore context from memory
    const context = this.memorySystem.retrieveContext(task.goal);
    task.context = context;

    return task;
  }

  // Task monitoring and status updates
  getTaskStatus(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) return null;

    return {
      id: taskId,
      goal: task.goal,
      status: task.status,
      progress: task.progress,
      startTime: task.startTime,
      endTime: task.endTime,
      subtasks: task.subtasks?.map(st => ({
        id: st.id,
        title: st.title,
        status: st.status,
        progress: st.progress
      })),
      results: task.results,
      errors: task.errors
    };
  }

  // Get all active tasks
  getActiveTasks() {
    return Array.from(this.activeTasks.entries()).map(([id, task]) => ({
      id,
      goal: task.goal,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt
    }));
  }

  // Cancel task
  async cancelTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;

    task.status = 'cancelled';
    task.endTime = Date.now();

    // Cancel subtasks
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        await this.cancelTask(subtask.id);
      }
    }

    // Move to completed with cancelled status
    this.completedTasks.set(taskId, task);
    this.activeTasks.delete(taskId);

    return true;
  }

  // INTERNAL METHODS

  _buildDecompositionPrompt(goal, context) {
    return `You are an advanced task decomposition AI. Given a goal, break it down into manageable subtasks.

GOAL: ${goal}

CONTEXT: ${JSON.stringify(context)}

Please break this down into:
1. Main research/analysis tasks
2. Data gathering tasks  
3. Processing/analysis tasks
4. Output generation tasks
5. Validation tasks

For each task provide:
- title: Clear description
- type: research|web_search|file_operation|analysis|report_generation
- description: What this task accomplishes
- dependencies: Array of task IDs this depends on
- estimated_time: Time estimate in minutes
- priority: high|medium|low
- tools_needed: Array of required tools

Format as JSON array. Focus on creating sequential, logical steps that build upon each other.`;
  }

  _parseTaskPlan(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      // Fallback parsing if JSON is malformed
      const lines = response.split('\n').filter(line => line.trim());
      return this._structureTasksFromText(lines);
    }
  }

  _structureTasksFromText(lines) {
    const tasks = [];
    let currentTask = null;

    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^-/)) {
        if (currentTask) tasks.push(currentTask);
        
        currentTask = {
          title: line.replace(/^[\d\.\-\s]+/, '').trim(),
          type: 'research',
          description: line.replace(/^[\d\.\-\s]+/, '').trim(),
          dependencies: [],
          estimated_time: 30,
          priority: 'medium',
          tools_needed: []
        };
      }
    }

    if (currentTask) tasks.push(currentTask);
    return tasks;
  }

  async _createTaskStructure(goal, plan, context) {
    const taskId = uuidv4();
    
    const task = {
      id: taskId,
      goal: goal,
      plan: plan,
      context: context,
      status: 'planned',
      createdAt: Date.now(),
      subtasks: [],
      dependencies: [],
      results: {},
      errors: [],
      progress: 0
    };

    // Create subtasks
    for (const subtaskData of plan) {
      const subtask = {
        id: uuidv4(),
        parentTaskId: taskId,
        ...subtaskData,
        status: 'planned',
        createdAt: Date.now(),
        results: null,
        errors: []
      };
      
      task.subtasks.push(subtask);
      this.taskDependencies.set(subtask.id, subtaskData.dependencies || []);
    }

    // Store in active tasks
    this.activeTasks.set(taskId, task);

    // Cache in memory system
    this.memorySystem.setShortTerm(`task_${taskId}`, task, 86400000); // 24 hours

    return task;
  }

  _createFallbackTask(goal, context) {
    return this._createTaskStructure(goal, [{
      title: `Complete: ${goal}`,
      type: 'research',
      description: `Execute the requested task: ${goal}`,
      dependencies: [],
      estimated_time: 60,
      priority: 'high',
      tools_needed: []
    }], context);
  }

  async _checkDependencies(task) {
    for (const depId of task.dependencies) {
      const depTask = this.activeTasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        throw new Error(`Dependency ${depId} not completed`);
      }
    }
  }

  async _executeResearchTask(task, input) {
    // This would integrate with research tools
    const result = {
      type: 'research',
      data: await this._performResearch(task.description, input),
      timestamp: Date.now()
    };

    task.progress = 100;
    return result;
  }

  async _executeFileTask(task, input) {
    // File operations would go here
    const result = {
      type: 'file_operation',
      operation: task.description,
      data: `File operation completed for: ${task.title}`,
      timestamp: Date.now()
    };

    task.progress = 100;
    return result;
  }

  async _executeWebSearchTask(task, input) {
    // Web search integration would go here
    const result = {
      type: 'web_search',
      query: task.description,
      data: await this._performWebSearch(task.description, input),
      timestamp: Date.now()
    };

    task.progress = 100;
    return result;
  }

  async _executeReportTask(task, input) {
    // Report generation logic
    const result = {
      type: 'report_generation',
      title: task.title,
      data: await this._generateReport(task.description, input),
      timestamp: Date.now()
    };

    task.progress = 100;
    return result;
  }

  async _executeAnalysisTask(task, input) {
    // Analysis logic
    const result = {
      type: 'analysis',
      subject: task.description,
      data: await this._performAnalysis(task.description, input),
      timestamp: Date.now()
    };

    task.progress = 100;
    return result;
  }

  async _executeGenericTask(task, input) {
    // Generic task execution
    const result = {
      type: 'generic',
      title: task.title,
      data: await this._executeGenericLogic(task.description, input),
      timestamp: Date.now()
    };

    task.progress = 100;
    return result;
  }

  async _completeTask(taskId, result) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.endTime = Date.now();
    task.results = result;
    task.progress = 100;

    // Store in memory system
    this.memorySystem.setLongTerm(`completed_task_${taskId}`, {
      task: task,
      result: result
    }, {
      importance: 0.8,
      tags: ['completed_task', task.type]
    });

    // Add to episodic memory
    this.memorySystem.addEpisode({
      type: 'task_completion',
      taskId: taskId,
      goal: task.goal,
      results: result,
      startTime: task.startTime,
      endTime: task.endTime,
      success: true
    });

    // Move from active to completed
    this.completedTasks.set(taskId, task);
    this.activeTasks.delete(taskId);
  }

  async _failTask(taskId, error) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.endTime = Date.now();
    task.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });

    // Store error in memory
    this.memorySystem.setLongTerm(`failed_task_${taskId}`, {
      task: task,
      error: error.message
    }, {
      importance: 0.6,
      tags: ['failed_task', task.type]
    });

    this.completedTasks.set(taskId, task);
    this.activeTasks.delete(taskId);
  }

  _restoreTaskFromState(savedState) {
    // Restore task from serialized state
    return {
      ...savedState,
      status: 'resumed',
      results: savedState.results || {},
      errors: savedState.errors || []
    };
  }

  // Placeholder methods - these would be implemented with actual tool integrations
  async _performResearch(description, input) {
    return { research: "Research results would go here" };
  }

  async _performWebSearch(query, input) {
    return { search: "Web search results would go here" };
  }

  async _generateReport(description, input) {
    return { report: "Generated report content would go here" };
  }

  async _performAnalysis(description, input) {
    return { analysis: "Analysis results would go here" };
  }

  async _executeGenericLogic(description, input) {
    return { generic: "Generic task execution would go here" };
  }
}
