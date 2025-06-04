
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'pulse-report', 'playwright-pulse-report.json');
  console.log('Attempting to read current run report from:', filePath);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return NextResponse.json(jsonData);
  } catch (error) {
    console.error('Failed to read current run report from path', filePath, 'Error:', error);
    let errorMessage = 'Error fetching current run data.';
    if (error instanceof Error) {
      errorMessage = `Error reading or parsing current run report: ${error.message}. Expected at ${filePath}`;
    }
    return NextResponse.json({ message: errorMessage, path: filePath }, { status: 500 });
  }
}
