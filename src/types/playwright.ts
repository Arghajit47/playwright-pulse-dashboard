export interface TestAttachment {
  name: string;
  path: string;
  contentType: string;
  'data-ai-hint'?: string;
}

export interface TestResult {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'pending';
  duration: number;
  error?: string | null;
  attachments: TestAttachment[];
}

export interface Suite {
  title: string;
  tests: TestResult[];
}

export interface ReportMetadata {
  reportGeneratedAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface PlaywrightPulseReport {
  metadata: ReportMetadata;
  suites: Suite[];
}

export interface HistoricalTrend {
  date: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  flakinessRate?: number; // Optional, as it was an example
}
