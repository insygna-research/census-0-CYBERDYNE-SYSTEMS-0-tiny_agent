import { v4 as uuidv4 } from 'uuid';

/**
 * Advanced Strategic Planner for Long-Horizon Autonomous Research
 *
 * Provides hierarchical task planning with dynamic re-prioritization,
 * self-reflection capabilities, and adaptive execution strategies.
 */
export class StrategicPlanner {
  constructor(memorySystem, llmClient) {
    this.memory = memorySystem;
    this.llm = llmClient;
    this.activePlans = new Map();
    this.milestones = new Map();
    this.executionHistory = [];
    this.reflectionInterval = 5; // Reflect every 5 tasks
    this.adaptationThreshold = 0.3; // Adapt when success rate drops below 30%
  }

  /**
   * Create comprehensive strategic plan for long-horizon goals
   */
  async createStrategicPlan(goal, options = {}) {
    const planId = uuidv4();

    try {
      // Phase 1: Deep goal analysis and decomposition
      const goalAnalysis = await this._analyzeGoal(goal, options);

      // Phase 2: Hierarchical task structure creation
      const hierarchy = await this._createTaskHierarchy(goalAnalysis);

      // Phase 3: Milestone definition and sequencing
      const milestones = await this._defineMilestones(hierarchy);

      // Phase 4: Resource allocation and timeline planning
      const resourcePlan = await this._allocateResources(hierarchy, milestones, options);

      // Phase 5: Risk assessment and mitigation strategies
      const riskAssessment = await this._assessRisks(hierarchy, options);

      const strategicPlan = {
        id: planId,
        goal,
        createdAt: Date.now(),
        status: 'active',
        analysis: goalAnalysis,
        hierarchy,
        milestones,
        resources: resourcePlan,
        risks: riskAssessment,
        execution: {
          currentPhase: 0,
          completedMilestones: [],
          adaptHistory: [],
          performance: {
            totalTasks: 0,
            completedTasks: 0,
            successRate: 0,
            averageExecutionTime: 0
          }
        },
        metadata: {
          estimatedDuration: this._estimateDuration(hierarchy),
          complexity: goalAnalysis.complexity,
          confidence: goalAnalysis.confidence,
          lastUpdated: Date.now()
        }
      };

      // Store plan in memory
      this.activePlans.set(planId, strategicPlan);
      await this.memory.setLongTerm(`strategic_plan_${planId}`, strategicPlan, {
        importance: 0.9,
        tags: ['strategic_plan', 'long_horizon', goal.toLowerCase().split(' ').slice(0, 3)]
      });

      return {
        success: true,
        planId,
        plan: strategicPlan,
        summary: this._generatePlanSummary(strategicPlan)
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        planId
      };
    }
  }

  /**
   * Adaptive execution with dynamic re-prioritization
   */
  async executeNextPhase(planId, context = {}) {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Strategic plan ${planId} not found`);
    }

    try {
      // Check if we need reflection and adaptation
      if (plan.execution.totalTasks > 0 && plan.execution.totalTasks % this.reflectionInterval === 0) {
        await this._reflectAndAdapt(planId, context);
      }

      // Determine next phase based on current progress
      const nextPhase = this._determineNextPhase(plan);
      if (!nextPhase) {
        return { success: true, completed: true, message: 'All phases completed' };
      }

      // Execute phase with adaptive strategies
      const phaseResult = await this._executePhase(planId, nextPhase, context);

      // Update plan state
      await this._updatePlanProgress(planId, phaseResult);

      return {
        success: true,
        phase: nextPhase,
        result: phaseResult,
        nextRecommendations: this._generateNextRecommendations(plan, phaseResult)
      };

    } catch (error) {
      await this._handleExecutionFailure(planId, error);
      throw error;
    }
  }

  /**
   * Self-reflection and adaptive learning
   */
  async _reflectAndAdapt(planId, context) {
    const plan = this.activePlans.get(planId);
    const recentPerformance = this._analyzeRecentPerformance(plan);

    // Generate reflection prompt
    const reflectionPrompt = this._buildReflectionPrompt(plan, recentPerformance, context);

    try {
      const reflection = await this.llm.generate(reflectionPrompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const reflectionData = JSON.parse(reflection.content);

      // Apply adaptations if needed
      if (reflectionData.adaptations && reflectionData.adaptations.length > 0) {
        await this._applyAdaptations(planId, reflectionData.adaptations);
      }

      // Store reflection in memory
      await this.memory.addEpisode({
        type: 'strategic_reflection',
        planId,
        performance: recentPerformance,
        reflections: reflectionData,
        timestamp: Date.now()
      });

    } catch (error) {
      console.warn('Reflection failed, proceeding without adaptation:', error.message);
    }
  }

  /**
   * Deep goal analysis with complexity assessment
   */
  async _analyzeGoal(goal, options) {
    const analysisPrompt = `You are an expert strategic analyzer. Analyze this research goal for complexity, feasibility, and execution requirements.

GOAL: ${goal}
CONTEXT: ${JSON.stringify(options, null, 2)}

Provide analysis in JSON format:
{
  "complexity": "low|medium|high|very_high",
  "confidence": 0.0-1.0,
  "estimatedPhases": number,
  "keyDomains": ["domain1", "domain2"],
  "criticalDependencies": ["dependency1", "dependency2"],
  "successFactors": ["factor1", "factor2"],
  "potentialChallenges": ["challenge1", "challenge2"],
  "resourceRequirements": {
    "time": "hours/days/weeks",
    "tools": ["tool1", "tool2"],
    "expertise": ["area1", "area2"]
  },
  "uncertainties": ["uncertainty1", "uncertainty2"]
}`;

    try {
      const response = await this.llm.generate(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 1500
      });

      return JSON.parse(response.content);
    } catch (error) {
      // Fallback analysis
      return {
        complexity: goal.length > 100 ? 'high' : 'medium',
        confidence: 0.7,
        estimatedPhases: Math.ceil(goal.split('and').length),
        keyDomains: this._extractDomains(goal),
        criticalDependencies: [],
        successFactors: ['Clear objectives', 'Systematic approach'],
        potentialChallenges: ['Information availability', 'Complexity management'],
        resourceRequirements: {
          time: '2-4 hours',
          tools: ['web search', 'analysis'],
          expertise: ['research', 'analysis']
        },
        uncertainties: ['Source availability', 'Technical complexity']
      };
    }
  }

  /**
   * Create hierarchical task structure
   */
  async _createTaskHierarchy(goalAnalysis) {
    const hierarchyPrompt = `Based on this goal analysis, create a hierarchical task structure for systematic execution.

GOAL ANALYSIS:
${JSON.stringify(goalAnalysis, null, 2)}

Create task hierarchy in JSON format:
{
  "phases": [
    {
      "id": "phase_1",
      "title": "Phase Title",
      "objective": "Clear objective for this phase",
      "tasks": [
        {
          "id": "task_1_1",
          "title": "Task Title",
          "description": "Detailed task description",
          "type": "research|analysis|synthesis|validation",
          "priority": "high|medium|low",
          "estimatedTime": "minutes",
          "dependencies": [],
          "successCriteria": ["criteria1", "criteria2"],
          "tools": ["tool1", "tool2"]
        }
      ],
      "deliverables": ["deliverable1", "deliverable2"],
      "completionCriteria": ["criteria1", "criteria2"]
    }
  ],
  "executionStrategy": "sequential|parallel|adaptive",
  "coordinationPoints": ["point1", "point2"]
}`;

    try {
      const response = await this.llm.generate(hierarchyPrompt, {
        temperature: 0.3,
        maxTokens: 2500
      });

      return JSON.parse(response.content);
    } catch (error) {
      return this._createFallbackHierarchy(goalAnalysis);
    }
  }

  /**
   * Define progress milestones
   */
  async _defineMilestones(hierarchy) {
    const milestones = [];

    hierarchy.phases.forEach((phase, index) => {
      milestones.push({
        id: `milestone_${index + 1}`,
        title: `Complete ${phase.title}`,
        description: phase.objective,
        phaseId: phase.id,
        criteria: phase.completionCriteria,
        deliverables: phase.deliverables,
        estimatedCompletion: this._estimatePhaseCompletion(phase),
        status: 'pending',
        dependencies: index > 0 ? [`milestone_${index}`] : []
      });
    });

    // Add final synthesis milestone
    milestones.push({
      id: 'milestone_final',
      title: 'Research Synthesis and Reporting',
      description: 'Integrate all findings and generate comprehensive report',
      phaseId: 'final',
      criteria: ['All phases completed', 'Findings synthesized', 'Report generated'],
      deliverables: ['Executive summary', 'Detailed findings', 'Recommendations'],
      estimatedCompletion: '30 minutes',
      status: 'pending',
      dependencies: [`milestone_${hierarchy.phases.length}`]
    });

    return milestones;
  }

  /**
   * Resource allocation and timeline planning
   */
  async _allocateResources(hierarchy, milestones, options) {
    const totalTime = milestones.reduce((sum, m) => {
      const time = parseInt(m.estimatedCompletion) || 30;
      return sum + time;
    }, 0);

    return {
      timeline: {
        estimatedTotalTime: `${totalTime} minutes`,
        phases: hierarchy.phases.map(phase => ({
          id: phase.id,
          title: phase.title,
          estimatedTime: phase.tasks.reduce((sum, task) => sum + (parseInt(task.estimatedTime) || 30), 0),
          parallelizable: this._canRunParallel(phase.tasks)
        }))
      },
      tools: this._identifyRequiredTools(hierarchy),
      contingencies: {
        extraTime: Math.round(totalTime * 0.25), // 25% buffer
        alternativeApproaches: ['Simplify scope', 'Extend timeline', 'Additional resources']
      }
    };
  }

  /**
   * Risk assessment and mitigation
   */
  async _assessRisks(hierarchy, options) {
    return {
      identifiedRisks: [
        {
          id: 'risk_1',
          type: 'execution',
          description: 'Complex tasks may take longer than estimated',
          probability: 'medium',
          impact: 'medium',
          mitigation: 'Build in buffer time and progress monitoring'
        },
        {
          id: 'risk_2',
          type: 'resource',
          description: 'Required tools may be unavailable',
          probability: 'low',
          impact: 'high',
          mitigation: 'Have backup tools and alternative approaches'
        },
        {
          id: 'risk_3',
          type: 'information',
          description: 'Key information may be difficult to obtain',
          probability: 'medium',
          impact: 'medium',
          mitigation: 'Multiple source strategies and iterative refinement'
        }
      ],
      mitigationStrategies: [
        'Regular progress reviews and adaptation',
        'Fallback tool options',
        'Iterative approach with validation checkpoints'
      ]
    };
  }

  // Helper methods
  _extractDomains(goal) {
    const domains = ['research', 'analysis', 'technical', 'business'];
    return domains.filter(domain => goal.toLowerCase().includes(domain));
  }

  _createFallbackHierarchy(goalAnalysis) {
    return {
      phases: [
        {
          id: 'phase_1',
          title: 'Initial Research and Discovery',
          objective: 'Gather foundational information',
          tasks: [
            {
              id: 'task_1_1',
              title: 'Comprehensive Web Research',
              description: 'Search for relevant information and sources',
              type: 'research',
              priority: 'high',
              estimatedTime: '60',
              dependencies: [],
              successCriteria: ['Multiple relevant sources found'],
              tools: ['web_search', 'web_fetch']
            }
          ],
          deliverables: ['Research findings', 'Source list'],
          completionCriteria: ['Research completed', 'Sources validated']
        }
      ],
      executionStrategy: 'sequential',
      coordinationPoints: ['Research completion']
    };
  }

  _estimatePhaseCompletion(phase) {
    const totalTime = phase.tasks.reduce((sum, task) => {
      const time = parseInt(task.estimatedTime) || 30;
      return sum + time;
    }, 0);
    return `${totalTime} minutes`;
  }

  _canRunParallel(tasks) {
    return tasks.filter(task => task.dependencies.length === 0).length > 1;
  }

  _identifyRequiredTools(hierarchy) {
    const tools = new Set();
    hierarchy.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        task.tools.forEach(tool => tools.add(tool));
      });
    });
    return Array.from(tools);
  }

  _generatePlanSummary(plan) {
    return {
      goal: plan.goal,
      estimatedDuration: plan.metadata.estimatedDuration,
      phases: plan.hierarchy.phases.length,
      milestones: plan.milestones.length,
      complexity: plan.metadata.complexity,
      confidence: plan.metadata.confidence
    };
  }

  async _updatePlanProgress(planId, phaseResult) {
    const plan = this.activePlans.get(planId);
    plan.execution.totalTasks++;
    if (phaseResult.success) {
      plan.execution.completedTasks++;
    }

    // Update success rate
    plan.execution.performance.successRate =
      plan.execution.completedTasks / plan.execution.totalTasks;

    plan.metadata.lastUpdated = Date.now();

    // Save updated plan
    await this.memory.setLongTerm(`strategic_plan_${planId}`, plan, {
      importance: 0.9,
      tags: ['strategic_plan', 'updated']
    });
  }

  _determineNextPhase(plan) {
    const currentPhaseIndex = plan.execution.currentPhase;
    if (currentPhaseIndex < plan.hierarchy.phases.length) {
      return plan.hierarchy.phases[currentPhaseIndex];
    }
    return null;
  }

  async _executePhase(planId, phase, context) {
    // This would integrate with the existing task execution system
    return {
      success: true,
      phaseId: phase.id,
      executionTime: Date.now(),
      results: `Phase ${phase.title} executed successfully`,
      nextPhaseReady: true
    };
  }

  _analyzeRecentPerformance(plan) {
    // Analyze last few tasks for performance trends
    return {
      successRate: plan.execution.performance.successRate,
      averageTime: plan.execution.performance.averageExecutionTime,
      trends: 'stable' // Would be calculated from actual data
    };
  }

  _buildReflectionPrompt(plan, performance, context) {
    return `You are a reflective strategic planner. Review recent performance and suggest adaptations.

RECENT PERFORMANCE:
${JSON.stringify(performance, null, 2)}

PLAN STATUS:
${JSON.stringify(plan.execution, null, 2)}

CONTEXT: ${JSON.stringify(context, null, 2)}

Provide reflection in JSON format:
{
  "overallAssessment": "excellent|good|acceptable|concerning",
  "keyInsights": ["insight1", "insight2"],
  "performanceIssues": ["issue1", "issue2"],
  "adaptations": [
    {
      "type": "prioritization|strategy|resources",
      "description": "What to change",
      "rationale": "Why this change is needed",
      "expectedImpact": "expected outcome"
    }
  ],
  "nextSteps": ["step1", "step2"]
}`;
  }

  async _applyAdaptations(planId, adaptations) {
    const plan = this.activePlans.get(planId);

    adaptations.forEach(adaptation => {
      plan.execution.adaptHistory.push({
        ...adaptation,
        timestamp: Date.now()
      });
    });

    plan.metadata.lastUpdated = Date.now();

    // Store adapted plan
    await this.memory.setLongTerm(`strategic_plan_${planId}`, plan, {
      importance: 0.9,
      tags: ['strategic_plan', 'adapted']
    });
  }

  async _handleExecutionFailure(planId, error) {
    const plan = this.activePlans.get(planId);

    await this.memory.addEpisode({
      type: 'execution_failure',
      planId,
      error: error.message,
      timestamp: Date.now(),
      context: {
        currentPhase: plan.execution.currentPhase,
        completedTasks: plan.execution.completedTasks
      }
    });
  }

  _generateNextRecommendations(plan, phaseResult) {
    return [
      'Continue with next phase as planned',
      'Monitor performance metrics',
      'Validate deliverables before proceeding'
    ];
  }

  _estimateDuration(hierarchy) {
    const totalMinutes = hierarchy.phases.reduce((sum, phase) => {
      return sum + phase.tasks.reduce((taskSum, task) => {
        return taskSum + (parseInt(task.estimatedTime) || 30);
      }, 0);
    }, 0);

    const hours = Math.ceil(totalMinutes / 60);
    return hours > 1 ? `${hours} hours` : `${totalMinutes} minutes`;
  }

  // Public interface methods
  getActivePlans() {
    return Array.from(this.activePlans.entries()).map(([id, plan]) => ({
      id,
      goal: plan.goal,
      status: plan.status,
      progress: plan.execution.completedTasks / plan.hierarchy.phases.length,
      lastUpdated: plan.metadata.lastUpdated
    }));
  }

  getPlanDetails(planId) {
    return this.activePlans.get(planId);
  }

  async updatePlan(planId, updates) {
    const plan = this.activePlans.get(planId);
    if (plan) {
      Object.assign(plan, updates);
      plan.metadata.lastUpdated = Date.now();

      await this.memory.setLongTerm(`strategic_plan_${planId}`, plan, {
        importance: 0.9,
        tags: ['strategic_plan', 'updated']
      });

      return true;
    }
    return false;
  }
}