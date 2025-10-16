import { v4 as uuidv4 } from 'uuid';
import pako from 'pako';

export class MemorySystem {
  constructor(options = {}) {
    this.shortTermMemory = new Map();
    this.longTermMemory = new Map();
    this.episodicMemory = new Map();
    this.maxShortTermSize = options.maxShortTermSize || 1000;
    this.maxLongTermSize = options.maxLongTermSize || 10000;
    this.compressionThreshold = options.compressionThreshold || 1024;
  }

  // SHORT TERM MEMORY - Cache immediate context and recent operations
  setShortTerm(key, value, ttl = 3600000) { // 1 hour default TTL
    const now = Date.now();
    
    // Compress large content
    const serializedValue = JSON.stringify(value);
    const shouldCompress = serializedValue.length > this.compressionThreshold;
    const content = shouldCompress ? pako.deflate(serializedValue) : serializedValue;
    
    this.shortTermMemory.set(key, {
      id: uuidv4(),
      content,
      compressed: shouldCompress,
      timestamp: now,
      expires: now + ttl,
      accessCount: 1,
      lastAccess: now
    });

    // Evict old entries if memory is full
    this._evictShortTermIfNeeded();
    return value;
  }

  getShortTerm(key) {
    const entry = this.shortTermMemory.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expires) {
      this.shortTermMemory.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();

    // Decompress if needed
    const content = entry.compressed ? 
      pako.inflate(entry.content) : entry.content;
    
    return typeof content === 'string' ? JSON.parse(content) : content;
  }

  // LONG TERM MEMORY - Store persistent knowledge and context graphs
  setLongTerm(key, value, metadata = {}) {
    const now = Date.now();
    const serializedValue = JSON.stringify(value);
    
    // Create semantic index for better retrieval
    const semanticSignature = this._createSemanticSignature(value);
    
    this.longTermMemory.set(key, {
      id: uuidv4(),
      content: this._compressContent(serializedValue),
      metadata: {
        ...metadata,
        semanticSignature,
        size: serializedValue.length,
        tags: metadata.tags || []
      },
      timestamp: now,
      lastAccess: now,
      accessCount: 1,
      importance: metadata.importance || 1.0
    });

    this._evictLongTermIfNeeded();
    return value;
  }

  getLongTerm(key) {
    const entry = this.longTermMemory.get(key);
    if (!entry) return null;

    entry.accessCount++;
    entry.lastAccess = Date.now();
    
    const content = this._decompressContent(entry.content);
    return JSON.parse(content);
  }

  // EPISODIC MEMORY - Store task sequences and experiences
  addEpisode(episode) {
    const episodeId = uuidv4();
    const now = Date.now();
    
    this.episodicMemory.set(episodeId, {
      id: episodeId,
      ...episode,
      timestamp: now,
      summary: this._summarizeEpisode(episode),
      keyMoments: this._extractKeyMoments(episode),
      connections: []
    });

    // Create connections to related episodes
    this._createEpisodeConnections(episodeId);
    return episodeId;
  }

  // CONTEXT RETRIEVAL with semantic search
  retrieveContext(query, options = {}) {
    const results = {
      shortTerm: [],
      longTerm: [],
      episodes: []
    };

    // Semantic search in short term memory
    if (options.includeShortTerm !== false) {
      for (const [key, entry] of this.shortTermMemory) {
        const similarity = this._calculateSimilarity(query, key, entry);
        if (similarity > 0.3) {
          const value = this.getShortTerm(key);
          results.shortTerm.push({ key, value, similarity, entry });
        }
      }
    }

    // Semantic search in long term memory
    if (options.includeLongTerm !== false) {
      for (const [key, entry] of this.longTermMemory) {
        const similarity = this._calculateSimilarity(
          query, 
          key, 
          entry.metadata.semanticSignature
        );
        if (similarity > 0.3) {
          const value = this.getLongTerm(key);
          results.longTerm.push({ key, value, similarity, entry });
        }
      }
    }

    // Episode retrieval based on content similarity
    if (options.includeEpisodes !== false) {
      for (const [id, episode] of this.episodicMemory) {
        const similarity = this._calculateEpisodeSimilarity(query, episode);
        if (similarity > 0.2) {
          results.episodes.push({ episode, similarity });
        }
      }
    }

    // Sort by relevance
    Object.keys(results).forEach(type => {
      results[type].sort((a, b) => b.similarity - a.similarity);
    });

    return results;
  }

  // Memory management and cleanup
  cleanup() {
    const now = Date.now();
    
    // Cleanup expired short-term memory
    for (const [key, entry] of this.shortTermMemory) {
      if (now > entry.expires) {
        this.shortTermMemory.delete(key);
      }
    }

    // Promote frequently accessed short-term to long-term
    for (const [key, entry] of this.shortTermMemory) {
      if (entry.accessCount > 5 && entry.lastAccess > now - 300000) { // 5 minutes
        const value = this.getShortTerm(key);
        this.setLongTerm(`promoted_${key}`, value, {
          source: 'short_term_promotion',
          originalKey: key
        });
        this.shortTermMemory.delete(key);
      }
    }
  }

  // Cache statistics and insights
  getStats() {
    return {
      shortTerm: {
        size: this.shortTermMemory.size,
        maxSize: this.maxShortTermSize,
        utilization: this.shortTermMemory.size / this.maxShortTermSize
      },
      longTerm: {
        size: this.longTermMemory.size,
        maxSize: this.maxLongTermSize,
        utilization: this.longTermMemory.size / this.maxLongTermSize
      },
      episodes: this.episodicMemory.size,
      totalMemoryUsage: this._estimateMemoryUsage()
    };
  }

  // INTERNAL METHODS
  
  _evictShortTermIfNeeded() {
    if (this.shortTermMemory.size <= this.maxShortTermSize) return;

    const entries = Array.from(this.shortTermMemory.entries());
    entries.sort((a, b) => 
      (a[1].importance * a[1].accessCount / (Date.now() - a[1].lastAccess)) -
      (b[1].importance * b[1].accessCount / (Date.now() - b[1].lastAccess))
    );

    // Remove least valuable entries
    const toRemove = Math.floor(this.maxShortTermSize * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.shortTermMemory.delete(entries[i][0]);
    }
  }

  _evictLongTermIfNeeded() {
    if (this.longTermMemory.size <= this.maxLongTermSize) return;

    const entries = Array.from(this.longTermMemory.entries());
    entries.sort((a, b) => 
      (b[1].importance * b[1].accessCount) - (a[1].importance * a[1].accessCount)
    );

    // Remove least important long-term entries
    const toRemove = Math.floor(this.maxLongTermSize * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.longTermMemory.delete(entries[i][0]);
    }
  }

  _createSemanticSignature(content) {
    // Create a simple semantic fingerprint for similarity matching
    const text = JSON.stringify(content).toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const wordSet = new Set(words);
    return Array.from(wordSet).sort().join('|').substring(0, 500);
  }

  _calculateSimilarity(query, key1, content1) {
    // Simple keyword-based similarity for now
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = new Set(content1.toString().toLowerCase().split(/\s+/));
    
    const intersection = new Set([...queryWords].filter(x => contentWords.has(x)));
    const union = new Set([...queryWords, ...contentWords]);
    
    return intersection.size / union.size;
  }

  _summarizeEpisode(episode) {
    const summary = {
      duration: episode.endTime - episode.startTime,
      tasks: episode.tasks?.length || 0,
      outcomes: episode.outcomes || [],
      keyTopics: this._extractTopics(episode)
    };
    return summary;
  }

  _extractKeyMoments(episode) {
    // Identify significant moments in the episode
    const moments = [];
    
    if (episode.success) moments.push('task_completion');
    if (episode.errors?.length > 0) moments.push('error_occurred');
    if (episode.decisions?.length > 0) moments.push('critical_decision');
    
    return moments;
  }

  _extractTopics(episode) {
    const content = JSON.stringify(episode).toLowerCase();
    const commonWords = ['research', 'analysis', 'code', 'data', 'report', 'web', 'file'];
    return commonWords.filter(word => content.includes(word));
  }

  _createEpisodeConnections(episodeId) {
    // Find related episodes based on similarity
    const currentEpisode = this.episodicMemory.get(episodeId);
    if (!currentEpisode) return;

    for (const [id, episode] of this.episodicMemory) {
      if (id === episodeId) continue;
      
      const similarity = this._calculateEpisodeSimilarity(
        currentEpisode.summary?.keyTopics?.join(' ') || '',
        episode
      );
      
      if (similarity > 0.4) {
        currentEpisode.connections.push({
          episodeId: id,
          similarity,
          type: 'thematic'
        });
      }
    }
  }

  _calculateEpisodeSimilarity(query, episode) {
    const episodeText = JSON.stringify(episode).toLowerCase();
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const episodeWords = new Set(episodeText.split(/\s+/));
    
    const intersection = new Set([...queryWords].filter(x => episodeWords.has(x)));
    return intersection.size / Math.max(queryWords.size, 1);
  }

  _compressContent(content) {
    return content.length > this.compressionThreshold ? 
      pako.deflate(content) : content;
  }

  _decompressContent(content) {
    return content instanceof Uint8Array ? pako.inflate(content) : content;
  }

  _estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const entry of this.shortTermMemory.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    
    for (const entry of this.longTermMemory.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    
    for (const episode of this.episodicMemory.values()) {
      totalSize += JSON.stringify(episode).length;
    }
    
    return totalSize;
  }
}
