import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

async function build() {
  try {
    // Ensure dist directory exists
    await mkdir('./dist', { recursive: true });
    
    console.log('🔨 Building web UI...');
    
    // Copy HTML template
    const html = await readFile('./src/ui/index.html', 'utf8');
    await writeFile('./dist/index.html', html);
    
    // Copy CSS
    const css = await readFile('./src/ui/style.css', 'utf8');
    await writeFile('./dist/style.css', css);
    
    // Process and copy JavaScript
    const js = await readFile('./src/ui/app.js', 'utf8');
    const processedJs = processJavaScript(js);
    await writeFile('./dist/app.js', processedJs);
    
    // Copy additional assets
    await copyIfExists('./src/ui/icon.svg', './dist/icon.svg');
    
    console.log('✅ Build completed successfully!');
    console.log('📁 Files created in ./dist/');
    
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
  } catch (error) {
    // File doesn't exist, skip
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}
