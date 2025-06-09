
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  console.log('[API /api/current-run] Raw process.env.PULSE_USER_CWD:', process.env.PULSE_USER_CWD);
  console.log('[API /api/current-run] Current process.cwd() for Next.js server:', process.cwd());

  const baseDir = process.env.PULSE_USER_CWD || process.cwd();
  console.log('[API /api/current-run] Effective baseDir determined:', baseDir);
  
  const filePath = path.join(baseDir, 'pulse-report', 'playwright-pulse-report.json');
  console.log('[API /api/current-run] Attempting to read current run report from:', filePath);

  let fileContent: string;
  try {
    fileContent = await fs.readFile(filePath, 'utf-8');
  } catch (fileReadError: any) {
    console.error(`[API /api/current-run] FAILED to read file ${filePath}. Error: ${fileReadError.message}. Stack: ${fileReadError.stack}`);
    if (fileReadError.code === 'ENOENT') {
      return NextResponse.json({ message: `Report file not found at ${filePath}. This path was constructed using base directory: '${baseDir}'. Please ensure 'playwright-pulse-report.json' exists in the 'pulse-report' directory.`, path: filePath }, { status: 404 });
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
}
