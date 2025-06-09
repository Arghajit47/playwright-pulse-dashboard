
import { NextResponse } from 'next/server';
import { getRawHistoricalReports } from '@/app/actions';
import type { PlaywrightPulseReport, HistoricalTrend } from '@/types/playwright';

export async function GET() {
  console.log('[API /api/historical-trends] Route hit.');
  const pulseUserCwdFromEnv = process.env.PULSE_USER_CWD;
  const currentProcessCwd = process.cwd();

  console.log('[API /api/historical-trends] process.env.PULSE_USER_CWD (inside API route):', pulseUserCwdFromEnv);
  console.log('[API /api/historical-trends] process.cwd() (inside API route):', currentProcessCwd);
  
  const baseDir = (pulseUserCwdFromEnv && pulseUserCwdFromEnv.trim() !== '') ? pulseUserCwdFromEnv.trim() : currentProcessCwd;
  console.log('[API /api/historical-trends] Effective baseDir determined for API route (should match actions):', baseDir);

  try {
    const rawReports: PlaywrightPulseReport[] = await getRawHistoricalReports(); // This function now has more internal logging

    // The getRawHistoricalReports function will log its own errors if fs operations fail.
    // If it returns an empty array, it could be due to actual lack of files or an internal error it handled by returning [].
    // The logs from getRawHistoricalReports should be checked.
    if (!rawReports) { // Should not happen if getRawHistoricalReports always returns an array
        console.error('[API /api/historical-trends] getRawHistoricalReports returned undefined/null. This is unexpected.');
        return NextResponse.json({ message: "Internal error: Failed to retrieve historical reports data structure." }, { status: 500 });
    }
    
    console.log(`[API /api/historical-trends] Received ${rawReports.length} raw reports from getRawHistoricalReports.`);

    const historicalTrends: HistoricalTrend[] = rawReports.map(report => {
      if (!report.run) {
        console.warn('[API /api/historical-trends] Found a report in history without a .run property, skipping:', report);
        return null; 
      }
      return {
        date: report.run.timestamp,
        totalTests: report.run.totalTests,
        passed: report.run.passed,
        failed: report.run.failed + (report.run.timedOut || 0),
        skipped: report.run.skipped,
        duration: report.run.duration,
        flakinessRate: report.run.flakinessRate !== undefined ? report.run.flakinessRate : 0, // Default if undefined
      };
    }).filter((trend): trend is HistoricalTrend => trend !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

    console.log(`[API /api/historical-trends] Successfully processed ${historicalTrends.length} historical trend items.`);
    return NextResponse.json(historicalTrends, { status: 200 });

  } catch (error: any) {
    // This catch block is for errors specifically within this API route's logic,
    // not for errors deep within getRawHistoricalReports's fs calls (those are logged there).
    console.error('[API /api/historical-trends] Error processing historical trends in API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while processing historical trends.';
    return NextResponse.json({ message: `Error processing historical trends: ${errorMessage}`, details: String(error) }, { status: 500 });
  }
}
