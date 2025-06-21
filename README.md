
# Pulse Dashboard

**Pulse Dashboard** is a reusable Next.js component and standalone CLI tool designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

It can be: **Run as a Standalone CLI Tool**: Install globally or use with `npx` to quickly view reports.

[Note: **Pulse Dashboard** uses playwright-pulse-report generated data]

## Key Features

[![pulse-dashboard-key-features](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-key-features.svg)](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-key-features.svg)

*   **Real-time Dashboard**: View summary metrics (total, passed, failed, skipped, duration), test distribution charts, and system information from the latest test run.
*   **Live Test Results**: Browse and filter test results by status, name, suite, tags, and browser. View detailed information for each test, including execution steps, error messages, and retries.
*   **Trend Analysis**: Visualize historical data for test outcomes and duration over time to identify patterns and regressions.
*   **Flaky Test Analysis**: Identify tests that have shown inconsistent pass/fail behavior across historical runs.
*   **Failure Categorization**: Group common failure types based on error messages to quickly pinpoint systemic issues.
*   **Attachment Viewing**:
    *   **Screenshots**: Displays images captured during test execution (sourced from the `screenshots: string[]` field in each test result).
    *   **Videos**: Allows viewing of video recordings of test runs (sourced from the `videoPath: string[]` field).
    *   **Trace Files**: Provides download links for Playwright trace files for in-depth debugging (sourced from the `tracePath: string` field).
    *   **Other File Types**: The UI includes tabs for HTML, PDF, JSON, Text/CSV, and other generic file types. *Note: To populate these tabs, your `playwright-pulse-report.json` would need to include an `attachments` array (or similar structured data) within each test result, where each element is an object like `{ name: string, path: string, contentType: string }`. Currently, these specific tabs are not populated directly from the `screenshots`, `videoPath`, or `tracePath` fields.*
*   **Export to CSV**: Download the current run's test results as a CSV file for external analysis.
*   **Customizable Theme**: Toggle between light and dark modes for optimal viewing.
*   **Responsive Design**: Access the dashboard on various devices.

## How to Use Pulse Dashboard

### 1. As a Standalone CLI Tool (Recommended for quick report viewing)

Install the package globally or use `npx` to run the dashboard directly.

**Prerequisites:**
*   Node.js and npm/npx installed.
*   playwright installed.
*   Playwright-pulse-report npm package integrated into the playwright test repository (`playwright-pulse-report.json` and optional `history/trend-*.json` files) organized in a `pulse-report` directory.

**Installation & Usage:**

*   **Using npx (Recommended for easy, one-time use):**
    Navigate to your project directory that contains the `pulse-report` folder (with your `playwright-pulse-report.json` inside it), and run:

    ```bash
    npx pulse-dashboard
    ```

    This will download and run the latest version of Pulse Dashboard without a global installation.

    **[NOTE: user does not need to navigate inside `pulse-report` folder]**

*   **Global Installation (if you use it frequently):**

    ```bash
    npm install -g pulse-dashboard
    ```

    Then, navigate to your project directory that contains the `pulse-report` folder (not inside `pulse-report` folder) and run:

    ```bash
    npm run pulse-dashboard
    ```

The dashboard will start (usually on `http://localhost:9002`) and serve data from the `pulse-report` directory located in your current working directory.

**Data Directory Structure for CLI Usage:**
When you run `pulse-dashboard` or `npx pulse-dashboard`, it expects the following structure in the directory **from where you run the command**:

[![pulse-dashboard-client-folder-structure](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-client-folder-structure.svg)](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-client-folder-structure.svg)

## Technical Stack (of this Dashboard Project/Component Package)

[![pulse-dashboard-framework](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-framework.svg)](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-framework.svg)

## NPM Scripts (for developing this project)

-   `npm run pulse-dashboard`: Starts the Next.js development server for standalone source viewing.

## Thank You

Special Thanks to **[@Suman Vishwakarma](https://www.linkedin.com/in/suman-vishwakarma-426108185/)** for continuous UAT feedback and **[@Sagnik Ghosh](https://www.linkedin.com/in/sagnikghosh99/)** for continuous development related help.

## **[View the Live Documentation](https://postman-test-bit.github.io/pulse-dashboard/)**

## License

This project is licensed under the Apache 2.0 License.
