# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.9] - YYYY-MM-DD

### Added
- "Active Worker Count Over Time" chart added to the Trend Analysis view, visualizing the number of unique workers per historical run.
- `workerCount` field added to the `HistoricalTrend` type and populated by the `/api/historical-trends` route.

### Changed
- Trend Analysis view: Replaced the "Flakiness Rate Over Time" chart with the new "Active Worker Count Over Time" chart.

### Removed
- "Flakiness Rate Over Time" chart from the Trend Analysis view.

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
