
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  const filePath = path.join(process.cwd(), 'pulse-report', 'playwright-pulse-report.json');
  console.log('Attempting to read current run report from:', filePath);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    try {
      const jsonData: PlaywrightPulseReport = JSON.parse(data);
      return NextResponse.json(jsonData);
    } catch (parseError) {
      console.error(`Failed to parse JSON from ${filePath}:`, parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      return NextResponse.json({ message: `Invalid JSON format in ${filePath}: ${errorMessage}`, path: filePath, details: String(parseError) }, { status: 400 });
    }
  } catch (fileReadError: any) {
    console.error(`Failed to read current run report from ${filePath}:`, fileReadError);
    if (fileReadError.code === 'ENOENT') {
      return NextResponse.json({ message: `Report file not found at ${filePath}. Please ensure 'playwright-pulse-report.json' exists in the 'pulse-report' directory at the project root.`, path: filePath }, { status: 404 });
    }
    const errorMessage = fileReadError instanceof Error ? fileReadError.message : 'Unknown file read error';
    return NextResponse.json({ message: `Error reading report file from ${filePath}: ${errorMessage}`, path: filePath, details: String(fileReadError) }, { status: 500 });
  }
}
