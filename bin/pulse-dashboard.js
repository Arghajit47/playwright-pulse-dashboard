#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOutputDir } from "../dist/lib/getOutputDir.js";

console.log(
  "\n🎯 Pulse Dashboard is an extensive visualization of playwright-pulse-report."
);
console.log(
  "📦 Kindly run 'npm install @arghajit/playwright-pulse-report@latest' to install the pulse-report package."
);
console.log("📖 Follow the readme file for setup instructions.");
console.log("✅ If already installed, please ignore. Happy reporting!\n");

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command to run Next.js
const projectRoot = path.resolve(__dirname, ".."); // This is the root of the installed pulse-dashboard package
const nextCommand = path.join(projectRoot, "node_modules", ".bin", "next");
const userCwd = process.cwd(); // Capture the CWD from where the user ran the command

// Parse CLI arguments for custom output directory
const args = process.argv.slice(2);
let customOutputDir = null;
const outputDirIndex = args.findIndex(
  (arg) => arg === "--output-dir" || arg === "-o"
);
if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
  customOutputDir = args[outputDirIndex + 1];
  // Remove the --output-dir and its value from args to pass clean args to next
  args.splice(outputDirIndex, 2);
}

// Determine the output directory
let reportDir = "pulse-report";
try {
  reportDir = await getOutputDir(customOutputDir);
  console.log(`[BIN SCRIPT] Resolved report directory: ${reportDir}`);
} catch (error) {
  console.error("[BIN SCRIPT] Error resolving output directory:", error);
  console.log(
    `[BIN SCRIPT] Falling back to default: ${path.join(
      userCwd,
      "pulse-report"
    )}`
  );
  reportDir = path.join(userCwd, "pulse-report");
}

const nextArgs = ["start", "-p", "9002"];

console.log(
  `[BIN SCRIPT] Starting Pulse Dashboard from (projectRoot): ${projectRoot}`
);
console.log(`[BIN SCRIPT] User CWD (userCwd): ${userCwd}`);
console.log(`[BIN SCRIPT] Report directory: ${reportDir}`);

const envForSpawn = {
  ...process.env, // Inherit existing environment variables
  PULSE_USER_CWD: userCwd, // Pass the user's CWD to the Next.js app
  PULSE_REPORT_DIR: reportDir, // Pass the resolved report directory
};

console.log(
  `[BIN SCRIPT] Environment for Next.js process: PULSE_USER_CWD = ${envForSpawn.PULSE_USER_CWD}`
);
console.log(
  `[BIN SCRIPT] Environment for Next.js process: PULSE_REPORT_DIR = ${envForSpawn.PULSE_REPORT_DIR}`
);
// console.log(`[BIN SCRIPT] Full environment for Next.js process:`, JSON.stringify(envForSpawn, null, 2)); // Uncomment for very verbose logging

console.log(`[BIN SCRIPT] Executing: ${nextCommand} ${nextArgs.join(" ")}`);
console.log(
  `[BIN SCRIPT] IMPORTANT: Ensure your report folder is in: ${reportDir}`
);

const child = spawn(nextCommand, nextArgs, {
  stdio: "inherit",
  // The `cwd` option tells `next start` where to look for the .next folder, package.json, etc.
  // This should be the root of the installed `pulse-dashboard` package.
  cwd: projectRoot,
  shell: true, // shell: true helps in resolving commands like 'next' from PATH
  env: envForSpawn,
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
