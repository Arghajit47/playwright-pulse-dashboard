
# Pulse Dashboard

Pulse Dashboard is a web application designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

## Key Features

-   **Live Results View**: Displays up-to-the-second results from the latest Playwright test run, with detailed views for each test.
-   **Summary Metrics**: At-a-glance overview of the current test run, including total tests, pass/fail/skipped counts, and overall duration. Clickable cards allow quick filtering of the live results.
-   **Trend Analysis**: Visualizes historical test run data, showing trends for test outcomes (passed, failed, skipped) and execution duration over time.
-   **Detailed Test Information**: For each test, view:
    -   Status, duration, retries, browser, and associated tags.
    -   Detailed execution steps with timings and error messages.
    -   Attached screenshots, video recordings (if available), and Playwright trace files.
    -   Console logs (stdout) and error logs (stderr).
    -   Individual test run history chart showing status and duration over time.
-   **Failure Categorization**: Automatically groups failed tests from the current run into common categories (e.g., Timeout Errors, Locator Errors, Assertion Errors) for easier analysis.
-   **Flaky Test Analysis**: Identifies tests that have exhibited inconsistent pass/fail behavior across historical runs, showing their run history and flakiness statistics.
-   **Filtering Capabilities**:
    -   Filter live test results by status (passed, failed, etc.), name/suite, tags, browser, and retries.
-   **AI-Powered Failure Pattern Analysis**: Utilizes Genkit and Google AI to analyze historical test failure patterns, identify trending issues, and suggest potential root causes or fixes.
-   **Responsive Design**: UI adapts for different screen sizes.
-   **Theme Customization**: Switch between light and dark themes.
-   **Interactive Charts**: Overview charts for test distribution by status, browser, slowest tests, failed test durations, and tests per suite. Historical trend charts are also interactive. Download charts as PNG.

## Data Sources

Pulse Dashboard relies on specific JSON files generated from your Playwright test runs:

-   **Current Test Run**:
    -   File: `pulse-report/playwright-pulse-report.json`
    -   This file contains the detailed results of the most recent test execution. The dashboard polls this file for updates.
-   **Historical Test Data**:
    -   Directory: `pulse-report/history/`
    -   Files: `trend-*.json` (e.g., `trend-2023-10-26T10-30-00.json`)
    -   Each file in this directory should represent a historical test run, following the same structure as `playwright-pulse-report.json`. These are used for trend analysis and flaky test detection.
-   **Attachments**:
    -   Screenshots, videos, and trace files linked in the JSON reports are expected to be located within `public/pulse-report/attachments/` (or be fully qualified URLs, or Base64 data URIs). Paths in the JSON like `attachments/[runId]/[assetName]` will be resolved relative to `public/pulse-report/`.

## Navigating the Dashboard

The dashboard uses a sidebar for navigation between different views:

-   **Dashboard**: The main landing page showing summary metrics and overview charts for the current run.
-   **Test Results**: A detailed, filterable list of all tests from the current run. Click on any test to navigate to its dedicated details page.
-   **Trend Analysis**: Displays charts illustrating historical trends in test outcomes and durations.
-   **Flaky Tests**: Shows a list of tests identified as flaky based on historical data, with details on their occurrences.
-   **Failure Categorization**: Presents failed tests from the current run, grouped by common error types.
-   **Settings**: Allows users to customize dashboard settings, such as the theme.

## Technical Stack

-   **Framework**: Next.js (App Router)
-   **UI Library**: React
-   **Component Library**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **Generative AI**: Genkit with Google AI (for failure pattern analysis)
-   **Language**: TypeScript

## Getting Started

### Prerequisites

-   Node.js (v18 or later recommended)
-   npm or yarn

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd pulse-dashboard 
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Prepare Playwright Report Data:**
    -   Ensure your Playwright test execution generates `playwright-pulse-report.json` and places it in a `pulse-report/` directory inside the `public/` folder of this project.
    -   For historical data, place older `trend-*.json` files into `public/pulse-report/history/`.
    -   Ensure any referenced attachments (screenshots, videos, traces) are correctly placed, typically within `public/pulse-report/attachments/` or are accessible via the paths specified in the JSON.

4.  **Environment Variables (for Genkit/Google AI):**
    -   If you are using Google AI with Genkit, ensure your Google AI API key and any other necessary Genkit configurations are set up. This might involve a `.env` file if `src/ai/genkit.ts` is configured to read from it (currently, the model is hardcoded but API keys are typically via environment variables for Google Cloud services).
    ```bash
    # Example .env file (if needed by Genkit configuration)
    # GOOGLE_API_KEY=your_google_ai_api_key
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:9002](http://localhost:9002) (or the configured port) in your browser to see the result.

### Project Structure (Key Directories)

-   `src/app`: Next.js application pages and route handlers.
-   `src/components/pulse-dashboard`: React components specific to the Pulse Dashboard UI.
-   `src/components/ui`: Reusable ShadCN UI components.
-   `src/hooks`: Custom React hooks (e.g., `useTestData`).
-   `src/ai`: Genkit configuration and AI flows.
-   `public/pulse-report/`: Directory where the dashboard expects `playwright-pulse-report.json` and the `history/` subdirectory for trend data. Attachments are also typically served from under `public/`.
-   `src/types`: TypeScript type definitions for report data.

## AI-Powered Insights

The "Failure Pattern Analysis" feature (accessible if AI analysis is triggered, typically planned for the Dashboard view or a dedicated section) uses Genkit to:
-   Analyze historical failure data from `trend-*.json` files.
-   Identify common error messages and recurring failure patterns.
-   Suggest potential root causes and debugging strategies.

## Customization

-   **Theme**: Switch between light and dark mode via the "Settings" view. Your preference is saved locally in your browser.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs or feature enhancements.

## License

This project is licensed under the Apache 2.0 License. See the `LICENSE` file for details (assuming one exists or will be added).
