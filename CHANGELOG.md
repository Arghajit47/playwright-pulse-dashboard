# Changelog

All notable changes to this project will be documented in this file.

## [1.2.8] - 2026-02-22

### Fixed
- **Security Vulnerabilities**: Resolved multiple package vulnerabilities to enhance application security.
- **Dependency Updates**: Updated all dependencies to their latest versions for improved security and feature support.

## [1.2.7] - 2026-02-13

### Added
- **New Card components**: Added new KPI card components, "Total Retries Count", "Avg. Test Time" and "Flaky" for better visual organization and layout.
- **Automatic Trend Generation Added**: Modified bin/pulse-dashboard.js to automatically run npx generate-trend before starting the dashboard.
Now when users run: `npx pulse-dashboard` and it will:
  - Generate trends (if possible)
  - Start the dashboard
  - Handle errors gracefully (dashboard starts even if trend generation fails)

### Changed
- **UI Revamp**: Improved layout for "Failure Categorization" and "Dashboard" Tab, with better spacing and alignments.
- **Chart Alignment Adjustment**: Made minor adjustments to chart alignments for better visual consistency.
- **Added Multi-Environment Support**: Enhanced dashboard to display results from multiple environments side-by-side for comparative analysis in Dashboard.
- **Added Test retry statistics**: Added test retry statistics to the dashboard for 'Tests with Retries', 'Total Retries', 'Max Retries' and 'Tests with Max Retries'.
- **Added Test Flakiness**: Added test flakiness through out the dashboard tabs for 'Flaky Tests' analysis.
- **Flaky Test Analysis tab**: Upgraded the flaky test analysis tab to display the flaky tests in "Current Run" and "Historical Data" for comparative analysis.
- **Added Retry Count**: Added retry count to the test results for better understanding of test failures. Also, each retry run steps are now visible in the test results with proper attachments, logs, etc.
- **Added Browser Distribution**: Added browser distribution to the dashboard for better understanding of test distribution across browsers.
- **Configurable port support**: The dashboard now supports custom port configuration via:
  - `--port 8080` or `-p 8080` CLI flag
  - `PORT=8080` environment variable
  - Default: 9002

## [1.2.6] - 2026-01-09

### Changed
- **License**: Switched from Apache 2.0 to MIT License for more permissive use and contributions
- **Dependencies**: Updated all dependencies to their latest versions for improved security and feature support, and resolved the AGPL license conflict

## [1.2.5] - 2026-01-06

### Added
- **Pulse Command Tab**: New sidebar tab for generating different report formats directly from the dashboard
  - Generate Attachment Based Report (`npx generate-pulse-report`)
  - Generate Embedded Single File Report (`npx generate-report`)
  - Generate Email Report (`npx generate-email-report`)
  - Re-run button to execute commands via API
  - View button to open generated reports in new tab
- **Report Serving API**: New `/api/reports/[filename]` endpoint to serve HTML report files dynamically
- **Command Execution API**: New `/api/run-command` endpoint to securely execute whitelisted report generation commands
- **Severity Distribution Chart**: New chart in Trend Analysis view showing test counts grouped by severity levels (Critical, High, Medium, Low, Minor) with stacked bar visualization for Passed, Failed, and Skipped tests
- **Tags and Severity Badges**: Test results now display tags and severity badges with color-coded styling for better visual identification

### Changed
- **Test Results Display**: Cleaner test item layout with improved visual hierarchy
- **Trend Analysis**: Improved chart organization with severity-based analytics
- **Chart Visibility**: Hidden X-axis labels from "Test Describe Duration" chart for cleaner presentation

---

## [1.2.4] - 2025-12-21

### Added
- **Custom Output Directory Support**: Implemented dynamic report directory detection and configuration
  - Added CLI argument support (`--output-dir` / `-o`) to specify custom report directories
  - Created `getOutputDir` utility that automatically detects output directory from Playwright config files
  - Supports reading `outputDir` from playwright-pulse-report reporter configuration in `playwright.config.ts/js/mjs`
  - Falls back gracefully to default `pulse-report` directory when no custom directory is specified
- **Annotations Support**: Enhanced test result display with support for Playwright test annotations
  - Test annotations are now visible in test details and results views
  - Supports all standard Playwright annotation types (skip, fixme, fail, slow, etc.)

### Changed
- **Next.js Update**: Upgraded Next.js from version 15.5.9 to 16.1.0 for latest features, performance improvements, and security enhancements
- **Environment Variable Integration**: Updated bin script to pass resolved report directory via `PULSE_REPORT_DIR` environment variable
- **API Routes Enhancement**: All API routes now dynamically resolve report directories using environment variables
  - Updated `/api/current-run` to use dynamic report directory
  - Updated `/api/historical-trends` to use dynamic report directory  
  - Updated `/api/assets` to use dynamic report directory
- **Actions Enhancement**: Updated server actions (`getRawHistoricalReports`, `getFlakyTestsAnalysis`) to support dynamic report directories
- **Dependency Cleanup**: Removed unused dependencies to reduce package size and improve installation times
  - Removed unused form dependencies (react-hook-form, @hookform/resolvers, zod)
  - Removed unused calendar dependencies (react-day-picker, date-fns)
  - Removed unused dev dependencies (dotenv, patch-package)
  - Deleted unused UI components (form.tsx, calendar.tsx)
  - **Result**: 440 packages removed, significantly reducing node_modules size and installation time

### Fixed
- **Security Vulnerabilities**: Resolved multiple package vulnerabilities to enhance application security
- **TypeScript Compatibility**: Fixed Buffer type incompatibility in assets route for Next.js 15
- **Build Configuration**: Updated bin script to use compiled JavaScript from dist folder instead of TypeScript source

### Technical Improvements
- Enhanced error handling and logging for report directory resolution
- Improved fallback mechanisms for missing or invalid directory configurations
- Added comprehensive documentation for custom directory usage

---

## [1.1.5] - 2025-11-22

### Fixed
- **Package Vulnerabilities**: Resolved security vulnerabilities in project dependencies to ensure enhanced application security
- **Next.js Update**: Upgraded Next.js to version 15.5.6 to address security and performance improvements
- **README Update**: Updated `README.md` to include new logo image for Pulse Dashboard

---

## [1.1.4] - 2025-08-20

### Added
- **Historical Run Navigation**: Added historical run selector dropdown functionality to test details page for improved test run navigation and comparison

### Changed
- **UI Enhancements**: Enhanced test details user interface with redesigned status indicators and visual styling improvements
- **Modern Design**: Updated sidebar component design to incorporate glass morphism effects for modern aesthetics
- **Terminology Update**: Renamed "Live Test Results" section to "Test Results" to maintain consistent terminology across the application

### Fixed
- **CSV Handling**: Resolved issues with CSV attachment filtering functionality and standardized date display format handling

---

## [1.1.3] - 2025-08-15

### Added
- **AI Suggestions**: Implemented AI Suggestions sub-tab inside failed test case details page.
- **Test Case Snippet**: Added _Test Case Snippet_ section containing the failed test cases' entire test snippet, `Test Details` > `Logs` .

---

## [1.1.2] - 2025-07-07

### Added
- **Copy Button**: Implemented copy functionality in the "Test Deatils" view to copy the console logs, error logs.
- **Documentation Website**: Added Documentation website in the settings page, for reference.

---

## [1.1.1] - 2025-06-21

### Added
- **Export Test Results as CSV**: Implemented functionality in the "Test Results" view to download the current run's test data as a CSV file.
- **Responsive Attachment Tabs**: Ensured the attachment type tabs in the "Test Details" view are horizontally scrollable on smaller screens.

### Changed
- **Attachment Handling Documentation**: Updated `README.md` to clarify how different attachment types (screenshots, videos, traces, and other potential types) are sourced and displayed.

### Fixed
- Corrected CSV export filename generation to be more robust and handle various `run.id` formats.
- Resolved a runtime error ("test.videoPath.split is not a function") in "Test Details" view by adding a type check before attempting string operations on `videoPath`.
- Ensured case-insensitive matching for attachment `contentType` and relevant `name` properties to improve visibility of attachments from JSON reports.

---

## [1.1.0] - 2025-06-16

### Changed
- **Worker Utilization View (Dashboard Overview)**:
    - Replaced the previous Gantt chart implementation (which had used Highcharts and briefly Google Charts) with individual Donut Charts for each worker, rendered using Recharts.
    - Each donut chart visualizes the tests run by a specific worker. Slices within the donut represent individual test durations and are colored according to test status (Passed, Failed, Skipped).
    - Tooltips on donut chart segments now display test name, suite name, status, and duration for clarity.

### Added
- **Advance System Information (Dashboard Overview)**:
    - Introduced 'Details about the test execution environment', like; Host, Os, Cpu Model & Cores, Memory, Node, V8, Cwd.

- **Advanced Filtering for Worker Donut Charts (Dashboard Overview)**:
    - Introduced a "Filter by test name" input field.
    - Added a "Filter by suite" dropdown.
    - Implemented a "Visible Workers" dropdown checklist to dynamically show/hide donut charts for specific workers.
    - Included a "Reset Filters" button to clear all active filters for the worker utilization section.

### Removed
- **Highcharts Library**: Completely removed the Highcharts library and its Gantt chart module as a dependency, as it's no longer used for worker utilization or other charts. This simplifies the overall charting stack.

---

## [1.0.0] - 2025-06-14

### Changed
- **Worker Utilization Chart (Dashboard Overview)**:
    - Replaced Highcharts Gantt chart with Google Gantt chart for rendering the worker utilization view.
    - Y-axis (resource lanes) now displays worker IDs directly. Test names are available in tooltips.
    - X-axis time legends, grid lines, and current time indicator have been removed for a cleaner visualization.

### Added
- "Active Worker Count Over Time" chart added to the Trend Analysis view, visualizing the number of unique workers per historical run.
- `workerCount` field added to the `HistoricalTrend` type and populated by the `/api/historical-trends` route.

---

## [0.1.9] - 2025-06-13

### Fixed
- Fixed Test Details > Attachment [Screenshots, Video, Trace] paths.

---

## [0.1.8] - 2025-06-12

### Added
- "Total Tests" line added to the "Test Outcomes Over Time" chart in Trend Analysis view.
- Tooltip in Trend Analysis now includes "Total Tests" data.

### Changed
- Data fetching strategy in `useTestData` changed from polling to single fetch on load.
- Sidebar: Active menu items now have distinct styles for better clarity.

### Fixed
- Fixed `trends.map is not a function` error in `TrendAnalysis.tsx`.
- Improved resilience in `/api/historical-trends`, `/api/current-run`, and `src/app/actions.ts`.
- Ensured `flakinessRate` is passed correctly from historical data.

---

## [0.1.7] - 2025-05-31

### Changed
- **Major UI Revamp: "Neon Noir & Arctic Sky" Theme**
  - New palettes in `globals.css` for dark and light themes.
  - Cards now use `rounded-xl`, `shadow-lg`, and hover transitions.
  - Buttons use `rounded-lg`, `font-semibold`, and `active:scale-95`.
  - Skeleton loaders improved with theme-aware animation.
  - Unified status indicator colors and layout hierarchy.

- Updated:
  - `PulseDashboard.tsx`: content box styling
  - Footer links
  - Recharts tooltips and icons throughout the UI

---

## [0.1.6] - 2025-05-25

### Added
- Display "Latest Run Date" in `PulseDashboard.tsx` and `TestDetailsClientPage.tsx`.

### Changed
- Implemented `ansiToHtml` to convert ANSI logs to styled HTML.
- Applied to components like `TestItem`, `TestStepItemRecursive`, etc.

---

## [0.1.5] - 2025-05-21

### Changed
- **Attachment Handling (Local CLI):**
  - Added `userProjectDir` to `ReportFileMetadata`.
  - `/api/current-run` embeds working dir via `PULSE_USER_CWD`.
  - Centralized `getAssetPath` utility to resolve paths consistently.

### Fixed
- Attachment URLs now resolve across all deployment environments.

---

## [0.1.4] - 2025-05-17

### Added
- Introduced `PULSE_USER_CWD` env var to help locate correct working directory.
- Added logging for `cwd` path resolution.

### Fixed
- Crashes on API routes due to bad paths or unhandled exceptions.

---

## [0.1.3] - 2025-05-10

### Added
- `FlakyTestsWidget.tsx`: flaky tests display.
- `FailureCategorizationView.tsx`: grouped common failures.
- `SettingsView.tsx`: for theme toggling.

### Changed
- Integrated Recharts in `TrendAnalysis` and `DashboardOverviewCharts`.
- Filtering in `LiveTestResults.tsx`.
- "Test Run History" chart in `TestDetailsClientPage.tsx`.

---

## [0.1.2] - 2025-05-05

### Added
- `DashboardOverviewCharts.tsx` for charts like test distribution, browser breakdown.
- `TestItem.tsx`, `TestStepItemRecursive.tsx` for structured test display.
- Basic light/dark theme persistence via `localStorage`.

### Changed
- Restructured `PulseDashboard.tsx` to manage views and improve layout.
- Used ShadCN UI and Tailwind CSS across components.

---

## [0.1.1] - 2025-04-29

### Added
- Core `PulseDashboard` component and basic test display views.
- `/api/current-run` and `/api/historical-trends` API routes.
- `useTestData` custom hook.

---

## [0.1.0] - 2025-04-20

### Added
- Initial Next.js app setup with Tailwind + ShadCN.
- CLI entry script: `bin/pulse-dashboard.js`.
- Basic config files (`package.json`, `tsconfig`, etc.).
- Initial component structure and layout.
