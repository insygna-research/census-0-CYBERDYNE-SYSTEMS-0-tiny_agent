// ANTHROPIC INSIGHT: LLM-as-judge evaluation framework for measuring agent performance
export class EvaluationSystem {
  constructor(llmClient, memorySystem) {
    this.llmClient = llmClient;
    this.memory = memorySystem;
    this.evaluationTemplates = this._initEvaluationTemplates();
    this.history = [];
    this.metrics = {
      totalEvaluations: 0,
      averageScore: 0,
      evaluationTypes: new Set()
    };
  }

  // ANTHROPIC INSIGHT: Comprehensive evaluation of agent performance
  async evaluateAgentResponse(goal, response, context = {}) {
    const evaluationId = this._generateId();
    
    try {
      // Determine evaluation type based on response
      const evalType = this._determineEvaluationType(response);
      
      // Build evaluation prompt
      const evaluationPrompt = this.evaluationTemplates[evalType]
        .replace('{{GOAL}}', goal)
        .replace('{{RESPONSE}}', JSON.stringify(response, null, 2))
        .replace('{{CONTEXT}}', JSON.stringify(context, null, 2));

      // Get LLM judgment
      const llmResponse = await this.llmClient.generate(evaluationPrompt, {
        temperature: 0.2, // Lower temperature for more consistent evaluation
        maxTokens: 1500
      });

      const evaluation = this._parseEvaluation(llmResponse.content, evalType, evaluationId);
      
      // Store evaluation in memory
      await this.memory.setLongTerm(`evaluation_${evaluationId}`, evaluation, {
        importance: 0.7,
        tags: ['evaluation', evalType]
      });

      // Update metrics
      this._updateMetrics(evaluation);

      return evaluation;

    } catch (error) {
      console.error('Evaluation failed:', error);
      return this._createFallbackEvaluation(goal, response, evaluationId);
    }
  }

  // ANTHROPIC INSIGHT: Compare multiple agent responses
  async compareResponses(goal, responses, context = {}) {
    const comparisonPrompt = this.evaluationTemplates.comparison
      .replace('{{GOAL}}', goal)
      .replace('{{RESPONSES}}', JSON.stringify(responses, null, 2))
      .replace('{{CONTEXT}}', JSON.stringify(context, null, 2));

    try {
      const llmResponse = await this.llmClient.generate(comparisonPrompt, {
        temperature: 0.1,
        maxTokens: 2000
      });

      const comparison = this._parseComparison(llmResponse.content);
      
      await this.memory.setLongTerm(`comparison_${this._generateId()}`, comparison, {
        importance: 0.6,
        tags: ['comparison', 'multi_response']
      });

      return comparison;

    } catch (error) {
      console.error('Comparison evaluation failed:', error);
      return this._createFallbackComparison(responses);
    }
  }

  // ANTHROPIC INSIGHT: Evaluate tool usage efficiency
  async evaluateToolUsage(toolUsage, goal) {
    const toolPrompt = this.evaluationTemplates.tool_usage
      .replace('{{GOAL}}', goal)
      .replace('{{TOOL_USAGE}}', JSON.stringify(toolUsage, null, 2));

    try {
      const llmResponse = await this.llmClient.generate(toolPrompt, {
        temperature: 0.3,
        maxTokens: 1000
      });

      return this._parseToolEvaluation(llmResponse.content);

    } catch (error) {
      console.error('Tool usage evaluation failed:', error);
      return {
        efficiency_score: 0.5,
        recommendations: ['Enable LLM evaluation for tool usage feedback']
      };
    }
  }

  // ANTHROPIC INSIGHT: Batch evaluation with multiple criteria
  async batchEvaluate(cases, criteria = ['accuracy', 'efficiency', 'completeness']) {
    const batchEvaluation = {
      id: this._generateId(),
      cases: [],
      overall_metrics: {
        cases_evaluated: 0,
        average_scores: {},
        pass_rates: {},
        common_failures: []
      }
    };

    for (let i = 0; i < cases.length; i++) {
      const caseEvaluation = await this.evaluateAgentResponse(
        cases[i].goal, 
        cases[i].response, 
        cases[i].context
      );
      
      batchEvaluation.cases.push(caseEvaluation);
      batchEvaluation.overall_metrics.cases_evaluated++;
    }

    // Calculate overall metrics
    batchEvaluation.overall_metrics.average_scores = this._calculateBatchScores(batchEvaluation.cases, criteria);
    batchEvaluation.overall_metrics.pass_rates = this._calculateBatchPassRates(batchEvaluation.cases, criteria);
    batchEvaluation.overall_metrics.common_failures = this._identifyCommonFailures(batchEvaluation.cases);

    return batchEvaluation;
  }

  // Get evaluation history and statistics
  getStatistics() {
    return {
      ...this.metrics,
      recent_evaluations: this.history.slice(-10),
      evaluation_history_size: this.history.length
    };
  }

  // ANTHROPIC INSIGHT: Evaluation templates with structured rubrics
  _initEvaluationTemplates() {
    return {
      research: `<evaluation_rubric>
You are an expert evaluator of AI research systems. Evaluate the quality and effectiveness of a research response.

EVALUATION CRITERIA:
1. **Research Completeness** (0-1.0)
   - Did the response thoroughly address the research question?
   - Were key aspects of the topic covered?
   - Was the research scope appropriate for the goal?

2. **Source Quality** (0-1.0)
   - Are the sources authoritative and relevant?
   - Is there sufficient source diversity?
   - Are citations accurate and properly formatted?

3. **Synthesis Quality** (0-1.0)
   - Information is well-organized and logically structured?
   - Key insights are clearly articulated?
   - Analysis shows understanding beyond surface facts?

4. **Practical Value** (0-1.0)
   - Results provide actionable insights?
   - Research would be useful for decision-making?
   - Conclusions are supported by evidence presented?

INPUT DATA:
Goal: {{GOAL}}
Response: {{RESPONSE}}
Context: {{CONTEXT}}

EVALUATION FORMAT:
{
  "overall_score": 0.0-1.0,
  "criteria_scores": {
    "completeness": 0.0-1.0,
    "source_quality": 0.0-1.0,
    "synthesis": 0.0-1.0,
    "practical_value": 0.0-1.0
  },
  "strengths": ["specific positive aspects"],
  "weaknesses": ["specific areas for improvement"],
  "confidence": 0.0-1.0,
  "recommendations": ["actionable improvement suggestions"],
  "verdict": "outstanding|excellent|good|adequate|needs_improvement|poor"
}
</evaluation_rubric>`,

      analysis: `<evaluation_rubric>
You are evaluating analytical responses from AI systems. Focus on logical reasoning and data interpretation.

EVALUATION CRITERIA:
1. **Logical Coherence** (0-1.0)
2. **Data Accuracy** (0-1.0)  
3. **Insight Quality** (0-1.0)
4. **Methodological Soundness** (0-1.0)

INPUT DATA:
Goal: {{GOAL}}
Response: {{RESPONSE}}
Context: {{CONTEXT}}

EVALUATION FORMAT:
{
  "overall_score": 0.0-1.0,
  "criteria_scores": {
    "coherence": 0.0-1.0,
    "accuracy": 0.0-1.0,
    "insights": 0.0-1.0,
    "methodology": 0.0-1.0
  },
  "reasoning_quality": "assessment of logical flow",
  "key_insights": ["main findings identified"],
  "method_issues": ["methodological concerns"],
  "improvements": ["ways to enhance analysis"],
  "confidence": 0.0-1.0
}
</evaluation_rubric>`,

      comparison: `<evaluation_rubric>
You are comparing multiple AI agent responses to the same goal. Evaluate which responses are most effective.

GOAL: {{GOAL}}
RESPONSES: {{RESPONSES}}
CONTEXT: {{CONTEXT}}

COMPARISON APPROACH:
1. Evaluate each response against the appropriate rubric
2. Compare relative strengths and weaknesses
3. Generate rankings with justifications
4. Identify best practices across all responses

OUTPUT FORMAT:
{
  "rankings": [
    {
      "response_id": 0,
      "rank": 1,
      "overall_score": 0.0-1.0,
      "strengths": ["key advantages"],
      "weaknesses": ["relative disadvantages"]
    }
  ],
  "winning_response": {
    "id": 0,
    "reasoning": "why this response performed best",
    "confidence": 0.0-1.0
  },
  "key_differences": ["major distinctions between responses"],
  "best_practices": ["techniques used by top performers"],
  "common_issues": ["problems across multiple responses"]
}
</evaluation_rubric>`,

      tool_usage: `<evaluation_rubric>
Evaluate the efficiency and appropriateness of tool usage in AI agent execution.

GOAL: {{GOAL}}
TOOL USAGE: {{TOOL_USAGE}}

EVALUATION CRITERIA:
1. **Tool Selection** (0-1.0) - Appropriate tools chosen?
2. **Usage Efficiency** (0-1.0) - Minimal wasted calls?
3. **Coordination** (0-1.0) - Tools used synergistically?
4. **Error Handling** (0-1.0) - Graceful error recovery?

OUTPUT FORMAT:
{
  "efficiency_score": 0.0-1.0,
  "tool_selection_score": 0.0-1.0,
  "coordination_score": 0.0-1.0,
  "recommendations": [
    "Specific improvements for tool usage"
  ],
  "waste_detected": ["inefficient operations"],
  "opportunities": ["missed optimization chances"]
}
</evaluation_rubric>`
    };
  }

  _determineEvaluationType(response) {
    if (response.synthesis || response.key_themes) {
      return 'research';
    } else if (response.analysis || response.data_processing) {
      return 'analysis';
    } else {
      return 'research'; // Default to research evaluation
    }
  }

  _parseEvaluation(content, type, evaluationId) {
    try {
      const parsed = JSON.parse(content);
      return {
        id: evaluationId,
        type,
        timestamp: Date.now(),
        ...parsed,
        validated: true
      };
    } catch (error) {
      console.error('Failed to parse evaluation:', error);
      return this._createFallbackEvaluation('Unknown goal', 'Could not parse response content', evaluationId);
    }
  }

  _parseComparison(content) {
    try {
      const parsed = JSON.parse(content);
      return {
        type: 'comparison',
        timestamp: Date.now(),
        id: this._generateId(),
        ...parsed
      };
    } catch (error) {
      return this._createFallbackComparison([{}]);
    }
  }

  _parseToolEvaluation(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        tool_usage_score: 0.5,
        recommendations: ['Parse issue detected with tool evaluation']
      };
    }
  }

  _updateMetrics(evaluation) {
    this.metrics.totalEvaluations++;
    this.metrics.evaluationTypes.add(evaluation.type);
    this.metrics.averageScore = (
      (this.metrics.averageScore * (this.metrics.totalEvaluations - 1) + evaluation.overall_score) / 
      this.metrics.totalEvaluations
    );
    
    this.history.push(evaluation);
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500); // Keep recent history
    }
  }

  _calculateBatchScores(cases, criteria) {
    const scores = {};
    criteria.forEach(criterion => {
      const criterionScores = cases
        .map(c => c.criteria_scores?.[criterion] || c[criterion])
        .filter(score => score !== undefined);
      
      if (criterionScores.length > 0) {
        scores[criterion] = criterionScores.reduce((a, b) => a + b) / criterionScores.length;
      }
    });
    return scores;
  }

  _calculateBatchPassRates(cases, criteria) {
    const passRates = {};
    criteria.forEach(criterion => {
      const passingCases = cases.filter(c => {
        const score = c.criteria_scores?.[criterion] || c[criterion];
        return score !== undefined && score >= 0.7;
      });
      passRates[criterion] = passingCases.length / cases.length;
    });
    return passRates;
  }

  _identifyCommonFailures(cases) {
    const failures = {};
    cases.forEach(c => {
      if (c.weaknesses) {
        c.weaknesses.forEach(weakness => {
          failures[weakness] = (failures[weakness] || 0) + 1;
        });
      }
    });
    
    return Object.entries(failures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([failure, count]) => `${failure} (${count} cases)`);
  }

  _createFallbackEvaluation(goal, response, evaluationId) {
    return {
      id: evaluationId,
      type: 'fallback',
      timestamp: Date.now(),
      overall_score: 0.5,
      criteria_scores: {
        completeness: 0.5,
        source_quality: 0.5,
        synthesis: 0.5,
        practical_value: 0.5
      },
      strengths: ['Evaluation completed'],
      weaknesses: ['Parsing prevented detailed assessment'],
      confidence: 0.3,
      recommendations: ['Enable evaluation parsing for detailed assessment'],
      verdict: 'adequate',
      error: 'Evaluation response could not be parsed',
      validated: false
    };
  }

  _createFallbackComparison(responses) {
    return {
      type: 'fallback_comparison',
      timestamp: Date.now(),
      rankings: responses.map((r, i) => ({
        response_id: i,
        rank: i + 1,
        overall_score: 0.5,
        strengths: ['Response provided'],
        weaknesses: ['Comparison evaluation failed']
      })),
      common_issues: ['Comparison parsing failed'],
      error: 'Detailed comparison unavailable'
    };
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
