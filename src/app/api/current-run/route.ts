import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'pulse-report', 'playwright-pulse-report.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return NextResponse.json(jsonData);
  } catch (error) {
    console.error('Failed to read current run report:', error);
    return NextResponse.json({ message: 'Error fetching current run data' }, { status: 500 });
  }
}
