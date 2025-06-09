
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[API /api/historical-trends] MINIMAL ROUTE HIT. Attempting to return simple success.');
    return NextResponse.json({ message: "Historical trends API is alive" }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/historical-trends] MINIMAL ROUTE CRITICAL ERROR:', error);
    // This catch might not even be reached if the "Failed to fetch" is due to an earlier crash
    return NextResponse.json({ message: `Minimal route critical error: ${error.message}` }, { status: 500 });
  }
}
