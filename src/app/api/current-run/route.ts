
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'pulse-report', 'playwright-pulse-report.json');
    console.log('[API /api/current-run] Attempting to read current run report from:', filePath);

    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (fileReadError: any) {
      console.error(`[API /api/current-run] FAILED to read file ${filePath}. Error: ${fileReadError.message}. Stack: ${fileReadError.stack}`);
      if (fileReadError.code === 'ENOENT') {
        return NextResponse.json({ message: `Report file not found at ${filePath}. Please ensure 'playwright-pulse-report.json' exists in the 'pulse-report' directory at the project root.`, path: filePath }, { status: 404 });
      }
      return NextResponse.json({ message: `Error reading report file from ${filePath}: ${fileReadError.message || 'Unknown file read error.'}`, path: filePath, details: String(fileReadError) }, { status: 500 });
    }

    try {
      const jsonData: PlaywrightPulseReport = JSON.parse(fileContent);
      return NextResponse.json(jsonData);
    } catch (parseError: any) {
      console.error(`[API /api/current-run] FAILED to parse JSON from ${filePath}. Error: ${parseError.message}. Stack: ${parseError.stack}`);
      return NextResponse.json({ message: `Invalid JSON format in ${filePath}: ${parseError.message || 'Unknown parsing error.'}`, path: filePath, details: String(parseError) }, { status: 400 });
    }

  } catch (e: any) {
    // This catch is for truly unexpected errors not caught by the specific file/parse handlers.
    console.error(`[API /api/current-run] UNEXPECTED CRITICAL ERROR in GET handler. Error: ${e.message}. Stack: ${e.stack}`);
    return NextResponse.json({ message: `An unexpected server error occurred while processing the report: ${e.message || 'Unknown critical error.'}` }, { status: 500 });
  }
}
