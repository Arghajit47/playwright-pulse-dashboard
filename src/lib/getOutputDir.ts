#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { dirname } from "path";

const DEFAULT_OUTPUT_DIR = "pulse-report";

async function findPlaywrightConfig() {
  const possibleConfigs = [
    "playwright.config.ts",
    "playwright.config.js",
    "playwright.config.mjs",
  ];

  for (const configFile of possibleConfigs) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (fs.existsSync(configPath)) {
      return { path: configPath, exists: true };
    }
  }

  return { path: null, exists: false };
}

async function extractOutputDirFromConfig(
  configPath: string
): Promise<string | null> {
  try {
    let config;

    const configDir = dirname(configPath);
    const originalDirname = global.__dirname;
    const originalFilename = global.__filename;

    try {
      global.__dirname = configDir;
      global.__filename = configPath;

      if (configPath.endsWith(".ts")) {
        try {
          const { register } = await import("node:module");
          const { pathToFileURL } = await import("node:url");

          register("ts-node/esm", pathToFileURL("./"));

          config = await import(pathToFileURL(configPath).href);
        } catch (tsError) {
          console.warn(
            "TypeScript config could not be loaded with ts-node/esm, skipping TypeScript config support"
          );
          return null;
        }
      } else {
        config = await import(pathToFileURL(configPath).href);
      }
    } finally {
      if (originalDirname !== undefined) {
        global.__dirname = originalDirname;
      }
      if (originalFilename !== undefined) {
        global.__filename = originalFilename;
      }
    }

    const playwrightConfig = config.default || config;

    if (playwrightConfig && Array.isArray(playwrightConfig.reporter)) {
      for (const reporterConfig of playwrightConfig.reporter) {
        if (Array.isArray(reporterConfig)) {
          const [reporterPath, options] = reporterConfig;

          if (
            typeof reporterPath === "string" &&
            (reporterPath.includes("playwright-pulse-report") ||
              reporterPath.includes("@arghajit/playwright-pulse-report") ||
              reporterPath.includes("@arghajit/dummy"))
          ) {
            if (options && options.outputDir) {
              const resolvedPath =
                typeof options.outputDir === "string"
                  ? options.outputDir
                  : options.outputDir;
              console.log(`Found outputDir in config: ${resolvedPath}`);
              return path.resolve(process.cwd(), resolvedPath);
            }
          }
        }
      }
    }

    console.log("No matching reporter config found with outputDir");
    return null;
  } catch (error) {
    console.error("Error extracting outputDir from config:", error);
    return null;
  }
}

export async function getOutputDir(customOutputDirFromArgs = null) {
  if (customOutputDirFromArgs) {
    console.log(`Using custom outputDir from CLI: ${customOutputDirFromArgs}`);
    return path.resolve(process.cwd(), customOutputDirFromArgs);
  }

  const { path: configPath, exists } = await findPlaywrightConfig();
  console.log(
    `Config file search result: ${exists ? configPath : "not found"}`
  );

  if (exists && configPath) {
    const outputDirFromConfig = await extractOutputDirFromConfig(configPath);
    if (outputDirFromConfig) {
      console.log(`Using outputDir from config: ${outputDirFromConfig}`);
      return outputDirFromConfig;
    }
  }

  console.log(`Using default outputDir: ${DEFAULT_OUTPUT_DIR}`);
  return path.resolve(process.cwd(), DEFAULT_OUTPUT_DIR);
}
