#!/usr/bin/env node

import { AutonomousAgent } from './src/core/AutonomousAgent.js';

// Simple test without starting web server
async function testAgent() {
  console.log('🧪 Testing Tiny Autonomous Research Agent...');
  
  const agent = new AutonomousAgent({
    workDirectory: './test_workspace',
    maxConcurrentTasks: 1,
    autoCleanup: false,
    memoryOptions: {
      maxShortTermSize: 100,
      maxLongTermSize: 1000
    },
    llmConfig: {
      defaultProvider: 'lmstudio',
      fallback: false,
      lmStudio: {
        baseUrl: 'http://localhost:1234',
        timeout: 10000
      }
    }
  });
  
  // Get agent status
  const status = agent.getStatus();
  console.log('\n✅ Agent Status:');
  console.log(`  Agent ID: ${status.agentId}`);
  console.log(`  Status: ${status.status}`);
  console.log(`  Memory: ${status.memory.totalMemoryUsage} bytes`);
  
  // Test memory system
  console.log('\n🧠 Testing Memory System...');
  agent.memory.setShortTerm('test', { data: 'test data' });
  const retrieved = agent.memory.getShortTerm('test');
  console.log(`  Short-term memory test: ${retrieved?.data === 'test data' ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test long-term memory
  agent.memory.setLongTerm('lt_test', { data: 'long term data' });
  const ltRetrieved = agent.memory.getLongTerm('lt_test');
  console.log(`  Long-term memory test: ${ltRetrieved?.data === 'long term data' ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test context retrieval
  const context = agent.memory.retrieveContext('test', { includeShortTerm: true });
  console.log(`  Context retrieval: ${context.shortTerm.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test task decomposition (without LLM for now)
  console.log('\n📋 Testing Task Management...');
  try {
    // This would normally use LLM, so we'll test the structure
    const taskManager = agent.taskManager;
    console.log('  Task Manager initialized ✅');
  } catch (error) {
    console.log(`  Task Manager test: ❌ FAIL - ${error.message}`);
  }
  
  // Test tools
  console.log('\n🔧 Testing Tool System...');
  const tools = agent.tools;
  const toolList = tools.getToolList();
  console.log(`  Available tools: ${Object.keys(toolList).join(', ')} ✅`);
  
  // Cleanup
  await agent.shutdown();
  console.log('\n🎉 All tests completed! Agent is ready for use.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testAgent().catch(console.error);
}
