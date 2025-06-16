
# Pulse Dashboard

**Pulse Dashboard** is a reusable Next.js component and standalone CLI tool designed to provide real-time monitoring and historical analysis of Playwright test executions. It helps development and QA teams to quickly identify issues, track test performance over time, and gain insights into failure patterns.

It can be: **Run as a Standalone CLI Tool**: Install globally or use with `npx` to quickly view reports.

[Note: **Pulse Dashboard** uses playwright-pulse-report generated data]

## Key Features

[![pulse-dashboard-key-features](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-key-features.svg)](https://ocpaxmghzmfbuhxzxzae.supabase.co/storage/v1/object/public/images/pulse-dashboard/pulse-dashboard-key-features.svg)

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

## License

This project is licensed under the Apache 2.0 License.
