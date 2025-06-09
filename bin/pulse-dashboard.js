#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Next.js CLI. It's a dependency of this package.
// It should be located in this package's node_modules/.bin/
const nextCliPath = path.resolve(__dirname, '../node_modules/.bin/next');
const projectRoot = path.resolve(__dirname, '..'); // This is the root of the installed pulse-dashboard package

const args = ['start', '-p', '9002'];

console.log(`Starting Pulse Dashboard from: ${projectRoot}`);
console.log(`Executing: ${nextCliPath} ${args.join(' ')}`);
console.log(`IMPORTANT: Ensure you run this command from the directory containing your 'pulse-report' folder.`);

const child = spawn(nextCliPath, args, {
  stdio: 'inherit',
  // The `cwd` option tells `next start` where to look for the .next folder, package.json, etc.
  // This should be the root of the installed `pulse-dashboard` package.
  cwd: projectRoot, 
  shell: true // Add shell: true for .bin scripts, especially on Windows
});

child.on('error', (err) => {
  console.error('Failed to start Pulse Dashboard:', err);
  if (err.message.includes('ENOENT')) {
    console.error(`It seems the 'next' command was not found at ${nextCliPath}. This might indicate an issue with the installation of 'pulse-dashboard' or its 'next' dependency.`);
  }
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Pulse Dashboard process was killed with signal: ${signal}`);
  } else if (code !== 0) {
    console.log(`Pulse Dashboard process exited with code: ${code}`);
  } else {
    console.log('Pulse Dashboard closed.');
  }
  process.exit(code === null ? 1 : code);
});

// Handle process termination gracefully
function-gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down Pulse Dashboard...`);
  child.kill(signal);
  // Give it a moment to shut down before force exiting
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
