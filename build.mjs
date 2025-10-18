import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

async function build() {
  try {
    // Ensure dist directory exists
    await mkdir('./dist', { recursive: true });
    
    console.log('🔨 Building web UI...');
    
    // Copy Project Management UI (index.html)
    console.log('📄 Copying index.html...');
    const indexHtml = await readFile('./src/ui/index.html', 'utf8');
    await writeFile('./dist/index.html', indexHtml);
    
    // Copy Chat UI (chat.html)
    console.log('📄 Copying chat.html...');
    const chatHtml = await readFile('./src/ui/chat.html', 'utf8');
    await writeFile('./dist/chat.html', chatHtml);
    
    // Copy CSS files
    console.log('🎨 Copying CSS files...');
    const styleFile = await copyIfExists('./src/ui/style.css', './dist/style.css');
    const chatCss = await readFile('./src/ui/chat.css', 'utf8');
    await writeFile('./dist/chat.css', chatCss);
    
    // Process and copy JavaScript files
    console.log('⚙️  Processing JavaScript files...');
    const appJs = await readFile('./src/ui/app.js', 'utf8');
    await writeFile('./dist/app.js', appJs);
    
    const chatJs = await readFile('./src/ui/chat.js', 'utf8');
    await writeFile('./dist/chat.js', chatJs);
    
    const chatManagerJs = await readFile('./src/ui/ChatManager.js', 'utf8');
    await writeFile('./dist/ChatManager.js', chatManagerJs);
    
    // Copy additional assets
    await copyIfExists('./src/ui/icon.svg', './dist/icon.svg');
    
    console.log('✅ Build completed successfully!');
    console.log('📁 Files created in ./dist/');
    console.log('');
    console.log('Available pages:');
    console.log('  • Project Management: http://localhost:8080/');
    console.log('  • Chat Interface:     http://localhost:8080/chat.html');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function processJavaScript(js) {
  // Simple minification and processing
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
    .trim();
}

async function copyIfExists(src, dest) {
  try {
    const content = await readFile(src, 'utf8');
    await writeFile(dest, content);
    return true;
  } catch (error) {
    // File doesn't exist, skip
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}
