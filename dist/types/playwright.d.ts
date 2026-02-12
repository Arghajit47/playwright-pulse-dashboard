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
export interface Annotation {
    type: string;
    description?: string;
    location?: {
        file: string;
        line: number;
        column: number;
    };
}
export interface DetailedTestResult {
    id: string;
    runId: string;
    name: string;
    suiteName: string;
    status: "passed" | "failed" | "skipped" | "timedOut" | "pending" | "flaky";
    outcome?: 'flaky' | 'expected' | 'unexpected' | 'skipped';
    final_status?: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'flaky';
    duration: number;
    startTime: string;
    endTime: string;
    browser: string;
    retries: number;
    retryHistory?: any[];
    steps: TestStep[];
    errorMessage?: string | null;
    stdout?: string[] | null;
    codeSnippet: string;
    snippet?: string;
    tags: string[];
    screenshots?: string[];
    videoPath?: string[];
    tracePath?: string;
    attachments?: any;
    annotations?: Annotation[];
    workerId?: string | number;
    totalWorkers?: number;
    configFile?: string;
    metadata?: string;
}
export interface EnvironmentInfo {
    [key: string]: string | number | boolean | EnvironmentInfo | undefined | null | string[] | Record<string, string | number | boolean>;
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
    flakinessRate?: number;
    userProjectDir?: string;
    environment?: EnvironmentInfo | EnvironmentInfo[];
}
export interface ReportFileMetadata {
    generatedAt: string;
    userProjectDir?: string;
}
export interface PlaywrightPulseReport {
    run: RunMetadata;
    results: DetailedTestResult[];
    metadata: ReportFileMetadata;
    environment?: EnvironmentInfo | EnvironmentInfo[];
}
export interface HistoricalTrend {
    date: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky?: number;
    duration: number;
    flakinessRate?: number;
    workerCount?: number;
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