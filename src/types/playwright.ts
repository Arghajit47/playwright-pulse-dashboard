
export interface TestStep {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'pending' | string; // string for broader compatibility
  duration: number;
  startTime: string;
  endTime: string;
  browser?: string; // Optional as it might not be on all steps
  codeLocation?: string;
  isHook?: boolean;
  hookType?: 'before' | 'after' | string;
  steps: TestStep[];
  errorMessage?: string | null;
}

export interface ScreenshotAttachment {
  name: string;
  path: string;
  contentType: string; // e.g., 'image/png'
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
  screenshots: string[]; // Changed from ScreenshotAttachment[]
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
  timedOut?: number; // Optional, if your data source provides it
  pending?: number; // Optional
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
  occurrences: FlakyTestOccurrence[]; // Chronologically sorted
  passedCount: number;
  failedCount: number; // includes timedOut
  skippedCount: number;
  pendingCount: number;
  totalRuns: number;
  firstSeen: string;
  lastSeen: string;
}
