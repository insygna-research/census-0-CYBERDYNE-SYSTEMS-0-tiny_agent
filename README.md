# Tiny Autonomous Research Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A lightweight, intelligent autonomous agent designed for long-horizon research tasks with modern UX and comprehensive capabilities.

## 🌟 Features

### Core Capabilities
- **Long-Horizon Task Execution**: Handles complex multi-step research projects with intelligent decomposition
- **Hybrid Memory System**: Short-term cache + long-term knowledge storage with context retrieval
- **State Persistence**: Projects can be paused and resumed without losing progress
- **Modern Web Interface**: Clean, responsive UI with real-time task monitoring

### Research Tools
- **Web Research**: Intelligent web searching and content extraction
- **File Operations**: Read, write, and edit files with smart operations
- **Report Generation**: Comprehensive markdown reports with multiple sections
- **Analysis Tools**: Text analysis, pattern recognition, and semantic similarity

### LLM Integration
- **LM Studio Support**: Local model execution
- **OpenRouter Integration**: Cloud-based model access
- **Automatic Fallback**: Failover between providers
- **Cost Optimization**: Intelligent caching and reuse

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd tiny_agent

# Install dependencies
npm install

# Build the web UI
node build.mjs
```

### 2. Start the Agent

```bash
# Start with web interface
npm start

# Or CLI mode
node src/index.js help
```

### 3. Configure LLM Provider

Choose one of the following:

#### Option A: LM Studio (Local, Free)
1. Download [LM Studio](https://lmstudio.ai/)
2. Install and open LM Studio
3. Download a model (recommended: Mistral 7B, Llama 2, or similar)
4. Click "Start Server" in LM Studio (default port: 1234)
5. The agent will automatically connect

#### Option B: OpenRouter (Cloud, Requires API Key)
1. Create account at [openrouter.ai](https://openrouter.ai)
2. Navigate to Keys section and generate an API key
3. Set the environment variable:
   ```bash
   export OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```
   Or configure it in the web UI settings

### 4. Access the Interfaces

Two interfaces are available:

**Chat Interface** (Recommended for interactive use):
- URL: **http://localhost:8080/chat.html**
- Conversational interaction with the agent
- Send links for analysis
- Get streaming responses
- Perfect for quick questions and exploration

**Project Management Interface**:
- URL: **http://localhost:8080/**
- Formal research project management
- Start comprehensive research tasks
- Monitor multiple active projects
- Generate detailed reports

### 5. First Research

#### Using Chat Interface:
1. Open http://localhost:8080/chat.html
2. Configure settings (⚙️ button) to select LLM provider
3. Send a message like:
   ```
   Research the latest AI agent architectures using context caching
   ```
4. The agent will process your request and provide results

#### Using Project Interface:
1. Open http://localhost:8080/
2. Enter a research goal:
   ```
   Latest AI agent architectures using context caching and memory systems
   ```
3. Click "Start Research"
4. Monitor progress and view comprehensive report when complete

## 💡 Usage Examples

### Chat Interface (Interactive)
1. Open **http://localhost:8080/chat.html**
2. Configure LLM provider in Settings
3. Start chatting with the agent:
   - "What are the latest developments in AI?"
   - "Analyze this article: https://example.com/article"
   - "Research and compare React vs Vue.js"
4. Receive real-time responses with typing indicators
5. Ask follow-up questions naturally

### Project Management Interface (Formal Research)
1. Open **http://localhost:8080/**
2. Enter your research goal in the form
3. Select options (detailed analysis, report format)
4. Click "Start Research"
5. Monitor progress in real-time
6. View comprehensive reports when complete
7. Pause/resume projects as needed

### CLI Mode
```bash
# Research from command line
node src/index.js research "Python performance optimization techniques"

# Check agent status
node src/index.js status
```

### REST API
```bash
# Start research via API
curl -X POST http://localhost:8080/api/research \
  -H "Content-Type: application/json" \
  -d '{"goal": "Modern web development frameworks"}'

# Get agent status
curl http://localhost:8080/api/status
```

## 🏗️ Architecture

### Core Components

#### Memory System
- **Short-Term Memory**: Active task context and recent operations (compressible, TTL-based)
- **Long-Term Memory**: Persistent knowledge and results (semantic indexing)
- **Episodic Memory**: Task sequences and experiences (context connections)
- **Intelligent Caching**: Automatic compression and eviction based on access patterns

#### Task Manager
- **Intelligent Decomposition**: Breaks complex goals into manageable subtasks
- **Dependency Management**: Handles task relationships and execution order
- **Error Recovery**: Automatic retry strategies and fallback mechanisms
- **Progress Tracking**: Real-time status updates and progress visualization

#### LLM Integration
- **Multi-Provider Support**: LM Studio (local) + OpenRouter (cloud)
- **Automatic Fallback**: Switches providers if one fails
- **Context Management**: Intelligent prompt construction with memory context
- **Cost Optimization**: Response caching and reuse

#### Tool System
- **File Operations**: Read, write, edit with smart editing operations
- **Web Research**: Search, fetch, and content extraction with filtering
- **Analysis Tools**: Text analysis, pattern recognition, statistics
- **Extensible Design**: Easy to add new tool capabilities

### Research Agent Architecture

Based on cutting-edge research in autonomous agents:

1. **Memory Systems**: Inspired by KARMA's dual memory architecture
2. **Context Caching**: Following MemGPT's hierarchical memory approach
3. **Task Decomposition**: Similar to AgentKit's dynamic graph reasoning
4. **Episodic Learning**: Drawing from AriGraph's knowledge graph methodology

## ⚙️ Configuration

### Environment Variables

```bash
# OpenRouter API Key (if using OpenRouter)
export OPENROUTER_API_KEY=your-openrouter-api-key

# Optional custom configurations
export AGENT_WORK_DIR=./my_workspace
export AGENT_MAX_CONCURRENT=2
```

### Configuration File

Edit `src/index.js` to modify agent settings:

```javascript
const agent = new AutonomousAgent({
  workDirectory: './agent_workspace',
  maxConcurrentTasks: 2,
  memoryOptions: {
    maxShortTermSize: 800,
    maxLongTermSize: 8000
  },
  llmConfig: {
    defaultProvider: 'lmstudio',
    fallback: true
  }
});
```

### LM Studio Setup (Local LLMs)

**Advantages:**
- ✅ Free and private
- ✅ No API limits
- ✅ Run offline
- ✅ Full control over models

**Setup Steps:**
1. Download [LM Studio](https://lmstudio.ai/) for your OS
2. Install and open LM Studio
3. Download a model from the Models tab:
   - **Recommended for research**: `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
   - **Fast and efficient**: `TheBloke/Llama-2-7B-Chat-GGUF`
   - **Larger, more capable**: `TheBloke/Llama-2-13B-Chat-GGUF`
4. Click "Local Server" tab
5. Click "Start Server" (ensure port is 1234)
6. In the web UI Settings:
   - Select "LM Studio" as provider
   - URL should be: `http://localhost:1234`
   - Click "Test Connection" to verify

**Troubleshooting LM Studio:**
- Ensure the server is running (green indicator in LM Studio)
- Check no firewall is blocking port 1234
- Try different models if one doesn't work well
- Increase context length in LM Studio for better results

### OpenRouter Setup (Cloud LLMs)

**Advantages:**
- ✅ Access to latest models (Claude 3.5, GPT-4, etc.)
- ✅ No local setup required
- ✅ Higher quality responses
- ✅ Automatic model updates

**Setup Steps:**
1. Create account at [openrouter.ai](https://openrouter.ai)
2. Add credits ($5-10 recommended for testing)
3. Navigate to **Keys** section
4. Click "Create Key" and copy the API key
5. Set environment variable (recommended):
   ```bash
   export OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```
   Or configure in web UI:
   - Open Settings (⚙️ button)
   - Select "OpenRouter" as provider
   - Paste your API key
   - Select model (Claude 3.5 Sonnet recommended)
   - Click "Test Connection" to verify

**Recommended Models:**
- **Claude 3.5 Sonnet**: Best for research and analysis
- **Claude 3 Opus**: Most capable, higher cost
- **GPT-4 Turbo**: Good for general tasks
- **Claude 3 Haiku**: Fastest, most economical

**Cost Estimates** (approximate):
- Light research query: $0.01 - $0.05
- Medium research task: $0.10 - $0.50
- Comprehensive research: $0.50 - $2.00

## 📊 Projects and Tasks

### Project Management

Projects can be:
- **Active**: Currently running research
- **Paused**: Temporarily stopped (can be resumed)
- **Completed**: Finished with comprehensive reports
- **Failed**: Encountered critical errors

### Task Types

- **Research**: Core investigation and analysis
- **Web Search**: Online information gathering
- **File Operations**: Reading, writing, editing files
- **Report Generation**: Creating comprehensive documentation
- **Analysis**: Processing and synthesizing data

### Report Sections

Generated reports include:
- **Executive Summary**: High-level overview and findings
- **Methodology**: Research approach and techniques used
- **Findings**: Key results and discoveries
- **Analysis**: Detailed interpretation and insights
- **Sources**: References and citations
- **Recommendations**: Actionable next steps
- **Appendices**: Technical details and methodologies

## 🛠️ Advanced Usage

### Custom Tool Development

```javascript
// Add custom tools to the ToolSystem
class CustomTool extends ToolSystem {
  async customOperation(input) {
    // Custom tool implementation
  }
}
```

### Report Customization

```javascript
// Add custom report templates
agent.reportGenerator.addTemplate('technical-deep-dive', {
  sections: {
    overview: { type: 'summary', title: 'Technical Overview' },
    architecture: { type: 'analysis', title: 'System Architecture' },
    implementation: { type: 'details', title: 'Implementation' }
  }
});
```

### Event Handling

```javascript
// Monitor agent events
agent.on('project.completed', (data) => {
  console.log('Project completed:', data.projectId);
});

agent.on('task.failed', (data) => {
  console.log('Task failed:', data.subtask.title);
});
```

## 🔍 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/research` | Start new research |
| GET | `/api/status` | Get agent status |
| GET | `/api/projects` | List all projects |
| GET | `/api/project/:id` | Get project details |
| POST | `/api/project/:id/pause` | Pause project |
| POST | `/api/project/:id/resume` | Resume project |
| POST | `/api/report` | Generate report |
| GET | `/api/providers/status` | Check LLM providers |
| POST | `/api/shutdown` | Graceful shutdown |

### WebSocket Events

| Event | Description |
|-------|-------------|
| `status` | Agent status updates |
| `task.started` | Task execution begun |
| `task.completed` | Task finished successfully |
| `project.completed` | Project finished |
| `agent.error` | Error occurrence |

## 🚨 Troubleshooting

### Common Issues

**Q: Agent won't connect to LM Studio**
- Check LM Studio is running (port 1234)
- Verify a model is loaded
- Try refreshing the web page

**Q: Research tasks keep failing**
- Check internet connection
- Verify LLM provider status in settings
- Review error messages in browser console

**Q: Interface not loading**
- Ensure agent server is running (`npm start`)
- Check port 8080 is available
- Try clearing browser cache

### Debug Mode

Enable detailed logging:
```bash
# Run with debug logging
DEBUG=agent:* node src/index.js
```

### Logs and Output

- **Agent Logs**: Console output from server
- **Web Console**: Browser developer tools
- **Project Files**: Saved in `./agent_workspace/`
- **Reports**: Generated in project directories

## 🤝 Contributing

### Development Setup

```bash
# Clone and install
git clone <your-repo>
cd tiny_agent
npm install

# Development mode with hot reload
npm run dev

# Run tests
npm test
```

### Code Structure

```
src/
├── core/          # Core agent components
├── memory/        # Memory system implementation
├── llm/          # LLM client and integration
├── tools/        # Research and file tools
├── ui/           # Web interface
└── index.js      # Main entry point
```

### Adding Features

1. Core functionality in `src/core/`
2. New tools in `src/tools/`
3. Memory features in `src/memory/`
4. UI updates in `src/ui/`

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

Based on cutting-edge research in autonomous agents:

- **KARMA Memory System** - Long and short-term memory for embodied agents
- **MemGPT** - LLMs as operating systems with hierarchical memory
- **AgentKit** - Structured reasoning with dynamic graphs
- **Optimus-1** - Hybrid multimodal memory for long-horizon tasks
- **AriGraph** - Knowledge graphs with episodic memory

Thanks to the AI research community for advancing autonomous agent capabilities.

## 📞 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Community discussions and Q&A
- **Documentation**: Additional docs and examples

---

**Built with ❤️ for the autonomous agent community**
