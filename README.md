
# Pulse Dashboard Component

**Pulse Dashboard Component** is a reusable Next.js component package designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

This package provides the UI components. The consuming Next.js application is responsible for providing the backend API endpoints and data.

## Key Features (UI Package)

-   **Live Results View**: Displays up-to-the-second results from the latest Playwright test run, with detailed views for each test.
-   **Summary Metrics**: At-a-glance overview of the current test run, including total tests, pass/fail/skipped counts, and overall duration. Clickable cards allow quick filtering of the live results.
-   **Trend Analysis**: Visualizes historical test run data, showing trends for test outcomes (passed, failed, skipped) and execution duration over time.
-   **Detailed Test Information**: For each test, view:
    -   Status, duration, retries, browser, and associated tags.
    -   Detailed execution steps with timings and error messages.
    -   Attached screenshots, video recordings (if available), and Playwright trace files.
    -   Console logs (stdout) and error logs (stderr).
    -   Individual test run history chart showing status and duration over time.
-   **Failure Categorization**: Automatically groups failed tests from the current run into common categories for easier analysis.
-   **Flaky Test Analysis (UI Shell)**: Identifies tests that have exhibited inconsistent pass/fail behavior. *Data must be provided by the consuming application*.
-   **Filtering Capabilities**: Filter live test results by status, name/suite, tags, browser, and retries.
-   **Responsive Design**: UI adapts for different screen sizes.
-   **Theme Customization**: Switch between light and dark themes. Theme preference is saved in local storage.
-   **Interactive Charts**: Overview charts and historical trend charts are interactive. Charts can be downloaded as PNG.

## Installation

```bash
npm install pulse-dashboard-component # Or your chosen package name
# or
yarn add pulse-dashboard-component
```

## Usage

1.  **Import CSS**:
    In your main application file (e.g., `_app.tsx`, `layout.tsx`, or a global CSS file):
    ```javascript
    import 'pulse-dashboard-component/dist/styles.css';
    ```

2.  **Import and Use Component**:
    ```tsx
    import { PulseDashboard } from 'pulse-dashboard-component';

    function MyPage() {
      return <PulseDashboard />;
    }
    ```

## Data Provision Requirements (Consumer Application)

The `PulseDashboard` component relies on the consuming Next.js application to provide data through specific API routes and server actions. You must implement these in your application.

### 1. Data File Locations:

   All report data and attachments should be placed within a `pulse-report/` directory at the **root of your consuming Next.js project**.

   -   **Current Test Run JSON**:
        -   File: `playwright-pulse-report.json`
        -   Location: `YOUR_PROJECT_ROOT/pulse-report/playwright-pulse-report.json`
   -   **Historical Test Data JSON**:
        -   Files: `trend-*.json` (e.g., `trend-2023-10-26T10-30-00.json`)
        -   Location: `YOUR_PROJECT_ROOT/pulse-report/history/`
   -   **Attachments (Screenshots, Videos, Traces)**:
        -   These should be located within `YOUR_PROJECT_ROOT/pulse-report/attachments/`.
        -   For example, if a screenshot path in your JSON is `attachments/[runId]/asset.png`, the physical file should be at `YOUR_PROJECT_ROOT/pulse-report/attachments/[runId]/asset.png`.
        -   **Important**: The Pulse Dashboard component will attempt to load these assets using URLs like `/pulse-report/attachments/[runId]/asset.png`. Since these files are not in the `public` directory by default, **you must configure your Next.js application to serve files from `YOUR_PROJECT_ROOT/pulse-report/attachments/` at the `/pulse-report/attachments/` web path.** This can be done using Next.js rewrites or by copying these files to a `public/pulse-report/attachments/` directory during your application's build process.
        -   If paths in your JSON are absolute external URLs (e.g., `https://...`) or Base64 data URIs (`data:image/...`), they will be used directly, and this serving configuration is not needed for those specific assets.

### 2. API Routes (to be implemented by consumer):

   Your Next.js application must implement the following API routes. They should read data from the `pulse-report/` directory structure specified above.

   -   **GET `/api/current-run`**:
        -   **Purpose**: Fetch the latest test run data.
        -   **Implementation**: Should read `YOUR_PROJECT_ROOT/pulse-report/playwright-pulse-report.json` and return its content as JSON.
        -   **Expected Response Structure**: `PlaywrightPulseReport` (see `pulse-dashboard-component/dist/types/playwright.d.ts`).

   -   **GET `/api/historical-trends`**:
        -   **Purpose**: Fetch summarized historical test run data for trend charts.
        -   **Implementation**: Should read all `YOUR_PROJECT_ROOT/pulse-report/history/trend-*.json` files, aggregate them, sort by date, and return an array of `HistoricalTrend` objects.
        -   **Expected Response Structure**: `HistoricalTrend[]` (see `pulse-dashboard-component/dist/types/playwright.d.ts`).

### 3. Server Actions (to be implemented by consumer):

   The dashboard UI includes features that, in the original project, used Server Actions. The consuming application must provide equivalent functionality.

   -   **`getFlakyTestsAnalysis`**:
        -   **Purpose**: Analyze historical reports to identify flaky tests.
        -   **Implementation**: Should process data from `YOUR_PROJECT_ROOT/pulse-report/history/trend-*.json` files to identify tests with inconsistent outcomes.
        -   **Expected Return Structure**: `{ success: boolean; flakyTests?: FlakyTestDetail[]; error?: string }` (see `pulse-dashboard-component/dist/types/playwright.d.ts`).
        -   *Note*: The current package version comments out direct calls to this for build compatibility. Future versions might accept this data via props or a provided function.

   -   **(Optional) `analyzeFailurePatterns` (AI Feature)**:
        -   **Purpose**: Use Genkit AI to analyze failure patterns from historical data.
        -   **Implementation**: Requires setting up Genkit and an AI model. Processes historical data to provide insights.
        -   **Expected Input/Output**: Refer to `src/ai/flows/analyze-failure-patterns.ts` in the original project for details on `AnalyzeFailurePatternsInput` and the expected string output.
        -   *Note*: This is an advanced feature and may require significant setup in the consuming application.

## Technical Stack (of the Component Package)

-   **Framework**: Next.js (UI components compatible with App Router)
-   **UI Library**: React
-   **Component Library**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **Language**: TypeScript

## NPM Scripts (for developing this package)

-   `npm run dev`: Starts the Next.js development server for testing the components locally (requires example data and mock APIs).
-   `npm run build`: Compiles TypeScript and CSS to the `dist` folder, making the package ready for publishing.
-   `npm run prepare`: Automatically runs `npm run build` before publishing.
-   `npm run clean`: Removes the `dist` directory.
-   `npm run typecheck`: Runs TypeScript compiler for type checking.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs or feature enhancements.

## License

This project is licensed under the Apache 2.0 License. (Assuming `LICENSE` file exists or will be added).
