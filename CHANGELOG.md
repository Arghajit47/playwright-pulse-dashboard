# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (though pre-1.0.0 versions have less strict guarantees).

## [0.1.8] - YYYY-MM-DD

### Added
- "Total Tests" line added to the "Test Outcomes Over Time" chart in Trend Analysis view.
- Tooltip in Trend Analysis now includes "Total Tests" data.

### Changed
- Data fetching strategy in `useTestData` hook changed from polling to fetching only on initial load/browser refresh.
- Sidebar: Active menu items now have a distinct background and foreground color, different from hover effects, for better visual clarity.

### Fixed
- Resolved "trends.map is not a function" error in `TrendAnalysis.tsx` by ensuring the `/api/historical-trends` route correctly returns an array.
- Improved resilience of API routes (`/api/historical-trends`, `/api/current-run`) and server actions (`src/app/actions.ts`) against potential "Failed to fetch" errors by making `baseDir` determination more robust and adding more specific logging for path issues.
- Ensured `flakinessRate` is correctly handled and passed through from historical data if present.

## [0.1.7] - YYYY-MM-DD

### Changed
- **Major UI Revamp: "Neon Noir & Arctic Sky" Theme**
    - Introduced new, modern color palettes in `src/app/globals.css` for both light ("Arctic Sky") and dark ("Neon Noir") themes, affecting backgrounds, foregrounds, cards, popovers, accents, charts, and sidebar.
    - Enhanced card styling (`rounded-xl`, `shadow-lg hover:shadow-xl`).
    - Updated button styling (`rounded-lg`, `font-semibold`, improved transitions, `active:scale-95`).
    - Improved skeleton loader animation (`animate-pulse-enhanced`) with theme-aware colors.
    - Standardized status indicator colors (passed, failed, skipped, pending) across components to use new theme variables for consistency.
    - Refined overall layout, spacing, and visual hierarchy in various dashboard components.
    - Improved styling for Recharts tooltips and legends.
- `PulseDashboard.tsx`: Main content area styled with `rounded-xl shadow-lg bg-background`. Footer link color now uses theme variable.
- Updated various icons throughout the UI for better visual appeal and clarity.

## [0.1.6] - YYYY-MM-DD

### Added
- Display "Latest Run Date" in the main header of `PulseDashboard.tsx`, visible across all views.
- Display "Latest Run Date" in the header of `TestDetailsClientPage.tsx`.

### Changed
- Implemented `ansiToHtml` utility function to render ANSI escape codes (e.g., from error messages, console logs) as styled HTML, preserving terminal-like formatting.
- Updated `TestItem.tsx`, `TestStepItemRecursive.tsx`, `TestDetailsClientPage.tsx`, and `FailureCategorizationView.tsx` to use `ansiToHtml` for displaying error messages and logs.

## [0.1.5] - YYYY-MM-DD

### Changed
- **Attachment Path Handling for Local CLI Usage:**
    - `ReportFileMetadata` type updated to include `userProjectDir`.
    - `/api/current-run` route now embeds `userProjectDir` (derived from `PULSE_USER_CWD` or `process.cwd()`) into the report metadata.
    - `useTestData` hook extracts and provides `userProjectDir`.
    - Centralized `getAssetPath` function in `src/lib/utils.ts` to construct `file:///` URLs for attachments when `userProjectDir` is available, intended for local CLI execution.
    - `TestDetailsClientPage.tsx` and `TestItem.tsx` updated to use the new `getAssetPath` for all attachment links and image sources, and added `unoptimized` prop to `next/image` for `file:///` URLs.
- Refined `getAssetPath` logic in components to better handle various path formats and ensure consistent root-relative paths (e.g., `/pulse-report/...`) as a fallback.

### Fixed
- Addressed issues where attachment URLs were not resolving correctly in different deployment/execution contexts.

## [0.1.4] - YYYY-MM-DD

### Added
- Introduced `PULSE_USER_CWD` environment variable mechanism to help the CLI tool determine the correct working directory for report files.
- Added focused logging in API routes (`/api/current-run`, `/api/historical-trends`) and server actions (`src/app/actions.ts`) to debug path resolution issues, particularly related to `PULSE_USER_CWD` and `process.cwd()`.

### Fixed
- Addressed "Failed to fetch" errors related to API routes crashing early due to incorrect path construction or unhandled exceptions during `baseDir` determination.

## [0.1.3] - YYYY-MM-DD

### Added
- Initial implementation of `FlakyTestsWidget.tsx` to display flaky test analysis.
- Initial implementation of `FailureCategorizationView.tsx` to group and display common failure types.
- `SettingsView.tsx` for theme toggling (light/dark).

### Changed
- Integrated `Recharts` for charting in `TrendAnalysis.tsx` and `DashboardOverviewCharts.tsx`.
- `LiveTestResults.tsx`: Added advanced filtering options (tags, browser, suite, retries only).
- `TestDetailsClientPage.tsx`: Added tab for "Test Run History" with a chart.

## [0.1.2] - YYYY-MM-DD

### Added
- `DashboardOverviewCharts.tsx` component to display various charts (Test Distribution, Tests by Browser, Failed Tests Duration, Slowest Tests, Tests per Suite) on the main dashboard view.
- `TestItem.tsx` component for rendering individual test results in lists.
- `TestStepItemRecursive.tsx` for displaying nested test execution steps.
- Basic theme persistence using `localStorage` for light/dark mode.

### Changed
- Refined the structure of `PulseDashboard.tsx` to manage different views (Dashboard, Live Results, Trend Analysis, Test Details, Settings).
- Initial styling improvements using ShadCN UI components and Tailwind CSS.

## [0.1.1] - YYYY-MM-DD

### Added
- Core `PulseDashboard` component structure (`src/components/pulse-dashboard/PulseDashboard.tsx`).
- `SummaryMetrics.tsx` component to display high-level test run statistics.
- `LiveTestResults.tsx` component for displaying a list of tests from the current run.
- `TrendAnalysis.tsx` component placeholder for historical trend charts.
- Basic `TestDetailsClientPage.tsx` for viewing individual test details.
- `useTestData` custom hook (`src/hooks/useTestData.ts`) for fetching current run and historical trend data.
- API route `/api/current-run` to serve `playwright-pulse-report.json`.
- API route `/api/historical-trends` to serve aggregated historical trend data.
- Server actions in `src/app/actions.ts` for reading report files from the file system.

### Changed
- Set up project with Next.js, React, ShadCN UI, Tailwind CSS.
- Defined initial data types in `src/types/playwright.ts`.
- Configured `globals.css` with initial HSL theme variables.

## [0.1.0] - YYYY-MM-DD

### Added
- Project initiated.
- Basic Next.js application setup.
- `package.json` configured with initial dependencies.
- README.md created outlining project goals and usage.
- `bin/pulse-dashboard.js` script for CLI execution.
- Initial `next.config.ts`.
- tsconfig files (`tsconfig.json`, `tsconfig.build.json`).
