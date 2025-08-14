# Changelog

All notable changes to this project will be documented in this file.

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
