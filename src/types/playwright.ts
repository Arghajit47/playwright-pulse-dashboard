
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
  error?: string | null; // Added for steps that might fail
}

export interface ScreenshotAttachment {
  name: string; // Assuming name will be provided or can be derived
  path: string;
  contentType: string; // e.g., 'image/png'
  'data-ai-hint'?: string;
}

export interface DetailedTestResult {
  id: string;
  runId: string;
  name: string; // Replaces 'title'
  suiteName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'pending';
  duration: number;
  startTime: string;
  endTime: string;
  browser: string;
  retries: number;
  steps: TestStep[];
  error?: string | null; // For overall test error
  codeSnippet: string;
  tags: string[];
  screenshots: ScreenshotAttachment[]; // Replaces 'attachments'
}

export interface RunMetadata {
  id: string;
  timestamp: string; // Report generation/run start time
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // Overall run duration
}

export interface ReportFileMetadata {
  generatedAt: string; // Timestamp for when the JSON file itself was generated
}

export interface PlaywrightPulseReport {
  run: RunMetadata;
  results: DetailedTestResult[];
  metadata: ReportFileMetadata;
}

// This type remains for historical trend data, which is structured differently
export interface HistoricalTrend {
  date: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  flakinessRate?: number;
}

// Old types that might be replaced or removed if no longer directly used.
// For now, keeping them commented out or to be removed once all usages are updated.
// export interface TestAttachment {
//   name: string;
//   path: string;
//   contentType: string;
//   'data-ai-hint'?: string;
// }

// export interface TestResult { // This is now DetailedTestResult
//   id: string;
//   title: string;
//   status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'pending';
//   duration: number;
//   error?: string | null;
//   attachments: TestAttachment[];
// }

// export interface Suite { // Tests are now in a flat list 'results'
//   title: string;
//   tests: TestResult[]; // Now DetailedTestResult
// }

// export interface ReportMetadata { // This is now RunMetadata + ReportFileMetadata
//   reportGeneratedAt: string;
//   totalTests: number;
//   passed: number;
//   failed: number;
//   skipped: number;
//   duration: number;
// }
