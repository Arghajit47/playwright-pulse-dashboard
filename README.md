
# Pulse Dashboard Component & CLI

**Pulse Dashboard** is a reusable Next.js component and standalone CLI tool designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

It can be:
1.  **Run as a Standalone CLI Tool**: Install globally or use with `npx` to quickly view reports.
2.  **Run as a Standalone Application (from source)**: Clone the repo and run locally for development or direct report viewing.
3.  **Used as an NPM Package (Component Library)**: Integrate the `PulseDashboard` UI component into your existing Next.js application.

## Key Features

-   **Live Results View**: Displays up-to-the-second results from the latest Playwright test run, with detailed views for each test.
-   **Summary Metrics**: At-a-glance overview of the current test run, including total tests, pass/fail/skipped counts, and overall duration. Clickable cards allow quick filtering of the live results.
-   **Trend Analysis**: Visualizes historical test run data, showing trends for test outcomes (passed, failed, skipped) and execution duration over time.
-   **Detailed Test Information**: For each test, view status, duration, retries, attachments, logs, and individual test history.
-   **Failure Categorization**: Automatically groups failed tests from the current run into common categories.
-   **Flaky Test Analysis**: Identifies tests that have exhibited inconsistent pass/fail behavior based on historical runs.
-   **Filtering Capabilities**: Filter live test results by status, name/suite, tags, browser, and retries.
-   **Theme Customization**: Switch between light and dark themes.

## Three Ways to Use Pulse Dashboard

### 1. As a Standalone CLI Tool (Recommended for quick report viewing)

Install the package globally or use `npx` to run the dashboard directly.

**Prerequisites:**
*   Node.js and npm/npx installed.
*   Your Playwright test reports (`playwright-pulse-report.json` and optional `history/trend-*.json` files) organized in a `pulse-report` directory.

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
  ... (your other project files)
```

### 2. As a Standalone Application (Running from Source)

If you want to view your Playwright reports by running this `pulse-dashboard` project's source code directly (e.g., for development on the dashboard itself).

1.  **Prerequisites:**
    *   Ensure you have Node.js and npm installed.
    *   Clone this repository:
        ```bash
        git clone https://github.com/Postman-test-bit/pulse-dashboard.git
        cd pulse-dashboard
        ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Prepare Your Report Data:**
    *   At the root of this cloned `pulse-dashboard` project, create a directory named `pulse-report`.
    *   Place your `playwright-pulse-report.json` inside this `pulse-dashboard/pulse-report` directory.
    *   For historical trends, create `pulse-dashboard/pulse-report/history/` and place your `trend-*.json` files there.
    *   For attachments, ensure they are located within `pulse-dashboard/pulse-report/attachments/`. The dashboard will expect to load these from `/pulse-report/attachments/...`.

4.  **Start the Dashboard:**
    ```bash
    npm run dev
    ```
    This starts the Next.js development server, usually on `http://localhost:9002`.

5.  **View in Browser:**
    Open `http://localhost:9002`.

### 3. As an NPM Package (Component Library in another Next.js App)

Install and import the `PulseDashboard` component into your existing Next.js project.

**Installation:**
```bash
npm install pulse-dashboard
# or
yarn add pulse-dashboard
```

**Usage as a Component:**

1.  **Import CSS**:
    In your main application file (e.g., `_app.tsx`, `layout.tsx`, or a global CSS file of your **consuming Next.js application**):
    ```javascript
    import 'pulse-dashboard/dist/styles.css';
    ```

2.  **Import and Use Component**:
    In a page or component of your **consuming Next.js application**:
    ```tsx
    import { PulseDashboard } from 'pulse-dashboard';

    export default function MyDashboardPage() {
      // Ensure your application provides the necessary API routes
      // and data files as specified below.
      return <PulseDashboard />;
    }
    ```

**Data Provision Requirements (When Used as a Component):**

If using `pulse-dashboard` as an NPM package in your own Next.js application, that application is responsible for providing the necessary data.

*   **Data File Locations (in Consumer Application):**
    All report data and attachments should be placed within a `pulse-report/` directory at the **root of your consuming Next.js project**.
    *   Current Run: `YOUR_PROJECT_ROOT/pulse-report/playwright-pulse-report.json`
    *   Historical Data: `YOUR_PROJECT_ROOT/pulse-report/history/trend-*.json`
    *   Attachments: `YOUR_PROJECT_ROOT/pulse-report/attachments/`.
        **Important**: The Pulse Dashboard component loads assets using URLs like `/pulse-report/attachments/...`. You must configure your Next.js application to serve files from `YOUR_PROJECT_ROOT/pulse-report/attachments/` at the `/pulse-report/attachments/` web path. This can be done via Next.js rewrites or by copying files to `public/pulse-report/attachments/` during your build.

*   **API Routes (to be implemented by consumer):**
    Your Next.js application must implement:
    *   **GET `/api/current-run`**: Reads and returns `YOUR_PROJECT_ROOT/pulse-report/playwright-pulse-report.json`.
    *   **GET `/api/historical-trends`**: Reads and returns aggregated `YOUR_PROJECT_ROOT/pulse-report/history/trend-*.json` files.

*   **Server Actions (to be implemented by consumer, optional):**
    For features like flaky test analysis, the consuming app needs to provide equivalent server-side logic (see `src/app/actions.ts` in this project for reference).

## Technical Stack (of this Dashboard Project/Component Package)

-   **Framework**: Next.js
-   **UI Library**: React
-   **Component Library**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **Language**: TypeScript

## NPM Scripts (for developing this project)

-   `npm run dev`: Starts the Next.js development server for standalone source viewing.
-   `npm run build:app`: Builds the Next.js application pages (`.next` folder).
-   `npm run start`: Starts the Next.js production server (requires `npm run build:app` first).
-   `npm run build:tsc`: Compiles TypeScript to `dist` for the NPM library.
-   `npm run build:css`: Compiles Tailwind CSS to `dist/styles.css` for the NPM library.
-   `npm run build`: Prepares the NPM library package (`dist` folder).
-   `npm run prepublishOnly`: Builds both the app and the library, run automatically before `npm publish`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the Apache 2.0 License.
