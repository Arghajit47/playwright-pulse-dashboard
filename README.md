
# Pulse Dashboard Component

**Pulse Dashboard Component** is a reusable Next.js component package designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

While it's designed as an NPM package for integration into other Next.js applications, **this project itself can also be run as a standalone dashboard** to view your Playwright reports directly.

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

## Two Ways to Use Pulse Dashboard

You have two main ways to use this dashboard:

1.  **As a Standalone Application (Recommended for direct report viewing):**
    Run this project directly to view your Playwright reports. See "Running the Dashboard Standalone" below.
2.  **As an NPM Package in another Next.js Application:**
    Install and import the `PulseDashboard` component into your existing Next.js project. See "Installation as an NPM Package" and "Usage as a Component" below.

## Running the Dashboard Standalone (for direct report viewing)

If you want to view your Playwright reports without integrating the dashboard into another Next.js project, you can run this `pulse-dashboard` project directly.

1.  **Prerequisites:**
    *   Ensure you have Node.js and npm installed.
    *   Clone this repository (or download the source code).
        ```bash
        git clone https://github.com/Postman-test-bit/pulse-dashboard.git
        cd pulse-dashboard
        ```

2.  **Install Dependencies:**
    Navigate to the root directory of this `pulse-dashboard` project and run:
    ```bash
    npm install
    ```

3.  **Prepare Your Report Data:**
    *   At the root of this `pulse-dashboard` project, create a directory named `pulse-report`.
    *   Place your `playwright-pulse-report.json` (the main report from `@arghajit/playwright-pulse-report`) inside the `pulse-report` directory.
    *   For historical trends, create `pulse-report/history/` and place your `trend-*.json` files there.
    *   For attachments (screenshots, videos, traces), ensure they are located within `pulse-report/attachments/`. For example, if a screenshot path in your JSON is `attachments/[runId]/asset.png`, the physical file should be at `pulse-dashboard/pulse-report/attachments/[runId]/asset.png`. The dashboard will expect to load these from `/pulse-report/attachments/...`.
        *   **Note:** When running `npm run dev`, Next.js does not automatically serve files outside the `public` directory. For attachments to work correctly in this standalone dev mode, you might need to either:
            *   Manually copy your `pulse-report/attachments` into a `public/pulse-report/attachments` directory within this project before running `npm run dev`.
            *   Or, ensure your `playwright-pulse-report.json` uses absolute URLs or Base64 data URIs for attachments if direct file serving is an issue.
            *   For a production build (`npm run build` then `npm start`), you would need to ensure the `pulse-report` directory is handled by your deployment or served appropriately.

4.  **Start the Dashboard:**
    From the root of this `pulse-dashboard` project, run:
    ```bash
    npm run dev
    ```
    This will start the Next.js development server.

5.  **View in Browser:**
    Open your web browser and navigate to `http://localhost:9002` (or the port shown in your terminal if 9002 is in use).

## Installation as an NPM Package (for integration into another Next.js app)

```bash
npm install pulse-dashboard-component # Or your chosen package name
# or
yarn add pulse-dashboard-component
```

## Usage as a Component (in another Next.js app)

1.  **Import CSS**:
    In your main application file (e.g., `_app.tsx`, `layout.tsx`, or a global CSS file of your **consuming Next.js application**):
    ```javascript
    import 'pulse-dashboard-component/dist/styles.css'; // Adjust if your package name is different
    ```

2.  **Import and Use Component**:
    In a page or component of your **consuming Next.js application** (e.g., `app/dashboard/page.tsx` or `pages/dashboard.tsx`):
    ```tsx
    import { PulseDashboard } from 'pulse-dashboard-component'; // Adjust if your package name is different

    export default function MyDashboardPage() {
      return <PulseDashboard />;
    }
    ```

## Data Provision Requirements (When Used as a Component in a Consumer Application)

If you are using `pulse-dashboard-component` as an NPM package in your own Next.js application, that application is responsible for providing the necessary data.

### 1. Data File Locations (in Consumer Application):

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

## Technical Stack (of this Dashboard Project/Component Package)

-   **Framework**: Next.js (UI components compatible with App Router)
-   **UI Library**: React
-   **Component Library**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **Language**: TypeScript

## NPM Scripts (for developing/running this project)

-   `npm run dev`: Starts the Next.js development server. Use this to run the dashboard standalone (requires report data in `pulse-report/` directory).
-   `npm run build:app`: Builds the Next.js application (e.g., for a standalone deployment).
-   `npm run start`: Starts the Next.js production server after running `npm run build:app`.
-   `npm run lint`: Lints the codebase.
-   `npm run typecheck`: Runs TypeScript compiler for type checking.
-   `npm run build:tsc`: Compiles TypeScript to the `dist` folder for the NPM package.
-   `npm run build:css`: Compiles Tailwind CSS to `dist/styles.css` for the NPM package.
-   `npm run build`: Prepares the NPM package (runs `clean`, `build:tsc`, `build:css`).
-   `npm run clean`: Removes the `dist` directory.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs or feature enhancements.

## License

This project is licensed under the Apache 2.0 License. (Assuming `LICENSE` file exists or will be added).
```