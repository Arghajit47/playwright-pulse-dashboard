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

console.log(`[BIN SCRIPT] Starting Pulse Dashboard from (projectRoot): ${projectRoot}`);
console.log(`[BIN SCRIPT] User CWD (userCwd): ${userCwd}`);

const envForSpawn = {
  ...process.env, // Inherit existing environment variables
  PULSE_USER_CWD: userCwd // Pass the user's CWD to the Next.js app
};

console.log(`[BIN SCRIPT] Environment for Next.js process: PULSE_USER_CWD = ${envForSpawn.PULSE_USER_CWD}`);
// console.log(`[BIN SCRIPT] Full environment for Next.js process:`, JSON.stringify(envForSpawn, null, 2)); // Uncomment for very verbose logging

console.log(`[BIN SCRIPT] Executing: ${nextCommand} ${args.join(' ')}`);
console.log(`[BIN SCRIPT] IMPORTANT: Ensure your 'pulse-report' folder is in: ${userCwd}`);

const child = spawn(nextCommand, args, {
  stdio: 'inherit',
  // The `cwd` option tells `next start` where to look for the .next folder, package.json, etc.
  // This should be the root of the installed `pulse-dashboard` package.
  cwd: projectRoot,
  shell: true, // shell: true helps in resolving commands like 'next' from PATH
  env: envForSpawn
});

child.on('error', (err) => {
  console.error('[BIN SCRIPT] Failed to start Pulse Dashboard:', err);
  if (err.message.includes('ENOENT')) {
    console.error(`[BIN SCRIPT] It seems the '${nextCommand}' command was not found. This might indicate an issue with the installation of 'pulse-dashboard' or its 'next' dependency, or the shell environment.`);
  }
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`[BIN SCRIPT] Pulse Dashboard process was killed with signal: ${signal}`);
  } else if (code !== 0) {
    console.log(`[BIN SCRIPT] Pulse Dashboard process exited with code: ${code}`);
  } else {
    console.log('[BIN SCRIPT] Pulse Dashboard closed.');
  }
  process.exit(code === null ? 1 : code);
});

// Handle process termination gracefully
function gracefulShutdown(signal) {
  console.log(`[BIN SCRIPT] Received ${signal}. Shutting down Pulse Dashboard...`);
  child.kill(signal);
  // Give it a moment to shut down before force exiting
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
