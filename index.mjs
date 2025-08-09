#!/usr/bin/env node

import * as fs from "fs/promises";
import { readFileSync, existsSync as fsExistsSync } from "fs";
import path from "path";
import { fork } from "child_process";
import { fileURLToPath } from "url";

// Use dynamic import for chalk as it's ESM only
let chalk;
try {
  chalk = (await import("chalk")).default;
} catch (e) {
  console.warn("Chalk could not be imported. Using plain console logs.");
  chalk = {
    green: (text) => text,
    red: (text) => text,
    yellow: (text) => text,
    blue: (text) => text,
    bold: (text) => text,
    gray: (text) => text,
  };
}

// Default configuration
const DEFAULT_OUTPUT_DIR = "pulse-report";
const DEFAULT_JSON_FILE = "playwright-pulse-report.json";
const DEFAULT_HTML_FILE = "playwright-pulse-static-report.html";

// Helper functions
export function ansiToHtml(text) {
  if (!text) {
    return "";
  }
  const codes = {
    0: "color:inherit;font-weight:normal;font-style:normal;text-decoration:none;opacity:1;background-color:inherit;",
    1: "font-weight:bold",
    2: "opacity:0.6",
    3: "font-style:italic",
    4: "text-decoration:underline",
    30: "color:#000", // black
    31: "color:#d00", // red
    32: "color:#0a0", // green
    33: "color:#aa0", // yellow
    34: "color:#00d", // blue
    35: "color:#a0a", // magenta
    36: "color:#0aa", // cyan
    37: "color:#aaa", // light grey
    39: "color:inherit", // default foreground color
    40: "background-color:#000", // black background
    41: "background-color:#d00", // red background
    42: "background-color:#0a0", // green background
    43: "background-color:#aa0", // yellow background
    44: "background-color:#00d", // blue background
    45: "background-color:#a0a", // magenta background
    46: "background-color:#0aa", // cyan background
    47: "background-color:#aaa", // light grey background
    49: "background-color:inherit", // default background color
    90: "color:#555", // dark grey
    91: "color:#f55", // light red
    92: "color:#5f5", // light green
    93: "color:#ff5", // light yellow
    94: "color:#55f", // light blue
    95: "color:#f5f", // light magenta
    96: "color:#5ff", // light cyan
    97: "color:#fff", // white
  };

  let currentStylesArray = [];
  let html = "";
  let openSpan = false;

  const applyStyles = () => {
    if (openSpan) {
      html += "&lt;/span&gt;";
      openSpan = false;
    }
    if (currentStylesArray.length > 0) {
      const styleString = currentStylesArray.filter((s) => s).join(";");
      if (styleString) {
        html += `&lt;span style="${styleString}"&gt;`;
        openSpan = true;
      }
    }
  };
  const resetAndApplyNewCodes = (newCodesStr) => {
    const newCodes = newCodesStr.split(";");
    if (newCodes.includes("0")) {
      currentStylesArray = [];
      if (codes["0"]) currentStylesArray.push(codes["0"]);
    }
    for (const code of newCodes) {
      if (code === "0") continue;
      if (codes[code]) {
        if (code === "39") {
          currentStylesArray = currentStylesArray.filter(
            (s) => !s.startsWith("color:")
          );
          currentStylesArray.push("color:inherit");
        } else if (code === "49") {
          currentStylesArray = currentStylesArray.filter(
            (s) => !s.startsWith("background-color:")
          );
          currentStylesArray.push("background-color:inherit");
        } else {
          currentStylesArray.push(codes[code]);
        }
      } else if (code.startsWith("38;2;") || code.startsWith("48;2;")) {
        const parts = code.split(";");
        const type = parts[0] === "38" ? "color" : "background-color";
        if (parts.length === 5) {
          currentStylesArray = currentStylesArray.filter(
            (s) => !s.startsWith(type + ":")
          );
          currentStylesArray.push(
            `${type}:rgb(${parts[2]},${parts[3]},${parts[4]})`
          );
        }
      }
    }
    applyStyles();
  };
  const segments = text.split(/(\x1b\[[0-9;]*m)/g);
  for (const segment of segments) {
    if (!segment) continue;
    if (segment.startsWith("\x1b[") && segment.endsWith("m")) {
      const command = segment.slice(2, -1);
      resetAndApplyNewCodes(command);
    } else {
      const escapedContent = segment
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      html += escapedContent;
    }
  }
  if (openSpan) {
    html += "&lt;/span&gt;";
  }
  return html;
}
function sanitizeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(
    /[&<>"']/g,
    (match) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[match] || match)
  );
}
function capitalize(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
function formatPlaywrightError(error) {
  const commandOutput = ansiToHtml(error || error.message);
  return convertPlaywrightErrorToHTML(commandOutput);
}
function convertPlaywrightErrorToHTML(str) {
    if (!str) return "";
    return str
      .replace(/^(\s+)/gm, (match) =>
        match.replace(/ /g, "&nbsp;").replace(/\t/g, "&nbsp;&nbsp;")
      )
      .replace(/&lt;red&gt;/g, '&lt;span style="color: red;"&gt;')
      .replace(/&lt;green&gt;/g, '&lt;span style="color: green;"&gt;')
      .replace(/&lt;dim&gt;/g, '&lt;span style="opacity: 0.6;"&gt;')
      .replace(/&lt;intensity&gt;/g, '&lt;span style="font-weight: bold;"&gt;')
      .replace(/&lt;\/color&gt;/g, "&lt;/span&gt;")
      .replace(/&lt;\/intensity&gt;/g, "&lt;/span&gt;")
      .replace(/\n/g, "&lt;br&gt;");
}
function formatDuration(ms, options = {}) {
  const {
    precision = 1,
    invalidInputReturn = "N/A",
    defaultForNullUndefinedNegative = null,
  } = options;

  const validPrecision = Math.max(0, Math.floor(precision));
  const zeroWithPrecision = (0).toFixed(validPrecision) + "s";
  const resolvedNullUndefNegReturn =
    defaultForNullUndefinedNegative === null
      ? zeroWithPrecision
      : defaultForNullUndefinedNegative;

  if (ms === undefined || ms === null) {
    return resolvedNullUndefNegReturn;
  }

  const numMs = Number(ms);

  if (Number.isNaN(numMs) || !Number.isFinite(numMs)) {
    return invalidInputReturn;
  }

  if (numMs < 0) {
    return resolvedNullUndefNegReturn;
  }

  if (numMs === 0) {
    return zeroWithPrecision;
  }

  const MS_PER_SECOND = 1000;
  const SECONDS_PER_MINUTE = 60;
  const MINUTES_PER_HOUR = 60;
  const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

  const totalRawSeconds = numMs / MS_PER_SECOND;

  if (
    totalRawSeconds < SECONDS_PER_MINUTE &&
    Math.ceil(totalRawSeconds) < SECONDS_PER_MINUTE
  ) {
    return `${totalRawSeconds.toFixed(validPrecision)}s`;
  } else {
    const totalMsRoundedUpToSecond =
      Math.ceil(numMs / MS_PER_SECOND) * MS_PER_SECOND;

    let remainingMs = totalMsRoundedUpToSecond;

    const h = Math.floor(remainingMs / (MS_PER_SECOND * SECONDS_PER_HOUR));
    remainingMs %= MS_PER_SECOND * SECONDS_PER_HOUR;

    const m = Math.floor(remainingMs / (MS_PER_SECOND * SECONDS_PER_MINUTE));
    remainingMs %= MS_PER_SECOND * SECONDS_PER_MINUTE;

    const s = Math.floor(remainingMs / MS_PER_SECOND);

    const parts = [];
    if (h > 0) {
      parts.push(`${h}h`);
    }
    if (h > 0 || m > 0 || numMs >= MS_PER_SECOND * SECONDS_PER_MINUTE) {
      parts.push(`${m}m`);
    }
    parts.push(`${s}s`);

    return parts.join(" ");
  }
}
function generateTestTrendsChart(trendData) {
  if (!trendData || !trendData.overall || trendData.overall.length === 0) {
    return '&lt;div class="no-data"&gt;No overall trend data available for test counts.&lt;/div&gt;';
  }

  const chartId = `testTrendsChart-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const renderFunctionName = `renderTestTrendsChart_${chartId.replace(
    /-/g,
    "_"
  )}`;
  const runs = trendData.overall;

  const series = [
    {
      name: "Total",
      data: runs.map((r) => r.totalTests),
      color: "var(--primary-color)",
      marker: { symbol: "circle" },
    },
    {
      name: "Passed",
      data: runs.map((r) => r.passed),
      color: "var(--success-color)",
      marker: { symbol: "circle" },
    },
    {
      name: "Failed",
      data: runs.map((r) => r.failed),
      color: "var(--danger-color)",
      marker: { symbol: "circle" },
    },
    {
      name: "Skipped",
      data: runs.map((r) => r.skipped || 0),
      color: "var(--warning-color)",
      marker: { symbol: "circle" },
    },
  ];
  const runsForTooltip = runs.map((r) => ({
    runId: r.runId,
    timestamp: r.timestamp,
    duration: r.duration,
  }));

  const categoriesString = JSON.stringify(runs.map((run, i) => `Run ${i + 1}`));
  const seriesString = JSON.stringify(series);
  const runsForTooltipString = JSON.stringify(runsForTooltip);

  return `
      &lt;div id="${chartId}" class="trend-chart-container lazy-load-chart" data-render-function-name="${renderFunctionName}"&gt;
          &lt;div class="no-data"&gt;Loading Test Volume Trends...&lt;/div&gt;
      &lt;/div&gt;
      &lt;script&gt;
          window.${renderFunctionName} = function() {
              const chartContainer = document.getElementById('${chartId}');
              if (!chartContainer) { console.error("Chart container ${chartId} not found for lazy loading."); return; }
              if (typeof Highcharts !== 'undefined' && typeof formatDuration !== 'undefined') {
                  try {
                      chartContainer.innerHTML = ''; // Clear placeholder
                      const chartOptions = {
                          chart: { type: "line", height: 350, backgroundColor: "transparent" },
                          title: { text: null },
                          xAxis: { categories: ${categoriesString}, crosshair: true, labels: { style: { color: 'var(--text-color-secondary)', fontSize: '12px' }}},
                          yAxis: { title: { text: "Test Count", style: { color: 'var(--text-color)'} }, min: 0, labels: { style: { color: 'var(--text-color-secondary)', fontSize: '12px' }}},
                          legend: { layout: "horizontal", align: "center", verticalAlign: "bottom", itemStyle: { fontSize: "12px", color: 'var(--text-color)' }},
                          plotOptions: { series: { marker: { radius: 4, states: { hover: { radius: 6 }}}, states: { hover: { halo: { size: 5, opacity: 0.1 }}}}, line: { lineWidth: 2.5 }},
                          tooltip: {
                              shared: true, useHTML: true, backgroundColor: 'rgba(10,10,10,0.92)', borderColor: 'rgba(10,10,10,0.92)', style: { color: '#f5f5f5' },
                              formatter: function () {
                                  const runsData = ${runsForTooltipString};
                                  const pointIndex = this.points[0].point.x;
                                  const run = runsData[pointIndex];
                                  let tooltip = '&lt;strong&gt;Run ' + (run.runId || pointIndex + 1) + '&lt;/strong&gt;&lt;br&gt;' + 'Date: ' + new Date(run.timestamp).toLocaleString() + '&lt;br&gt;&lt;br&gt;';
                                  this.points.forEach(point => { tooltip += '&lt;span style="color:' + point.color + '"&gt;●&lt;/span&gt; ' + point.series.name + ': &lt;b&gt;' + point.y + '&lt;/b&gt;&lt;br&gt;'; });
                                  tooltip += '&lt;br&gt;Duration: ' + formatDuration(run.duration);
                                  return tooltip;
                              }
                          },
                          series: ${seriesString},
                          credits: { enabled: false }
                      };
                      Highcharts.chart('${chartId}', chartOptions);
                  } catch (e) {
                      console.error("Error rendering chart ${chartId} (lazy):", e);
                      chartContainer.innerHTML = '&lt;div class="no-data"&gt;Error rendering test trends chart.&lt;/div&gt;';
                  }
              } else {
                  chartContainer.innerHTML = '&lt;div class="no-data"&gt;Charting library not available for test trends.&lt;/div&gt;';
              }
          };
      &lt;/script&gt;
  `;
}
function generateDurationTrendChart(trendData) {
  if (!trendData || !trendData.overall || trendData.overall.length === 0) {
    return '&lt;div class="no-data"&gt;No overall trend data available for durations.&lt;/div&gt;';
  }
  const chartId = `durationTrendChart-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const renderFunctionName = `renderDurationTrendChart_${chartId.replace(
    /-/g,
    "_"
  )}`;
  const runs = trendData.overall;

  const accentColorAltRGB = "255, 152, 0"; // Assuming var(--accent-color-alt) is Orange #FF9800

  const chartDataString = JSON.stringify(runs.map((run) => run.duration));
  const categoriesString = JSON.stringify(runs.map((run, i) => `Run ${i + 1}`));
  const runsForTooltip = runs.map((r) => ({
    runId: r.runId,
    timestamp: r.timestamp,
    duration: r.duration,
    totalTests: r.totalTests,
  }));
  const runsForTooltipString = JSON.stringify(runsForTooltip);

  const seriesStringForRender = `[{
      name: 'Duration',
      data: ${chartDataString},
      color: 'var(--accent-color-alt)',
      type: 'area',
      marker: { symbol: 'circle', enabled: true, radius: 4, states: { hover: { radius: 6, lineWidthPlus: 0 } } },
      fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(${accentColorAltRGB}, 0.4)'], [1, 'rgba(${accentColorAltRGB}, 0.05)']] },
      lineWidth: 2.5
  }]`;

  return `
      &lt;div id="${chartId}" class="trend-chart-container lazy-load-chart" data-render-function-name="${renderFunctionName}"&gt;
          &lt;div class="no-data"&gt;Loading Duration Trends...&lt;/div&gt;
      &lt;/div&gt;
      &lt;script&gt;
          window.${renderFunctionName} = function() {
              const chartContainer = document.getElementById('${chartId}');
              if (!chartContainer) { console.error("Chart container ${chartId} not found for lazy loading."); return; }
              if (typeof Highcharts !== 'undefined' && typeof formatDuration !== 'undefined') {
                  try {
                      chartContainer.innerHTML = ''; // Clear placeholder
                      const chartOptions = {
                          chart: { type: 'area', height: 350, backgroundColor: 'transparent' },
                          title: { text: null },
                          xAxis: { categories: ${categoriesString}, crosshair: true, labels: { style: { color: 'var(--text-color-secondary)', fontSize: '12px' }}},
                          yAxis: {
                              title: { text: 'Duration', style: { color: 'var(--text-color)' } },
                              labels: { formatter: function() { return formatDuration(this.value); }, style: { color: 'var(--text-color-secondary)', fontSize: '12px' }},
                              min: 0
                          },
                          legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom', itemStyle: { fontSize: '12px', color: 'var(--text-color)' }},
                          plotOptions: { area: { lineWidth: 2.5, states: { hover: { lineWidthPlus: 0 } }, threshold: null }},
                          tooltip: {
                              shared: true, useHTML: true, backgroundColor: 'rgba(10,10,10,0.92)', borderColor: 'rgba(10,10,10,0.92)', style: { color: '#f5f5f5' },
                              formatter: function () {
                                  const runsData = ${runsForTooltipString};
                                  const pointIndex = this.points[0].point.x;
                                  const run = runsData[pointIndex];
                                  let tooltip = '&lt;strong&gt;Run ' + (run.runId || pointIndex + 1) + '&lt;/strong&gt;&lt;br&gt;' + 'Date: ' + new Date(run.timestamp).toLocaleString() + '&lt;br&gt;';
                                  this.points.forEach(point => { tooltip += '&lt;span style="color:' + point.series.color + '"&gt;●&lt;/span&gt; ' + point.series.name + ': &lt;b&gt;' + formatDuration(point.y) + '&lt;/b&gt;&lt;br&gt;'; });
                                  tooltip += '&lt;br&gt;Tests: ' + run.totalTests;
                                  return tooltip;
                              }
                          },
                          series: ${seriesStringForRender}, // This is already a string representation of an array
                          credits: { enabled: false }
                      };
                      Highcharts.chart('${chartId}', chartOptions);
                  } catch (e) {
                      console.error("Error rendering chart ${chartId} (lazy):", e);
                      chartContainer.innerHTML = '&lt;div class="no-data"&gt;Error rendering duration trend chart.&lt;/div&gt;';
                  }
              } else {
                  chartContainer.innerHTML = '&lt;div class="no-data"&gt;Charting library not available for duration trends.&lt;/div&gt;';
              }
          };
      &lt;/script&gt;
  `;
}
function formatDate(dateStrOrDate) {
  if (!dateStrOrDate) return "N/A";
  try {
    const date = new Date(dateStrOrDate);
    if (isNaN(date.getTime())) return "Invalid Date";
    return (
      date.toLocaleDateString(undefined, {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      }) +
      " " +
      date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  } catch (e) {
    return "Invalid Date Format";
  }
}
function generateTestHistoryChart(history) {
  if (!history || history.length === 0)
    return '&lt;div class="no-data-chart"&gt;No data for chart&lt;/div&gt;';
  const validHistory = history.filter(
    (h) => h && typeof h.duration === "number" && h.duration >= 0
  );
  if (validHistory.length === 0)
    return '&lt;div class="no-data-chart"&gt;No valid data for chart&lt;/div&gt;';

  const chartId = `testHistoryChart-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const renderFunctionName = `renderTestHistoryChart_${chartId.replace(
    /-/g,
    "_"
  )}`;

  const seriesDataPoints = validHistory.map((run) => {
    let color;
    switch (String(run.status).toLowerCase()) {
      case "passed":
        color = "var(--success-color)";
        break;
      case "failed":
        color = "var(--danger-color)";
        break;
      case "skipped":
        color = "var(--warning-color)";
        break;
      default:
        color = "var(--dark-gray-color)";
    }
    return {
      y: run.duration,
      marker: {
        fillColor: color,
        symbol: "circle",
        radius: 3.5,
        states: { hover: { radius: 5 } },
      },
      status: run.status,
      runId: run.runId,
    };
  });

  const accentColorRGB = "103, 58, 183"; // Assuming var(--accent-color) is Deep Purple #673ab7

  const categoriesString = JSON.stringify(
    validHistory.map((_, i) => `R${i + 1}`)
  );
  const seriesDataPointsString = JSON.stringify(seriesDataPoints);

  return `
      &lt;div id="${chartId}" style="width: 320px; height: 100px;" class="lazy-load-chart" data-render-function-name="${renderFunctionName}"&gt;
          &lt;div class="no-data-chart"&gt;Loading History...&lt;/div&gt;
      &lt;/div&gt;
      &lt;script&gt;
          window.${renderFunctionName} = function() {
              const chartContainer = document.getElementById('${chartId}');
              if (!chartContainer) { console.error("Chart container ${chartId} not found for lazy loading."); return; }
              if (typeof Highcharts !== 'undefined' && typeof formatDuration !== 'undefined') {
                  try {
                      chartContainer.innerHTML = ''; // Clear placeholder
                      const chartOptions = {
                          chart: { type: 'area', height: 100, width: 320, backgroundColor: 'transparent', spacing: [10,10,15,35] },
                          title: { text: null },
                          xAxis: { categories: ${categoriesString}, labels: { style: { fontSize: '10px', color: 'var(--text-color-secondary)' }}},
                          yAxis: {
                              title: { text: null },
                              labels: { formatter: function() { return formatDuration(this.value); }, style: { fontSize: '10px', color: 'var(--text-color-secondary)' }, align: 'left', x: -35, y: 3 },
                              min: 0, gridLineWidth: 0, tickAmount: 4
                          },
                          legend: { enabled: false },
                          plotOptions: {
                              area: {
                                  lineWidth: 2, lineColor: 'var(--accent-color)',
                                  fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(${accentColorRGB}, 0.4)'],[1, 'rgba(${accentColorRGB}, 0)']]},
                                  marker: { enabled: true }, threshold: null
                              }
                          },
                          tooltip: {
                              useHTML: true, backgroundColor: 'rgba(10,10,10,0.92)', borderColor: 'rgba(10,10,10,0.92)', style: { color: '#f5f5f5', padding: '8px' },
                              formatter: function() {
                                  const pointData = this.point;
                                  let statusBadgeHtml = '&lt;span style="padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-weight: 600; color: white; text-transform: uppercase; background-color: ';
                                  switch(String(pointData.status).toLowerCase()) {
                                      case 'passed': statusBadgeHtml += 'var(--success-color)'; break;
                                      case 'failed': statusBadgeHtml += 'var(--danger-color)'; break;
                                      case 'skipped': statusBadgeHtml += 'var(--warning-color)'; break;
                                      default: statusBadgeHtml += 'var(--dark-gray-color)';
                                  }
                                  statusBadgeHtml += ';"&gt;' + String(pointData.status).toUpperCase() + '&lt;/span&gt;';
                                  return '&lt;strong&gt;Run ' + (pointData.runId || (this.point.index + 1)) + '&lt;/strong&gt;&lt;br&gt;' + 'Status: ' + statusBadgeHtml + '&lt;br&gt;' + 'Duration: ' + formatDuration(pointData.y);
                              }
                          },
                          series: [{ data: ${seriesDataPointsString}, showInLegend: false }],
                          credits: { enabled: false }
                      };
                      Highcharts.chart('${chartId}', chartOptions);
                  } catch (e) {
                      console.error("Error rendering chart ${chartId} (lazy):", e);
                      chartContainer.innerHTML = '&lt;div class="no-data-chart"&gt;Error rendering history chart.&lt;/div&gt;';
                  }
              } else {
                  chartContainer.innerHTML = '&lt;div class="no-data-chart"&gt;Charting library not available for history.&lt;/div&gt;';
              }
          };
      &lt;/script&gt;
  `;
}
function generatePieChart(data, chartWidth = 300, chartHeight = 300) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return '&lt;div class="pie-chart-wrapper"&gt;&lt;h3&gt;Test Distribution&lt;/h3&gt;&lt;div class="no-data"&gt;No data for Test Distribution chart.&lt;/div&gt;&lt;/div&gt;';
  }
  const passedEntry = data.find((d) => d.label === "Passed");
  const passedPercentage = Math.round(
    ((passedEntry ? passedEntry.value : 0) / total) * 100
  );

  const chartId = `pieChart-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;

  const seriesData = [
    {
      name: "Tests", // Changed from 'Test Distribution' for tooltip clarity
      data: data
        .filter((d) => d.value > 0)
        .map((d) => {
          let color;
          switch (d.label) {
            case "Passed":
              color = "var(--success-color)";
              break;
            case "Failed":
              color = "var(--danger-color)";
              break;
            case "Skipped":
              color = "var(--warning-color)";
              break;
            default:
              color = "#CCCCCC"; // A neutral default color
          }
          return { name: d.label, y: d.value, color: color };
        }),
      size: "100%",
      innerSize: "55%",
      dataLabels: { enabled: false },
      showInLegend: true,
    },
  ];

  // Approximate font size for center text, can be adjusted or made dynamic with more client-side JS
  const centerTitleFontSize =
    Math.max(12, Math.min(chartWidth, chartHeight) / 12) + "px";
  const centerSubtitleFontSize =
    Math.max(10, Math.min(chartWidth, chartHeight) / 18) + "px";

  const optionsObjectString = `
  {
      chart: {
          type: 'pie',
          width: ${chartWidth},
          height: ${
            chartHeight - 40
          }, // Adjusted height to make space for legend if chartHeight is for the whole wrapper
          backgroundColor: 'transparent',
          plotShadow: false,
          spacingBottom: 40 // Ensure space for legend
      },
      title: {
          text: '${passedPercentage}%',
          align: 'center',
          verticalAlign: 'middle',
          y: 5, 
          style: { fontSize: '${centerTitleFontSize}', fontWeight: 'bold', color: 'var(--primary-color)' }
      },
      subtitle: {
          text: 'Passed',
          align: 'center',
          verticalAlign: 'middle',
          y: 25, 
          style: { fontSize: '${centerSubtitleFontSize}', color: 'var(--text-color-secondary)' }
      },
      tooltip: {
          pointFormat: '{series.name}: &lt;b&gt;{point.percentage:.1f}%&lt;/b&gt; ({point.y})',
          backgroundColor: 'rgba(10,10,10,0.92)',
          borderColor: 'rgba(10,10,10,0.92)',
          style: { color: '#f5f5f5' }
      },
      legend: {
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: { color: 'var(--text-color)', fontWeight: 'normal', fontSize: '12px' }
      },
      plotOptions: {
          pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              borderWidth: 3,
              borderColor: 'var(--card-background-color)', // Match D3 style
              states: {
                  hover: {
                      // Using default Highcharts halo which is generally good
                  }
              }
          }
      },
      series: ${JSON.stringify(seriesData)},
      credits: { enabled: false }
  }
  `;

  return `
      &lt;div class="pie-chart-wrapper" style="align-items: center; max-height: 450px"&gt;
          &lt;div style="display: flex; align-items: start; width: 100%;"&gt;&lt;h3&gt;Test Distribution&lt;/h3&gt;&lt;/div&gt;
          &lt;div id="${chartId}" style="width: ${chartWidth}px; height: ${
    chartHeight - 40
  }px;"&gt;&lt;/div&gt;
          &lt;script&gt;
              document.addEventListener('DOMContentLoaded', function() {
                  if (typeof Highcharts !== 'undefined') {
                      try {
                          const chartOptions = ${optionsObjectString};
                          Highcharts.chart('${chartId}', chartOptions);
                      } catch (e) {
                          console.error("Error rendering chart ${chartId}:", e);
                          document.getElementById('${chartId}').innerHTML = '&lt;div class="no-data"&gt;Error rendering pie chart.&lt;/div&gt;';
                      }
                  } else {
                      document.getElementById('${chartId}').innerHTML = '&lt;div class="no-data"&gt;Charting library not available.&lt;/div&gt;';
                  }
              });
          &lt;/script&gt;
      &lt;/div&gt;
  `;
}
function generateEnvironmentDashboard(environment, dashboardHeight = 600) {
  // Format memory for display
  const formattedMemory = environment.memory.replace(/(\d+\.\d{2})GB/, "$1 GB");

  // Generate a unique ID for the dashboard
  const dashboardId = `envDashboard-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;

  const cardHeight = Math.floor(dashboardHeight * 0.44);
  const cardContentPadding = 16; // px

  return `
    &lt;div class="environment-dashboard-wrapper" id="${dashboardId}"&gt;
      &lt;style&gt;
        .environment-dashboard-wrapper *,
        .environment-dashboard-wrapper *::before,
        .environment-dashboard-wrapper *::after {
          box-sizing: border-box;
        }

        .environment-dashboard-wrapper {
          --primary-color: #007bff;
          --primary-light-color: #e6f2ff;
          --secondary-color: #6c757d;
          --success-color: #28a745;
          --success-light-color: #eaf6ec;
          --warning-color: #ffc107;
          --warning-light-color: #fff9e6;
          --danger-color: #dc3545;
          
          --background-color: #ffffff; 
          --card-background-color: #ffffff; 
          --text-color: #212529; 
          --text-color-secondary: #6c757d; 
          --border-color: #dee2e6; 
          --border-light-color: #f1f3f5;
          --icon-color: #495057;
          --chip-background: #e9ecef;
          --chip-text: #495057;
          --shadow-color: rgba(0, 0, 0, 0.075);

          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
          background-color: var(--background-color);
          border-radius: 12px; 
          box-shadow: 0 6px 12px var(--shadow-color);
          padding: 24px; 
          color: var(--text-color);
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto 1fr; 
          gap: 20px; 
          font-size: 14px; 
        }
        
        .env-dashboard-header {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px; 
          margin-bottom: 8px; 
        }
        
        .env-dashboard-title {
          font-size: 1.5rem; 
          font-weight: 600;
          color: var(--text-color); 
          margin: 0;
        }
        
        .env-dashboard-subtitle {
          font-size: 0.875rem; 
          color: var(--text-color-secondary);
          margin-top: 4px;
        }
        
        .env-card {
          background-color: var(--card-background-color);
          border-radius: 8px;
          padding: ${cardContentPadding}px;
          box-shadow: 0 3px 6px var(--shadow-color);
          height: ${cardHeight}px;
          display: flex;
          flex-direction: column;
          overflow: hidden; 
        }
        
        .env-card-header {
          font-weight: 600;
          font-size: 1rem; 
          margin-bottom: 12px;
          color: var(--text-color);
          display: flex;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-light-color);
        }
        
        .env-card-header svg {
          margin-right: 10px; 
          width: 18px; 
          height: 18px;
          fill: var(--icon-color);
        }

        .env-card-content {
          flex-grow: 1; 
          overflow-y: auto; 
          padding-right: 5px; 
        }
        
        .env-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center; 
          padding: 10px 0; 
          border-bottom: 1px solid var(--border-light-color);
          font-size: 0.875rem;
        }
        
        .env-detail-row:last-child {
          border-bottom: none;
        }
        
        .env-detail-label {
          color: var(--text-color-secondary);
          font-weight: 500;
          margin-right: 10px; 
        }
        
        .env-detail-value {
          color: var(--text-color);
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          text-align: right;
          word-break: break-all; 
        }
        
        .env-chip {
          display: inline-block;
          padding: 4px 10px; 
          border-radius: 16px; 
          font-size: 0.75rem; 
          font-weight: 500;
          line-height: 1.2;
          background-color: var(--chip-background);
          color: var(--chip-text);
        }
        
        .env-chip-primary {
          background-color: var(--primary-light-color);
          color: var(--primary-color);
        }
        
        .env-chip-success {
          background-color: var(--success-light-color);
          color: var(--success-color);
        }
        
        .env-chip-warning {
          background-color: var(--warning-light-color);
          color: var(--warning-color);
        }
        
        .env-cpu-cores {
          display: flex;
          align-items: center;
          gap: 6px; 
        }
        
        .env-core-indicator {
          width: 12px; 
          height: 12px;
          border-radius: 50%;
          background-color: var(--success-color);
          border: 1px solid rgba(0,0,0,0.1); 
        }
        
        .env-core-indicator.inactive {
          background-color: var(--border-light-color);
          opacity: 0.7; 
          border-color: var(--border-color);
        }
      &lt;/style&gt;
      
      &lt;div class="env-dashboard-header"&gt;
        &lt;div&gt;
          &lt;h3 class="env-dashboard-title"&gt;System Environment&lt;/h3&gt;
          &lt;p class="env-dashboard-subtitle"&gt;Snapshot of the execution environment&lt;/p&gt;
        &lt;/div&gt;
        &lt;span class="env-chip env-chip-primary"&gt;${environment.host}&lt;/span&gt;
      &lt;/div&gt;
      
      &lt;div class="env-card"&gt;
        &lt;div class="env-card-header"&gt;
          &lt;svg viewBox="0 0 24 24"&gt;&lt;path d="M4 6h16V4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h-2v10H4V6zm18-2h-4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2H6a2 2 0 0 0-2 2v2h20V6a2 2 0 0 0-2-2zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"/&gt;&lt;/svg&gt;
          Hardware
        &lt;/div&gt;
        &lt;div class="env-card-content"&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;CPU Model&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${environment.cpu.model}&lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;CPU Cores&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;
              &lt;div class="env-cpu-cores"&gt;
                ${Array.from(
                  { length: Math.max(0, environment.cpu.cores || 0) },
                  (_, i) =>
                    `&lt;div class="env-core-indicator ${
                      i >=
                      (environment.cpu.cores >= 8 ? 8 : environment.cpu.cores)
                        ? "inactive"
                        : ""
                    }" title="Core ${i + 1}"&gt;&lt;/div&gt;`
                ).join("")}
                &lt;span&gt;${environment.cpu.cores || "N/A"} cores&lt;/span&gt;
              &lt;/div&gt;
            &lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Memory&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${formattedMemory}&lt;/span&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div class="env-card"&gt;
        &lt;div class="env-card-header"&gt;
          &lt;svg viewBox="0 0 24 24"&gt;&lt;path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-0.01 18c-2.76 0-5.26-1.12-7.07-2.93A7.973 7.973 0 0 1 4 12c0-2.21.9-4.21 2.36-5.64A7.994 7.994 0 0 1 11.99 4c4.41 0 8 3.59 8 8 0 2.76-1.12 5.26-2.93 7.07A7.973 7.973 0 0 1 11.99 20zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/&gt;&lt;/svg&gt;
          Operating System
        &lt;/div&gt;
        &lt;div class="env-card-content"&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;OS Type&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${
              environment.os.split(" ")[0] === "darwin"
                ? "darwin (macOS)"
                : environment.os.split(" ")[0] || "Unknown"
            }&lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;OS Version&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${
              environment.os.split(" ")[1] || "N/A"
            }&lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Hostname&lt;/span&gt;
            &lt;span class="env-detail-value" title="${environment.host}"&gt;${
    environment.host
  }&lt;/span&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div class="env-card"&gt;
        &lt;div class="env-card-header"&gt;
          &lt;svg viewBox="0 0 24 24"&gt;&lt;path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/&gt;&lt;/svg&gt;
          Node.js Runtime
        &lt;/div&gt;
        &lt;div class="env-card-content"&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Node Version&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${environment.node}&lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;V8 Engine&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${environment.v8}&lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Working Dir&lt;/span&gt;
            &lt;span class="env-detail-value" title="${environment.cwd}"&gt;${
    environment.cwd.length > 25
      ? "..." + environment.cwd.slice(-22)
      : environment.cwd
  }&lt;/span&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div class="env-card"&gt;
        &lt;div class="env-card-header"&gt;
          &lt;svg viewBox="0 0 24 24"&gt;&lt;path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 8.69 9.48 7 12 7c2.76 0 5 2.24 5 5v1h2c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/&gt;&lt;/svg&gt;
          System Summary
        &lt;/div&gt;
        &lt;div class="env-card-content"&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Platform Arch&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;
              &lt;span class="env-chip ${
                environment.os.includes("darwin") &&
                environment.cpu.model.toLowerCase().includes("apple")
                  ? "env-chip-success"
                  : "env-chip-warning"
              }"&gt;
                ${
                  environment.os.includes("darwin") &&
                  environment.cpu.model.toLowerCase().includes("apple")
                    ? "Apple Silicon"
                    : environment.cpu.model.toLowerCase().includes("arm") ||
                      environment.cpu.model.toLowerCase().includes("aarch64")
                    ? "ARM-based"
                    : "x86/Other"
                }
              &lt;/span&gt;
            &lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Memory per Core&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;${
              environment.cpu.cores > 0
                ? (
                    parseFloat(environment.memory) / environment.cpu.cores
                  ).toFixed(2) + " GB"
                : "N/A"
            }&lt;/span&gt;
          &lt;/div&gt;
          &lt;div class="env-detail-row"&gt;
            &lt;span class="env-detail-label"&gt;Run Context&lt;/span&gt;
            &lt;span class="env-detail-value"&gt;CI/Local Test&lt;/span&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  `;
}
function generateWorkerDistributionChart(results) {
  if (!results || results.length === 0) {
    return '&lt;div class="no-data"&gt;No test results data available to display worker distribution.&lt;/div&gt;';
  }

  // 1. Sort results by startTime to ensure chronological order
  const sortedResults = [...results].sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    return timeA - timeB;
  });

  const workerData = sortedResults.reduce((acc, test) => {
    const workerId =
      typeof test.workerId !== "undefined" ? test.workerId : "N/A";
    if (!acc[workerId]) {
      acc[workerId] = { passed: 0, failed: 0, skipped: 0, tests: [] };
    }

    const status = String(test.status).toLowerCase();
    if (status === "passed" || status === "failed" || status === "skipped") {
      acc[workerId][status]++;
    }

    const testTitleParts = test.name.split(" &gt; ");
    const testTitle =
      testTitleParts[testTitleParts.length - 1] || "Unnamed Test";
    // Store both name and status for each test
    acc[workerId].tests.push({ name: testTitle, status: status });

    return acc;
  }, {});

  const workerIds = Object.keys(workerData).sort((a, b) => {
    if (a === "N/A") return 1;
    if (b === "N/A") return -1;
    return parseInt(a, 10) - parseInt(b, 10);
  });

  if (workerIds.length === 0) {
    return '&lt;div class="no-data"&gt;Could not determine worker distribution from test data.&lt;/div&gt;';
  }

  const chartId = `workerDistChart-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const renderFunctionName = `renderWorkerDistChart_${chartId.replace(
    /-/g,
    "_"
  )}`;
  const modalJsNamespace = `modal_funcs_${chartId.replace(/-/g, "_")}`;

  // The categories now just need the name for the axis labels
  const categories = workerIds.map((id) => `Worker ${id}`);

  // We pass the full data separately to the script
  const fullWorkerData = workerIds.map((id) => ({
    id: id,
    name: `Worker ${id}`,
    tests: workerData[id].tests,
  }));

  const passedData = workerIds.map((id) => workerData[id].passed);
  const failedData = workerIds.map((id) => workerData[id].failed);
  const skippedData = workerIds.map((id) => workerData[id].skipped);

  const categoriesString = JSON.stringify(categories);
  const fullDataString = JSON.stringify(fullWorkerData);
  const seriesString = JSON.stringify([
    { name: "Passed", data: passedData, color: "var(--success-color)" },
    { name: "Failed", data: failedData, color: "var(--danger-color)" },
    { name: "Skipped", data: skippedData, color: "var(--warning-color)" },
  ]);

  // The HTML now includes the chart container, the modal, and styles for the modal
  return `
    &lt;style&gt;
      .worker-modal-overlay {
        position: fixed; z-index: 1050; left: 0; top: 0; width: 100%; height: 100%;
        overflow: auto; background-color: rgba(0,0,0,0.6);
        display: none; align-items: center; justify-content: center;
      }
      .worker-modal-content {
        background-color: #3d4043;
        color: var(--card-background-color);
        margin: auto; padding: 20px; border: 1px solid var(--border-color, #888);
        width: 80%; max-width: 700px; border-radius: 8px;
        position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
      }
      .worker-modal-close {
        position: absolute; top: 10px; right: 20px;
        font-size: 28px; font-weight: bold; cursor: pointer;
        line-height: 1;
      }
      .worker-modal-close:hover, .worker-modal-close:focus {
        color: var(--text-color, #000);
      }
      #worker-modal-body-${chartId} ul {
        list-style-type: none; padding-left: 0; margin-top: 15px; max-height: 45vh; overflow-y: auto;
      }
       #worker-modal-body-${chartId} li {
         padding: 8px 5px; border-bottom: 1px solid var(--border-color, #eee);
         font-size: 0.9em;
      }
       #worker-modal-body-${chartId} li:last-child {
         border-bottom: none;
      }
       #worker-modal-body-${chartId} li &gt; span {
         display: inline-block;
         width: 70px;
         font-weight: bold;
         text-align: right;
         margin-right: 10px;
      }
    &lt;/style&gt;

    &lt;div id="${chartId}" class="trend-chart-container lazy-load-chart" data-render-function-name="${renderFunctionName}" style="min-height: 350px;"&gt;
      &lt;div class="no-data"&gt;Loading Worker Distribution Chart...&lt;/div&gt;
    &lt;/div&gt;

    &lt;div id="worker-modal-${chartId}" class="worker-modal-overlay"&gt;
      &lt;div class="worker-modal-content"&gt;
        &lt;span class="worker-modal-close"&gt;×&lt;/span&gt;
        &lt;h3 id="worker-modal-title-${chartId}" style="text-align: center; margin-top: 0; margin-bottom: 25px; font-size: 1.25em; font-weight: 600; color: #fff"&gt;&lt;/h3&gt;
        &lt;div id="worker-modal-body-${chartId}"&gt;&lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;

    &lt;script&gt;
      // Namespace for modal functions to avoid global scope pollution
      window.${modalJsNamespace} = {};

      window.${renderFunctionName} = function() {
        const chartContainer = document.getElementById('${chartId}');
        if (!chartContainer) { console.error("Chart container ${chartId} not found."); return; }

        // --- Modal Setup ---
        const modal = document.getElementById('worker-modal-${chartId}');
        const modalTitle = document.getElementById('worker-modal-title-${chartId}');
        const modalBody = document.getElementById('worker-modal-body-${chartId}');
        const closeModalBtn = modal.querySelector('.worker-modal-close');

        window.${modalJsNamespace}.open = function(worker) {
          if (!worker) return;
          modalTitle.textContent = 'Test Details for ' + worker.name;

          let testListHtml = '&lt;ul&gt;';
          if (worker.tests && worker.tests.length &gt; 0) {
            worker.tests.forEach(test => {
                let color = 'inherit';
                if (test.status === 'passed') color = 'var(--success-color)';
                else if (test.status === 'failed') color = 'var(--danger-color)';
                else if (test.status === 'skipped') color = 'var(--warning-color)';

                const escapedName = test.name.replace(/&/g, '&amp;').replace(/&lt;/g, '&lt;').replace(/&gt;/g, '&gt;');
                testListHtml += `&lt;li style="color: \${color};"&gt;&lt;span style="color: \${color}"&gt;[\${test.status.toUpperCase()}]&lt;/span&gt; \${escapedName}&lt;/li&gt;`;
            });
          } else {
            testListHtml += '&lt;li&gt;No detailed test data available for this worker.&lt;/li&gt;';
          }
          testListHtml += '&lt;/ul&gt;';

          modalBody.innerHTML = testListHtml;
          modal.style.display = 'flex';
        };

        const closeModal = function() {
          modal.style.display = 'none';
        };

        closeModalBtn.onclick = closeModal;
        modal.onclick = function(event) {
          // Close if clicked on the dark overlay background
          if (event.target == modal) {
            closeModal();
          }
        };


        // --- Highcharts Setup ---
        if (typeof Highcharts !== 'undefined') {
          try {
            chartContainer.innerHTML = '';
            const fullData = ${fullDataString};

            const chartOptions = {
              chart: { type: 'bar', height: 350, backgroundColor: 'transparent' },
              title: { text: null },
              xAxis: {
                categories: ${categoriesString},
                title: { text: 'Worker ID' },
                labels: { style: { color: 'var(--text-color-secondary)' }}
              },
              yAxis: {
                min: 0,
                title: { text: 'Number of Tests' },
                labels: { style: { color: 'var(--text-color-secondary)' }},
                stackLabels: { enabled: true, style: { fontWeight: 'bold', color: 'var(--text-color)' } }
              },
              legend: { reversed: true, itemStyle: { fontSize: "12px", color: 'var(--text-color)' } },
              plotOptions: {
                series: {
                  stacking: 'normal',
                  cursor: 'pointer',
                  point: {
                    events: {
                      click: function () {
                        // 'this.x' is the index of the category
                        const workerData = fullData[this.x];
                        window.${modalJsNamespace}.open(workerData);
                      }
                    }
                  }
                }
              },
              tooltip: {
                shared: true,
                headerFormat: '&lt;b&gt;{point.key}&lt;/b&gt; (Click for details)&lt;br/&gt;',
                pointFormat: '&lt;span style="color:{series.color}"&gt;●&lt;/span&gt; {series.name}: &lt;b&gt;{point.y}&lt;/b&gt;&lt;br/&gt;',
                footerFormat: 'Total: &lt;b&gt;{point.total}&lt;/b&gt;'
              },
              series: ${seriesString},
              credits: { enabled: false }
            };
            Highcharts.chart('${chartId}', chartOptions);
          } catch (e) {
            console.error("Error rendering chart ${chartId}:", e);
            chartContainer.innerHTML = '&lt;div class="no-data"&gt;Error rendering worker distribution chart.&lt;/div&gt;';
          }
        } else {
          chartContainer.innerHTML = '&lt;div class="no-data"&gt;Charting library not available for worker distribution.&lt;/div&gt;';
        }
      };
    &lt;/script&gt;
  `;
}
const infoTooltip = `
  &lt;span class="info-tooltip" style="display: inline-block; margin-left: 8px;"&gt;
    &lt;span class="info-icon" 
          style="cursor: pointer; font-size: 1.25rem;"
          onclick="window.workerInfoPrompt()"&gt;ℹ️&lt;/span&gt;
  &lt;/span&gt;
  &lt;script&gt;
    window.workerInfoPrompt = function() {
      const message = 'Why is worker -1 special?\\n\\n' +
                     'Playwright assigns skipped tests to worker -1 because:\\n' +
                     '1. They don\\'t require browser execution\\n' +
                     '2. This keeps real workers focused on actual tests\\n' +
                     '3. Maintains clean reporting\\n\\n' +
                     'This is an intentional optimization by Playwright.';
      alert(message);
    }
  &lt;/script&gt;
`;
function generateTestHistoryContent(trendData) {
  if (
    !trendData ||
    !trendData.testRuns ||
    Object.keys(trendData.testRuns).length === 0
  ) {
    return '&lt;div class="no-data"&gt;No historical test data available.&lt;/div&gt;';
  }

  const allTestNamesAndPaths = new Map();
  Object.values(trendData.testRuns).forEach((run) => {
    if (Array.isArray(run)) {
      run.forEach((test) => {
        if (test && test.testName && !allTestNamesAndPaths.has(test.testName)) {
          const parts = test.testName.split(" &gt; ");
          const title = parts[parts.length - 1];
          allTestNamesAndPaths.set(test.testName, title);
        }
      });
    }
  });

  if (allTestNamesAndPaths.size === 0) {
    return '&lt;div class="no-data"&gt;No historical test data found after processing.&lt;/div&gt;';
  }

  const testHistory = Array.from(allTestNamesAndPaths.entries())
    .map(([fullTestName, testTitle]) => {
      const history = [];
      (trendData.overall || []).forEach((overallRun, index) => {
        const runKey = overallRun.runId
          ? `test run ${overallRun.runId}`
          : `test run ${index + 1}`;
        const testRunForThisOverallRun = trendData.testRuns[runKey]?.find(
          (t) => t && t.testName === fullTestName
        );
        if (testRunForThisOverallRun) {
          history.push({
            runId: overallRun.runId || index + 1,
            status: testRunForThisOverallRun.status || "unknown",
            duration: testRunForThisOverallRun.duration || 0,
            timestamp:
              testRunForThisOverallRun.timestamp ||
              overallRun.timestamp ||
              new Date(),
          });
        }
      });
      return { fullTestName, testTitle, history };
    })
    .filter((item) => item.history.length > 0);

  return `
    &lt;div class="test-history-container"&gt;
      &lt;div class="filters" style="border-color: black; border-style: groove;"&gt;
    &lt;input type="text" id="history-filter-name" placeholder="Search by test title..." style="border-color: black; border-style: outset;"&gt;
    &lt;select id="history-filter-status"&gt;
        &lt;option value=""&gt;All Statuses&lt;/option&gt;
        &lt;option value="passed"&gt;Passed&lt;/option&gt;
        &lt;option value="failed"&gt;Failed&lt;/option&gt;
        &lt;option value="skipped"&gt;Skipped&lt;/option&gt;
    &lt;/select&gt;
    &lt;button id="clear-history-filters" class="clear-filters-btn"&gt;Clear Filters&lt;/button&gt;
&lt;/div&gt;
      
      &lt;div class="test-history-grid"&gt;
        ${testHistory
          .map((test) => {
            const latestRun =
              test.history.length > 0
                ? test.history[test.history.length - 1]
                : { status: "unknown" };
            return `
            &lt;div class="test-history-card" data-test-name="${sanitizeHTML(
              test.testTitle.toLowerCase()
            )}" data-latest-status="${latestRun.status}"&gt;
              &lt;div class="test-history-header"&gt;
                &lt;p title="${sanitizeHTML(test.testTitle)}"${capitalize(
              sanitizeHTML(test.testTitle)
            )}&lt;/p&gt;
                &lt;span class="status-badge ${getStatusClass(latestRun.status)}"${String(latestRun.status).toUpperCase()}&lt;/span&gt;
              &lt;/div&gt;
              &lt;div class="test-history-trend"&gt;
                ${generateTestHistoryChart(test.history)} 
              &lt;/div&gt;
              &lt;details class="test-history-details-collapsible"&gt;
                &lt;summary&gt;Show Run Details (${test.history.length})&lt;/summary&gt;
                &lt;div class="test-history-details"&gt;
                  &lt;table&gt;
                    &lt;thead&gt;&lt;tr&gt;&lt;th&gt;Run&lt;/th&gt;&lt;th&gt;Status&lt;/th&gt;&lt;th&gt;Duration&lt;/th&gt;&lt;th&gt;Date&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;
                    &lt;tbody&gt;
                      ${test.history
                        .slice()
                        .reverse()
                        .map(
                          (run) => `
                        &lt;tr&gt;
                          &lt;td&gt;${run.runId}&lt;/td&gt;
                          &lt;td&gt;&lt;span class="status-badge-small ${getStatusClass(
                            run.status
                          )}"${String(run.status).toUpperCase()}&lt;/span&gt;&lt;/td&gt;
                          &lt;td&gt;${formatDuration(run.duration)}&lt;/td&gt;
                          &lt;td&gt;${formatDate(run.timestamp)}&lt;/td&gt;
                        &lt;/tr&gt;`
                        )
                        .join("")}
                    &lt;/tbody&gt;
                  &lt;/table&gt;
                &lt;/div&gt;
              &lt;/details&gt;
            &lt;/div&gt;`;
          })
          .join("")}
      &lt;/div&gt;
    &lt;/div&gt;
  `;
}
function getStatusClass(status) {
  switch (String(status).toLowerCase()) {
    case "passed":
      return "status-passed";
    case "failed":
      return "status-failed";
    case "skipped":
      return "status-skipped";
    default:
      return "status-unknown";
  }
}
function getStatusIcon(status) {
  switch (String(status).toLowerCase()) {
    case "passed":
      return "✅";
    case "failed":
      return "❌";
    case "skipped":
      return "⏭️";
    default:
      return "❓";
  }
}
function getSuitesData(results) {
  const suitesMap = new Map();
  if (!results || results.length === 0) return [];

  results.forEach((test) => {
    const browser = test.browser || "unknown";
    const suiteParts = test.name.split(" &gt; ");
    let suiteNameCandidate = "Default Suite";
    if (suiteParts.length > 2) {
      suiteNameCandidate = suiteParts[1];
    } else if (suiteParts.length > 1) {
      suiteNameCandidate = suiteParts[0]
        .split(path.sep)
        .pop()
        .replace(/\.(spec|test)\.(ts|js|mjs|cjs)$/, "");
    } else {
      suiteNameCandidate = test.name
        .split(path.sep)
        .pop()
        .replace(/\.(spec|test)\.(ts|js|mjs|cjs)$/, "");
    }
    const suiteName = suiteNameCandidate;
    const key = `${suiteName}|${browser}`;

    if (!suitesMap.has(key)) {
      suitesMap.set(key, {
        id: test.id || key,
        name: suiteName,
        browser: browser,
        passed: 0,
        failed: 0,
        skipped: 0,
        count: 0,
        statusOverall: "passed",
      });
    }
    const suite = suitesMap.get(key);
    suite.count++;
    const currentStatus = String(test.status).toLowerCase();
    if (currentStatus && suite[currentStatus] !== undefined) {
      suite[currentStatus]++;
    }
    if (currentStatus === "failed") suite.statusOverall = "failed";
    else if (currentStatus === "skipped" && suite.statusOverall !== "failed")
      suite.statusOverall = "skipped";
  });
  return Array.from(suitesMap.values());
}
function getAttachmentIcon(contentType) {
  if (!contentType) return "📎"; // Handle undefined/null

  const normalizedType = contentType.toLowerCase();

  if (normalizedType.includes("pdf")) return "📄";
  if (normalizedType.includes("json")) return "{ }";
  if (/html/.test(normalizedType)) return "🌐"; // Fixed: regex for any HTML type
  if (normalizedType.includes("xml")) return "&lt;&gt;";
  if (normalizedType.includes("csv")) return "📊";
  if (normalizedType.startsWith("text/")) return "📝";
  return "📎";
}
function generateSuitesWidget(suitesData) {
  if (!suitesData || suitesData.length === 0) {
    return '&lt;div class="suites-widget"&gt;&lt;div class="suites-header"&gt;&lt;h2&gt;Test Suites&lt;/h2&gt;&lt;/div&gt;&lt;div class="no-data"&gt;No suite data available.&lt;/div&gt;&lt;/div&gt;';
  }
  return `
&lt;div class="suites-widget"&gt;
  &lt;div class="suites-header"&gt;
    &lt;h2&gt;Test Suites&lt;/h2&gt;
    &lt;span class="summary-badge"&gt;${
      suitesData.length
    } suites • ${suitesData.reduce(
    (sum, suite) => sum + suite.count,
    0
  )} tests&lt;/span&gt;
  &lt;/div&gt;
  &lt;div class="suites-grid"&gt;
    ${suitesData
      .map(
        (suite) => `
    &lt;div class="suite-card status-${suite.statusOverall}"&gt;
      &lt;div class="suite-card-header"&gt;
        &lt;h3 class="suite-name" title="${sanitizeHTML(
          suite.name
        )} (${sanitizeHTML(suite.browser)})"${sanitizeHTML(suite.name)}&lt;/h3&gt;
      &lt;/div&gt;
      &lt;div&gt;🖥️ &lt;span class="browser-tag"${sanitizeHTML(
        suite.browser
      )}&lt;/span&gt;&lt;/div&gt;
      &lt;div class="suite-card-body"&gt;
        &lt;span class="test-count"${
          suite.count !== 1 ? "s" : ""
        }&lt;/span&gt;
        &lt;div class="suite-stats"&gt;
            ${
              suite.passed > 0
                ? `&lt;span class="stat-passed" title="Passed"&gt;&lt;svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16"&gt;&lt;path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/&gt;&lt;/svg&gt; ${suite.passed}&lt;/span&gt;`
                : ""
            }
            ${
              suite.failed > 0
                ? `&lt;span class="stat-failed" title="Failed"&gt;&lt;svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16"&gt;&lt;path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8 7.293 5.354 4.646z"/&gt;&lt;/svg&gt; ${suite.failed}&lt;/span&gt;`
                : ""
            }
            ${
              suite.skipped > 0
                ? `&lt;span class="stat-skipped" title="Skipped"&gt;&lt;svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16"&gt;&lt;path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/&gt;&lt;/svg&gt; ${suite.skipped}&lt;/span&gt;`
                : ""
            }
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;`
      )
      .join("")}
  &lt;/div&gt;
&lt;/div&gt;`;
}
function generateAIFailureAnalyzerTab(results) {
  const failedTests = (results || []).filter(test => test.status === 'failed');

  if (failedTests.length === 0) {
    return `
      &lt;h2 class="tab-main-title"&gt;AI Failure Analysis&lt;/h2&gt;
      &lt;div class="no-data"&gt;Congratulations! No failed tests in this run.&lt;/div&gt;
    `;
  }

  // btoa is not available in Node.js environment, so we define a simple polyfill for it.
  const btoa = (str) => Buffer.from(str).toString('base64');

  return `
    &lt;h2 class="tab-main-title"&gt;AI Failure Analysis&lt;/h2&gt;
    &lt;div class="ai-analyzer-stats"&gt;
        &lt;div class="stat-item"&gt;
            &lt;span class="stat-number"&gt;${failedTests.length}&lt;/span&gt;
            &lt;span class="stat-label"&gt;Failed Tests&lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="stat-item"&gt;
            &lt;span class="stat-number"&gt;${new Set(failedTests.map(t => t.browser)).size}&lt;/span&gt;
            &lt;span class="stat-label"&gt;Browsers&lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="stat-item"&gt;
            &lt;span class="stat-number"&gt;${(Math.round(failedTests.reduce((sum, test) => sum + (test.duration || 0), 0) / 1000))}s&lt;/span&gt;
            &lt;span class="stat-label"&gt;Total Duration&lt;/span&gt;
        &lt;/div&gt;
    &lt;/div&gt;
    &lt;p class="ai-analyzer-description"&gt;
        Analyze failed tests using AI to get suggestions and potential fixes. Click the AI Fix button for specific failed test.
    &lt;/p&gt;
    
    &lt;div class="compact-failure-list"&gt;
      ${failedTests.map(test => {
    const testTitle = test.name.split(" &gt; ").pop() || "Unnamed Test";
    const testJson = btoa(JSON.stringify(test)); // Base64 encode the test object
    const truncatedError = (test.errorMessage || "No error message").slice(0, 150) +
      (test.errorMessage && test.errorMessage.length > 150 ? "..." : "");

    return `
        &lt;div class="compact-failure-item"&gt;
            &lt;div class="failure-header"&gt;
                &lt;div class="failure-main-info"&gt;
                    &lt;h3 class="failure-title" title="${sanitizeHTML(test.name)}"${sanitizeHTML(testTitle)}&lt;/h3&gt;
                    &lt;div class="failure-meta"&gt;
                        &lt;span class="browser-indicator"${sanitizeHTML(test.browser || 'unknown')}&lt;/span&gt;
                        &lt;span class="duration-indicator"${formatDuration(test.duration)}&lt;/span&gt;
                    &lt;/div&gt;
                &lt;/div&gt;
                &lt;button class="compact-ai-btn" onclick="getAIFix(this)" data-test-json="${testJson}"&gt;
                    &lt;span class="ai-text"&gt;AI Fix&lt;/span&gt;
                &lt;/button&gt;
            &lt;/div&gt;
            &lt;div class="failure-error-preview"&gt;
                &lt;div class="error-snippet"${formatPlaywrightError(truncatedError)}&lt;/div&gt;
                &lt;button class="expand-error-btn" onclick="toggleErrorDetails(this)"&gt;
                    &lt;span class="expand-text"&gt;Show Full Error&lt;/span&gt;
                    &lt;span class="expand-icon"&gt;▼&lt;/span&gt;
                &lt;/button&gt;
            &lt;/div&gt;
            &lt;div class="full-error-details" style="display: none;"&gt;
                &lt;div class="full-error-content"&gt;
                    ${formatPlaywrightError(test.errorMessage || "No detailed error message available")}
                &lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
        `
  }).join('')}
    &lt;/div&gt;

    &lt;!-- AI Fix Modal --&gt;
    &lt;div id="ai-fix-modal" class="ai-modal-overlay" onclick="closeAiModal()"&gt;
      &lt;div class="ai-modal-content" onclick="event.stopPropagation()"&gt;
        &lt;div class="ai-modal-header"&gt;
            &lt;h3 id="ai-fix-modal-title"&gt;AI Analysis&lt;/h3&gt;
            &lt;span class="ai-modal-close" onclick="closeAiModal()"&gt;×&lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="ai-modal-body" id="ai-fix-modal-content"&gt;
            &lt;!-- Content will be injected by JavaScript --&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  `;
}
/**
 * Generates the HTML report with lazy loading for tabs and test details.
 * @param {object} reportData - The data for the report.
 * @param {object} trendData - The data for the trend chart.
 * @returns {string} The HTML report.
 */
function generateHTML(reportData, trendData = null) {
  const { run, results } = reportData;
  const suitesData = getSuitesData(reportData.results || []);
  const runSummary = run || {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    timestamp: new Date().toISOString(),
  };

  // Prepare data for client-side rendering
  const pulseData = {
    runSummary,
    results: results || [],
    suitesData,
    trendData: trendData || { overall: [], testRuns: {} },
    pieData: [
      { label: "Passed", value: runSummary.passed },
      { label: "Failed", value: runSummary.failed },
      { label: "Skipped", value: runSummary.skipped || 0 },
    ]
  };
  
  // Helper function to generate test details HTML (will be used client-side)
  const generateTestDetailsHTMLFunction = `
    function generateTestDetailsHTML(testIndex) {
      const test = window._pulseData.results[testIndex];
      if (!test) return '&lt;div class="no-data"&gt;Test data not found.&lt;/div&gt;';
      
      const browser = test.browser || "unknown";
      
      const generateStepsHTML = (steps, depth = 0) => {
        if (!steps || steps.length === 0)
          return "&lt;div class='no-steps'&gt;No steps recorded for this test.&lt;/div&gt;";
        return steps.map((step) => {
          const hasNestedSteps = step.steps && step.steps.length > 0;
          const isHook = step.hookType;
          const stepClass = isHook ? \`step-hook step-hook-\${step.hookType}\` : "";
          const hookIndicator = isHook ? \` (\${step.hookType} hook)\` : "";
          return \`&lt;div class="step-item" style="--depth: \${depth};"&gt;
            &lt;div class="step-header \${stepClass}" role="button" aria-expanded="false"&gt;
              &lt;span class="step-icon"&gt;\${getStatusIcon(step.status)}&lt;/span&gt;
              &lt;span class="step-title"&gt;\${sanitizeHTML(step.title)}\${hookIndicator}&lt;/span&gt;
              &lt;span class="step-duration"&gt;\${formatDuration(step.duration)}&lt;/span&gt;
            &lt;/div&gt;
            &lt;div class="step-details" style="display: none;"&gt;
              \${step.codeLocation ? \`&lt;div class="step-info code-section"&gt;&lt;strong&gt;Location:&lt;/strong&gt; \${sanitizeHTML(step.codeLocation)}&lt;/div&gt;\` : ""}
              \${step.errorMessage ? \`&lt;div class="test-error-summary"&gt;
                \${step.stackTrace ? \`&lt;div class="stack-trace"&gt;\${formatPlaywrightError(step.stackTrace)}&lt;/div&gt;\` : ""}
                &lt;button class="copy-error-btn" onclick="copyErrorToClipboard(this)"&gt;Copy Error Prompt&lt;/button&gt;
              &lt;/div&gt;\` : ""}
              \${hasNestedSteps ? \`&lt;div class="nested-steps"&gt;\${generateStepsHTML(step.steps, depth + 1)}&lt;/div&gt;\` : ""}
            &lt;/div&gt;
          &lt;/div&gt;\`;
        }).join("");
      };
      
      let html = \`
        &lt;p&gt;&lt;strong&gt;Full Path:&lt;/strong&gt; \${sanitizeHTML(test.name)}&lt;/p&gt;
        &lt;p&gt;&lt;strong&gt;Test run Worker ID:&lt;/strong&gt; \${sanitizeHTML(test.workerId)} 
           [&lt;strong&gt;Total No. of Workers:&lt;/strong&gt; \${sanitizeHTML(test.totalWorkers)}]&lt;/p&gt;
        \${test.errorMessage ? \`&lt;div class="test-error-summary"&gt;
          \${formatPlaywrightError(test.errorMessage)}
          &lt;button class="copy-error-btn" onclick="copyErrorToClipboard(this)"&gt;Copy Error Prompt&lt;/button&gt;
        &lt;/div&gt;\` : ""}
        \${test.snippet ? \`&lt;div class="code-section"&gt;&lt;h4&gt;Error Snippet&lt;/h4&gt;
          &lt;pre&gt;&lt;code&gt;\${formatPlaywrightError(test.snippet)}&lt;/code&gt;&lt;/pre&gt;&lt;/div&gt;\` : ""}
        &lt;h4&gt;Steps&lt;/h4&gt;
        &lt;div class="steps-list"&gt;\${generateStepsHTML(test.steps)}&lt;/div&gt;
      \`;
      
      // Add stdout if exists
      if (test.stdout && test.stdout.length > 0) {
        const logId = \`stdout-log-\${test.id || testIndex}\`;
        html += \`&lt;div class="console-output-section"&gt;
          &lt;h4&gt;Console Output (stdout)
            &lt;button class="copy-btn" onclick="copyLogContent('\${logId}', this)"&gt;Copy Console&lt;/button&gt;
          &lt;/h4&gt;
          &lt;div class="log-wrapper"&gt;
            &lt;pre id="\${logId}" class="console-log stdout-log" style="background-color: #2d2d2d; color: wheat; padding: 1.25em; border-radius: 0.85em; line-height: 1.2;"&gt;
              \${formatPlaywrightError(test.stdout.map(line => sanitizeHTML(line)).join("\\n"))}
            &lt;/pre&gt;
          &lt;/div&gt;
        &lt;/div&gt;\`;
      }
      
      // Add stderr if exists
      if (test.stderr && test.stderr.length > 0) {
        html += \`&lt;div class="console-output-section"&gt;
          &lt;h4&gt;Console Output (stderr)&lt;/h4&gt;
          &lt;pre class="console-log stderr-log"&gt;\${test.stderr.map(line => sanitizeHTML(line)).join("\\n")}&lt;/pre&gt;
        &lt;/div&gt;\`;
      }
      
      // Add screenshots - these are already base64 encoded in the data
      if (test.screenshots && test.screenshots.length > 0) {
        html += \`&lt;div class="attachments-section"&gt;
          &lt;h4&gt;Screenshots&lt;/h4&gt;
          &lt;div class="attachments-grid"&gt;
            \${test.screenshots.map((screenshot, index) => \`
              &lt;div class="attachment-item"&gt;
                &lt;img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" 
                     data-src="\${screenshot}" 
                     alt="Screenshot \${index + 1}" 
                     class="lazy-load-image"&gt;
                &lt;div class="attachment-info"&gt;
                  &lt;div class="trace-actions"&gt;
                    &lt;a href="\${screenshot}" target="_blank" download="screenshot-\${index}.png"&gt;Download&lt;/a&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            \`).join("")}
          &lt;/div&gt;
        &lt;/div&gt;\`;
      }
      
      // Add videos
      if (test.videoPath && test.videoPath.length > 0) {
        html += \`&lt;div class="attachments-section"&gt;
          &lt;h4&gt;Videos&lt;/h4&gt;
          &lt;div class="attachments-grid"&gt;
            \${test.videoPath.map((video, index) => \`
              &lt;div class="attachment-item video-item"&gt;
                &lt;video controls preload="none" class="lazy-load-video"&gt;
                  &lt;source data-src="\${video.dataUri}" type="\${video.mimeType}"&gt;
                &lt;/video&gt;
                &lt;div class="attachment-info"&gt;
                  &lt;div class="trace-actions"&gt;
                    &lt;a href="\${video.dataUri}" target="_blank" download="video-\${index}.\${video.extension}"&gt;Download&lt;/a&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            \`).join("")}
          &lt;/div&gt;
        &lt;/div&gt;\`;
      }
      
      // Add trace file
      if (test.tracePath) {
        html += \`&lt;div class="attachments-section"&gt;
          &lt;h4&gt;Trace File&lt;/h4&gt;
          &lt;div class="attachments-grid"&gt;
            &lt;div class="attachment-item generic-attachment"&gt;
              &lt;div class="attachment-icon"&gt;📄&lt;/div&gt;
              &lt;div class="attachment-caption"&gt;
                &lt;span class="attachment-name"&gt;trace.zip&lt;/span&gt;
              &lt;/div&gt;
              &lt;div class="attachment-info"&gt;
                &lt;div class="trace-actions"&gt;
                  &lt;a href="#" data-href="\${test.tracePath}" class="lazy-load-attachment" download="trace.zip"&gt;Download Trace&lt;/a&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;\`;
      }
      
      // Add other attachments
      if (test.attachments && test.attachments.length > 0) {
        html += \`&lt;div class="attachments-section"&gt;
          &lt;h4&gt;Other Attachments&lt;/h4&gt;
          &lt;div class="attachments-grid"&gt;
            \${test.attachments.map(attachment => \`
              &lt;div class="attachment-item generic-attachment"&gt;
                &lt;div class="attachment-icon"&gt;\${getAttachmentIcon(attachment.contentType)}&lt;/div&gt;
                &lt;div class="attachment-caption"&gt;
                  &lt;span class="attachment-name" title="\${sanitizeHTML(attachment.name)}"\${sanitizeHTML(attachment.name)}&lt;/span&gt;
                  &lt;span class="attachment-type"&gt;\${sanitizeHTML(attachment.contentType)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div class="attachment-info"&gt;
                  &lt;div class="trace-actions"&gt;
                    &lt;a href="\${attachment.dataUri}" target="_blank" class="view-full"&gt;View&lt;/a&gt;
                    &lt;a href="\${attachment.dataUri}" download="\${sanitizeHTML(attachment.name)}"\&gt;Download&lt;/a&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            \`).join("")}
          &lt;/div&gt;
        &lt;/div&gt;\`;
      }
      
      // Add code snippet if exists
      if (test.codeSnippet) {
        html += \`&lt;div class="code-section"&gt;
          &lt;h4&gt;Code Snippet&lt;/h4&gt;
          &lt;pre&gt;&lt;code&gt;\${sanitizeHTML(test.codeSnippet)}&lt;/code&gt;&lt;/pre&gt;
        &lt;/div&gt;\`;
      }
      
      return html;
    }
  `;
  // Process attachments to base64 for embedding in JSON
  const processedResults = (results || []).map(test => {
    const processed = { ...test };
    
    // Process screenshots
    if (test.screenshots && test.screenshots.length > 0) {
      processed.screenshots = test.screenshots.map(screenshotPath => {
        try {
          const imagePath = path.resolve(DEFAULT_OUTPUT_DIR, screenshotPath);
          if (!fsExistsSync(imagePath)) return null;
          const base64ImageData = readFileSync(imagePath).toString("base64");
          return `data:image/png;base64,${base64ImageData}`;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }
    
    // Process videos
    if (test.videoPath && test.videoPath.length > 0) {
      processed.videoPath = test.videoPath.map(videoPath => {
        try {
          const videoFilePath = path.resolve(DEFAULT_OUTPUT_DIR, videoPath);
          if (!fsExistsSync(videoFilePath)) return null;
          const videoBase64 = readFileSync(videoFilePath).toString("base64");
          const fileExtension = path.extname(videoPath).slice(1).toLowerCase();
          const mimeType = {
            mp4: "video/mp4",
            webm: "video/webm",
            ogg: "video/ogg",
            mov: "video/quicktime",
            avi: "video/x-msvideo",
          }[fileExtension] || "video/mp4";
          return {
            dataUri: `data:\${mimeType};base64,${videoBase64}`,
            mimeType,
            extension: fileExtension
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }
    
    // Process trace
    if (test.tracePath) {
      try {
        const traceFilePath = path.resolve(DEFAULT_OUTPUT_DIR, test.tracePath);
        if (fsExistsSync(traceFilePath)) {
          const traceBase64 = readFileSync(traceFilePath).toString("base64");
          processed.tracePath = `data:application/zip;base64,${traceBase64}`;
        }
      } catch (e) {
        processed.tracePath = null;
      }
    }
    
    // Process other attachments
    if (test.attachments && test.attachments.length > 0) {
      processed.attachments = test.attachments.map(attachment => {
        try {
          const attachmentPath = path.resolve(DEFAULT_OUTPUT_DIR, attachment.path);
          if (!fsExistsSync(attachmentPath)) return null;
          const attachmentBase64 = readFileSync(attachmentPath).toString("base64");
          return {
            ...attachment,
            dataUri: `data:\${attachment.contentType};base64,${attachmentBase64}`
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }
    
    return processed;
  });

  pulseData.results = processedResults;

  // Generate server-side tab content strings
  const dashboardHTML = generateDashboardTabHTML(pulseData);
  const testRunSummaryHTML = generateTestRunSummaryTabHTML(pulseData);
  const aiFailureAnalyzerHTML = generateAIFailureAnalyzerTab(pulseData.results);
  
  // Create an object to hold the pre-rendered tab contents
  const tabContents = {
    dashboard: dashboardHTML,
    'test-runs': testRunSummaryHTML,
    'ai-failure-analyzer': aiFailureAnalyzerHTML
  };
  return `
&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;link rel="icon" type="image/png" href="https://i.postimg.cc/v817w4sg/logo.png"&gt;
    &lt;link rel="apple-touch-icon" href="https://i.postimg.cc/v817w4sg/logo.png"&gt;
    &lt;script src="https://code.highcharts.com/highcharts.js" defer&gt;&lt;/script&gt;
    &lt;title&gt;Playwright Pulse Report (Static Report)&lt;/title&gt;
    &lt;style&gt;
        :root { 
          --primary-color: #3f51b5; --secondary-color: #ff4081; --accent-color: #673ab7; --accent-color-alt: #FF9800;
          --success-color: #4CAF50; --danger-color: #F44336; --warning-color: #FFC107; --info-color: #2196F3;
          --light-gray-color: #f5f5f5; --medium-gray-color: #e0e0e0; --dark-gray-color: #757575;
          --text-color: #333; --text-color-secondary: #555; --border-color: #ddd; --background-color: #f8f9fa;
          --card-background-color: #fff; --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          --border-radius: 8px; --box-shadow: 0 5px 15px rgba(0,0,0,0.08); --box-shadow-light: 0 3px 8px rgba(0,0,0,0.05); --box-shadow-inset: inset 0 1px 3px rgba(0,0,0,0.07);
        }
        .trend-chart-container, .test-history-trend div[id^="testHistoryChart-"] { min-height: 100px; }
        .lazy-load-chart .no-data, .lazy-load-chart .no-data-chart { display: flex; align-items: center; justify-content: center; height: 100%; font-style: italic; color: var(--dark-gray-color); }
        .highcharts-background { fill: transparent; }
        .highcharts-title, .highcharts-subtitle { font-family: var(--font-family); }
        .highcharts-axis-labels text, .highcharts-legend-item text { fill: var(--text-color-secondary) !important; font-size: 12px !important; }
        .highcharts-axis-title { fill: var(--text-color) !important; }
        .highcharts-tooltip &gt; span { background-color: rgba(10,10,10,0.92) !important; border-color: rgba(10,10,10,0.92) !important; color: #f5f5f5 !important; padding: 10px !important; border-radius: 6px !important; }
        body { font-family: var(--font-family); margin: 0; background-color: var(--background-color); color: var(--text-color); line-height: 1.65; font-size: 16px; }
        .container { padding: 30px; border-radius: var(--border-radius); box-shadow: var(--box-shadow); background: repeating-linear-gradient(#f1f8e9, #f9fbe7, #fce4ec); }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; padding-bottom: 25px; border-bottom: 1px solid var(--border-color); margin-bottom: 25px; }
        .header-title { display: flex; align-items: center; gap: 15px; }
        .header h1 { margin: 0; font-size: 1.85em; font-weight: 600; color: var(--primary-color); }
        #report-logo { height: 40px; width: 55px; }
        .run-info { font-size: 0.9em; text-align: right; color: var(--text-color-secondary); line-height:1.5;}
        .run-info strong { color: var(--text-color); }
        .tabs { display: flex; border-bottom: 2px solid var(--border-color); margin-bottom: 30px; overflow-x: auto; }
        .tab-button { padding: 15px 25px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 1.1em; font-weight: 600; color: black; transition: color 0.2s ease, border-color 0.2s ease; white-space: nowrap; }
        .tab-button:hover { color: var(--accent-color); }
        .tab-button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .tab-content { display: none; animation: fadeIn 0.4s ease-out; }
        .tab-content.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 22px; margin-bottom: 35px; }
        .summary-card { background-color: var(--card-background-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 22px; text-align: center; box-shadow: var(--box-shadow-light); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .summary-card:hover { transform: translateY(-5px); box-shadow: var(--box-shadow); }
        .summary-card h3 { margin: 0 0 10px; font-size: 1.05em; font-weight: 500; color: var(--text-color-secondary); }
        .summary-card .value { font-size: 2.4em; font-weight: 600; margin-bottom: 8px; }
        .summary-card .trend-percentage { font-size: 1em; color: var(--dark-gray-color); }
        .status-passed .value, .stat-passed svg { color: var(--success-color); }
        .status-failed .value, .stat-failed svg { color: var(--danger-color); }
        .status-skipped .value, .stat-skipped svg { color: var(--warning-color); }
        .dashboard-bottom-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 28px; align-items: stretch; }
        .pie-chart-wrapper, .suites-widget, .trend-chart { background-color: var(--card-background-color); padding: 28px; border-radius: var(--border-radius); box-shadow: var(--box-shadow-light); display: flex; flex-direction: column; }
        .pie-chart-wrapper h3, .suites-header h2, .trend-chart h3 { text-align: center; margin-top: 0; margin-bottom: 25px; font-size: 1.25em; font-weight: 600; color: var(--text-color); }
        .trend-chart-container, .pie-chart-wrapper div[id^="pieChart-"] { flex-grow: 1; min-height: 250px; }
        .status-badge-small-tooltip { padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-weight: 600; color: white; text-transform: uppercase; }
        .status-badge-small-tooltip.status-passed { background-color: var(--success-color); }
        .status-badge-small-tooltip.status-failed { background-color: var(--danger-color); }
        .status-badge-small-tooltip.status-skipped { background-color: var(--warning-color); }
        .status-badge-small-tooltip.status-unknown { background-color: var(--dark-gray-color); }
        .suites-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .summary-badge { background-color: var(--light-gray-color); color: var(--text-color-secondary); padding: 7px 14px; border-radius: 16px; font-size: 0.9em; }
        .suites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .suite-card { border: 1px solid var(--border-color); border-left-width: 5px; border-radius: calc(var(--border-radius) / 1.5); padding: 20px; background-color: var(--card-background-color); transition: box-shadow 0.2s ease, border-left-color 0.2s ease; }
        .suite-card:hover { box-shadow: var(--box-shadow); }
        .suite-card.status-passed { border-left-color: var(--success-color); }
        .suite-card.status-failed { border-left-color: var(--danger-color); }
        .suite-card.status-skipped { border-left-color: var(--warning-color); }
        .suite-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .suite-name { font-weight: 600; font-size: 1.05em; color: var(--text-color); margin-right: 10px; word-break: break-word;}
        .browser-tag { font-size: 0.8em; background-color: var(--medium-gray-color); color: var(--text-color-secondary); padding: 3px 8px; border-radius: 4px; white-space: nowrap;}
        .suite-card-body .test-count { font-size: 0.95em; color: var(--text-color-secondary); display: block; margin-bottom: 10px; }
        .suite-stats { display: flex; gap: 14px; font-size: 0.95em; align-items: center; }
        .suite-stats span { display: flex; align-items: center; gap: 6px; }
        .suite-stats svg { vertical-align: middle; font-size: 1.15em; }
        .filters { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 28px; padding: 20px; background-color: var(--light-gray-color); border-radius: var(--border-radius); box-shadow: var(--box-shadow-inset); border-color: black; border-style: groove; }
        .filters input, .filters select, .filters button { padding: 11px 15px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1em; }
        .filters input { flex-grow: 1; min-width: 240px;}
        .filters select {min-width: 180px;}
        .filters button { background-color: var(--primary-color); color: white; cursor: pointer; transition: background-color 0.2s ease, box-shadow 0.2s ease; border: none; }
        .filters button:hover { background-color: var(--accent-color); box-shadow: 0 2px 5px rgba(0,0,0,0.15);}
        .test-case { margin-bottom: 15px; border: 1px solid var(--border-color); border-radius: var(--border-radius); background-color: var(--card-background-color); box-shadow: var(--box-shadow-light); overflow: hidden; }
        .test-case-header { padding: 10px 15px; background-color: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid transparent; transition: background-color 0.2s ease; }
        .test-case-header:hover { background-color: #f4f6f8; } 
        .test-case-header[aria-expanded="true"] { border-bottom-color: var(--border-color); background-color: #f9fafb; }
        .test-case-summary { display: flex; align-items: center; gap: 14px; flex-grow: 1; flex-wrap: wrap;}
        .test-case-title { font-weight: 600; color: var(--text-color); font-size: 1em; }
        .test-case-browser { font-size: 0.9em; color: var(--text-color-secondary); }
        .test-case-meta { display: flex; align-items: center; gap: 12px; font-size: 0.9em; color: var(--text-color-secondary); flex-shrink: 0; }
        .test-duration { background-color: var(--light-gray-color); padding: 4px 10px; border-radius: 12px; font-size: 0.9em;}
        .status-badge { padding: 5px; border-radius: 6px; font-size: 0.8em; font-weight: 600; color: white; text-transform: uppercase; min-width: 70px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .status-badge.status-passed { background-color: var(--success-color); }
        .status-badge.status-failed { background-color: var(--danger-color); }
        .status-badge.status-skipped { background-color: var(--warning-color); }
        .status-badge.status-unknown { background-color: var(--dark-gray-color); }
        .tag { display: inline-block; background: linear-gradient( #fff, #333, #000); color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; margin-right: 6px; font-weight: 400; }
        .test-case-content { display: none; padding: 20px; border-top: 1px solid var(--border-color); background-color: #fcfdff; }
        .test-case-content h4 { margin-top: 22px; margin-bottom: 14px; font-size: 1.15em; color: var(--primary-color); }
        .test-case-content p { margin-bottom: 10px; font-size: 1em; }
        .test-error-summary { margin-bottom: 20px; padding: 14px; background-color: rgba(244,67,54,0.05); border: 1px solid rgba(244,67,54,0.2); border-left: 4px solid var(--danger-color); border-radius: 4px; }
        .test-error-summary h4 { color: var(--danger-color); margin-top:0;}
        .test-error-summary pre { white-space: pre-wrap; word-break: break-all; color: var(--danger-color); font-size: 0.95em;}
        .steps-list { margin: 18px 0; }
        .step-item { margin-bottom: 8px; padding-left: calc(var(--depth, 0) * 28px); } 
        .step-header { display: flex; align-items: center; cursor: pointer; padding: 10px 14px; border-radius: 6px; background-color: #fff; border: 1px solid var(--light-gray-color); transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .step-header:hover { background-color: #f0f2f5; border-color: var(--medium-gray-color); box-shadow: var(--box-shadow-inset); }
        .step-icon { margin-right: 12px; width: 20px; text-align: center; font-size: 1.1em; }
        .step-title { flex: 1; font-size: 1em; }
        .step-duration { color: var(--dark-gray-color); font-size: 0.9em; }
        .step-details { display: none; padding: 14px; margin-top: 8px; background: #fdfdfd; border-radius: 6px; font-size: 0.95em; border: 1px solid var(--light-gray-color); }
        .step-info { margin-bottom: 8px; }
        .test-error-summary { color: var(--danger-color); margin-top: 12px; padding: 14px; background: rgba(244,67,54,0.05); border-radius: 4px; font-size: 0.95em; border-left: 3px solid var(--danger-color); }
        .test-error-summary pre.stack-trace { margin-top: 10px; padding: 12px; background-color: rgba(0,0,0,0.03); border-radius: 4px; font-size:0.9em; max-height: 280px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }
        .step-hook { background-color: rgba(33,150,243,0.04); border-left: 3px solid var(--info-color) !important; } 
        .step-hook .step-title { font-style: italic; color: var(--info-color)}
        .nested-steps { margin-top: 12px; }
        .attachments-section { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--light-gray-color); }
        .attachments-section h4 { margin-top: 0; margin-bottom: 20px; font-size: 1.1em; color: var(--text-color); }
        .attachments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 22px; }
        .attachment-item { border: 1px solid var(--border-color); border-radius: var(--border-radius); background-color: #fff; box-shadow: var(--box-shadow-light); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease-out, box-shadow 0.2s ease-out; }
        .attachment-item:hover { transform: translateY(-4px); box-shadow: var(--box-shadow); }
        .attachment-item img, .attachment-item video { width: 100%; height: 180px; object-fit: cover; display: block; background-color: #eee; border-bottom: 1px solid var(--border-color); transition: opacity 0.3s ease; }
        .attachment-info { padding: 12px; margin-top: auto; background-color: #fafafa;}
        .attachment-item a:hover img { opacity: 0.85; }
        .attachment-caption { padding: 12px 15px; font-size: 0.9em; text-align: center; color: var(--text-color-secondary); word-break: break-word; background-color: var(--light-gray-color); }
        .video-item a, .trace-item a { display: block; margin-bottom: 8px; color: var(--primary-color); text-decoration: none; font-weight: 500; }
        .video-item a:hover, .trace-item a:hover { text-decoration: underline; }
        .code-section pre { background-color: #2d2d2d; color: #f0f0f0; padding: 20px; border-radius: 6px; overflow-x: auto; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 0.95em; line-height:1.6;}
        .trend-charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 28px; margin-bottom: 35px; }
        .test-history-container h2.tab-main-title { font-size: 1.6em; margin-bottom: 18px; color: var(--primary-color); border-bottom: 1px solid var(--border-color); padding-bottom: 12px;}
        .test-history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 22px; margin-top: 22px; }
        .test-history-card { background: var(--card-background-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 22px; box-shadow: var(--box-shadow-light); display: flex; flex-direction: column; }
        .test-history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--light-gray-color); }
        .test-history-header h3 { margin: 0; font-size: 1.15em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } /* This was h3, changed to p for consistency with user file */
        .test-history-header p { font-weight: 500 } /* Added this */
        .test-history-trend { margin-bottom: 20px; min-height: 110px; }
        .test-history-trend div[id^="testHistoryChart-"] { display: block; margin: 0 auto; max-width:100%; height: 100px; width: 320px; }
        .test-history-details-collapsible summary { cursor: pointer; font-size: 1em; color: var(--primary-color); margin-bottom: 10px; font-weight:500; }
        .test-history-details-collapsible summary:hover {text-decoration: underline;}
        .test-history-details table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
        .test-history-details th, .test-history-details td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--light-gray-color); }
        .test-history-details th { background-color: var(--light-gray-color); font-weight: 600; }
        .status-badge-small { padding: 3px 7px; border-radius: 4px; font-size: 0.8em; font-weight: 600; color: white; text-transform: uppercase; display: inline-block; }
        .status-badge-small.status-passed { background-color: var(--success-color); }
        .status-badge-small.status-failed { background-color: var(--danger-color); }
        .status-badge-small.status-skipped { background-color: var(--warning-color); }
        .status-badge-small.status-unknown { background-color: var(--dark-gray-color); }
        .no-data, .no-tests, .no-steps, .no-data-chart { padding: 28px; text-align: center; color: var(--dark-gray-color); font-style: italic; font-size:1.1em; background-color: var(--light-gray-color); border-radius: var(--border-radius); margin: 18px 0; border: 1px dashed var(--medium-gray-color); }
        .no-data-chart {font-size: 0.95em; padding: 18px;}
        .ai-failure-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 22px; }
        .ai-failure-card { background: var(--card-background-color); border: 1px solid var(--border-color); border-left: 5px solid var(--danger-color); border-radius: var(--border-radius); box-shadow: var(--box-shadow-light); display: flex; flex-direction: column; }
        .ai-failure-card-header { padding: 15px 20px; border-bottom: 1px solid var(--light-gray-color); display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        .ai-failure-card-header h3 { margin: 0; font-size: 1.1em; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ai-fix-btn { background-color: var(--primary-color); color: white; border: none; padding: 10px 18px; font-size: 1em; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background-color 0.2s ease, transform 0.2s ease; display: inline-flex; align-items: center; gap: 8px; }
        .ai-fix-btn:hover { background-color: var(--accent-color); transform: translateY(-2px); }
        .ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.65); display: none; align-items: center; justify-content: center; z-index: 1050; animation: fadeIn 0.3s; }
        .ai-modal-content { background-color: var(--card-background-color); color: var(--text-color); border-radius: var(--border-radius); width: 90%; max-width: 800px; max-height: 90vh; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; }
        .ai-modal-header { padding: 18px 25px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .ai-modal-header h3 { margin: 0; font-size: 1.25em; }
        .ai-modal-close { font-size: 2rem; font-weight: 300; cursor: pointer; color: var(--dark-gray-color); line-height: 1; transition: color 0.2s; }
        .ai-modal-close:hover { color: var(--danger-color); }
        .ai-modal-body { padding: 25px; overflow-y: auto; }
        .ai-modal-body h4 { margin-top: 18px; margin-bottom: 10px; font-size: 1.1em; color: var(--primary-color); }
        .ai-modal-body p { margin-bottom: 15px; }
        .ai-loader { margin: 40px auto; border: 5px solid #f3f3f3; border-top: 5px solid var(--primary-color); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .trace-preview { padding: 1rem; text-align: center; background: #f5f5f5; border-bottom: 1px solid #e1e1e1; }
        .trace-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
        .trace-name { word-break: break-word; font-size: 0.9rem; }
        .trace-actions { display: flex; gap: 0.5rem; }
        .trace-actions a { flex: 1; text-align: center; padding: 0.25rem 0.5rem; font-size: 0.85rem; border-radius: 4px; text-decoration: none; background: cornflowerblue; color: aliceblue; }
        .view-trace { background: #3182ce; color: white; }
        .view-trace:hover { background: #2c5282; }
        .download-trace { background: #e2e8f0; color: #2d3748; }
        .download-trace:hover { background: #cbd5e0; }
        .filters button.clear-filters-btn { background-color: var(--medium-gray-color); color: var(--text-color); }
        .filters button.clear-filters-btn:hover { background-color: var(--dark-gray-color); color: #fff; }
        .copy-btn {color: var(--primary-color); background: #fefefe; border-radius: 8px; cursor: pointer; border-color: var(--primary-color); font-size: 1em; margin-left: 93%; font-weight: 600;}
        .ai-analyzer-stats { display: flex; gap: 20px; margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: var(--border-radius); justify-content: center; }
        .stat-item { text-align: center; color: white; }
        .stat-number { display: block; font-size: 2em; font-weight: 700; line-height: 1;}
        .stat-label { font-size: 0.9em; opacity: 0.9; font-weight: 500;}
        .ai-analyzer-description { margin-bottom: 25px; font-size: 1em; color: var(--text-color-secondary); text-align: center; max-width: 600px; margin-left: auto; margin-right: auto;}
        .compact-failure-list { display: flex; flex-direction: column; gap: 15px; }
        .compact-failure-item { background: var(--card-background-color); border: 1px solid var(--border-color); border-left: 4px solid var(--danger-color); border-radius: var(--border-radius); box-shadow: var(--box-shadow-light); transition: transform 0.2s ease, box-shadow 0.2s ease;}
        .compact-failure-item:hover { transform: translateY(-2px); box-shadow: var(--box-shadow); }
        .failure-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; gap: 15px;}
        .failure-main-info { flex: 1; min-width: 0; }
        .failure-title { margin: 0 0 8px 0; font-size: 1.1em; font-weight: 600; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        .failure-meta { display: flex; gap: 12px; align-items: center;}
        .browser-indicator, .duration-indicator { font-size: 0.85em; padding: 3px 8px; border-radius: 12px; font-weight: 500;}
        .browser-indicator { background: var(--info-color); color: white; }
        .duration-indicator { background: var(--medium-gray-color); color: var(--text-color); }
        .compact-ai-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; white-space: nowrap;}
        .compact-ai-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
        .ai-text { font-size: 0.95em; }
        .failure-error-preview { padding: 0 20px 18px 20px; border-top: 1px solid var(--light-gray-color);}
        .error-snippet { background: rgba(244, 67, 54, 0.05); border: 1px solid rgba(244, 67, 54, 0.2); border-radius: 6px; padding: 12px; margin-bottom: 12px; font-family: monospace; font-size: 0.9em; color: var(--danger-color); line-height: 1.4;}
        .expand-error-btn { background: none; border: 1px solid var(--border-color); color: var(--text-color-secondary); padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;}
        .expand-error-btn:hover { background: var(--light-gray-color); border-color: var(--medium-gray-color); }
        .expand-icon { transition: transform 0.2s ease; font-size: 0.8em;}
        .expand-error-btn.expanded .expand-icon { transform: rotate(180deg); }
        .full-error-details { padding: 0 20px 20px 20px; border-top: 1px solid var(--light-gray-color); margin-top: 0;}
        .full-error-content { background: rgba(244, 67, 54, 0.05); border: 1px solid rgba(244, 67, 54, 0.2); border-radius: 6px; padding: 15px; font-family: monospace; font-size: 0.9em; color: var(--danger-color); line-height: 1.4; max-height: 300px; overflow-y: auto;}
        @media (max-width: 1200px) { .trend-charts-row { grid-template-columns: 1fr; } }
        @media (max-width: 992px) { .dashboard-bottom-row { grid-template-columns: 1fr; } .pie-chart-wrapper div[id^="pieChart-"] { max-width: 350px; margin: 0 auto; } .filters input { min-width: 180px; } .filters select { min-width: 150px; } }
        @media (max-width: 768px) { body { font-size: 15px; } .container { margin: 10px; padding: 20px; } .header { flex-direction: column; align-items: flex-start; gap: 15px; } .header h1 { font-size: 1.6em; } .run-info { text-align: left; font-size:0.9em; } .tabs { margin-bottom: 25px;} .tab-button { padding: 12px 20px; font-size: 1.05em;} .dashboard-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 18px;} .summary-card .value {font-size: 2em;} .summary-card h3 {font-size: 0.95em;} .filters { flex-direction: column; padding: 18px; gap: 12px;} .filters input, .filters select, .filters button {width: 100%; box-sizing: border-box;} .test-case-header { flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px; } .test-case-summary {gap: 10px;} .test-case-title {font-size: 1.05em;} .test-case-meta { flex-direction: row; flex-wrap: wrap; gap: 8px; margin-top: 8px;} .attachments-grid {grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 18px;} .test-history-grid {grid-template-columns: 1fr;} .pie-chart-wrapper {min-height: auto;} .ai-failure-cards-grid { grid-template-columns: 1fr; } .ai-analyzer-stats { flex-direction: column; gap: 15px; text-align: center; } .failure-header { flex-direction: column; align-items: stretch; gap: 15px; } .failure-main-info { text-align: center; } .failure-meta { justify-content: center; } .compact-ai-btn { justify-content: center; padding: 12px 20px; } }
        @media (max-width: 480px) { body {font-size: 14px;} .container {padding: 15px;} .header h1 {font-size: 1.4em;} #report-logo { height: 35px; width: 45px; } .tab-button {padding: 10px 15px; font-size: 1em;} .summary-card .value {font-size: 1.8em;} .attachments-grid {grid-template-columns: 1fr;} .step-item {padding-left: calc(var(--depth, 0) * 18px);} .test-case-content, .step-details {padding: 15px;} .trend-charts-row {gap: 20px;} .trend-chart {padding: 20px;} .stat-item .stat-number { font-size: 1.5em; } .failure-header { padding: 15px; } .failure-error-preview, .full-error-details { padding-left: 15px; padding-right: 15px; } }
        .trace-actions a { text-decoration: none; color: var(--primary-color); font-weight: 500; font-size: 0.9em; }
        .generic-attachment { text-align: center; padding: 1rem; justify-content: center; }
        .attachment-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
        .attachment-caption { display: flex; flex-direction: column; align-items: center; justify-content: center; flex-grow: 1; }
        .attachment-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .attachment-type { font-size: 0.8rem; color: var(--text-color-secondary); }
    &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;div class="container"&gt;
        &lt;header class="header"&gt;
            &lt;div class="header-title"&gt;
                &lt;img id="report-logo" src="https://i.postimg.cc/v817w4sg/logo.png" alt="Report Logo"&gt;
                &lt;h1&gt;Playwright Pulse Report&lt;/h1&gt;
            &lt;/div&gt;
            &lt;div class="run-info"&gt;&lt;strong&gt;Run Date:&lt;/strong&gt; ${formatDate(
              runSummary.timestamp
            )}&lt;br&gt;&lt;strong&gt;Total Duration:&lt;/strong&gt; ${formatDuration(
    runSummary.duration
  )}&lt;/div&gt;
        &lt;/header&gt;
        &lt;div class="tabs"&gt;
            &lt;button class="tab-button active" data-tab="dashboard"&gt;Dashboard&lt;/button&gt;
            &lt;button class="tab-button" data-tab="test-runs"&gt;Test Run Summary&lt;/button&gt;
            &lt;button class="tab-button" data-tab="test-history"&gt;Test History&lt;/button&gt;
            &lt;button class="tab-button" data-tab="ai-failure-analyzer"&gt;AI Failure Analyzer&lt;/button&gt;
        &lt;/div&gt;
        &lt;div id="dashboard" class="tab-content active"&gt;
             &lt;div class="tab-loading-placeholder"&gt;Loading dashboard...&lt;/div&gt;
        &lt;/div&gt;
        &lt;div id="test-runs" class="tab-content"&gt;
             &lt;div class="tab-loading-placeholder"&gt;Loading test run summary...&lt;/div&gt;
        &lt;/div&gt;
        &lt;div id="test-history" class="tab-content"&gt;
          &lt;h2 class="tab-main-title"&gt;Execution Trends&lt;/h2&gt;
          &lt;div class="trend-charts-row"&gt;
            &lt;div class="trend-chart"&gt;&lt;h3 class="chart-title-header"&gt;Test Volume &amp; Outcome Trends&lt;/h3&gt;
              ${
                trendData && trendData.overall && trendData.overall.length > 0
                  ? generateTestTrendsChart(trendData)
                  : '&lt;div class="no-data"&gt;Overall trend data not available for test counts.&lt;/div&gt;'
              }
            &lt;/div&gt;
            &lt;div class="trend-chart"&gt;&lt;h3 class="chart-title-header"&gt;Execution Duration Trends&lt;/h3&gt;
              ${
                trendData && trendData.overall && trendData.overall.length > 0
                  ? generateDurationTrendChart(trendData)
                  : '&lt;div class="no-data"&gt;Overall trend data not available for durations.&lt;/div&gt;'
              }
              &lt;/div&gt;
          &lt;/div&gt;
          &lt;h2 class="tab-main-title"&gt;Test Distribution by Worker ${infoTooltip}&lt;/h2&gt;
          &lt;div class="trend-charts-row"&gt;
             &lt;div class="trend-chart"&gt;
                ${generateWorkerDistributionChart(results)}
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;h2 class="tab-main-title"&gt;Individual Test History&lt;/h2&gt;
          ${
            trendData &&
            trendData.testRuns &&
            Object.keys(trendData.testRuns).length > 0
              ? generateTestHistoryContent(trendData)
              : '&lt;div class="no-data"&gt;Individual test history data not available.&lt;/div&gt;'
          }
        &lt;/div&gt;
        &lt;div id="ai-failure-analyzer" class="tab-content"&gt;
            &lt;div class="tab-loading-placeholder"&gt;Loading failure analyzer...&lt;/div&gt;
        &lt;/div&gt;
        &lt;footer style="padding: 0.5rem; box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05); text-align: center; font-family: 'Segoe UI', system-ui, sans-serif;"&gt;
            &lt;div style="display: inline-flex; align-items: center; gap: 0.5rem; color: #333; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.5px;"&gt;
                &lt;span&gt;Created by&lt;/span&gt;
                &lt;a href="https://github.com/Arghajit47" target="_blank" rel="noopener noreferrer" style="color: #7737BF; font-weight: 700; font-style: italic; text-decoration: none; transition: all 0.2s ease;" onmouseover="this.style.color='#BF5C37'" onmouseout="this.style.color='#7737BF'"&gt;Arghajit Singha&lt;/a&gt;
            &lt;/div&gt;
            &lt;div style="margin-top: 0.5rem; font-size: 0.75rem; color: #666;"&gt;Crafted with precision&lt;/div&gt;
        &lt;/footer&gt;
    &lt;/div&gt;
    &lt;script&gt;
      // Store all data and generator functions on the window object
      window._pulseData = ${JSON.stringify(pulseData)};
      window._tabContents = ${JSON.stringify(tabContents)};
      
      function getStatusClass(status) {
        switch (String(status).toLowerCase()) {
          case "passed": return "status-passed";
          case "failed": return "status-failed";
          case "skipped": return "status-skipped";
          default: return "status-unknown";
        }
      }
    
      function sanitizeHTML(str) {
        if (str === null || str === undefined) return "";
        return String(str).replace(/[&<>"']/g, (match) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[match] || match));
      }
    
      function getStatusIcon(status) {
        switch (String(status).toLowerCase()) {
          case "passed": return "✅";
          case "failed": return "❌";
          case "skipped": return "⏭️";
          default: return "❓";
        }
      }

    // Ensure formatDuration is globally available
    if (typeof formatDuration === 'undefined') { 
        function formatDuration(ms) { 
            if (ms === undefined || ms === null || ms &lt; 0) return "0.0s"; 
            return (ms / 1000).toFixed(1) + "s"; 
        }
    }
    
    function copyLogContent(elementId, button) {
        const logElement = document.getElementById(elementId);
        if (!logElement) {
            console.error('Could not find log element with ID:', elementId);
            return;
        }
        navigator.clipboard.writeText(logElement.innerText).then(() =&gt; {
            button.textContent = 'Copied!';
            setTimeout(() =&gt; { button.textContent = 'Copy'; }, 2000);
        }).catch(err =&gt; {
            console.error('Failed to copy log content:', err);
            button.textContent = 'Failed';
             setTimeout(() =&gt; { button.textContent = 'Copy'; }, 2000);
        });
    }

    function getAIFix(button) {
        const modal = document.getElementById('ai-fix-modal');
        const modalContent = document.getElementById('ai-fix-modal-content');
        const modalTitle = document.getElementById('ai-fix-modal-title');
        
        modal.style.display = 'flex';
        modalTitle.textContent = 'Analyzing...';
        modalContent.innerHTML = '&lt;div class="ai-loader"&gt;&lt;/div&gt;';

        try {
            const testJson = button.dataset.testJson;
            const test = JSON.parse(atob(testJson));

            const testName = test.name || 'Unknown Test';
            const failureLogsAndErrors = [
                'Error Message:',
                test.errorMessage || 'Not available.',
                '\\n\\n--- stdout ---',
                (test.stdout && test.stdout.length &gt; 0) ? test.stdout.join('\\n') : 'Not available.',
                '\\n\\n--- stderr ---',
                (test.stderr && test.stderr.length &gt; 0) ? test.stderr.join('\\n') : 'Not available.'
            ].join('\\n');
            const codeSnippet = test.snippet || '';

            const shortTestName = testName.split(' &gt; ').pop();
            modalTitle.textContent = \`Analysis for: \${shortTestName}\`;
            
            const apiUrl = 'https://ai-test-analyser.netlify.app/api/analyze';
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testName: testName,
                    failureLogsAndErrors: failureLogsAndErrors,
                    codeSnippet: codeSnippet,
                }),
            })
            .then(response =&gt; {
                if (!response.ok) {
                    return response.text().then(text =&gt; { 
                        throw new Error(\`API request failed with status \${response.status}: \${text || response.statusText}\`);
                    });
                }
                return response.text();
            })
            .then(text =&gt; {
                if (!text) {
                    throw new Error("The AI analyzer returned an empty response. This might happen during high load or if the request was blocked. Please try again in a moment.");
                }
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error("Failed to parse JSON:", text);
                    throw new Error(\`The AI analyzer returned an invalid response. \${e.message}\`);
                }
            })
            .then(data =&gt; {
                const escapeHtml = (unsafe) =&gt; {
                    if (typeof unsafe !== 'string') return '';
                    return unsafe
                        .replace(/&/g, "&amp;")
                        .replace(/&lt;/g, "&lt;")
                        .replace(/&gt;/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                };

                const analysisHtml = \`&lt;h4&gt;Analysis&lt;/h4&gt;&lt;p&gt;\${escapeHtml(data.rootCause) || 'No analysis provided.'}&lt;/p&gt;\`;
                
                let suggestionsHtml = '&lt;h4&gt;Suggestions&lt;/h4&gt;';
                if (data.suggestedFixes && data.suggestedFixes.length &gt; 0) {
                    suggestionsHtml += '&lt;div class="suggestions-list" style="margin-top: 15px;"&gt;';
                    data.suggestedFixes.forEach(fix =&gt; {
                        suggestionsHtml += \`
                            &lt;div class="suggestion-item" style="margin-bottom: 22px; border-left: 3px solid var(--accent-color-alt); padding-left: 15px;"&gt;
                                &lt;p style="margin: 0 0 8px 0; font-weight: 500;"&gt;\${escapeHtml(fix.description)}&lt;/p&gt;
                                \${fix.codeSnippet ? \`&lt;div class="code-section"&gt;&lt;pre&gt;&lt;code&gt;\${escapeHtml(fix.codeSnippet)}&lt;/code&gt;&lt;/pre&gt;&lt;/div&gt;\` : ''}
                            &lt;/div&gt;
                        \`;
                    });
                    suggestionsHtml += '&lt;/div&gt;';
                } else {
                    suggestionsHtml += \`&lt;div class="code-section"&gt;&lt;pre&gt;&lt;code&gt;No suggestion provided.&lt;/code&gt;&lt;/pre&gt;&lt;/div&gt;\`;
                }
                
                modalContent.innerHTML = analysisHtml + suggestionsHtml;
            })
            .catch(err =&gt; {
                console.error('AI Fix Error:', err);
                modalContent.innerHTML = \`&lt;div class="test-error-summary"&gt;&lt;strong&gt;Error:&lt;/strong&gt; Failed to get AI analysis. Please check the console for details. &lt;br&gt;&lt;br&gt; \${err.message}&lt;/div&gt;\`;
            });

        } catch (e) {
            console.error('Error processing test data for AI Fix:', e);
            modalTitle.textContent = 'Error';
            modalContent.innerHTML = \`&lt;div class="test-error-summary"&gt;Could not process test data. Is it formatted correctly?&lt;/div&gt;\`;
        }
    }

    function closeAiModal() {
        const modal = document.getElementById('ai-fix-modal');
        if(modal) modal.style.display = 'none';
    }

    function toggleErrorDetails(button) {
        const errorDetails = button.closest('.compact-failure-item').querySelector('.full-error-details');
        const expandText = button.querySelector('.expand-text');
        
        if (errorDetails.style.display === 'none' || !errorDetails.style.display) {
            errorDetails.style.display = 'block';
            expandText.textContent = 'Hide Full Error';
            button.classList.add('expanded');
        } else {
            errorDetails.style.display = 'none';
            expandText.textContent = 'Show Full Error';
            button.classList.remove('expanded');
        }
    }

    function initializeReportInteractivity() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const loadedTabs = { 'test-history': true }; // Test History is pre-rendered

        const loadTabContent = (tabId) =&gt; {
            if (loadedTabs[tabId]) return;
            const contentContainer = document.getElementById(tabId);
            if (contentContainer && window._tabContents[tabId]) {
                contentContainer.innerHTML = window._tabContents[tabId];
            }
            loadedTabs[tabId] = true;
        };
        
        // Initial load for the active tab
        loadTabContent('dashboard');

        tabButtons.forEach(button =&gt; {
            button.addEventListener('click', () =&gt; {
                const tabId = button.getAttribute('data-tab');
                loadTabContent(tabId);

                tabButtons.forEach(btn =&gt; btn.classList.remove('active'));
                tabContents.forEach(content =&gt; content.classList.remove('active'));
                
                button.classList.add('active');
                const activeContent = document.getElementById(tabId);
                if (activeContent) {
                    activeContent.classList.add('active');
                }
            });
        });
        
        // --- Test Run Summary Filters ---
        const nameFilter = document.getElementById('filter-name');
        const statusFilter = document.getElementById('filter-status');
        const browserFilter = document.getElementById('filter-browser');
        const clearRunSummaryFiltersBtn = document.getElementById('clear-run-summary-filters'); 
        function filterTestCases() { 
            const nameValue = nameFilter ? nameFilter.value.toLowerCase() : "";
            const statusValue = statusFilter ? statusFilter.value : "";
            const browserValue = browserFilter ? browserFilter.value : "";
            document.querySelectorAll('#test-runs .test-case').forEach(testCaseElement =&gt; {
                const titleElement = testCaseElement.querySelector('.test-case-title');
                const fullTestName = titleElement ? titleElement.getAttribute('title').toLowerCase() : "";
                const status = testCaseElement.getAttribute('data-status');
                const browser = testCaseElement.getAttribute('data-browser');
                const nameMatch = fullTestName.includes(nameValue);
                const statusMatch = !statusValue || status === statusValue;
                const browserMatch = !browserValue || browser === browserValue;
                testCaseElement.style.display = (nameMatch && statusMatch && browserMatch) ? '' : 'none';
            });
        }
        if(nameFilter) nameFilter.addEventListener('input', filterTestCases);
        if(statusFilter) statusFilter.addEventListener('change', filterTestCases);
        if(browserFilter) browserFilter.addEventListener('change', filterTestCases);
        if(clearRunSummaryFiltersBtn) clearRunSummaryFiltersBtn.addEventListener('click', () =&gt; {
            if(nameFilter) nameFilter.value = ''; if(statusFilter) statusFilter.value = ''; if(browserFilter) browserFilter.value = '';
            filterTestCases();
        });
        
        // --- Test History Filters ---
        const historyNameFilter = document.getElementById('history-filter-name');
        const historyStatusFilter = document.getElementById('history-filter-status');
        const clearHistoryFiltersBtn = document.getElementById('clear-history-filters'); 
        function filterTestHistoryCards() { 
            const nameValue = historyNameFilter ? historyNameFilter.value.toLowerCase() : "";
            const statusValue = historyStatusFilter ? historyStatusFilter.value : "";
            document.querySelectorAll('.test-history-card').forEach(card =&gt; {
                const testTitle = card.getAttribute('data-test-name').toLowerCase(); 
                const latestStatus = card.getAttribute('data-latest-status');
                const nameMatch = testTitle.includes(nameValue);
                const statusMatch = !statusValue || latestStatus === statusValue;
                card.style.display = (nameMatch && statusMatch) ? '' : 'none';
            });
        }
        if(historyNameFilter) historyNameFilter.addEventListener('input', filterTestHistoryCards);
        if(historyStatusFilter) historyStatusFilter.addEventListener('change', filterTestHistoryCards);
        if(clearHistoryFiltersBtn) clearHistoryFiltersBtn.addEventListener('click', () =&gt; {
            if(historyNameFilter) historyNameFilter.value = ''; if(historyStatusFilter) historyStatusFilter.value = '';
            filterTestHistoryCards();
        });
        
        // --- Expand/Collapse and Toggle Details Logic ---
        function toggleElementDetails(headerElement, contentSelector) { 
            let contentElement;
            if (headerElement.classList.contains('test-case-header')) {
                contentElement = headerElement.parentElement.querySelector('.test-case-content');
            } else if (headerElement.classList.contains('step-header')) {
                contentElement = headerElement.nextElementSibling;
                if (!contentElement || !contentElement.matches(contentSelector || '.step-details')) {
                     contentElement = null;
                }
            }
            if (contentElement) {
                 const isExpanded = contentElement.style.display === 'block';
                 contentElement.style.display = isExpanded ? 'none' : 'block';
                 headerElement.setAttribute('aria-expanded', String(!isExpanded));
            }
        }
        document.querySelectorAll('#test-runs .test-case-header').forEach(header =&gt; {
            header.addEventListener('click', () =&gt; toggleElementDetails(header)); 
        });
        document.querySelectorAll('#test-runs .step-header').forEach(header =&gt; {
            header.addEventListener('click', () =&gt; toggleElementDetails(header, '.step-details'));
        });
        const expandAllBtn = document.getElementById('expand-all-tests');
        const collapseAllBtn = document.getElementById('collapse-all-tests');
        function setAllTestRunDetailsVisibility(displayMode, ariaState) {
            document.querySelectorAll('#test-runs .test-case-content').forEach(el =&gt; el.style.display = displayMode);
            document.querySelectorAll('#test-runs .step-details').forEach(el =&gt; el.style.display = displayMode);
            document.querySelectorAll('#test-runs .test-case-header[aria-expanded]').forEach(el =&gt; el.setAttribute('aria-expanded', ariaState));
            document.querySelectorAll('#test-runs .step-header[aria-expanded]').forEach(el =&gt; el.setAttribute('aria-expanded', ariaState));
        }
        if (expandAllBtn) expandAllBtn.addEventListener('click', () =&gt; setAllTestRunDetailsVisibility('block', 'true'));
        if (collapseAllBtn) collapseAllBtn.addEventListener('click', () =&gt; setAllTestRunDetailsVisibility('none', 'false'));
        
        // --- Intersection Observer for Lazy Loading ---
        const lazyLoadElements = document.querySelectorAll('.lazy-load-chart, .lazy-load-iframe, .lazy-load-image, .lazy-load-video, .lazy-load-attachment');
        if ('IntersectionObserver' in window) {
            let lazyObserver = new IntersectionObserver((entries, observer) =&gt; {
                entries.forEach(entry =&gt; {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        if (element.classList.contains('lazy-load-image')) {
                            if (element.dataset.src) {
                                element.src = element.dataset.src;
                                element.removeAttribute('data-src');
                            }
                        } else if (element.classList.contains('lazy-load-video')) {
                            const source = element.querySelector('source');
                            if (source && source.dataset.src) {
                                source.src = source.dataset.src;
                                source.removeAttribute('data-src');
                                element.load();
                            }
                        } else if (element.classList.contains('lazy-load-attachment')) {
                            if (element.dataset.href) {
                                element.href = element.dataset.href;
                                element.removeAttribute('data-href');
                            }
                        } else if (element.classList.contains('lazy-load-iframe')) {
                            if (element.dataset.src) {
                                element.src = element.dataset.src;
                                element.removeAttribute('data-src');
                            }
                        } else if (element.classList.contains('lazy-load-chart')) {
                            const renderFunctionName = element.dataset.renderFunctionName;
                            if (renderFunctionName && typeof window[renderFunctionName] === 'function') {
                                window[renderFunctionName]();
                            }
                        }
                        observer.unobserve(element);
                    }
                });
            }, { rootMargin: "0px 0px 200px 0px" });
            lazyLoadElements.forEach(el =&gt; lazyObserver.observe(el));
        } else { // Fallback for browsers without IntersectionObserver
            lazyLoadElements.forEach(element =&gt; {
                if (element.classList.contains('lazy-load-image') && element.dataset.src) element.src = element.dataset.src;
                else if (element.classList.contains('lazy-load-video')) { const source = element.querySelector('source'); if (source && source.dataset.src) { source.src = source.dataset.src; element.load(); } }
                else if (element.classList.contains('lazy-load-attachment') && element.dataset.href) element.href = element.dataset.href;
                else if (element.classList.contains('lazy-load-iframe') && element.dataset.src) element.src = element.dataset.src;
                else if (element.classList.contains('lazy-load-chart')) { const renderFn = element.dataset.renderFunctionName; if(renderFn && window[renderFn]) window[renderFn](); }
            });
        }
    }
    document.addEventListener('DOMContentLoaded', initializeReportInteractivity);

    function copyErrorToClipboard(button) {
      const errorContainer = button.closest('.test-error-summary');
      if (!errorContainer) {
        console.error("Could not find '.test-error-summary' container.");
        return;
      }
      let errorText;
      const stackTraceElement = errorContainer.querySelector('.stack-trace');
      if (stackTraceElement) {
        errorText = stackTraceElement.textContent;
      } else {
        const clonedContainer = errorContainer.cloneNode(true);
        const buttonInClone = clonedContainer.querySelector('button');
        if (buttonInClone) buttonInClone.remove();
        errorText = clonedContainer.textContent;
      }

      if (!errorText) {
        button.textContent = 'Nothing to copy';
        setTimeout(() =&gt; { button.textContent = 'Copy Error'; }, 2000);
        return;
      }
      navigator.clipboard.writeText(errorText.trim()).then(() =&gt; {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() =&gt; { button.textContent = originalText; }, 2000);
      }).catch(err =&gt; {
        console.error('Failed to copy: ', err);
        button.textContent = 'Failed';
      });
    }
&lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;
  `;
}

function generateDashboardTabHTML(data) {
    const runSummary = data.runSummary;
    const totalTestsOr1 = runSummary.totalTests || 1;
    const passPercentage = Math.round((runSummary.passed / totalTestsOr1) * 100);
    const failPercentage = Math.round((runSummary.failed / totalTestsOr1) * 100);
    const skipPercentage = Math.round(((runSummary.skipped || 0) / totalTestsOr1) * 100);
    const avgTestDuration = runSummary.totalTests &gt; 0 
      ? formatDuration(runSummary.duration / runSummary.totalTests) 
      : "0.0s";
    
    return `
      &lt;div class="dashboard-grid"&gt;
        &lt;div class="summary-card"&gt;&lt;h3&gt;Total Tests&lt;/h3&gt;&lt;div class="value"&gt;${runSummary.totalTests}&lt;/div&gt;&lt;/div&gt;
        &lt;div class="summary-card status-passed"&gt;&lt;h3&gt;Passed&lt;/h3&gt;&lt;div class="value"&gt;${runSummary.passed}&lt;/div&gt;&lt;div class="trend-percentage"&gt;${passPercentage}%&lt;/div&gt;&lt;/div&gt;
        &lt;div class="summary-card status-failed"&gt;&lt;h3&gt;Failed&lt;/h3&gt;&lt;div class="value"&gt;${runSummary.failed}&lt;/div&gt;&lt;div class="trend-percentage"&gt;${failPercentage}%&lt;/div&gt;&lt;/div&gt;
        &lt;div class="summary-card status-skipped"&gt;&lt;h3&gt;Skipped&lt;/h3&gt;&lt;div class="value"&gt;${runSummary.skipped || 0}&lt;/div&gt;&lt;div class="trend-percentage"&gt;${skipPercentage}%&lt;/div&gt;&lt;/div&gt;
        &lt;div class="summary-card"&gt;&lt;h3&gt;Avg. Test Time&lt;/h3&gt;&lt;div class="value"&gt;${avgTestDuration}&lt;/div&gt;&lt;/div&gt;
        &lt;div class="summary-card"&gt;&lt;h3&gt;Run Duration&lt;/h3&gt;&lt;div class="value"&gt;${formatDuration(runSummary.duration)}&lt;/div&gt;&lt;/div&gt;
      &lt;/div&gt;
      &lt;div class="dashboard-bottom-row"&gt;
        &lt;div style="display: grid; gap: 20px"&gt;
          ${generatePieChart(data.pieData, 400, 390)}
          ${runSummary.environment && Object.keys(runSummary.environment).length &gt; 0 
            ? generateEnvironmentDashboard(runSummary.environment) 
            : '&lt;div class="no-data"&gt;Environment data not available.&lt;/div&gt;'}
        &lt;/div&gt;
        ${generateSuitesWidget(data.suitesData)}
      &lt;/div&gt;
    `;
  }
  
  function generateTestRunSummaryTabHTML(data) {
    const results = data.results || [];
    
    if (results.length === 0) {
      return '&lt;div class="no-tests"&gt;No test results found in this run.&lt;/div&gt;';
    }
    
    // Generate minimal test list - just titles and status
    const testListHTML = results.map((test, index) =&gt; {
      const browser = test.browser || "unknown";
      const testFileParts = test.name.split(" &gt; ");
      const testTitle = testFileParts[testFileParts.length - 1] || "Unnamed Test";
      
      return `
        &lt;div class="test-case" data-status="${test.status}" data-browser="${sanitizeHTML(browser)}" data-tags="${(test.tags || []).join(",").toLowerCase()}"&gt;
          &lt;div class="test-case-header" role="button" aria-expanded="false" data-test-index="${index}"&gt;
            &lt;div class="test-case-summary"&gt;
              &lt;span class="status-badge ${getStatusClass(test.status)}"${String(test.status).toUpperCase()}&lt;/span&gt;
              &lt;span class="test-case-title" title="${sanitizeHTML(test.name)}"${sanitizeHTML(testTitle)}&lt;/span&gt;
              &lt;span class="test-case-browser"&gt;(${sanitizeHTML(browser)})&lt;/span&gt;
            &lt;/div&gt;
            &lt;div class="test-case-meta"&gt;
              ${test.tags && test.tags.length &gt; 0 
                ? test.tags.map(t =&gt; `&lt;span class="tag"${sanitizeHTML(t)}&lt;/span&gt;`).join(" ") 
                : ""}
              &lt;span class="test-duration"&gt;${formatDuration(test.duration)}&lt;/span&gt;
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;div class="test-case-content" id="test-details-${index}" style="display: none;"&gt;&lt;/div&gt;
        &lt;/div&gt;
      `;
    }).join("");
    
    return `
      &lt;div class="filters"&gt;
          &lt;input type="text" id="filter-name" placeholder="Filter by test name/path..." style="border-color: black; border-style: outset;"&gt;
          &lt;select id="filter-status"&gt;
              &lt;option value=""&gt;All Statuses&lt;/option&gt;
              &lt;option value="passed"&gt;Passed&lt;/option&gt;
              &lt;option value="failed"&gt;Failed&lt;/option&gt;
              &lt;option value="skipped"&gt;Skipped&lt;/option&gt;
          &lt;/select&gt;
          &lt;select id="filter-browser"&gt;
              &lt;option value=""&gt;All Browsers&lt;/option&gt;
              ${Array.from(new Set((results || []).map(test =&gt; test.browser || "unknown")))
                .map(browser =&gt; `&lt;option value="${sanitizeHTML(browser)}"${sanitizeHTML(browser)}&lt;/option&gt;`)
                .join("")}
          &lt;/select&gt;
          &lt;button id="expand-all-tests"&gt;Expand All&lt;/button&gt;
          &lt;button id="collapse-all-tests"&gt;Collapse All&lt;/button&gt;
          &lt;button id="clear-run-summary-filters" class="clear-filters-btn"&gt;Clear Filters&lt;/button&gt;
      &lt;/div&gt;
      &lt;div class="test-cases-list"&gt;
          ${testListHTML}
      &lt;/div&gt;
    `;
  }
async function runScript(scriptPath) {
  return new Promise((resolve, reject) =&gt; {
    console.log(chalk.blue(`Executing script: ${scriptPath}...`));
    const process = fork(scriptPath, [], {
      stdio: "inherit",
    });

    process.on("error", (err) =&gt; {
      console.error(chalk.red(`Failed to start script: ${scriptPath}`), err);
      reject(err);
    });

    process.on("exit", (code) =&gt; {
      if (code === 0) {
        console.log(chalk.green(`Script ${scriptPath} finished successfully.`));
        resolve();
      } else {
        const errorMessage = `Script ${scriptPath} exited with code ${code}.`;
        console.error(chalk.red(errorMessage));
        reject(new Error(errorMessage));
      }
    });
  });
}
async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Script to archive current run to JSON history (this is your modified "generate-trend.mjs")
  const archiveRunScriptPath = path.resolve(
    __dirname,
    "generate-trend.mjs" // Keeping the filename as per your request
  );

  const outputDir = path.resolve(process.cwd(), DEFAULT_OUTPUT_DIR);
  const reportJsonPath = path.resolve(outputDir, DEFAULT_JSON_FILE); // Current run's main JSON
  const reportHtmlPath = path.resolve(outputDir, DEFAULT_HTML_FILE);

  const historyDir = path.join(outputDir, "history"); // Directory for historical JSON files
  const HISTORY_FILE_PREFIX = "trend-"; // Match prefix used in archiving script
  const MAX_HISTORY_FILES_TO_LOAD_FOR_REPORT = 15; // How many historical runs to show in the report

  console.log(chalk.blue(`Starting static HTML report generation...`));
  console.log(chalk.blue(`Output directory set to: ${outputDir}`));

  // Step 1: Ensure current run data is archived to the history folder
  try {
    await runScript(archiveRunScriptPath); // This script now handles JSON history
    console.log(
      chalk.green("Current run data archiving to history completed.")
    );
  } catch (error) {
    console.error(
      chalk.red(
        "Failed to archive current run data. Report might use stale or incomplete historical trends."
      ),
      error
    );
  }

  // Step 2: Load current run's data (for non-trend sections of the report)
  let currentRunReportData;
  try {
    const jsonData = await fs.readFile(reportJsonPath, "utf-8");
    currentRunReportData = JSON.parse(jsonData);
    if (
      !currentRunReportData ||
      typeof currentRunReportData !== "object" ||
      !currentRunReportData.results
    ) {
      throw new Error(
        "Invalid report JSON structure. 'results' field is missing or invalid."
      );
    }
    if (!Array.isArray(currentRunReportData.results)) {
      currentRunReportData.results = [];
      console.warn(
        chalk.yellow(
          "Warning: 'results' field in current run JSON was not an array. Treated as empty."
        )
      );
    }
  } catch (error) {
    console.error(
      chalk.red(
        `Critical Error: Could not read or parse main report JSON at ${reportJsonPath}: ${error.message}`
      )
    );
    process.exit(1);
  }

  // Step 3: Load historical data for trends
  let historicalRuns = [];
  try {
    await fs.access(historyDir);
    const allHistoryFiles = await fs.readdir(historyDir);

    const jsonHistoryFiles = allHistoryFiles
      .filter(
        (file) =&gt; file.startsWith(HISTORY_FILE_PREFIX) && file.endsWith(".json")
      )
      .map((file) =&gt; {
        const timestampPart = file
          .replace(HISTORY_FILE_PREFIX, "")
          .replace(".json", "");
        return {
          name: file,
          path: path.join(historyDir, file),
          timestamp: parseInt(timestampPart, 10),
        };
      })
      .filter((file) =&gt; !isNaN(file.timestamp))
      .sort((a, b) =&gt; b.timestamp - a.timestamp);

    const filesToLoadForTrend = jsonHistoryFiles.slice(
      0,
      MAX_HISTORY_FILES_TO_LOAD_FOR_REPORT
    );

    for (const fileMeta of filesToLoadForTrend) {
      try {
        const fileContent = await fs.readFile(fileMeta.path, "utf-8");
        const runJsonData = JSON.parse(fileContent);
        historicalRuns.push(runJsonData);
      } catch (fileReadError) {
        console.warn(
          chalk.yellow(
            `Could not read/parse history file ${fileMeta.name}: ${fileReadError.message}`
          )
        );
      }
    }
    historicalRuns.reverse(); // Oldest first for charts
    console.log(
      chalk.green(
        `Loaded ${historicalRuns.length} historical run(s) for trend analysis.`
      )
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(
        chalk.yellow(
          `History directory '${historyDir}' not found. No historical trends will be displayed.`
        )
      );
    } else {
      console.warn(
        chalk.yellow(
          `Error loading historical data from '${historyDir}': ${error.message}`
        )
      );
    }
  }

  // Step 4: Prepare trendData object
  const trendData = {
    overall: [],
    testRuns: {},
  };

  if (historicalRuns.length &gt; 0) {
    historicalRuns.forEach((histRunReport) =&gt; {
      if (histRunReport.run) {
        const runTimestamp = new Date(histRunReport.run.timestamp);
        trendData.overall.push({
          runId: runTimestamp.getTime(),
          timestamp: runTimestamp,
          duration: histRunReport.run.duration,
          totalTests: histRunReport.run.totalTests,
          passed: histRunReport.run.passed,
          failed: histRunReport.run.failed,
          skipped: histRunReport.run.skipped || 0,
        });

        if (histRunReport.results && Array.isArray(histRunReport.results)) {
          const runKeyForTestHistory = `test run ${runTimestamp.getTime()}`;
          trendData.testRuns[runKeyForTestHistory] = histRunReport.results.map(
            (test) =&gt; ({
              testName: test.name,
              duration: test.duration,
              status: test.status,
              timestamp: new Date(test.startTime),
            })
          );
        }
      }
    });
    trendData.overall.sort(
      (a, b) =&gt; a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  // Step 5: Generate and write HTML
  try {
    const htmlContent = generateHTML(currentRunReportData, trendData);
    await fs.writeFile(reportHtmlPath, htmlContent, "utf-8");
    console.log(
      chalk.green.bold(
        `🎉 Pulse report generated successfully at: ${reportHtmlPath}`
      )
    );
    console.log(chalk.gray(`(You can open this file in your browser)`));
  } catch (error) {
    console.error(chalk.red(`Error generating HTML report: ${error.message}`));
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}
main().catch((err) =&gt; {
  console.error(
    chalk.red.bold(`Unhandled error during script execution: ${err.message}`)
  );
  console.error(err.stack);
  process.exit(1);
});

    