'use server';
import fs from 'fs/promises';
import path from 'path';
export async function getRawHistoricalReports() {
    console.log('[ACTIONS getRawHistoricalReports] ------------- START -------------');
    const pulseUserCwdFromEnv = process.env.PULSE_USER_CWD;
    const pulseReportDirFromEnv = process.env.PULSE_REPORT_DIR;
    const currentProcessCwd = process.cwd();
    console.log('[ACTIONS getRawHistoricalReports] process.env.PULSE_USER_CWD:', pulseUserCwdFromEnv);
    console.log("[ACTIONS getRawHistoricalReports] process.env.PULSE_REPORT_DIR:", pulseReportDirFromEnv);
    console.log('[ACTIONS getRawHistoricalReports] process.cwd():', currentProcessCwd);
    const baseDir = (pulseUserCwdFromEnv && pulseUserCwdFromEnv.trim() !== '') ? pulseUserCwdFromEnv.trim() : currentProcessCwd;
    const reportDir = pulseReportDirFromEnv && pulseReportDirFromEnv.trim() !== ""
        ? pulseReportDirFromEnv.trim()
        : path.join(baseDir, "pulse-report");
    console.log('[ACTIONS getRawHistoricalReports] Effective baseDir determined:', baseDir);
    console.log("[ACTIONS getRawHistoricalReports] Effective reportDir determined:", reportDir);
    const historyDir = path.join(reportDir, "history");
    console.log('[ACTIONS getRawHistoricalReports] Attempting to read history directory:', historyDir);
    try {
        const trendFileNames = (await fs.readdir(historyDir)).filter(file => file.startsWith('trend-') && file.endsWith('.json'));
        console.log(`[ACTIONS getRawHistoricalReports] Found ${trendFileNames.length} trend files in ${historyDir}`);
        const historicalDataArray = [];
        for (const fileName of trendFileNames) {
            const filePath = path.join(historyDir, fileName);
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const reportData = JSON.parse(fileContent);
                if (reportData.run && reportData.results) {
                    // Ensure flakinessRate is carried over if it exists
                    if (reportData.run.flakinessRate === undefined) {
                        reportData.run.flakinessRate = 0; // Default if not present
                    }
                    historicalDataArray.push(reportData);
                }
                else {
                    console.warn(`[ACTIONS getRawHistoricalReports] Skipping invalid historical report file (missing run or results): ${fileName}`);
                }
            }
            catch (fileReadError) {
                console.error(`[ACTIONS getRawHistoricalReports] Error reading or parsing historical file ${fileName}:`, fileReadError);
            }
        }
        historicalDataArray.sort((a, b) => new Date(a.run.timestamp).getTime() - new Date(b.run.timestamp).getTime());
        console.log('[ACTIONS getRawHistoricalReports] ------------- END (SUCCESS) -------------');
        return historicalDataArray;
    }
    catch (error) {
        console.error(`[ACTIONS getRawHistoricalReports] Error accessing or reading historical trends directory ${historyDir}:`, error.message);
        if (error instanceof Error && error.code === 'ENOENT') {
            console.warn(`[ACTIONS getRawHistoricalReports] History directory not found at ${historyDir}. This is normal if no historical reports exist yet.`);
        }
        console.log('[ACTIONS getRawHistoricalReports] ------------- END (ERROR) -------------');
        // Re-throw or return empty to allow API route to handle HTTP response
        // For now, returning empty and letting API route handle it based on this logged error.
        return [];
    }
}
export async function getFlakyTestsAnalysis() {
    try {
        const historicalReports = await getRawHistoricalReports();
        if (historicalReports.length === 0) {
            // Check if this is due to an actual lack of files or an error in getRawHistoricalReports
            // The logs from getRawHistoricalReports will indicate this.
            // If an error occurred there, it would have logged and returned empty.
            // So, here we assume if it's empty, it's genuinely no data or a handled error.
            console.log('[ACTIONS getFlakyTestsAnalysis] No historical reports found or an error occurred in getRawHistoricalReports. Returning empty flaky tests.');
            return { success: true, flakyTests: [] };
        }
        const testStatsMap = new Map();
        for (const report of historicalReports) {
            if (!report.results) { // Additional safety check
                console.warn('[ACTIONS getFlakyTestsAnalysis] Skipping a report in history due to missing .results property.');
                continue;
            }
            for (const testResult of report.results) {
                if (!testStatsMap.has(testResult.id)) {
                    testStatsMap.set(testResult.id, {
                        name: testResult.name,
                        suiteName: testResult.suiteName,
                        occurrences: [],
                    });
                }
                testStatsMap.get(testResult.id).occurrences.push({
                    runTimestamp: report.run.timestamp,
                    status: testResult.status,
                });
            }
        }
        const flakyTests = [];
        for (const [id, data] of testStatsMap.entries()) {
            const statuses = new Set(data.occurrences.map(o => o.status));
            const hasPassed = statuses.has('passed');
            const hasFailed = statuses.has('failed') || statuses.has('timedOut');
            if (hasPassed && hasFailed) {
                let passedCount = 0;
                let failedCount = 0;
                let skippedCount = 0;
                let pendingCount = 0;
                data.occurrences.forEach(occ => {
                    if (occ.status === 'passed')
                        passedCount++;
                    else if (occ.status === 'failed' || occ.status === 'timedOut')
                        failedCount++;
                    else if (occ.status === 'skipped')
                        skippedCount++;
                    else if (occ.status === 'pending')
                        pendingCount++;
                });
                const sortedOccurrences = data.occurrences.sort((a, b) => new Date(a.runTimestamp).getTime() - new Date(b.runTimestamp).getTime());
                flakyTests.push({
                    id,
                    name: data.name,
                    suiteName: data.suiteName,
                    occurrences: sortedOccurrences,
                    passedCount,
                    failedCount,
                    skippedCount,
                    pendingCount,
                    totalRuns: data.occurrences.length,
                    firstSeen: sortedOccurrences[0]?.runTimestamp || '',
                    lastSeen: sortedOccurrences[sortedOccurrences.length - 1]?.runTimestamp || '',
                });
            }
        }
        flakyTests.sort((a, b) => (b.failedCount / b.totalRuns) - (a.failedCount / a.totalRuns) || b.totalRuns - a.totalRuns);
        return { success: true, flakyTests };
    }
    catch (error) {
        console.error('[ACTIONS getFlakyTestsAnalysis] Error analyzing flaky tests:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during flaky test analysis.';
        return { success: false, error: errorMessage };
    }
}
//# sourceMappingURL=actions.js.map