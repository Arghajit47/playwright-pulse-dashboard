# **App Name**: Pulse Dashboard

## Core Features:

- Live Results View: Real-time test results fetched from `playwright-pulse-report.json`. Fetches and visualizes data as the file updates, offering an up-to-the-second view of the latest test runs.
- Trend Analysis: Historical analysis of test runs using data from `trend-*.json` files in the history directory. Generates trend graphs for failures, flakiness, and duration using Recharts.
- Summary Metrics: Presents key metrics at a glance, including total tests, pass/fail rates, and overall duration, via summary cards. Metrics update automatically.
- Test Details: Shows comprehensive results for individual tests including their status, error messages, and screenshots, within a vertically-oriented, scrolling format.
- Automatic Data Refresh: Scheduled polling of `playwright-pulse-report.json` (every 5 seconds).
- Failure Pattern Analysis: Generative AI Tool analyzes test failure patterns across historical runs, leveraging insights from `trend-*.json` files, to identify potential root causes and suggest possible fixes. AI will look at trending failures, error messages, code changes associated with failure and present hypothesis
- NPM Packaging: Package dashboard as an installable npm package. After npm installation user can import the component and reuse it inside their Nextjs apps.

## Style Guidelines:

- Primary color: Use a calm blue (#5DADE2) to create a sense of reliability and focus, without being distracting. This color represents stability.
- Background color: Very light blue (#EBF5FB). Provides a clean and unobtrusive backdrop that allows the dashboard elements to stand out.
- Accent color: Use a vibrant orange (#F39C12) to draw attention to key metrics, alerts, or actionable items. Signals importance.
- Font pairing: 'Inter' (sans-serif) for both headlines and body text. 'Inter' offers great legibility for dashboard contexts that call for the display of technical information.
- Crisp, modern icons from a set like 'Feather' or 'Lucide'.  Use icons to represent test statuses (pass, fail, pending), file types, and actions.
- Elongated layout: Vertical scrolling allows all tests and historical data to be viewed in a single, long page without pagination.
- Subtle animations on data refresh or when tests change status, to draw attention without being distracting.