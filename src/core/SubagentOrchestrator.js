import { v4 as uuidv4 } from 'uuid';

// ANTHROPIC INSIGHT: Subagent architecture for parallel exploration and synthesis
export class SubagentOrchestrator {
  constructor(memorySystem, llmClient, toolSystem) {
    this.memory = memorySystem;
    this.llmClient = llmClient;
    this.tools = toolSystem;
    this.activeSubagents = new Map();
    this.maxConcurrent = 4;
    this.subagentPromptTemplates = this._initPromptTemplates();
  }

  // ANTHROPIC INSIGHT: Lead agent orchestrates specialized subagents for parallel tasks
  async orchestrateResearch(goal, context = {}) {
    const sessionId = uuidv4();
    
    try {
      // Step 1: Lead agent analyzes and decomposes task
      const taskDecomposition = await this._decomposeTask(goal, context);
      
      // Step 2: Create specialized subagents
      const subagents = await this._createSubagents(taskDecomposition);
      
      // Step 3: Execute subagents in parallel
      const results = await this._executeSubagentsParallel(subagents);
      
      // Step 4: Synthesize results and create final response
      const synthesis = await this._synthesizeResults(goal, results, context);
      
      return {
        success: true,
        sessionId,
        goal,
        synthesis,
        subagentCount: subagents.length,
        executionTime: Date.now() - Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sessionId
      };
    }
  }

  // ANTHROPIC INSIGHT: Intelligent task decomposition based on research patterns
  async _decomposeTask(goal, context) {
    const decompositionPrompt = this.subagentPromptTemplates.taskDecomposition
      .replace('{{GOAL}}', goal)
      .replace('{{CONTEXT}}', JSON.stringify(context, null, 2));

    try {
      const response = await this.llmClient.generate(decompositionPrompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const plan = this._parseDecomposition(response.content);
      
      // Store plan in memory for traceability
      await this.memory.setLongTerm(`task_plan_${this._generatePlanId(goal)}`, plan, {
        importance: 0.9,
        tags: ['task_decomposition', 'research_plan']
      });

      return plan;
    } catch (error) {
      console.error('Task decomposition failed:', error);
      return this._fallbackDecomposition(goal);
    }
  }

  // ANTHROPIC INSIGHT: Create specialized subagents with clear roles
  async _createSubagents(taskDecomposition) {
    const subagents = [];
    
    for (const subtask of taskDecomposition.subtasks) {
      const subagentId = uuidv4();
      
      // Configure subagent with role-specific capabilities
      const subagent = {
        id: subagentId,
        type: subtask.type || 'research',
        goal: subtask.goal,
        role: subtask.role || 'researcher',
        scope: subtask.scope || 'broad',
        focus: subtask.focus || 'general',
        maxIterations: subtask.maxIterations || 3,
        toolsRequired: subtask.toolsRequired || this._getDefaultTools(subtask.type),
        context: {
          parentGoal: taskDecomposition.primaryGoal,
          subtaskId: subagentId,
          sessionId: taskDecomposition.sessionId
        }
      };

      subagents.push(subagent);
      this.activeSubagents.set(subagentId, subagent);
    }

    return subagents;
  }

  // ANTHROPIC INSIGHT: Parallel execution with coordination
  async _executeSubagentsParallel(subagents) {
    const batchSize = Math.min(subagents.length, this.maxConcurrent);
    const results = [];
    
    // Execute in batches to avoid overwhelming resources
    for (let i = 0; i < subagents.length; i += batchSize) {
      const batch = subagents.slice(i, i + batchSize);
      const batchPromises = batch.map(subagent => this._executeSubagent(subagent));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        for (const [index, result] of batchResults.entries()) {
          const subagent = batch[index];
          
          if (result.status === 'fulfilled') {
            results.push({
              subagentId: subagent.id,
              role: subagent.role,
              goal: subagent.goal,
              success: true,
              result: result.value,
              executionTime: result.value.executionTime
            });
          } else {
            results.push({
              subagentId: subagent.id,
              role: subagent.role,
              goal: subagent.goal,
              success: false,
              error: result.reason.message
            });
          }
        }
        
        // Optional: Coordination point between batches
        if (i + batchSize < subagents.length) {
          await this._coordinateBatchProgress(results);
        }
        
      } catch (error) {
        console.error('Batch execution failed:', error);
      }
    }
    
    return results;
  }

  // ANTHROPIC INSIGHT: Individual subagent execution with focused prompts
  async _executeSubagent(subagent) {
    const startTime = Date.now();
    let currentContext = {...subagent.context};
    let iterations = 0;
    let results = [];

    try {
      const promptTemplate = this.subagentPromptTemplates[subagent.type] || 
                           this.subagentPromptTasks.research;
      
      while (iterations < subagent.maxIterations) {
        iterationPrompt = promptTemplate
          .replace('{{GOAL}}', subagent.goal)
          .replace('{{ROLE}}', subagent.role)
          .replace('{{FOCUS}}', subagent.focus)
          .replace('{{CONTEXT}}', JSON.stringify(currentContext, null, 2))
          .replace('{{PREVIOUS_RESULTS}}', JSON.stringify(results, null, 2));

        const response = await this.llmClient.generate(iterationPrompt, {
          temperature: 0.4,
          maxTokens: 2500
        });

        const iterationResult = this._parseSubagentResponse(response.content, subagent);
        results.push(iterationResult);

        // Check if subagent should continue
        if (iterationResult.complete || iterationResult.sufficient) {
          break;
        }

        // Update context for next iteration
        currentContext = {
          ...currentContext,
          lastResult: iterationResult,
          iteration: iterations + 1
        };

        iterations++;
      }

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        subagentId: subagent.id,
        iterations,
        results,
        executionTime,
        finalContext: currentContext
      };

    } catch (error) {
      return {
        success: false,
        subagentId: subagent.id,
        error: error.message,
        iterations,
        executionTime: Date.now() - startTime
      };
    }
  }

  // ANTHROPIC INSIGHT: Synthesis step with intelligent combination of findings
  async _synthesizeResults(originalGoal, subagentResults, context) {
    const synthesisPrompt = this.subagentPromptTemplates.synthesis
      .replace('{{GOAL}}', originalGoal)
      .replace('{{CONTEXT}}', JSON.stringify(context, null, 2))
      .replace('{{SUBAGENT_RESULTS}}', JSON.stringify(subagentResults, null, 2));

    try {
      const response = await this.llmClient.generate(synthesisPrompt, {
        temperature: 0.3,
        maxTokens: 3000
      });

      const synthesis = this._parseSynthesis(response.content);
      
      // Create episodic memory of this multi-agent collaboration
      await this.memory.addEpisode({
        type: 'multi_agent_research',
        goal: originalGoal,
        subagentCount: subagentResults.length,
        successfulSubagents: subagentResults.filter(r => r.success).length,
        synthesis: synthesis.summary,
        findings: synthesis.findings,
        timestamp: Date.now()
      });

      return synthesis;

    } catch (error) {
      console.error('Synthesis failed:', error);
      return this._fallbackSynthesis(subagentResults);
    }
  }

  // ANTHROPIC INSIGHT: Prompt templates with proper structure and heuristics
  _initPromptTemplates() {
    return {
      taskDecomposition: `You are an expert research strategist. Your goal is to decompose a complex research query into parallelizable subtasks.

MAIN GOAL: {{GOAL}}
CONTEXT: {{CONTEXT}}

Create 3-5 specialized subtasks that can execute semi-independently. Each subtask should:
1. Have a clear, specific focus area
2. Be actionable within 2-3 iterations of tool use
3. Complement other subtasks rather than overlap
4. Target different aspects/scope of the main goal

For each subtask, provide:
- type: research|web|file|analysis
- role: expert title (e.g., "Web Research Specialist", "Data Analyst")
- goal: specific objective for this subtask
- focus: particular aspect to investigate
- scope: broad|targeted|deep
- maxIterations: recommended number of iterations
- toolsRequired: list of relevant tool types

Format as JSON array of subtask objects. Prioritize breadth-first exploration over depth.`,
        
      research: `You are {{ROLE}}, a specialized research agent focused on {{FOCUS}}.

CURRENT GOAL: {{GOAL}}
YOUR ROLE: {{ROLE}}
FOCUS AREA: {{FOCUS}}
CONTEXT: {{CONTEXT}}
PREVIOUS RESULTS: {{PREVIOUS_RESULTS}}

Use available tools to investigate your focus area. Your approach should:
1. Start with broad exploration, then narrow focus based on findings
2. Use 2-3 iterations maximum to gather relevant information
3. Return key findings, not exhaustive data
4. Coordinate with other subagents by avoiding overlap

TOOLS AVAILABLE:
- web_search: Use for discovering relevant information sources
- web_fetch: Use to extract content from specific URLs you find
- file_search: Look for relevant files if investigating local data
- analyze_text: Process and extract insights from gathered content

Respond with your findings in this format:
{
  "complete": true/false,
  "sufficient": true/false,
  "key_findings": [list of important discoveries],
  "sources_used": [list of sources examined],
  "recommendations": [what should be investigated next],
  "confidence": 0.0-1.0,
  "notes": "any additional insights or observations"
} `,

      synthesis: `You are the lead research synthesizer. Multiple specialized subagents have completed their research tasks.

ORIGINAL GOAL: {{GOAL}}
CONTEXT: {{CONTEXT}}

SUBAGENT RESULTS:
{{SUBAGENT_RESULTS}}

Your task is to synthesize these parallel findings into a coherent, comprehensive answer to the original goal.

ANALYSIS PROCESS:
1. Identify key themes and patterns across subagent results
2. Resolve any conflicts or inconsistencies  
3. Organize findings into logical sections
4. Provide actionable conclusions and next steps
5. Assess confidence and completeness of the research

SYNTHESIS STRUCTURE:
{
  "executive_summary": "high-level overview of key findings",
  "key_themes": ["main themes discovered across research"],
  "detailed_findings": {
    "section_1": {
      "finding": "specific discovery",
      "evidence": "supporting information from subagents",
      "sources": ["source references"]
    }
  },
  "confidence_assessment": {
    "overall": 0.0-1.0,
    "gaps": ["areas needing further investigation"],
    "strengths": ["well-supported conclusions"]
  },
  "recommendations": ["actionable next steps"],
  "complete_answer": boolean,
  "additional_research_needed": ["remaining questions"]
}

Focus on creating value through intelligent combination of parallel research efforts.`,
    
      coordination: `You are coordinating progress across multiple parallel subagents.

CURRENT STATUS: {{SUBAGENT_PROGRESS}}
MAIN GOAL: {{MAIN_GOAL}}

Review subagent progress and determine if any coordination is needed. Consider:
1. Are subagents duplicating efforts? Guide them apart.
2. Do any subagents need redirects based on others' findings?
3. Is the overall research on track for the main goal?
4. Should subagents adjust focus based on new discoveries?

Provide coordination guidance in JSON format with specific instructions for each subagent that needs guidance.`
    };
  }

  // Helper methods
  _parseDecomposition(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this._fallbackDecomposition('Research task');
    }
  }

  _fallbackDecomposition(goal) {
    return {
      primaryGoal: goal,
      subtasks: [
        {
          type: 'web',
          role: 'Web Research Specialist',
          goal: 'Search for online information and sources',
          focus: 'general',
          scope: 'broad',
          maxIterations: 3,
          toolsRequired: ['web_search', 'web_fetch']
        },
        {
          type: 'analysis',
          role: 'Information Analyst',
          goal: 'Analyze and synthesize gathered information',
          focus: 'analysis',
          scope: 'targeted',
          maxIterations: 2,
          toolsRequired: ['analyze_text']
        }
      ]
    };
  }

  _parseSubagentResponse(content, subagent) {
    try {
      const parsed = JSON.parse(content);
      return {
        ...parsed,
        subagentId: subagent.id,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        complete: true,
        sufficient: true,
        key_findings: ['Unable to parse structured response'],
        confidence: 0.3,
        raw_response: content.substring(0, 500)
      };
    }
  }

  _parseSynthesis(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        executive_summary: 'Research synthesis completed',
        key_themes: ['Research insights gathered'],
        complete_answer: false,
        raw_synthesis: content.substring(0, 1000)
      };
    }
  }

  _fallbackSynthesis(subagentResults) {
    const successful = subagentResults.filter(r => r.success);
    
    return {
      executive_summary: `Completed ${successful.length}/${subagentResults.length} parallel research tasks`,
      key_themes: ['Multiple investigation areas explored'],
      confidence_assessment: {
        overall: successful.length / subagentResults.length
      },
      complete_answer: false
    };
  }

  _getDefaultTools(taskType) {
    const toolMap = {
      web: ['web_search', 'web_fetch'],
      file: ['file_search', 'file_read'],
      analysis: ['analyze_text'],
      research: ['web_search', 'web_fetch', 'analyze_text']
    };
    
    return toolMap[taskType] || ['web_search'];
  }

  _generatePlanId(goal) {
    return goal.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
  }

  async _coordinateBatchProgress(results) {
    // Optional coordination between batches - could check for overlaps or opportunities
    // For now, this is a placeholder for potential future enhancement
    return true;
  }

  // Active subagent management
  getActiveSubagents() {
    return Array.from(this.activeSubagents.values());
  }

  async terminateSubagent(subagentId) {
    this.activeSubagents.delete(subagentId);
    return true;
  }

  // Statistics and monitoring
  getStats() {
    return {
      activeSubagents: this.activeSubagents.size,
      maxConcurrent: this.maxConcurrent,
      totalCompleted: 0, // Would track completed subagents
      averageExecutionTime: 0,
      coordinationEvents: 0
    };
  }
}
