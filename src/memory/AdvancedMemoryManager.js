import { v4 as uuidv4 } from 'uuid';
import pako from 'pako';

/**
 * Advanced Memory Manager for Long-Horizon Autonomy
 *
 * Provides semantic compression, knowledge graphs, cross-session persistence,
 * and intelligent context retrieval for sustained autonomous operation.
 */
export class AdvancedMemoryManager {
  constructor(memorySystem, llmClient) {
    this.baseMemory = memorySystem;
    this.llm = llmClient;
    this.knowledgeGraph = new Map();
    this.semanticIndex = new Map();
    this.sessionMemories = new Map();
    this.compressionHistory = new Map();
    this.conceptClusters = new Map();

    // Configuration
    this.config = {
      compressionThreshold: 10000, // tokens
      semanticSimilarityThreshold: 0.7,
      maxSessionMemory: 50, // items per session
      autoCompressInterval: 20, // items
      knowledgeDecayRate: 0.95, // per day
      clusterMinSize: 3
    };

    this._initializeSemanticIndexing();
  }

  /**
   * Store information with semantic analysis and compression
   */
  async storeSemanticMemory(key, content, metadata = {}) {
    try {
      // Analyze content for semantic features
      const semanticFeatures = await this._extractSemanticFeatures(content);

      // Create memory entry with rich metadata
      const memoryEntry = {
        id: uuidv4(),
        key,
        content,
        semanticFeatures,
        metadata: {
          ...metadata,
          createdAt: Date.now(),
          accessCount: 0,
          lastAccessed: Date.now(),
          importance: metadata.importance || 0.5,
          clusterIds: [],
          relatedConcepts: semanticFeatures.concepts || [],
          compressed: false,
          size: JSON.stringify(content).length
        }
      };

      // Store in base memory system
      await this.baseMemory.setLongTerm(key, memoryEntry, {
        importance: metadata.importance,
        tags: ['semantic', ...semanticFeatures.concepts, ...(metadata.tags || [])]
      });

      // Update semantic index
      this._updateSemanticIndex(memoryEntry);

      // Update knowledge graph
      this._updateKnowledgeGraph(memoryEntry);

      // Check if compression is needed
      if (memoryEntry.metadata.size > this.config.compressionThreshold) {
        await this._compressMemory(memoryEntry);
      }

      // Cluster with similar memories
      await this._updateClustering(memoryEntry);

      return memoryEntry.id;

    } catch (error) {
      console.error('Failed to store semantic memory:', error);
      // Fallback to base memory
      return this.baseMemory.setLongTerm(key, content, metadata);
    }
  }

  /**
   * Retrieve with semantic matching and context expansion
   */
  async retrieveWithContext(query, options = {}) {
    try {
      // Standard retrieval
      const baseResults = this.baseMemory.retrieveContext(query, options);

      // Semantic expansion
      const semanticExpansions = await this._expandQuerySemantically(query);

      // Knowledge graph traversal
      const graphRelated = await this._traverseKnowledgeGraph(query);

      // Cross-session memory retrieval
      const sessionMemories = await this._retrieveSessionMemories(query);

      // Combine and rank results
      const combinedResults = this._combineAndRankResults(
        baseResults,
        semanticExpansions,
        graphRelated,
        sessionMemories,
        options
      );

      // Context synthesis
      const synthesizedContext = await this._synthesizeContext(combinedResults, query);

      return {
        ...synthesizedContext,
        queryExpansion: semanticExpansions.expansions || [],
        relatedConcepts: graphRelated.concepts || [],
        sessionContext: sessionMemories.context || []
      };

    } catch (error) {
      console.error('Enhanced retrieval failed:', error);
      // Fallback to base memory
      return this.baseMemory.retrieveContext(query, options);
    }
  }

  /**
   * Create persistent session memory
   */
  async createSessionMemory(sessionId, goal, context = {}) {
    const sessionMemory = {
      id: sessionId,
      goal,
      context,
      createdAt: Date.now(),
      lastActive: Date.now(),
      memories: [],
      milestones: [],
      performance: {
        tasksCompleted: 0,
        successRate: 0,
        averageTime: 0
      },
      state: {
        currentPhase: 0,
        lastAction: null,
        nextPlannedAction: null
      },
      learnings: [],
      adaptations: []
    };

    this.sessionMemories.set(sessionId, sessionMemory);

    await this.baseMemory.setLongTerm(`session_${sessionId}`, sessionMemory, {
      importance: 0.9,
      tags: ['session_memory', 'persistent', goal.toLowerCase().split(' ').slice(0, 3)]
    });

    return sessionMemory;
  }

  /**
   * Update session memory with new experiences
   */
  async updateSessionMemory(sessionId, experience) {
    const session = this.sessionMemories.get(sessionId);
    if (!session) return false;

    // Add experience with semantic analysis
    const semanticExperience = await this._enrichExperienceSemantically(experience);
    session.memories.push(semanticExperience);
    session.lastActive = Date.now();

    // Update performance metrics
    this._updateSessionPerformance(session, experience);

    // Extract learnings
    if (experience.type === 'task_completion' || experience.type === 'error') {
      const learning = await this._extractLearning(experience);
      if (learning) {
        session.learnings.push(learning);
      }
    }

    // Manage session memory size
    if (session.memories.length > this.config.maxSessionMemory) {
      await this._compressSessionMemory(session);
    }

    // Persist updated session
    await this.baseMemory.setLongTerm(`session_${sessionId}`, session, {
      importance: 0.9,
      tags: ['session_memory', 'updated']
    });

    return true;
  }

  /**
   * Semantic compression of large memories
   */
  async _compressMemory(memoryEntry) {
    try {
      const compressionPrompt = `Compress this memory while preserving essential information and semantic relationships.

MEMORY CONTENT:
${JSON.stringify(memoryEntry.content, null, 2)}

SEMANTIC FEATURES:
${JSON.stringify(memoryEntry.semanticFeatures, null, 2)}

Provide compressed version in JSON format:
{
  "summary": "Concise summary of key information",
  "essentialConcepts": ["concept1", "concept2"],
  "keyRelationships": [["concept1", "concept2", "relationship_type"]],
  "criticalDetails": ["detail1", "detail2"],
  "actionableInsights": ["insight1", "insight2"],
  "retentionScore": 0.0-1.0
}`;

      const response = await this.llm.generate(compressionPrompt, {
        temperature: 0.2,
        maxTokens: 1500
      });

      const compressed = JSON.parse(response.content);

      // Create compressed version
      const compressedEntry = {
        ...memoryEntry,
        content: {
          type: 'compressed',
          original: memoryEntry.content,
          compressed: compressed,
          compressionRatio: JSON.stringify(compressed).length / JSON.stringify(memoryEntry.content).length,
          compressedAt: Date.now()
        },
        metadata: {
          ...memoryEntry.metadata,
          compressed: true,
          originalSize: memoryEntry.metadata.size,
          compressedSize: JSON.stringify(compressed).length
        }
      };

      // Store compression history
      this.compressionHistory.set(memoryEntry.id, {
        originalSize: memoryEntry.metadata.size,
        compressedSize: JSON.stringify(compressed).length,
        compressionRatio: compressedEntry.content.compressionRatio,
        compressedAt: Date.now()
      });

      return compressedEntry;

    } catch (error) {
      console.warn('Compression failed:', error);
      return memoryEntry;
    }
  }

  /**
   * Extract semantic features from content
   */
  async _extractSemanticFeatures(content) {
    try {
      const semanticPrompt = `Extract semantic features from this content for intelligent indexing and retrieval.

CONTENT:
${JSON.stringify(content, null, 2)}

Provide semantic analysis in JSON format:
{
  "concepts": ["main_concept1", "main_concept2"],
  "entities": ["entity1", "entity2"],
  "relationships": [["entity1", "entity2", "relationship_type"]],
  "keywords": ["keyword1", "keyword2"],
  "topics": ["topic1", "topic2"],
  "sentiment": "positive|negative|neutral",
  "complexity": "low|medium|high",
  "domain": "technical|business|academic|general",
  "intent": "informational|analytical|decisional|creative"
}`;

      const response = await this.llm.generate(semanticPrompt, {
        temperature: 0.1,
        maxTokens: 1000
      });

      return JSON.parse(response.content);

    } catch (error) {
      // Fallback to basic feature extraction
      return this._extractBasicFeatures(content);
    }
  }

  /**
   * Update semantic index for fast retrieval
   */
  _updateSemanticIndex(memoryEntry) {
    const { concepts, keywords, entities } = memoryEntry.semanticFeatures;

    // Index by concepts
    concepts.forEach(concept => {
      if (!this.semanticIndex.has(concept)) {
        this.semanticIndex.set(concept, new Set());
      }
      this.semanticIndex.get(concept).add(memoryEntry.id);
    });

    // Index by keywords
    keywords.forEach(keyword => {
      if (!this.semanticIndex.has(keyword)) {
        this.semanticIndex.set(keyword, new Set());
      }
      this.semanticIndex.get(keyword).add(memoryEntry.id);
    });
  }

  /**
   * Update knowledge graph with relationships
   */
  _updateKnowledgeGraph(memoryEntry) {
    const { relationships } = memoryEntry.semanticFeatures;

    relationships.forEach(([entity1, entity2, relationType]) => {
      const edgeKey = `${entity1}_${relationType}_${entity2}`;

      if (!this.knowledgeGraph.has(edgeKey)) {
        this.knowledgeGraph.set(edgeKey, {
          entity1,
          entity2,
          relationType,
          strength: 1,
          sources: new Set([memoryEntry.id]),
          lastUpdated: Date.now()
        });
      } else {
        const edge = this.knowledgeGraph.get(edgeKey);
        edge.strength += 1;
        edge.sources.add(memoryEntry.id);
        edge.lastUpdated = Date.now();
      }
    });
  }

  /**
   * Cluster similar memories for organization
   */
  async _updateClustering(memoryEntry) {
    const { concepts } = memoryEntry.semanticFeatures;

    concepts.forEach(concept => {
      if (!this.conceptClusters.has(concept)) {
        this.conceptClusters.set(concept, new Set());
      }
      this.conceptClusters.get(concept).add(memoryEntry.id);
      memoryEntry.metadata.clusterIds.push(concept);
    });
  }

  /**
   * Expand query with semantic synonyms and related concepts
   */
  async _expandQuerySemantically(query) {
    try {
      const expansionPrompt = `Expand this query with semantically related terms, synonyms, and concepts for comprehensive retrieval.

QUERY: ${query}

Provide expansion in JSON format:
{
  "expansions": ["expanded_term1", "expanded_term2"],
  "synonyms": ["synonym1", "synonym2"],
  "relatedConcepts": ["concept1", "concept2"],
  "broaderTerms": ["broader1", "broader2"],
  "narrowerTerms": ["narrower1", "narrower2"]
}`;

      const response = await this.llm.generate(expansionPrompt, {
        temperature: 0.3,
        maxTokens: 800
      });

      return JSON.parse(response.content);

    } catch (error) {
      return { expansions: [], synonyms: [], relatedConcepts: [] };
    }
  }

  /**
   * Traverse knowledge graph for related concepts
   */
  async _traverseKnowledgeGraph(query) {
    const relatedConcepts = new Set();
    const queryWords = query.toLowerCase().split(/\s+/);

    // Find direct matches in knowledge graph
    for (const [edgeKey, edge] of this.knowledgeGraph.entries()) {
      if (queryWords.some(word =>
        edge.entity1.toLowerCase().includes(word) ||
        edge.entity2.toLowerCase().includes(word)
      )) {
        relatedConcepts.add(edge.entity1);
        relatedConcepts.add(edge.entity2);
      }
    }

    return {
      concepts: Array.from(relatedConcepts),
      relationships: Array.from(this.knowledgeGraph.values())
        .filter(edge =>
          relatedConcepts.has(edge.entity1) || relatedConcepts.has(edge.entity2)
        )
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 10)
    };
  }

  /**
   * Retrieve session memories relevant to query
   */
  async _retrieveSessionMemories(query) {
    const relevantSessions = [];

    for (const [sessionId, session] of this.sessionMemories.entries()) {
      const relevance = this._calculateSessionRelevance(session, query);
      if (relevance > 0.3) {
        relevantSessions.push({
          sessionId,
          relevance,
          goal: session.goal,
          keyLearnings: session.learnings.slice(-3), // Last 3 learnings
          performance: session.performance
        });
      }
    }

    return {
      context: relevantSessions
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3)
    };
  }

  /**
   * Synthesize combined results into coherent context
   */
  async _synthesizeContext(results, query) {
    try {
      const synthesisPrompt = `Synthesize these retrieved information sources into a coherent context for the given query.

QUERY: ${query}

INFORMATION SOURCES:
${JSON.stringify(results, null, 2)}

Provide synthesized context in JSON format:
{
  "summary": "Coherent summary of relevant information",
  "keyPoints": ["point1", "point2"],
  "relationships": ["relationship1", "relationship2"],
  "knowledgeGaps": ["gap1", "gap2"],
  "confidence": 0.0-1.0,
  "recommendations": ["recommendation1", "recommendation2"]
}`;

      const response = await this.llm.generate(synthesisPrompt, {
        temperature: 0.3,
        maxTokens: 1200
      });

      return JSON.parse(response.content);

    } catch (error) {
      return {
        summary: 'Context synthesis failed, using raw results',
        keyPoints: [],
        relationships: [],
        knowledgeGaps: [],
        confidence: 0.5,
        recommendations: []
      };
    }
  }

  // Helper methods
  _extractBasicFeatures(content) {
    const text = JSON.stringify(content).toLowerCase();
    const words = text.split(/\s+/);

    return {
      concepts: words.filter(w => w.length > 6).slice(0, 5),
      entities: [],
      relationships: [],
      keywords: words.filter(w => w.length > 4).slice(0, 10),
      topics: [],
      sentiment: 'neutral',
      complexity: words.length > 100 ? 'high' : 'medium',
      domain: 'general',
      intent: 'informational'
    };
  }

  _calculateSessionRelevance(session, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sessionText = (session.goal + ' ' + session.learnings.map(l => l.text || '').join(' ')).toLowerCase();

    const matches = queryWords.filter(word => sessionText.includes(word));
    return matches.length / queryWords.length;
  }

  async _enrichExperienceSemantically(experience) {
    return {
      ...experience,
      semanticFeatures: await this._extractSemanticFeatures(experience),
      enrichedAt: Date.now()
    };
  }

  _updateSessionPerformance(session, experience) {
    session.performance.tasksCompleted++;

    if (experience.type === 'task_completion') {
      const successRate = session.performance.successRate || 0;
      session.performance.successRate = (successRate * (session.performance.tasksCompleted - 1) + 1) / session.performance.tasksCompleted;
    }
  }

  async _extractLearning(experience) {
    try {
      const learningPrompt = `Extract key learning from this experience for future improvement.

EXPERIENCE:
${JSON.stringify(experience, null, 2)}

Provide learning in JSON format:
{
  "type": "success|failure|insight",
  "lesson": "What was learned",
  "applicability": "When this learning applies",
  "actionable": "How to apply this learning"
}`;

      const response = await this.llm.generate(learningPrompt, {
        temperature: 0.2,
        maxTokens: 500
      });

      const learning = JSON.parse(response.content);
      learning.timestamp = Date.now();
      learning.source = experience.type;

      return learning;

    } catch (error) {
      return null;
    }
  }

  async _compressSessionMemory(session) {
    // Keep only the most important memories
    session.memories.sort((a, b) => (b.metadata?.importance || 0.5) - (a.metadata?.importance || 0.5));
    session.memories = session.memories.slice(0, this.config.maxSessionMemory * 0.7);
  }

  _combineAndRankResults(baseResults, expansions, graphRelated, sessionMemories, options) {
    // Combine all results with relevance scoring
    const combined = {
      base: baseResults,
      expansions: expansions,
      graph: graphRelated,
      sessions: sessionMemories
    };

    // Apply relevance ranking (simplified version)
    return combined;
  }

  _initializeSemanticIndexing() {
    // Initialize any required data structures for semantic indexing
    console.log('Advanced Memory Manager initialized with semantic indexing');
  }

  // Public interface
  async getMemoryStats() {
    return {
      semanticIndex: this.semanticIndex.size,
      knowledgeGraph: this.knowledgeGraph.size,
      activeSessions: this.sessionMemories.size,
      conceptClusters: this.conceptClusters.size,
      compressionHistory: this.compressionHistory.size,
      baseMemoryStats: this.baseMemory.getStats()
    };
  }

  async cleanupOldMemories() {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days

    for (const [sessionId, session] of this.sessionMemories.entries()) {
      if (session.lastActive < cutoffTime) {
        this.sessionMemories.delete(sessionId);
      }
    }

    // Clean up old compression history
    for (const [memoryId, compression] of this.compressionHistory.entries()) {
      if (compression.compressedAt < cutoffTime) {
        this.compressionHistory.delete(memoryId);
      }
    }
  }
}