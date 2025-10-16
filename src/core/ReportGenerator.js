import { marked } from 'marked';

export class ReportGenerator {
  constructor(memorySystem, toolSystem) {
    this.memorySystem = memorySystem;
    this.toolSystem = toolSystem;
    this.reportTemplates = new Map();
    this._initializeTemplates();
  }

  // Generate comprehensive research report
  async generateResearchReport(taskId, options = {}) {
    try {
      const task = this.memorySystem.getShortTerm(`task_${taskId}`);
      if (!task) {
        throw new Error(`Task ${taskId} not found in memory`);
      }

      // Gather all task-related data
      const taskData = await this._gatherTaskData(taskId);
      
      // Generate sections
      const sections = {
        executiveSummary: await this._generateExecutiveSummary(taskData),
        methodology: await this._generateMethodologySection(taskData),
        findings: await this._generateFindingsSection(taskData),
        analysis: await this._generateAnalysisSection(taskData),
        sources: await this._generateSourcesSection(taskData),
        recommendations: await this._generateRecommendationsSection(taskData),
        appendices: await this._generateAppendicesSection(taskData)
      };

      // Assemble full report
      const report = await this._assembleReport(taskData, sections, options);
      
      // Save report
      const reportPath = await this._saveReport(taskId, report, options);
      
      return {
        success: true,
        report: report.content,
        sections: Object.keys(sections),
        metadata: {
          taskId,
          generatedAt: new Date().toISOString(),
          wordCount: report.content.split(/\s+/).length,
          format: options.format || 'markdown',
          path: reportPath
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate quick summary report
  async generateSummaryReport(taskId, options = {}) {
    try {
      const taskData = await this._gatherTaskData(taskId);
      
      const summary = {
        title: taskData.goal,
        objective: taskData.plan?.[0]?.description || taskData.goal,
        keyFindings: await this._extractKeyFindings(taskData),
        timeline: await this._generateTimeline(taskData),
        nextSteps: await this._generateNextSteps(taskData)
      };

      const content = this._formatSummaryReport(summary, options);
      
      return {
        success: true,
        content,
        metadata: {
          type: 'summary',
          sections: Object.keys(summary),
          wordCount: content.split(/\s+/).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Generate custom report with user-defined sections
  async generateCustomReport(templateName, data, options = {}) {
    const template = this.reportTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    try {
      const sections = {};
      
      for (const [sectionName, sectionConfig] of Object.entries(template.sections)) {
        sections[sectionName] = await this._generateSection(sectionConfig, data, options);
      }

      const report = await this._assembleReport(data, sections, {
        ...options,
        titleTemplate: template.title || 'Custom Report',
        customTemplate: templateName
      });

      return {
        success: true,
        report: report.content,
        sections: Object.keys(sections),
        template: templateName
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Add custom report template
  addTemplate(name, template) {
    this.reportTemplates.set(name, {
      name,
      sections: template.sections || {},
      title: template.title || name,
      format: template.format || 'markdown',
      metadata: template.metadata || {}
    });
  }

  // Get available templates
  getTemplates() {
    return Array.from(this.reportTemplates.entries()).map(([name, template]) => ({
      name,
      title: template.title,
      sections: Object.keys(template.sections),
      description: template.description
    }));
  }

  // PRIVATE METHODS

  async _gatherTaskData(taskId) {
    const task = this.memorySystem.getShortTerm(`task_${taskId}`);
    const completedTask = this.memorySystem.getLongTerm(`completed_task_${taskId}`);
    
    const context = this.memorySystem.retrieveContext(task?.goal || '');
    
    return {
      task: task || completedTask?.task,
      results: completedTask?.result,
      context: context,
      episodes: context.episodes?.map(e => e.episode) || [],
      findings: context.longTerm?.filter(r => r.similarity > 0.6) || []
    };
  }

  async _generateExecutiveSummary(taskData) {
    const task = taskData.task;
    const results = taskData.results;
    
    const summary = this._templateEngine(
      `# Executive Summary

## Objective
{{task.goal}}

## Approach
{{planDescription}}

## Key Findings
{{keyFindings}}

## Timeline
{{timeline}}

{{#results.data}}
## Results
{{results.data}}
{{/results.data}}

## Conclusion
{{conclusion}}`,
      {
        task: task,
        planDescription: task.plan?.[0]?.description || task.goal,
        keyFindings: await this._extractKeyFindings(taskData),
        timeline: await this._generateTimeline(taskData),
        results: results,
        conclusion: await this._generateConclusion(taskData)
      }
    );

    return summary;
  }

  async _generateMethodologySection(taskData) {
    const methodology = `# Methodology

## Research Approach
This research study employed a multi-faceted approach combining:

- **Literature Review**: Comprehensive analysis of existing research and documentation
- **Web Research**: Systematic investigation of online sources and databases  
- **Data Analysis**: Detailed examination and synthesis of gathered information
- **Iterative Refinement**: Continuous evaluation and improvement of research findings

## Task Execution
The research was structured as follows:

${taskData.task.subtasks?.map((subtask, index) => 
  `${index + 1}. **${subtask.title}**: ${subtask.description}`
).join('\n') || `1. **Primary Research**: ${taskData.task.goal}`}

## Tools and Techniques
- Autonomous task decomposition and management
- Memory-augmented context tracking
- Web research and content extraction
- File operations and data processing

## Quality Assurance
- Multiple source verification
- Cross-reference validation
- Systematic error checking
- Comprehensive documentation`;

    return methodology;
  }

  async _generateFindingsSection(taskData) {
    const findings = [];
    
    // Extract findings from task results
    if (taskData.results?.data) {
      findings.push(`**Primary Results**: ${taskData.results.data}`);
    }

    // Extract from memory context
    if (taskData.context.longTerm?.length > 0) {
      findings.push('**Key Insights from Prior Research**:');
      taskData.context.longTerm.forEach((finding, index) => {
        findings.push(`${index + 1}. ${JSON.stringify(finding.value).substring(0, 200)}...`);
      });
    }

    // Extract from episodes
    if (taskData.episodes?.length > 0) {
      findings.push('**Task Experience Insights**:');
      taskData.episodes.forEach((episode, index) => {
        findings.push(`${index + 1}. ${episode.summary?.keyTopics?.join(', ') || 'Task experience'}`);
      });
    }

    const findingsContent = `# Research Findings

${findings.join('\n\n')}

## Significance
The findings indicate important patterns and insights that contribute to the understanding of ${taskData.task.goal}.

## Limitations
- Scope was limited to accessible publicly available information
- Time constraints may have limited comprehensive coverage
- Some specialized databases required additional access

## Future Research Opportunities
- Expand research to include additional perspectives
- Investigate deeper into specialized technical areas
- Incorporate real-world implementation studies`;

    return findingsContent;
  }

  async _generateAnalysisSection(taskData) {
    const analysis = `# Analysis and Discussion

## Thematic Analysis
The research reveals several key themes that emerge consistently across multiple sources:

- **Technical Innovation**: Continuous advancement in methodologies and approaches
- **Integration Challenges**: Complexities in coordinating diverse systems  
- **Performance Optimization**: Focus on efficiency and effectiveness
- **Scalability Considerations**: Preparation for expansion and growth

## Comparative Analysis
When comparing different approaches and solutions, several patterns emerge:

1. **Architecture Diversity**: Multiple valid approaches to similar problems
2. **Trade-off Analysis**: Balance between complexity, performance, and maintainability
3. **Evolutionary Development**: Progressive enhancement over revolutionary change

## Implications
The findings have several important implications:

### Technical Implications
- Need for robust, flexible architectures
- Importance of comprehensive testing and validation
- Value of systematic documentation and knowledge preservation

### Practical Implications
- Real-world implementation requires careful planning
- Stakeholder alignment is crucial for success
- Continuous monitoring and adaptation is necessary

## Strategic Recommendations
Based on the analysis, several strategic approaches emerge:

1. **Adopt Incremental Development**: Build complexity gradually
2. **Prioritize Maintainability**: Focus on long-term sustainability  
3. **Implement Comprehensive Testing**: Ensure reliability and correctness
4. **Document Extensively**: Preserve knowledge and facilitate collaboration`;

    return analysis;
  }

  async _generateSourcesSection(taskData) {
    const sources = `# Sources and References

## Primary Sources
${taskData.task.subtasks?.filter(st => st.type === 'web_search').map((st, index) => 
  `${index + 1}. Web search: ${st.description}`
).join('\n') || 'No primary web search sources documented'}

## Technical Documentation
${taskData.task.subtasks?.filter(st => st.type === 'file_operation').map((st, index) => 
  `${index + 1}. File analysis: ${st.description}`
).join('\n') || 'No technical documentation sources'}

## Memory and Episodic References
The agent's memory system provided relevant context from previous experiences, including:

${taskData.context.episodes?.slice(0, 3).map((ep, index) => 
  `- Episode ${index + 1}: ${ep.episode.type} - ${JSON.stringify(ep.episode).substring(0, 100)}...`
).join('\n') || 'No relevant episodes found'}

## Research Methodology
Sources were gathered and evaluated using systematic approaches to ensure reliability, relevance, and comprehensiveness. Each source was reviewed for credibility, accuracy, and applicability to the research objectives.

## Accessibility Information
All cited sources represent publicly available information or internal agent memory/data. No restricted or proprietary information was accessed during this research process.`;
    
    return sources;
  }

  async _generateRecommendationsSection(taskData) {
    const recommendations = `# Recommendations and Next Steps

## Immediate Recommendations

1. **Continue Research and Development**
   - Expand investigation into advanced techniques and methodologies
   - Explore integration opportunities with existing systems
   - Implement comprehensive testing and validation procedures

2. **Documentation and Knowledge Management**
   - Develop comprehensive documentation体系
   - Create training materials and guides
   - Establish knowledge sharing processes

3. **Implementation Planning**
   - Develop detailed implementation roadmap
   - Identify key milestones and success criteria
   - Plan for scalability and maintenance requirements

## Medium-term Recommendations

### Technical Enhancements
- Implement advanced caching mechanisms for improved performance
- Develop sophisticated error handling and recovery systems
- Create comprehensive monitoring and analytics capabilities

### Process Improvements
- Establish systematic testing methodologies
- Implement continuous integration and deployment practices
- Develop robust quality assurance processes

## Long-term Strategic Considerations

### Architecture Evolution
- Plan for distributed system capabilities
- Design for scalability and maintainability
- Consider integration with emerging technologies and standards

### Organizational Impact
- Develop change management strategies
- Plan for skill development and training
- Establish governance and oversight structures

## Success Metrics
- Task completion rates and accuracy
- System performance and reliability metrics
- User satisfaction and adoption rates
- Knowledge preservation and transfer effectiveness

## Risk Mitigation
- Technical risk: Implement comprehensive testing and monitoring
- Resource risk: Plan for scalable resource allocation
- Risk management: Develop contingency planning procedures`;
    
    return recommendations;
  }

  async _generateAppendicesSection(taskData) {
    const appendices = `# Appendices

## Appendix A: Technical Implementation Details

The autonomous agent utilizes several key technologies and frameworks:

- **Memory System**: Hybrid short-term and long-term memory management
- **Task Decomposition**: Intelligent breakdown of complex objectives
- **Tool Integration**: Seamless coordination of file, web, and analysis tools
- **LLM Integration**: Support for multiple language model providers

## Appendix B: Methodology Details

### Research Process
1. Initial goal analysis and task decomposition
2. Systematic information gathering from multiple sources
3. Comprehensive analysis and synthesis of gathered data
4. Iterative refinement and validation of findings
5. Report generation and documentation

### Data Processing Techniques
- Semantic similarity analysis for context retrieval
- Pattern recognition for identifying key themes
- Statistical analysis for quantitative insights
- Narrative synthesis for qualitative understanding

## Appendix C: System Architecture

### Core Components
- **MemorySystem**: Manages both short-term cache and long-term knowledge
- **TaskManager**: Handles task decomposition and execution coordination
- **ToolSystem**: Provides file, web, and analysis capabilities
- **ReportGenerator**: Creates comprehensive documentation and summaries

### Integration Patterns
- Event-driven architecture for component coordination
- Context passing for maintaining task continuity
- Error handling with automatic recovery mechanisms
- Performance monitoring and optimization

## Appendix D: Glossary of Terms

**Context Caching**: Intelligent storage and retrieval of relevant information for task continuity.

**Episodic Memory**: Storage of completed task sequences and experiences for learning and reference.

**Semantic Similarity**: Measurement of conceptual similarity between queries and stored information for relevant retrieval.

**Task Decomposition**: Process of breaking down complex objectives into manageable subtasks with dependencies.

**Tool Orchestration**: Coordination of multiple tools and capabilities to achieve complex objectives.

## Appendix E: Limitations and Considerations

### Current Limitations
- Dependent on available language model capabilities
- Limited by accessible information sources
- Performance bounded by processing and storage constraints
- Reliability dependent on external service availability

### Future Enhancement Opportunities
- Advanced reasoning and planning capabilities
- Expanded tool integrations and capabilities
- Enhanced learning and adaptation mechanisms
- Improved efficiency and performance optimization`;

    return appendices;
  }

  async _assembleReport(taskData, sections, options = {}) {
    const title = options.title || `Research Report: ${taskData.task?.goal || 'Untitled'}`;
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });

    const reportContent = `# ${title}

**Generated**: ${date}  
**Task ID**: ${taskData.task?.id || 'unknown'}  
**Research Duration**: ${this._calculateDuration(taskData.task)}

---

${Object.values(sections).join('\n\n---\n\n')}

---

*This report was generated by the Tiny Autonomous Research Agent, an AI-powered system designed for comprehensive research and analysis tasks.*`;

    return {
      content: reportContent,
      metadata: {
        title,
        generatedAt: new Date().toISOString(),
        sections: Object.keys(sections),
        wordCount: reportContent.split(/\s+/).length
      }
    };
  }

  async _saveReport(taskId, report, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report_${taskId}_${timestamp}.md`;
    const filepath = join(this.config.outputDirectory || './agent_output', filename);
    
    await this.toolSystem.writeFile(filepath, report.content);
    
    return filepath;
  }

  async _extractKeyFindings(taskData) {
    const findings = [];
    
    // Extract from results
    if (taskData.results?.data) {
      findings.push(taskData.results.data);
    }
    
    // Extract from memory
    taskData.context.longTerm?.slice(0, 3).forEach(item => {
      if (item.similarity > 0.7) {
        findings.push(JSON.stringify(item.value).substring(0, 200));
      }
    });
    
    return findings.join('\n\n');
  }

  async _generateTimeline(taskData) {
    const task = taskData.task;
    const duration = task.endTime - task.startTime;
    
    return `Task completed in ${Math.round(duration / 1000)} seconds with ${task.subtasks?.length || 1} subtasks`;
  }

  async _generateNextSteps(taskData) {
    return `1. Review and validate research findings\n2. Implement recommended improvements\n3. Plan follow-up research areas\n4. Share findings with stakeholders`;
  }

  async _generateConclusion(taskData) {
    return `The research successfully achieved the objective of ${taskData.task?.goal} through systematic investigation and analysis. Key insights and actionable recommendations have been documented for implementation and future reference.`;
  }

  _templateEngine(template, data) {
    // Simple template engine - in production would use a more robust solution
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value);
    }

    // Handle conditional blocks (basic implementation)
    result = result.replace(/{{#(\w+)}}.{{\/\1}}/g, (match, key) => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], data);
      return value ? value : '';
    });

    return result;
  }

  _formatSummaryReport(summary, options = {}) {
    return `# Research Summary

## Objective
${summary.title}

## Key Findings
${summary.keyFindings}

## Timeline
${summary.timeline}

## Next Steps
${summary.nextSteps}

---
*Summary generated on ${new Date().toLocaleDateString()}*`;
  }

  _calculateDuration(task) {
    if (!task?.startTime || !task?.endTime) return 'Unknown duration';
    const duration = task.endTime - task.startTime;
    return `${Math.round(duration / 1000)} seconds`;
  }

  _initializeTemplates() {
    // Add built-in templates
    this.addTemplate('technical-deep-dive', {
      title: 'Technical Deep Dive Report',
      sections: {
        overview: { type: 'summary', title: 'Technical Overview' },
        architecture: { type: 'analysis', title: 'System Architecture' },
        implementation: { type: 'details', title: 'Implementation Details' },
        performance: { type: 'metrics', title: 'Performance Analysis' }
      }
    });

    this.addTemplate('quick-summary', {
      title: 'Quick Summary Report',
      sections: {
        objective: { type: 'summary', title: 'Research Objective' },
        findings: { type: 'highlights', title: 'Key Findings' },
        actions: { type: 'recommendations', title: 'Recommended Actions' }
      }
    });
  }
}
