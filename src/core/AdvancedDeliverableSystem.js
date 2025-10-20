import { ReportGenerator } from './ReportGenerator.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Advanced Deliverable System for Professional Research Output
 *
 * Provides interactive report editing, multi-format export, template customization,
 * and professional document generation capabilities.
 */
export class AdvancedDeliverableSystem {
  constructor(memorySystem, toolSystem, llmClient) {
    this.memory = memorySystem;
    this.tools = toolSystem;
    this.llm = llmClient;
    this.baseReportGenerator = new ReportGenerator(memorySystem, toolSystem);

    // Deliverable management
    this.activeDeliverables = new Map();
    this.templates = new Map();
    this.editHistory = new Map();
    this.exportFormats = new Map();

    this._initializeTemplates();
    this._initializeExportFormats();
  }

  /**
   * Create interactive research deliverable
   */
  async createInteractiveDeliverable(projectId, options = {}) {
    const deliverableId = uuidv4();

    try {
      // Generate base report
      const baseReport = await this.baseReportGenerator.generateResearchReport(projectId, options);

      if (!baseReport.success) {
        throw new Error(`Base report generation failed: ${baseReport.error}`);
      }

      // Create interactive deliverable
      const deliverable = {
        id: deliverableId,
        projectId,
        type: options.type || 'research_report',
        template: options.template || 'comprehensive',
        status: 'draft',
        createdAt: Date.now(),
        lastModified: Date.now(),
        content: {
          sections: this._parseReportSections(baseReport.report),
          metadata: baseReport.metadata,
          structure: this._generateContentStructure(baseReport),
          interactiveElements: []
        },
        editing: {
          currentSection: null,
          editHistory: [],
          collaborators: new Set(),
          permissions: options.permissions || { owner: 'system', viewers: [], editors: [] }
        },
        exports: {
          available: ['markdown', 'html', 'pdf', 'json'],
          generated: new Map()
        },
        reviews: {
          feedback: [],
          approvals: [],
          version: 1
        },
        analytics: {
          views: 0,
          edits: 0,
          timeSpent: 0,
          lastViewed: null
        }
      };

      this.activeDeliverables.set(deliverableId, deliverable);

      // Store in memory
      await this.memory.setLongTerm(`deliverable_${deliverableId}`, deliverable, {
        importance: 0.9,
        tags: ['deliverable', options.type, projectId]
      });

      return {
        success: true,
        deliverableId,
        deliverable: this._sanitizeDeliverableForResponse(deliverable),
        editingUrl: `/deliverables/${deliverableId}/edit`,
        viewUrl: `/deliverables/${deliverableId}/view`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        deliverableId
      };
    }
  }

  /**
   * Edit deliverable section interactively
   */
  async editDeliverableSection(deliverableId, sectionId, edits, options = {}) {
    const deliverable = this.activeDeliverables.get(deliverableId);
    if (!deliverable) {
      throw new Error(`Deliverable ${deliverableId} not found`);
    }

    try {
      const section = deliverable.content.sections.find(s => s.id === sectionId);
      if (!section) {
        throw new Error(`Section ${sectionId} not found`);
      }

      // Create edit record
      const editRecord = {
        id: uuidv4(),
        sectionId,
        timestamp: Date.now(),
        editor: options.editor || 'system',
        type: edits.type || 'content',
        changes: edits,
        previousContent: section.content,
        description: edits.description || 'Section edit'
      };

      // Apply edits based on type
      const editResult = await this._applySectionEdits(section, edits);

      // Update edit history
      deliverable.editing.editHistory.push(editRecord);
      deliverable.content.lastModified = Date.now();
      deliverable.analytics.edits++;

      // Store edit in memory
      this.editHistory.set(editRecord.id, editRecord);

      // Regenerate affected sections if needed
      if (editResult.regenerateSections) {
        await this._regenerateAffectedSections(deliverable, [sectionId]);
      }

      // Update deliverable in memory
      await this.memory.setLongTerm(`deliverable_${deliverableId}`, deliverable, {
        importance: 0.9,
        tags: ['deliverable', 'edited']
      });

      return {
        success: true,
        editId: editRecord.id,
        changes: editResult.changes,
        regeneratedSections: editResult.regeneratedSections || []
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        sectionId
      };
    }
  }

  /**
   * Add interactive elements to deliverable
   */
  async addInteractiveElement(deliverableId, element) {
    const deliverable = this.activeDeliverables.get(deliverableId);
    if (!deliverable) {
      throw new Error(`Deliverable ${deliverableId} not found`);
    }

    const interactiveElement = {
      id: uuidv4(),
      type: element.type, // 'chart', 'table', 'diagram', 'widget', 'form'
      title: element.title,
      data: element.data,
      config: element.config || {},
      position: element.position || { sectionId: null, index: 0 },
      interactions: element.interactions || [],
      generatedAt: Date.now(),
      dynamic: element.dynamic || false
    };

    // Generate element based on type
    const generatedElement = await this._generateInteractiveElement(interactiveElement);

    deliverable.content.interactiveElements.push(generatedElement);

    await this.memory.setLongTerm(`deliverable_${deliverableId}`, deliverable, {
      importance: 0.9,
      tags: ['deliverable', 'interactive']
    });

    return {
      success: true,
      elementId: generatedElement.id,
      element: generatedElement
    };
  }

  /**
   * Export deliverable in multiple formats
   */
  async exportDeliverable(deliverableId, format, options = {}) {
    const deliverable = this.activeDeliverables.get(deliverableId);
    if (!deliverable) {
      throw new Error(`Deliverable ${deliverableId} not found`);
    }

    try {
      const exportId = uuidv4();
      const exportOptions = {
        format,
        options,
        timestamp: Date.now(),
        requestedBy: options.requestedBy || 'system'
      };

      let exportResult;

      switch (format.toLowerCase()) {
        case 'markdown':
          exportResult = await this._exportMarkdown(deliverable, exportOptions);
          break;
        case 'html':
          exportResult = await this._exportHTML(deliverable, exportOptions);
          break;
        case 'pdf':
          exportResult = await this._exportPDF(deliverable, exportOptions);
          break;
        case 'json':
          exportResult = await this._exportJSON(deliverable, exportOptions);
          break;
        case 'docx':
          exportResult = await this._exportDocx(deliverable, exportOptions);
          break;
        case 'latex':
          exportResult = await this._exportLatex(deliverable, exportOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Store export record
      deliverable.exports.generated.set(exportId, {
        ...exportResult,
        format,
        exportedAt: Date.now(),
        options: exportOptions
      });

      await this.memory.setLongTerm(`deliverable_${deliverableId}`, deliverable, {
        importance: 0.9,
        tags: ['deliverable', 'exported', format]
      });

      return {
        success: true,
        exportId,
        format,
        filePath: exportResult.filePath,
        downloadUrl: exportResult.downloadUrl,
        fileSize: exportResult.fileSize,
        generatedAt: exportResult.generatedAt
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        format
      };
    }
  }

  /**
   * Create custom deliverable template
   */
  async createCustomTemplate(templateData) {
    const templateId = uuidv4();

    const template = {
      id: templateId,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'custom',
      sections: templateData.sections || [],
      styling: templateData.styling || {},
      interactive: templateData.interactive || false,
      createdAt: Date.now(),
      createdBy: templateData.createdBy || 'system',
      version: '1.0.0',
      metadata: {
        usage: 0,
        rating: 0,
        tags: templateData.tags || []
      }
    };

    this.templates.set(templateId, template);

    await this.memory.setLongTerm(`template_${templateId}`, template, {
      importance: 0.8,
      tags: ['template', templateData.category, ...(templateData.tags || [])]
    });

    return {
      success: true,
      templateId,
      template: this._sanitizeTemplateForResponse(template)
    };
  }

  /**
   * Generate deliverable analytics
   */
  async generateDeliverableAnalytics(deliverableId) {
    const deliverable = this.activeDeliverables.get(deliverableId);
    if (!deliverable) {
      throw new Error(`Deliverable ${deliverableId} not found`);
    }

    const analytics = {
      overview: {
        totalViews: deliverable.analytics.views,
        totalEdits: deliverable.analytics.edits,
        totalExports: deliverable.exports.generated.size,
        timeSpent: deliverable.analytics.timeSpent,
        lastActivity: Math.max(deliverable.analytics.lastViewed, deliverable.content.lastModified)
      },
      content: {
        sectionCount: deliverable.content.sections.length,
        interactiveElements: deliverable.content.interactiveElements.length,
        wordCount: this._calculateWordCount(deliverable),
        readingTime: this._estimateReadingTime(deliverable)
      },
      engagement: {
        mostViewedSections: await this._getMostViewedSections(deliverableId),
        popularExports: this._getPopularExports(deliverable),
        editFrequency: this._calculateEditFrequency(deliverable)
      },
      quality: {
        completenessScore: this._calculateCompletenessScore(deliverable),
        consistencyScore: await this._calculateConsistencyScore(deliverable),
        readabilityScore: this._calculateReadabilityScore(deliverable)
      },
      recommendations: await this._generateDeliverableRecommendations(deliverable)
    };

    return analytics;
  }

  /**
   * Apply section edits
   */
  async _applySectionEdits(section, edits) {
    const result = {
      changes: [],
      regenerateSections: []
    };

    switch (edits.type) {
      case 'content':
        // Direct content replacement
        section.content = edits.content;
        result.changes.push({ type: 'content', action: 'replaced' });
        break;

      case 'append':
        // Append content
        section.content += '\n\n' + edits.content;
        result.changes.push({ type: 'content', action: 'appended' });
        break;

      case 'prepend':
        // Prepend content
        section.content = edits.content + '\n\n' + section.content;
        result.changes.push({ type: 'content', action: 'prepended' });
        break;

      case 'enhance':
        // AI-powered content enhancement
        const enhancedContent = await this._enhanceContent(section.content, edits.enhancement);
        section.content = enhancedContent.content;
        result.changes.push({ type: 'content', action: 'enhanced' });
        result.regenerateSections = enhancedContent.affectedSections || [];
        break;

      case 'summarize':
        // Generate summary
        const summary = await this._generateSummary(section.content, options);
        section.content = summary.content;
        result.changes.push({ type: 'content', action: 'summarized' });
        break;

      case 'restructure':
        // Restructure content
        const restructured = await this._restructureContent(section.content, edits.structure);
        section.content = restructured.content;
        result.changes.push({ type: 'content', action: 'restructured' });
        result.regenerateSections = restructured.affectedSections || [];
        break;

      default:
        throw new Error(`Unknown edit type: ${edits.type}`);
    }

    section.lastModified = Date.now();
    return result;
  }

  /**
   * Generate interactive element
   */
  async _generateInteractiveElement(element) {
    try {
      switch (element.type) {
        case 'chart':
          return await this._generateChart(element);
        case 'table':
          return await this._generateTable(element);
        case 'diagram':
          return await this._generateDiagram(element);
        case 'widget':
          return await this._generateWidget(element);
        default:
          return element;
      }
    } catch (error) {
      console.error(`Failed to generate ${element.type}:`, error);
      return element;
    }
  }

  /**
   * Generate chart element
   */
  async _generateChart(element) {
    const chartConfig = {
      type: element.config.chartType || 'bar',
      data: element.data,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: element.title
          },
          legend: {
            display: element.config.showLegend !== false
          }
        }
      }
    };

    return {
      ...element,
      config: chartConfig,
      renderData: JSON.stringify(chartConfig),
      htmlTemplate: this._generateChartHTML(chartConfig)
    };
  }

  /**
   * Generate table element
   */
  async _generateTable(element) {
    const tableHTML = `
      <div class="interactive-table">
        <h3>${element.title}</h3>
        <table class="data-table">
          <thead>
            <tr>
              ${element.data.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${element.data.rows.map(row =>
              `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
    `;

    return {
      ...element,
      htmlTemplate: tableHTML,
      config: {
        sortable: element.config.sortable || false,
        filterable: element.config.filterable || false,
        paginated: element.config.paginated || false
      }
    };
  }

  /**
   * Export as Markdown
   */
  async _exportMarkdown(deliverable, options) {
    const markdown = this._generateMarkdownContent(deliverable);
    const filename = `deliverable_${deliverable.id}_${Date.now()}.md`;
    const filePath = `./exports/${filename}`;

    await this.tools.writeFile(filePath, markdown);

    return {
      filePath,
      filename,
      fileSize: markdown.length,
      generatedAt: Date.now(),
      downloadUrl: `/exports/${filename}`
    };
  }

  /**
   * Export as HTML
   */
  async _exportHTML(deliverable, options) {
    const html = await this._generateHTMLContent(deliverable, options);
    const filename = `deliverable_${deliverable.id}_${Date.now()}.html`;
    const filePath = `./exports/${filename}`;

    await this.tools.writeFile(filePath, html);

    return {
      filePath,
      filename,
      fileSize: html.length,
      generatedAt: Date.now(),
      downloadUrl: `/exports/${filename}`
    };
  }

  /**
   * Export as PDF
   */
  async _exportPDF(deliverable, options) {
    // This would integrate with a PDF generation library
    // For now, provide a placeholder implementation
    const filename = `deliverable_${deliverable.id}_${Date.now()}.pdf`;
    const filePath = `./exports/${filename}`;

    // Placeholder: would convert HTML to PDF
    const html = await this._generateHTMLContent(deliverable, options);

    return {
      filePath,
      filename,
      fileSize: html.length * 0.7, // Estimated PDF size
      generatedAt: Date.now(),
      downloadUrl: `/exports/${filename}`,
      note: 'PDF generation requires additional library integration'
    };
  }

  /**
   * Export as JSON
   */
  async _exportJSON(deliverable, options) {
    const json = JSON.stringify(deliverable, null, 2);
    const filename = `deliverable_${deliverable.id}_${Date.now()}.json`;
    const filePath = `./exports/${filename}`;

    await this.tools.writeFile(filePath, json);

    return {
      filePath,
      filename,
      fileSize: json.length,
      generatedAt: Date.now(),
      downloadUrl: `/exports/${filename}`
    };
  }

  /**
   * Parse report sections
   */
  _parseReportSections(reportContent) {
    const sections = [];
    const lines = reportContent.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Save previous section
        if (currentSection) {
          sections.push({
            id: uuidv4(),
            title: currentSection,
            content: currentContent.join('\n').trim(),
            level: currentSection.startsWith('#') ? currentSection.length : 1,
            lastModified: Date.now()
          });
        }

        // Start new section
        currentSection = line.replace(/^#+\s*/, '');
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections.push({
        id: uuidv4(),
        title: currentSection,
        content: currentContent.join('\n').trim(),
        level: currentSection.startsWith('#') ? currentSection.length : 1,
        lastModified: Date.now()
      });
    }

    return sections;
  }

  /**
   * Generate content structure
   */
  _generateContentStructure(report) {
    return {
      title: report.metadata?.title || 'Research Report',
      sections: report.sections || [],
      wordCount: report.metadata?.wordCount || 0,
      estimatedReadTime: Math.ceil((report.metadata?.wordCount || 0) / 200), // 200 words per minute
      complexity: report.metadata?.complexity || 'medium',
      format: report.metadata?.format || 'markdown'
    };
  }

  /**
   * Generate HTML content
   */
  async _generateHTMLContent(deliverable, options) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${deliverable.content.structure.title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3, h4, h5, h6 { color: #2c3e50; margin-top: 30px; }
        .section { margin-bottom: 30px; padding: 20px; border-left: 4px solid #3498db; background: #f8f9fa; }
        .metadata { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
        .interactive-element { margin: 20px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px; }
        .chart-container { text-align: center; }
        .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .data-table th, .data-table td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
        .data-table th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="metadata">
        <h1>${deliverable.content.structure.title}</h1>
        <p><strong>Generated:</strong> ${new Date(deliverable.createdAt).toLocaleDateString()}</p>
        <p><strong>Last Modified:</strong> ${new Date(deliverable.content.lastModified).toLocaleDateString()}</p>
        <p><strong>Sections:</strong> ${deliverable.content.sections.length}</p>
        <p><strong>Word Count:</strong> ${deliverable.content.structure.wordCount}</p>
    </div>

    ${deliverable.content.sections.map(section => `
        <div class="section">
            <h${section.level} id="section-${section.id}">${section.title}</h${section.level}>
            <div class="section-content">${this._convertMarkdownToHTML(section.content)}</div>
        </div>
    `).join('')}

    ${deliverable.content.interactiveElements.map(element => `
        <div class="interactive-element" id="element-${element.id}">
            <h3>${element.title}</h3>
            ${element.htmlTemplate || '<p>Interactive element content</p>'}
        </div>
    `).join('')}

    <script>
        // Interactive element initialization would go here
        console.log('Deliverable loaded with ${deliverable.content.interactiveElements.length} interactive elements');
    </script>
</body>
</html>`;

    return htmlTemplate;
  }

  /**
   * Convert markdown to HTML (basic implementation)
   */
  _convertMarkdownToHTML(markdown) {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  /**
   * Generate markdown content
   */
  _generateMarkdownContent(deliverable) {
    let markdown = `# ${deliverable.content.structure.title}\n\n`;

    // Add metadata
    markdown += `**Generated:** ${new Date(deliverable.createdAt).toLocaleDateString()}\n`;
    markdown += `**Last Modified:** ${new Date(deliverable.content.lastModified).toLocaleDateString()}\n`;
    markdown += `**Sections:** ${deliverable.content.sections.length}\n\n`;

    // Add sections
    deliverable.content.sections.forEach(section => {
      markdown += `${'#'.repeat(section.level)} ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
    });

    return markdown;
  }

  /**
   * Generate chart HTML
   */
  _generateChartHTML(config) {
    return `
      <div class="chart-container">
        <canvas id="chart-${Date.now()}"></canvas>
        <script>
          // Chart.js implementation would go here
          console.log('Chart configuration:', ${JSON.stringify(config)});
        </script>
      </div>
    `;
  }

  /**
   * Initialize templates
   */
  _initializeTemplates() {
    // Add built-in templates
    this.templates.set('executive_summary', {
      id: 'executive_summary',
      name: 'Executive Summary',
      description: 'Concise executive summary template',
      sections: [
        { id: 'overview', title: 'Overview', required: true },
        { id: 'key_findings', title: 'Key Findings', required: true },
        { id: 'recommendations', title: 'Recommendations', required: true }
      ],
      styling: { theme: 'professional', compact: true }
    });

    this.templates.set('technical_report', {
      id: 'technical_report',
      name: 'Technical Report',
      description: 'Comprehensive technical report template',
      sections: [
        { id: 'abstract', title: 'Abstract', required: true },
        { id: 'introduction', title: 'Introduction', required: true },
        { id: 'methodology', title: 'Methodology', required: true },
        { id: 'results', title: 'Results', required: true },
        { id: 'discussion', title: 'Discussion', required: true },
        { id: 'conclusion', title: 'Conclusion', required: true }
      ],
      styling: { theme: 'academic', detailed: true }
    });
  }

  /**
   * Initialize export formats
   */
  _initializeExportFormats() {
    this.exportFormats.set('markdown', {
      name: 'Markdown',
      extension: '.md',
      mimeType: 'text/markdown',
      capabilities: ['editability', 'version_control']
    });

    this.exportFormats.set('html', {
      name: 'HTML',
      extension: '.html',
      mimeType: 'text/html',
      capabilities: ['interactivity', 'styling', 'web_display']
    });

    this.exportFormats.set('pdf', {
      name: 'PDF',
      extension: '.pdf',
      mimeType: 'application/pdf',
      capabilities: ['printing', 'sharing', 'professional_format']
    });

    this.exportFormats.set('json', {
      name: 'JSON',
      extension: '.json',
      mimeType: 'application/json',
      capabilities: ['data_export', 'api_integration']
    });
  }

  // Helper methods
  _sanitizeDeliverableForResponse(deliverable) {
    const sanitized = { ...deliverable };
    // Remove sensitive or large data fields
    return sanitized;
  }

  _sanitizeTemplateForResponse(template) {
    const sanitized = { ...template };
    // Remove sensitive fields
    return sanitized;
  }

  _calculateWordCount(deliverable) {
    return deliverable.content.sections.reduce((count, section) => {
      return count + section.content.split(/\s+/).length;
    }, 0);
  }

  _estimateReadingTime(deliverable) {
    const wordCount = this._calculateWordCount(deliverable);
    return Math.ceil(wordCount / 200); // 200 words per minute
  }

  async _enhanceContent(content, enhancement) {
    const prompt = `Enhance this content based on the enhancement request.

CONTENT: ${content}
ENHANCEMENT: ${enhancement}

Provide enhanced content in JSON format:
{
  "content": "enhanced content",
  "affectedSections": ["section1", "section2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1500
      });

      return JSON.parse(response.content);
    } catch (error) {
      return { content, affectedSections: [], improvements: [] };
    }
  }

  async _generateSummary(content) {
    const prompt = `Generate a concise summary of this content.

CONTENT: ${content}

Provide summary in JSON format:
{
  "content": "summary content",
  "keyPoints": ["point1", "point2"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        maxTokens: 800
      });

      return JSON.parse(response.content);
    } catch (error) {
      return { content: content.substring(0, 500) + '...', keyPoints: [] };
    }
  }

  async _regenerateAffectedSections(deliverable, sectionIds) {
    // Implementation for regenerating dependent sections
    console.log(`Regenerating sections affected by: ${sectionIds.join(', ')}`);
  }

  async _getMostViewedSections(deliverableId) {
    // This would track section views
    return [];
  }

  _getPopularExports(deliverable) {
    const exports = Array.from(deliverable.exports.generated.values());
    const formatCounts = {};

    exports.forEach(export_ => {
      formatCounts[export_.format] = (formatCounts[export_.format] || 0) + 1;
    });

    return formatCounts;
  }

  _calculateEditFrequency(deliverable) {
    if (deliverable.editing.editHistory.length === 0) return 0;

    const timeSpan = Date.now() - deliverable.createdAt;
    const editsPerHour = (deliverable.editing.editHistory.length / timeSpan) * 3600000;

    return Math.round(editsPerHour * 10) / 10;
  }

  _calculateCompletenessScore(deliverable) {
    const requiredSections = deliverable.content.sections.filter(s => s.required !== false);
    const completedSections = requiredSections.filter(s => s.content && s.content.trim().length > 0);

    return Math.round((completedSections.length / Math.max(requiredSections.length, 1)) * 100);
  }

  async _calculateConsistencyScore(deliverable) {
    // Simple consistency check based on section structure
    return 85; // Placeholder
  }

  _calculateReadabilityScore(deliverable) {
    const wordCount = this._calculateWordCount(deliverable);
    const sentenceCount = deliverable.content.sections.reduce((count, section) => {
      return count + section.content.split(/[.!?]+/).length;
    }, 0);

    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

    // Simple readability score based on sentence length
    if (avgWordsPerSentence < 15) return 90;
    if (avgWordsPerSentence < 20) return 80;
    if (avgWordsPerSentence < 25) return 70;
    return 60;
  }

  async _generateDeliverableRecommendations(deliverable) {
    const recommendations = [];

    if (this._calculateCompletenessScore(deliverable) < 80) {
      recommendations.push('Complete missing sections to improve deliverable completeness');
    }

    if (deliverable.content.interactiveElements.length === 0) {
      recommendations.push('Add interactive elements to enhance engagement');
    }

    if (deliverable.exports.generated.size === 0) {
      recommendations.push('Generate exports in multiple formats for better accessibility');
    }

    return recommendations;
  }

  // Public interface methods
  getActiveDeliverables() {
    return Array.from(this.activeDeliverables.entries()).map(([id, deliverable]) => ({
      id,
      title: deliverable.content.structure.title,
      status: deliverable.status,
      lastModified: deliverable.content.lastModified,
      sections: deliverable.content.sections.length,
      exports: deliverable.exports.generated.size
    }));
  }

  getAvailableTemplates() {
    return Array.from(this.templates.entries()).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      category: template.category,
      sections: template.sections.length
    }));
  }

  getAvailableExportFormats() {
    return Array.from(this.exportFormats.entries()).map(([id, format]) => ({
      id,
      name: format.name,
      extension: format.extension,
      capabilities: format.capabilities
    }));
  }
}