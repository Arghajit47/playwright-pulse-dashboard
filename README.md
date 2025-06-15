
# Pulse Dashboard

**Pulse Dashboard** is a reusable Next.js component and standalone CLI tool designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

It can be: **Run as a Standalone CLI Tool**: Install globally or use with `npx` to quickly view reports.

[Note: **Pulse Dashboard** uses playwright-pulse-report generated data]

## Key Features

-   **Live Results View**: Displays up-to-the-second results from the latest Playwright test run, with detailed views for each test.
-   **Summary Metrics**: At-a-glance overview of the current test run, including total tests, pass/fail/skipped counts, and overall duration. Clickable cards allow quick filtering of the live results.
-   **Trend Analysis**: Visualizes historical test run data, showing trends for test outcomes (passed, failed, skipped) and execution duration over time.
-   **Detailed Test Information**: For each test, view status, duration, retries, attachments, logs, and individual test history.
-   **Failure Categorization**: Automatically groups failed tests from the current run into common categories.
-   **Flaky Test Analysis**: Identifies tests that have exhibited inconsistent pass/fail behavior based on historical runs.
-   **Filtering Capabilities**: Filter live test results by status, name/suite, tags, browser, and retries.
-   **Theme Customization**: Switch between light and dark themes.
-   **Worker Utilizarion**: Chart to visualize no. of workers with respective test performed by them and test duration & test status.

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

*   **Global Installation (if you use it frequently):**
    ```bash
    npm install -g pulse-dashboard
    ```
    Then, navigate to your project directory that contains the `pulse-report` folder and run:
    ```bash
    pulse-dashboard
    ```

The dashboard will start (usually on `http://localhost:9002`) and serve data from the `pulse-report` directory located in your current working directory.

**Data Directory Structure for CLI Usage:**
When you run `pulse-dashboard` or `npx pulse-dashboard`, it expects the following structure in the directory **from where you run the command**:

```
/your-project-root
  /pulse-report  <-- THIS FOLDER MUST EXIST HERE
    playwright-pulse-report.json
    /history       <-- Optional: for historical trends
      trend-2023-10-26T10-30-00.json
      trend-2023-10-27T11-00-00.json
      ...
    /attachments   <-- Optional: for screenshots, videos, traces
      /RUN_ID_1
        screenshot.png
      /RUN_ID_2
        video.webm
      ...
  ... (other project files)
```

## Technical Stack (of this Dashboard Project/Component Package)

-   **Framework**: Next.js
-   **UI Library**: React
-   **Component Library**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **Language**: TypeScript

## NPM Scripts (for developing this project)

-   `npm run pulse-dashboard`: Starts the Next.js development server for standalone source viewing.


## Thank You

Special Thanks to [@suman-vishwakarma](https://www.linkedin.com/in/suman-vishwakarma-426108185/) for continuous UAT feedback and [@sagnik-ghosh](https://www.linkedin.com/in/sagnikghosh99/) for continuous development related help.

## License

This project is licensed under the Apache 2.0 License.
