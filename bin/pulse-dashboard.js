#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command to run Next.js
const nextCommand = 'next';
const projectRoot = path.resolve(__dirname, '..'); // This is the root of the installed pulse-dashboard package
const userCwd = process.cwd(); // Capture the CWD from where the user ran the command

const args = ['start', '-p', '9002'];

console.log(`Starting Pulse Dashboard from: ${projectRoot}`);
console.log(`User CWD for reports: ${userCwd}`);
console.log(`Executing: ${nextCommand} ${args.join(' ')}`);
console.log(`IMPORTANT: Ensure your 'pulse-report' folder is in: ${userCwd}`);

const child = spawn(nextCommand, args, {
  stdio: 'inherit',
  // The `cwd` option tells `next start` where to look for the .next folder, package.json, etc.
  // This should be the root of the installed `pulse-dashboard` package.
  cwd: projectRoot,
  shell: true, // shell: true helps in resolving commands like 'next' from PATH
  env: {
    ...process.env, // Inherit existing environment variables
    PULSE_USER_CWD: userCwd // Pass the user's CWD to the Next.js app
  }
});

child.on('error', (err) => {
  console.error('Failed to start Pulse Dashboard:', err);
  if (err.message.includes('ENOENT')) {
    console.error(`It seems the '${nextCommand}' command was not found. This might indicate an issue with the installation of 'pulse-dashboard' or its 'next' dependency, or the shell environment.`);
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
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down Pulse Dashboard...`);
  child.kill(signal);
  // Give it a moment to shut down before force exiting
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
