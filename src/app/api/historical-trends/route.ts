import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { HistoricalTrend } from '@/types/playwright';

export async function GET() {
  try {
    const historyDir = path.join(process.cwd(), 'public', 'pulse-report', 'history');
    const files = await fs.readdir(historyDir);
    const trendFiles = files.filter(file => file.startsWith('trend-') && file.endsWith('.json'));

    const trends: HistoricalTrend[] = [];
    for (const file of trendFiles) {
      const filePath = path.join(historyDir, file);
      const data = await fs.readFile(filePath, 'utf-8');
      trends.push(JSON.parse(data));
    }

    // Sort by date, newest first
    trends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(trends);
  } catch (error) {
    console.error('Failed to read historical trends:', error);
    return NextResponse.json({ message: 'Error fetching historical trends' }, { status: 500 });
  }
}
