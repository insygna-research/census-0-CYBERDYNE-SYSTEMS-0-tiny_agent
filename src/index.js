import express from 'express';
import { WebSocketServer } from 'ws';
import { AutonomousAgent } from './core/AutonomousAgent.js';

// Initialize the autonomous agent
const agent = new AutonomousAgent({
  workDirectory: './agent_workspace',
  maxConcurrentTasks: 2,
  autoCleanup: true,
  memoryOptions: {
    maxShortTermSize: 800,
    maxLongTermSize: 8000
  },
  llmConfig: {
    defaultProvider: 'lmstudio',
    fallback: true,
    lmStudio: {
      baseUrl: 'http://localhost:1234',
      model: 'ibm/granite-4-h-micro',  // IBM Granite 4-H Micro model
      timeout: 30000
    },
    openrouter: {
      model: 'anthropic/claude-3.5-sonnet',
      timeout: 60000
    }
  }
});

// Express server for REST API
const app = express();
const server = app.listen(8080, () => {
  console.log('🤖 Tiny Autonomous Research Agent Server running on http://localhost:8080');
});

// WebSocket server for real-time communication
const wss = new WebSocketServer({ server });

// Store active connections
const connections = new Set();

wss.on('connection', (ws) => {
  connections.add(ws);
  console.log('🔗 Client connected');

  // Send agent status on connection
  ws.send(JSON.stringify({
    type: 'status',
    data: agent.getStatus()
  }));

  ws.on('message', async (message) => {
    try {
      const request = JSON.parse(message);
      await handleWebSocketRequest(ws, request);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    connections.delete(ws);
    console.log('🔗 Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Setup agent event listeners
agent.on('status.changed', (data) => {
  broadcast({
    type: 'agent.status_changed',
    data
  });
});

agent.on('task.start', (data) => {
  broadcast({
    type: 'task.started',
    data
  });
});

agent.on('task.completed', (data) => {
  broadcast({
    type: 'task.completed',
    data
  });
});

agent.on('project.completed', (data) => {
  broadcast({
    type: 'project.completed',
    data
  });
});

agent.on('error', (data) => {
  broadcast({
    type: 'agent.error',
    data
  });
});

// REST API Routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get agent status
app.get('/api/status', (req, res) => {
  try {
    const status = agent.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start research
app.post('/api/research', async (req, res) => {
  try {
    const { goal, options } = req.body;
    if (!goal) {
      return res.status(400).json({ success: false, error: 'Goal is required' });
    }

    const result = await agent.startResearch(goal, options);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get project status
app.get('/api/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const status = agent.getProjectStatus(projectId);
    
    if (!status) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = {
      active: Array.from(agent.activeProjects.entries()).map(([id, project]) => ({
        id,
        goal: project.goal,
        status: project.status,
        startTime: project.startTime
      })),
      completed: Array.from(agent.completedProjects.entries()).map(([id, project]) => ({
        id,
        goal: project.goal,
        status: project.status,
        startTime: project.startTime,
        endTime: project.endTime
      }))
    };
    
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pause project
app.post('/api/project/:projectId/pause', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await agent.pauseProject(projectId);
    res.json({ success: true, data: { paused: result } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resume project
app.post('/api/project/:projectId/resume', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await agent.resumeProject(projectId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate report
app.post('/api/report', async (req, res) => {
  try {
    const { taskId, options } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Task ID is required' });
    }

    const report = await agent.reportGenerator.generateResearchReport(taskId, options);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check LLM provider status
app.get('/api/providers/status', async (req, res) => {
  try {
    const lmStudioStatus = await agent.llmClient.checkProviderStatus('lmstudio');
    const openRouterStatus = await agent.llmClient.checkProviderStatus('openrouter');
    
    res.json({
      success: true,
      data: {
        lmstudio: lmStudioStatus,
        openrouter: openRouterStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const { provider = 'lmstudio' } = req.query;
    const models = await agent.llmClient.getAvailableModels(provider);
    res.json({ success: true, data: { provider, models } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent configuration
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    agent.updateConfig(newConfig);
    res.json({ success: true, data: agent.llmClient.getStats() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shutdown gracefully
app.post('/api/shutdown', async (req, res) => {
  try {
    await agent.shutdown();
    server.close(() => {
      process.exit(0);
    });
    res.json({ success: true, message: 'Shutting down' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket request handler
async function handleWebSocketRequest(ws, request) {
  const { type, id, data } = request;

  try {
    let response;

    switch (type) {
      case 'chat.message':
        // Broadcast user message immediately
        broadcast({
          type: 'chat.message',
          data: {
            id: Date.now(),
            type: 'user',
            sender: 'You',
            content: data.content,
            timestamp: new Date().toISOString()
          }
        });
        
        // Process with LLM and respond
        try {
          const llmResponse = await handleChatMessage(data.content);
          
          broadcast({
            type: 'chat.message',
            data: {
              id: Date.now() + 1,
              type: 'agent',
              sender: 'Agent',
              content: llmResponse,
              timestamp: new Date().toISOString()
            }
          });
        } catch (chatError) {
          broadcast({
            type: 'chat.message',
            data: {
              id: Date.now() + 1,
              type: 'agent',
              sender: 'Agent',
              content: `I encountered an error: ${chatError.message}`,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Don't send a direct response for chat messages
        response = null;
        break;

      case 'research.start':
        response = await agent.startResearch(data.goal, data.options);
        break;

      case 'project.status':
        response = agent.getProjectStatus(data.projectId);
        break;

      case 'project.pause':
        response = await agent.pauseProject(data.projectId);
        break;

      case 'project.resume':
        response = await agent.resumeProject(data.projectId);
        break;

      case 'report.generate':
        response = await agent.reportGenerator.generateResearchReport(
          data.taskId, 
          data.options
        );
        break;

      case 'agent.status':
        response = agent.getStatus();
        break;

      case 'config.update':
        agent.updateConfig(data.config);
        response = { success: true };
        break;

      case 'projects.list':
        response = {
          active: Array.from(agent.activeProjects.entries()).map(([id, project]) => ({
            id,
            goal: project.goal,
            status: project.status,
            startTime: project.startTime
          })),
          completed: Array.from(agent.completedProjects.entries()).map(([id, project]) => ({
            id,
            goal: project.goal,
            status: project.status,
            startTime: project.startTime,
            endTime: project.endTime
          }))
        };
        break;

      default:
        throw new Error(`Unknown request type: ${type}`);
    }

    if (id && response !== null) {
      ws.send(JSON.stringify({
        type: 'response',
        id,
        data: { success: true, ...response }
      }));
    }

  } catch (error) {
    if (id) {
      ws.send(JSON.stringify({
        type: 'response',
        id,
        data: { success: false, error: error.message }
      }));
    }
  }
}

// Handle chat message processing
async function handleChatMessage(content) {
  try {
    // Check if message contains URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    
    // Enhance prompt with URL context if present
    let prompt = content;
    if (urls && urls.length > 0) {
      const urlList = urls.map(url => `- ${url}`).join('\n');
      prompt = `The user shared these links:\n${urlList}\n\nUser's message: ${content.replace(urlRegex, '').trim() || 'Please analyze these links'}`;
    }
    
    // Get actual LLM response
    const response = await agent.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 1000
    });
    
    return response.content;
    
  } catch (error) {
    console.error('Chat message processing error:', error);
    throw error;
  }
}

// Broadcast messages to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  
  for (const connection of connections) {
    if (connection.readyState === WebSocket.OPEN) {
      connection.send(messageStr);
    }
  }
}

// Serve static files (for future web UI)
app.use(express.static('dist'));

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await agent.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await agent.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// CLI interface when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🤖 Tiny Autonomous Research Agent

Usage:
  node src/index.js [command] [options]

Commands:
  (no args)       Start web server on http://localhost:8080
  research <goal> Run research from CLI
  status          Show agent status
  help            Show this help

Examples:
  node src/index.js research "Latest AI agent architectures"
  node src/index.js research "Python performance optimization"
  node src/index.js status

Web Interface:
  Start server and visit http://localhost:8080
    `);
  } else if (args[0] === 'research' && args[1]) {
    const goal = args.slice(1).join(' ');
    console.log(`🔍 Starting research: ${goal}`);
    
    agent.startResearch(goal).then(result => {
      if (result.success) {
        console.log('\n✅ Research completed successfully!');
        console.log('\n📊 Results:');
        console.log(result.report);
        
        if (result.metadata?.path) {
          console.log(`\n📄 Report saved to: ${result.metadata.path}`);
        }
      } else {
        console.error('\n❌ Research failed:', result.error);
      }
      
      process.exit(0);
    }).catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
  } else if (args[0] === 'status') {
    const status = agent.getStatus();
    console.log(`
🤖 Agent Status:
  
Agent ID: ${status.agentId}
Status: ${status.status}
Uptime: ${Math.round(status.uptime / 1000 / 60)} minutes
Active Projects: ${status.activeProjects}
Completed Projects: ${status.completedProjects}
Tasks Completed: ${status.metrics.tasksCompleted}
Tasks Failed: ${status.metrics.tasksFailed}
Memory Usage: ${Math.round(status.memory.totalMemoryUsage / 1024)} KB

LLM Stats:
- Current Provider: ${status.llmStatus.currentProvider}
- Cache Size: ${status.llmStatus.cacheSize}

Memory Stats:
- Short Term: ${status.memory.shortTerm.size}/${status.memory.shortTerm.maxSize} (${Math.round(status.memory.shortTerm.utilization * 100)}%)
- Long Term: ${status.memory.longTerm.size}/${status.memory.longTerm.maxSize} (${Math.round(status.memory.longTerm.utilization * 100)}%)
- Episodes: ${status.memory.episodes}
    `);
  } else if (args[0] === 'help') {
    console.log(`
🤖 Tiny Autonomous Research Agent Help

This agent performs autonomous research tasks using:
- Hybrid memory systems (short-term and long-term)
- Intelligent task decomposition
- Web research capabilities
- File operations
- Comprehensive report generation

Features:
- Long-horizon task execution with state persistence
- Context caching for efficient operation
- LM Studio and OpenRouter integration
- Modern web UI with project management
- Real-time task monitoring

Configuration:
- Edit src/index.js to modify agent settings
- Set environment variables for API keys
- Configure LLM endpoints in config

Web Interface:
1. Start server: node src/index.js
2. Open browser: http://localhost:8080
3. Enter research goal and click start

API Endpoints:
- POST /api/research - Start new research
- GET /api/status - Agent status
- GET /api/projects - List projects
- POST /api/project/:id/pause - Pause project
- POST /api/project/:id/resume - Resume project
- POST /api/report - Generate report
    `);
  } else {
    console.log('Unknown command. Use "help" for usage information.');
  }
}

export { AutonomousAgent };
