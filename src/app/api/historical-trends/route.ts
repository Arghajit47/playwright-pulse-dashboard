
import { NextResponse } from 'next/server';
import path from "path";
import { getRawHistoricalReports } from '@/app/actions';
import type { PlaywrightPulseReport, HistoricalTrend, DetailedTestResult } from '@/types/playwright';
import { getEffectiveTestStatus } from '@/lib/testUtils';

export async function GET() {
  console.log('[API /api/historical-trends] Route hit.');
  const pulseUserCwdFromEnv = process.env.PULSE_USER_CWD;
  const pulseReportDirFromEnv = process.env.PULSE_REPORT_DIR;
  const currentProcessCwd = process.cwd();

  console.log('[API /api/historical-trends] process.env.PULSE_USER_CWD (inside API route):', pulseUserCwdFromEnv);
  console.log(
    "[API /api/historical-trends] process.env.PULSE_REPORT_DIR (inside API route):",
    pulseReportDirFromEnv
  );
  console.log('[API /api/historical-trends] process.cwd() (inside API route):', currentProcessCwd);
  
  const baseDir = (pulseUserCwdFromEnv && pulseUserCwdFromEnv.trim() !== '') ? pulseUserCwdFromEnv.trim() : currentProcessCwd;
  const reportDir =
    pulseReportDirFromEnv && pulseReportDirFromEnv.trim() !== ""
      ? pulseReportDirFromEnv.trim()
      : path.join(baseDir, "pulse-report");
  
  console.log('[API /api/historical-trends] Effective baseDir determined for API route (should match actions):', baseDir);
  console.log(
    "[API /api/historical-trends] Effective reportDir determined for API route:",
    reportDir
  );

  try {
    const rawReports: PlaywrightPulseReport[] = await getRawHistoricalReports(); 

    if (!rawReports) { 
        console.error('[API /api/historical-trends] getRawHistoricalReports returned undefined/null. This is unexpected.');
        return NextResponse.json({ message: "Internal error: Failed to retrieve historical reports data structure." }, { status: 500 });
    }
    
    console.log(`[API /api/historical-trends] Received ${rawReports.length} raw reports from getRawHistoricalReports.`);

    const historicalTrends: HistoricalTrend[] = rawReports
      .filter(report => report.run !== undefined && report.run !== null)
      .map(report => {
        let strictPassed = 0;
        let strictFailed = 0;
        let strictSkipped = 0;
        let strictFlaky = 0;
        let workerCount: number | undefined = undefined;

        if (report.results && report.results.length > 0) {
          const workerIds = new Set<string | number>();
          report.results.forEach((result: DetailedTestResult) => {
            // Worker count logic
            if (result.workerId !== undefined && result.workerId !== null && Number(result.workerId) >= 0) {
              workerIds.add(result.workerId);
            }

            // Strict stats logic
            const status = getEffectiveTestStatus(result);
            if (status === 'passed') strictPassed++;
            else if (status === 'failed' || status === 'timedOut') strictFailed++;
            else if (status === 'skipped') strictSkipped++;
            else if (status === 'flaky') strictFlaky++;
          });

          if (workerIds.size > 0) {
            workerCount = workerIds.size;
          }
        } else {
          // Fallback to run metadata if results missing
          strictPassed = report.run.passed;
          strictFailed = report.run.failed + (report.run.timedOut || 0);
          strictSkipped = report.run.skipped;
          strictFlaky = 0; 
        }

        return {
          date: report.run.timestamp,
          totalTests: report.run.totalTests,
          passed: strictPassed,
          failed: strictFailed,
          skipped: strictSkipped,
          flaky: strictFlaky,
          duration: report.run.duration,
          flakinessRate: report.run.flakinessRate,
          workerCount: workerCount,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

    console.log(`[API /api/historical-trends] Successfully processed ${historicalTrends.length} historical trend items.`);
    return NextResponse.json(historicalTrends, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/historical-trends] Error processing historical trends in API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while processing historical trends.';
    return NextResponse.json({ message: `Error processing historical trends: ${errorMessage}`, details: String(error) }, { status: 500 });
  }
}
