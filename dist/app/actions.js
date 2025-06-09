'use server';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRawHistoricalReports = getRawHistoricalReports;
exports.getFlakyTestsAnalysis = getFlakyTestsAnalysis;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function getRawHistoricalReports() {
    const historyDir = path_1.default.join(process.cwd(), 'pulse-report', 'history');
    try {
        const trendFileNames = (await promises_1.default.readdir(historyDir)).filter(file => file.startsWith('trend-') && file.endsWith('.json'));
        const historicalDataArray = [];
        for (const fileName of trendFileNames) {
            const filePath = path_1.default.join(historyDir, fileName);
            try {
                const fileContent = await promises_1.default.readFile(filePath, 'utf-8');
                const reportData = JSON.parse(fileContent);
                if (reportData.run && reportData.results) {
                    historicalDataArray.push(reportData);
                }
                else {
                    console.warn(`Skipping invalid historical report file: ${fileName}`);
                }
            }
            catch (fileReadError) {
                console.error(`Error reading or parsing historical file ${fileName}:`, fileReadError);
            }
        }
        historicalDataArray.sort((a, b) => new Date(a.run.timestamp).getTime() - new Date(b.run.timestamp).getTime());
        return historicalDataArray;
    }
    catch (error) {
        console.error('Error fetching raw historical reports:', error);
        return [];
    }
}
async function getFlakyTestsAnalysis() {
    try {
        const historicalReports = await getRawHistoricalReports();
        if (historicalReports.length === 0) {
            return { success: true, flakyTests: [] };
        }
        const testStatsMap = new Map();
        for (const report of historicalReports) {
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
        console.error('Error analyzing flaky tests:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during flaky test analysis.';
        return { success: false, error: errorMessage };
    }
}
//# sourceMappingURL=actions.js.map