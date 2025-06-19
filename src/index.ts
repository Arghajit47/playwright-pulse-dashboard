
// Main component export
export { PulseDashboard } from './components/pulse-dashboard/PulseDashboard.js';

// Type exports for consumers
export type {
  PlaywrightPulseReport,
  HistoricalTrend,
  DetailedTestResult,
  RunMetadata,
  TestStep,
  ScreenshotAttachment, // Changed from PlaywrightAttachment
  FlakyTestDetail,
  FlakyTestOccurrence,
} from './types/playwright.js';

export type { TestStatusFilter } from './components/pulse-dashboard/LiveTestResults.js';

// It's crucial to instruct users of this package to import the CSS.
// For example, in their main application file (like _app.tsx or layout.tsx):
// import 'pulse-dashboard-component/dist/styles.css';

// Note: Server Actions and API route handlers are not exported as part of this client-side package.
// The consuming Next.js application must implement the required backend endpoints and data provision.
