export interface TestStep {
    id: string;
    title: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'pending' | string;
    duration: number;
    startTime: string;
    endTime: string;
    browser?: string;
    codeLocation?: string;
    isHook?: boolean;
    hookType?: 'before' | 'after' | string;
    steps: TestStep[];
    errorMessage?: string | null;
}
export interface ScreenshotAttachment {
    name: string;
    path: string;
    contentType: string;
    'data-ai-hint'?: string;
}
export interface DetailedTestResult {
    id: string;
    runId: string;
    name: string;
    suiteName: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'pending';
    duration: number;
    startTime: string;
    endTime: string;
    browser: string;
    retries: number;
    steps: TestStep[];
    errorMessage?: string | null;
    stdout?: string[] | null;
    codeSnippet: string;
    tags: string[];
    screenshots: string[];
    videoPath?: string;
    tracePath?: string;
}
export interface RunMetadata {
    id: string;
    timestamp: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timedOut?: number;
    pending?: number;
}
export interface ReportFileMetadata {
    generatedAt: string;
}
export interface PlaywrightPulseReport {
    run: RunMetadata;
    results: DetailedTestResult[];
    metadata: ReportFileMetadata;
}
export interface HistoricalTrend {
    date: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    flakinessRate?: number;
}
export interface FlakyTestOccurrence {
    runTimestamp: string;
    status: DetailedTestResult['status'];
}
export interface FlakyTestDetail {
    id: string;
    name: string;
    suiteName: string;
    occurrences: FlakyTestOccurrence[];
    passedCount: number;
    failedCount: number;
    skippedCount: number;
    pendingCount: number;
    totalRuns: number;
    firstSeen: string;
    lastSeen: string;
}
//# sourceMappingURL=playwright.d.ts.map