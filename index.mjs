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
      html += "</span>";
      openSpan = false;
    }
    if (currentStylesArray.length > 0) {
      const styleString = currentStylesArray.filter((s) => s).join(";");
      if (styleString) {
        html += `<span style="${styleString}">`;
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
    html += "</span>";
  }
  return html;
}
function sanitizeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(
    /[&<>"']/g,
    (match) =>
      ({ "&": "&", "<": "<", ">": ">", '"': '"', "'": "'" }[match] || match)
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
        match.replace(/ /g, " ").replace(/\t/g, "  ")
      )
      .replace(/<red>/g, '<span style="color: red;">')
      .replace(/<green>/g, '<span style="color: green;">')
      .replace(/<dim>/g, '<span style="opacity: 0.6;">')
      .replace(/<intensity>/g, '<span style="font-weight: bold;">')
      .replace(/<\/color>/g, "</span>")
      .replace(/<\/intensity>/g, "</span>")
      .replace(/\n/g, "<br>");
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
    return '<div class="no-data">No overall trend data available for test counts.</div>';
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
      <div id="${chartId}" class="trend-chart-container lazy-load-chart" data-render-function-name="${renderFunctionName}">
          <div class="no-data">Loading Test Volume Trends...</div>
      </div>
      <script>
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
                                  let tooltip = '<strong>Run ' + (run.runId || pointIndex + 1) + '</strong><br>' + 'Date: ' + new Date(run.timestamp).toLocaleString() + '<br><br>';
                                  this.points.forEach(point => { tooltip += '<span style="color:' + point.color + '">●</span> ' + point.series.name + ': <b>' + point.y + '</b><br>'; });
                                  tooltip += '<br>Duration: ' + formatDuration(run.duration);
                                  return tooltip;
                              }
                          },
                          series: ${seriesString},
                          credits: { enabled: false }
                      };
                      Highcharts.chart('${chartId}', chartOptions);
                  } catch (e) {
                      console.error("Error rendering chart ${chartId} (lazy):", e);
                      chartContainer.innerHTML = '<div class="no-data">Error rendering test trends chart.</div>';
                  }
              } else {
                  chartContainer.innerHTML = '<div class="no-data">Charting library not available for test trends.</div>';
              }
          };
      </script>
  `;
}
function generateDurationTrendChart(trendData) {
  if (!trendData || !trendData.overall || trendData.overall.length === 0) {
    return '<div class="no-data">No overall trend data available for durations.</div>';
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
      <div id="${chartId}" class="trend-chart-container lazy-load-chart" data-render-function-name="${renderFunctionName}">
          <div class="no-data">Loading Duration Trends...</div>
      </div>
      <script>
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
                                  let tooltip = '<strong>Run ' + (run.runId || pointIndex + 1) + '</strong><br>' + 'Date: ' + new Date(run.timestamp).toLocaleString() + '<br>';
                                  this.points.forEach(point => { tooltip += '<span style="color:' + point.series.color + '">●</span> ' + point.series.name + ': <b>' + formatDuration(point.y) + '</b><br>'; });
                                  tooltip += '<br>Tests: ' + run.totalTests;
                                  return tooltip;
                              }
                          },
                          series: ${seriesStringForRender}, // This is already a string representation of an array
                          credits: { enabled: false }
                      };
                      Highcharts.chart('${chartId}', chartOptions);
                  } catch (e) {
                      console.error("Error rendering chart ${chartId} (lazy):", e);
                      chartContainer.innerHTML = '<div class="no-data">Error rendering duration trend chart.</div>';
                  }
              } else {
                  chartContainer.innerHTML = '<div class="no-data">Charting library not available for duration trends.</div>';
              }
          };
      </script>
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
    return '<div class="no-data-chart">No data for chart</div>';
  const validHistory = history.filter(
    (h) => h && typeof h.duration === "number" && h.duration >= 0
  );
  if (validHistory.length === 0)
    return '<div class="no-data-chart">No valid data for chart</div>';

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
      <div id="${chartId}" style="width: 320px; height: 100px;" class="lazy-load-chart" data-render-function-name="${renderFunctionName}">
          <div class="no-data-chart">Loading History...</div>
      </div>
      <script>
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
                                  let statusBadgeHtml = '<span style="padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-weight: 600; color: white; text-transform: uppercase; background-color: ';
                                  switch(String(pointData.status).toLowerCase()) {
                                      case 'passed': statusBadgeHtml += 'var(--success-color)'; break;
                                      case 'failed': statusBadgeHtml += 'var(--danger-color)'; break;
                                      case 'skipped': statusBadgeHtml += 'var(--warning-color)'; break;
                                      default: statusBadgeHtml += 'var(--dark-gray-color)';
                                  }
                                  statusBadgeHtml += ';">' + String(pointData.status).toUpperCase() + '</span>';
                                  return '<strong>Run ' + (pointData.runId || (this.point.index + 1)) + '</strong><br>' + 'Status: ' + statusBadgeHtml + '<br>' + 'Duration: ' + formatDuration(pointData.y);
                              }
                          },
                          series: [{ data: ${seriesDataPointsString}, showInLegend: false }],
                          credits: { enabled: false }
                      };
                      Highcharts.chart('${chartId}', chartOptions);
                  } catch (e) {
                      console.error("Error rendering chart ${chartId} (lazy):", e);
                      chartContainer.innerHTML = '<div class="no-data-chart">Error rendering history chart.</div>';
                  }
              } else {
                  chartContainer.innerHTML = '<div class="no-data-chart">Charting library not available for history.</div>';
              }
          };
      </script>
  `;
}
function generatePieChart(data, chartWidth = 300, chartHeight = 300) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return '<div class="pie-chart-wrapper"><h3>Test Distribution</h3><div class="no-data">No data for Test Distribution chart.</div></div>';
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
          pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y})',
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
      <div class="pie-chart-wrapper" style="align-items: center; max-height: 450px">
          <div style="display: flex; align-items: start; width: 100%;"><h3>Test Distribution</h3></div>
          <div id="${chartId}" style="width: ${chartWidth}px; height: ${
    chartHeight - 40
  }px;"></div>
          <script>
              document.addEventListener('DOMContentLoaded', function() {
                  if (typeof Highcharts !== 'undefined') {
                      try {
                          const chartOptions = ${optionsObjectString};
                          Highcharts.chart('${chartId}', chartOptions);
                      } catch (e) {
                          console.error("Error rendering chart ${chartId}:", e);
                          document.getElementById('${chartId}').innerHTML = '<div class="no-data">Error rendering pie chart.</div>';
                      }
                  } else {
                      document.getElementById('${chartId}').innerHTML = '<div class="no-data">Charting library not available.</div>';
                  }
              });
          </script>
      </div>
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
    <div class="environment-dashboard-wrapper" id="${dashboardId}">
      <style>
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
      </style>
      
      <div class="env-dashboard-header">
        <div>
          <h3 class="env-dashboard-title">System Environment</h3>
          <p class="env-dashboard-subtitle">Snapshot of the execution environment</p>
        </div>
        <span class="env-chip env-chip-primary">${environment.host}</span>
      </div>
      
      <div class="env-card">
        <div class="env-card-header">
          <svg viewBox="0 0 24 24"><path d="M4 6h16V4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h-2v10H4V6zm18-2h-4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2H6a2 2 0 0 0-2 2v2h20V6a2 2 0 0 0-2-2zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>
          Hardware
        </div>
        <div class="env-card-content">
          <div class="env-detail-row">
            <span class="env-detail-label">CPU Model</span>
            <span class="env-detail-value">${environment.cpu.model}</span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">CPU Cores</span>
            <span class="env-detail-value">
              <div class="env-cpu-cores">
                ${Array.from(
                  { length: Math.max(0, environment.cpu.cores || 0) },
                  (_, i) =>
                    `<div class="env-core-indicator ${
                      i >=
                      (environment.cpu.cores >= 8 ? 8 : environment.cpu.cores)
                        ? "inactive"
                        : ""
                    }" title="Core ${i + 1}"></div>`
                ).join("")}
                <span>${environment.cpu.cores || "N/A"} cores</span>
              </div>
            </span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">Memory</span>
            <span class="env-detail-value">${formattedMemory}</span>
          </div>
        </div>
      </div>
      
      <div class="env-card">
        <div class="env-card-header">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-0.01 18c-2.76 0-5.26-1.12-7.07-2.93A7.973 7.973 0 0 1 4 12c0-2.21.9-4.21 2.36-5.64A7.994 7.994 0 0 1 11.99 4c4.41 0 8 3.59 8 8 0 2.76-1.12 5.26-2.93 7.07A7.973 7.973 0 0 1 11.99 20zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>
          Operating System
        </div>
        <div class="env-card-content">
          <div class="env-detail-row">
            <span class="env-detail-label">OS Type</span>
            <span class="env-detail-value">${
              environment.os.split(" ")[0] === "darwin"
                ? "darwin (macOS)"
                : environment.os.split(" ")[0] || "Unknown"
            }</span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">OS Version</span>
            <span class="env-detail-value">${
              environment.os.split(" ")[1] || "N/A"
            }</span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">Hostname</span>
            <span class="env-detail-value" title="${environment.host}">${
    environment.host
  }</span>
          </div>
        </div>
      </div>
      
      <div class="env-card">
        <div class="env-card-header">
          <svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
          Node.js Runtime
        </div>
        <div class="env-card-content">
          <div class="env-detail-row">
            <span class="env-detail-label">Node Version</span>
            <span class="env-detail-value">${environment.node}</span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">V8 Engine</span>
            <span class="env-detail-value">${environment.v8}</span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">Working Dir</span>
            <span class="env-detail-value" title="${environment.cwd}">${
    environment.cwd.length > 25
      ? "..." + environment.cwd.slice(-22)
      : environment.cwd
  }</span>
          </div>
        </div>
      </div>
      
      <div class="env-card">
        <div class="env-card-header">
          <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 8.69 9.48 7 12 7c2.76 0 5 2.24 5 5v1h2c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/></svg>
          System Summary
        </div>
        <div class="env-card-content">
          <div class="env-detail-row">
            <span class="env-detail-label">Platform Arch</span>
            <span class="env-detail-value">
              <span class="env-chip ${
                environment.os.includes("darwin") &&
                environment.cpu.model.toLowerCase().includes("apple")
                  ? "env-chip-success"
                  : "env-chip-warning"
              }">
                ${
                  environment.os.includes("darwin") &&
                  environment.cpu.model.toLowerCase().includes("apple")
                    ? "Apple Silicon"
                    : environment.cpu.model.toLowerCase().includes("arm") ||
                      environment.cpu.model.toLowerCase().includes("aarch64")
                    ? "ARM-based"
                    : "x86/Other"
                }
              </span>
            </span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">Memory per Core</span>
            <span class="env-detail-value">${
              environment.cpu.cores > 0
                ? (
                    parseFloat(environment.memory) / environment.cpu.cores
                  ).toFixed(2) + " GB"
                : "N/A"
            }</span>
          </div>
          <div class="env-detail-row">
            <span class="env-detail-label">Run Context</span>
            <span class="env-detail-value">CI/Local Test</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
function generateWorkerDistributionChart(results) {
  if (!results || results.length === 0) {
    return '<div class="no-data">No test results data available to display worker distribution.</div>';
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

    const testTitleParts = test.name.split(" > ");
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
    return '<div class="no-data">Could not determine worker distribution from test data.</div>';
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
    <style>
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
       #worker-modal-body-${chartId} li > span {
         display: inline-block;
         width: 70px;
         font-weight: bold;
         text-align: right;
         margin-right: 10px;
      }
    </style>

    <div id="${chartId}" class="trend-chart-container lazy-load-chart" data-render-function-name="${renderFunctionName}" style="min-height: 350px;">
      <div class="no-data">Loading Worker Distribution Chart...</div>
    </div>

    <div id="worker-modal-${chartId}" class="worker-modal-overlay">
      <div class="worker-modal-content">
        <span class="worker-modal-close">×</span>
        <h3 id="worker-modal-title-${chartId}" style="text-align: center; margin-top: 0; margin-bottom: 25px; font-size: 1.25em; font-weight: 600; color: #fff"></h3>
        <div id="worker-modal-body-${chartId}"></div>
      </div>
    </div>

    <script>
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

          let testListHtml = '<ul>';
          if (worker.tests && worker.tests.length > 0) {
            worker.tests.forEach(test => {
                let color = 'inherit';
                if (test.status === 'passed') color = 'var(--success-color)';
                else if (test.status === 'failed') color = 'var(--danger-color)';
                else if (test.status === 'skipped') color = 'var(--warning-color)';

                const escapedName = test.name.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                testListHtml += \`<li style="color: \${color};"><span style="color: \${color}">[\${test.status.toUpperCase()}]</span> \${escapedName}</li>\`;
            });
          } else {
            testListHtml += '<li>No detailed test data available for this worker.</li>';
          }
          testListHtml += '</ul>';

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
                headerFormat: '<b>{point.key}</b> (Click for details)<br/>',
                pointFormat: '<span style="color:{series.color}">●</span> {series.name}: <b>{point.y}</b><br/>',
                footerFormat: 'Total: <b>{point.total}</b>'
              },
              series: ${seriesString},
              credits: { enabled: false }
            };
            Highcharts.chart('${chartId}', chartOptions);
          } catch (e) {
            console.error("Error rendering chart ${chartId}:", e);
            chartContainer.innerHTML = '<div class="no-data">Error rendering worker distribution chart.</div>';
          }
        } else {
          chartContainer.innerHTML = '<div class="no-data">Charting library not available for worker distribution.</div>';
        }
      };
    </script>
  `;
}
const infoTooltip = `
  <span class="info-tooltip" style="display: inline-block; margin-left: 8px;">
    <span class="info-icon" 
          style="cursor: pointer; font-size: 1.25rem;"
          onclick="window.workerInfoPrompt()">ℹ️</span>
  </span>
  <script>
    window.workerInfoPrompt = function() {
      const message = 'Why is worker -1 special?\\n\\n' +
                     'Playwright assigns skipped tests to worker -1 because:\\n' +
                     '1. They don\\'t require browser execution\\n' +
                     '2. This keeps real workers focused on actual tests\\n' +
                     '3. Maintains clean reporting\\n\\n' +
                     'This is an intentional optimization by Playwright.';
      alert(message);
    }
  </script>
`;
function generateTestHistoryContent(trendData) {
  if (
    !trendData ||
    !trendData.testRuns ||
    Object.keys(trendData.testRuns).length === 0
  ) {
    return '<div class="no-data">No historical test data available.</div>';
  }

  const allTestNamesAndPaths = new Map();
  Object.values(trendData.testRuns).forEach((run) => {
    if (Array.isArray(run)) {
      run.forEach((test) => {
        if (test && test.testName && !allTestNamesAndPaths.has(test.testName)) {
          const parts = test.testName.split(" > ");
          const title = parts[parts.length - 1];
          allTestNamesAndPaths.set(test.testName, title);
        }
      });
    }
  });

  if (allTestNamesAndPaths.size === 0) {
    return '<div class="no-data">No historical test data found after processing.</div>';
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
    <div class="test-history-container">
      <div class="filters" style="border-color: black; border-style: groove;">
    <input type="text" id="history-filter-name" placeholder="Search by test title..." style="border-color: black; border-style: outset;">
    <select id="history-filter-status">
        <option value="">All Statuses</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="skipped">Skipped</option>
    </select>
    <button id="clear-history-filters" class="clear-filters-btn">Clear Filters</button>
</div>
      
      <div class="test-history-grid">
        ${testHistory
          .map((test) => {
            const latestRun =
              test.history.length > 0
                ? test.history[test.history.length - 1]
                : { status: "unknown" };
            return `
            <div class="test-history-card" data-test-name="${sanitizeHTML(
              test.testTitle.toLowerCase()
            )}" data-latest-status="${latestRun.status}">
              <div class="test-history-header">
                <p title="${sanitizeHTML(test.testTitle)}">${capitalize(
              sanitizeHTML(test.testTitle)
            )}</p>
                <span class="status-badge ${getStatusClass(latestRun.status)}">
                  ${String(latestRun.status).toUpperCase()}
                </span>
              </div>
              <div class="test-history-trend">
                ${generateTestHistoryChart(test.history)} 
              </div>
              <details class="test-history-details-collapsible">
                <summary>Show Run Details (${test.history.length})</summary>
                <div class="test-history-details">
                  <table>
                    <thead><tr><th>Run</th><th>Status</th><th>Duration</th><th>Date</th></tr></thead>
                    <tbody>
                      ${test.history
                        .slice()
                        .reverse()
                        .map(
                          (run) => `
                        <tr>
                          <td>${run.runId}</td>
                          <td><span class="status-badge-small ${getStatusClass(
                            run.status
                          )}">${String(run.status).toUpperCase()}</span></td>
                          <td>${formatDuration(run.duration)}</td>
                          <td>${formatDate(run.timestamp)}</td>
                        </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>`;
          })
          .join("")}
      </div>
    </div>
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
    const suiteParts = test.name.split(" > ");
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
  if (normalizedType.includes("xml")) return "<>";
  if (normalizedType.includes("csv")) return "📊";
  if (normalizedType.startsWith("text/")) return "📝";
  return "📎";
}
function generateSuitesWidget(suitesData) {
  if (!suitesData || suitesData.length === 0) {
    return `<div class="suites-widget"><div class="suites-header"><h2>Test Suites</h2></div><div class="no-data">No suite data available.</div></div>`;
  }
  return `
<div class="suites-widget">
  <div class="suites-header">
    <h2>Test Suites</h2>
    <span class="summary-badge">${
      suitesData.length
    } suites • ${suitesData.reduce(
    (sum, suite) => sum + suite.count,
    0
  )} tests</span>
  </div>
  <div class="suites-grid">
    ${suitesData
      .map(
        (suite) => `
    <div class="suite-card status-${suite.statusOverall}">
      <div class="suite-card-header">
        <h3 class="suite-name" title="${sanitizeHTML(
          suite.name
        )} (${sanitizeHTML(suite.browser)})">${sanitizeHTML(suite.name)}</h3>
      </div>
      <div>🖥️ <span class="browser-tag">${sanitizeHTML(
        suite.browser
      )}</span></div>
      <div class="suite-card-body">
        <span class="test-count">${suite.count} test${
          suite.count !== 1 ? "s" : ""
        }</span>
        <div class="suite-stats">
            ${
              suite.passed > 0
                ? `<span class="stat-passed" title="Passed"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg> ${suite.passed}</span>`
                : ""
            }
            ${
              suite.failed > 0
                ? `<span class="stat-failed" title="Failed"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg> ${suite.failed}</span>`
                : ""
            }
            ${
              suite.skipped > 0
                ? `<span class="stat-skipped" title="Skipped"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> ${suite.skipped}</span>`
                : ""
            }
        </div>
      </div>
    </div>`
      )
      .join("")}
  </div>
</div>`;
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

    // Process attachments to base64 for embedding in JSON
    const processedResults = (results || []).map(test => {
        const processed = { ...test };
        if (test.screenshots && test.screenshots.length > 0) {
            processed.screenshots = test.screenshots.map(screenshotPath => {
                try {
                    const imagePath = path.resolve(DEFAULT_OUTPUT_DIR, screenshotPath);
                    if (!fsExistsSync(imagePath)) return null;
                    const base64ImageData = readFileSync(imagePath).toString("base64");
                    return `data:image/png;base64,${base64ImageData}`;
                } catch (e) { return null; }
            }).filter(Boolean);
        }
        if (test.videoPath && test.videoPath.length > 0) {
            processed.videoPath = test.videoPath.map(videoPath => {
                try {
                    const videoFilePath = path.resolve(DEFAULT_OUTPUT_DIR, videoPath);
                    if (!fsExistsSync(videoFilePath)) return null;
                    const videoBase64 = readFileSync(videoFilePath).toString("base64");
                    const fileExtension = path.extname(videoPath).slice(1).toLowerCase();
                    const mimeType = {
                        mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg",
                        mov: "video/quicktime", avi: "video/x-msvideo",
                    }[fileExtension] || "video/mp4";
                    return { dataUri: `data:${mimeType};base64,${videoBase64}`, mimeType, extension: fileExtension };
                } catch (e) { return null; }
            }).filter(Boolean);
        }
        if (test.tracePath) {
            try {
                const traceFilePath = path.resolve(DEFAULT_OUTPUT_DIR, test.tracePath);
                if (fsExistsSync(traceFilePath)) {
                    const traceBase64 = readFileSync(traceFilePath).toString("base64");
                    processed.tracePath = `data:application/zip;base64,${traceBase64}`;
                }
            } catch (e) { processed.tracePath = null; }
        }
        if (test.attachments && test.attachments.length > 0) {
            processed.attachments = test.attachments.map(attachment => {
                try {
                    const attachmentPath = path.resolve(DEFAULT_OUTPUT_DIR, attachment.path);
                    if (!fsExistsSync(attachmentPath)) return null;
                    const attachmentBase64 = readFileSync(attachmentPath).toString("base64");
                    return { ...attachment, dataUri: `data:${attachment.contentType};base64,${attachmentBase64}` };
                } catch (e) { return null; }
            }).filter(Boolean);
        }
        return processed;
    });

  // Prepare data for client-side rendering
  const pulseData = {
    runSummary,
    results: processedResults,
    suitesData,
    trendData: trendData || { overall: [], testRuns: {} },
    pieData: [
      { label: "Passed", value: runSummary.passed },
      { label: "Failed", value: runSummary.failed },
      { label: "Skipped", value: runSummary.skipped || 0 },
    ]
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="https://i.postimg.cc/v817w4sg/logo.png">
    <link rel="apple-touch-icon" href="https://i.postimg.cc/v817w4sg/logo.png">
    <script src="https://code.highcharts.com/highcharts.js" defer></script>
    <title>Playwright Pulse Report (Static Report)</title>
    <style>
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
        .highcharts-tooltip > span { background-color: rgba(10,10,10,0.92) !important; border-color: rgba(10,10,10,0.92) !important; color: #f5f5f5 !important; padding: 10px !important; border-radius: 6px !important; }
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
        .no-data, .no-tests, .no-steps, .no-data-chart, .tab-loading-placeholder { padding: 28px; text-align: center; color: var(--dark-gray-color); font-style: italic; font-size:1.1em; background-color: var(--light-gray-color); border-radius: var(--border-radius); margin: 18px 0; border: 1px dashed var(--medium-gray-color); }
        .no-data-chart {font-size: 0.95em; padding: 18px;}
        .ai-failure-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 22px; }
        .ai-failure-card { background: var(--card-background-color); border: 1px solid var(--border-color); border-left: 5px solid var(--danger-color); border-radius: var(--border-radius); box-shadow: var(--box-shadow-light); display: flex; flex-direction: column; }
        .ai-failure-card-header { padding: 15px 20px; border-bottom: 1px solid var(--light-gray-color); display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        .ai-failure-card-header h3 { margin: 0; font-size: 1.1em; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ai-failure-card-body { padding: 20px; }
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
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-title">
                <img id="report-logo" src="https://i.postimg.cc/v817w4sg/logo.png" alt="Report Logo">
                <h1>Playwright Pulse Report</h1>
            </div>
            <div class="run-info"><strong>Run Date:</strong> ${formatDate(
              runSummary.timestamp
            )}<br><strong>Total Duration:</strong> ${formatDuration(
    runSummary.duration
  )}</div>
        </header>
        <div class="tabs">
            <button class="tab-button active" data-tab="dashboard">Dashboard</button>
            <button class="tab-button" data-tab="test-runs">Test Run Summary</button>
            <button class="tab-button" data-tab="test-history">Test History</button>
            <button class="tab-button" data-tab="ai-failure-analyzer">AI Failure Analyzer</button>
        </div>

        <div id="dashboard" class="tab-content active">
            <div class="tab-loading-placeholder">Loading dashboard...</div>
        </div>
        <div id="test-runs" class="tab-content">
            <div class="tab-loading-placeholder">Loading test cases...</div>
        </div>
        
        <div id="test-history" class="tab-content">
          <h2 class="tab-main-title">Execution Trends</h2>
          <div class="trend-charts-row">
            <div class="trend-chart"><h3 class="chart-title-header">Test Volume & Outcome Trends</h3>
              ${
                trendData && trendData.overall && trendData.overall.length > 0
                  ? generateTestTrendsChart(trendData)
                  : '<div class="no-data">Overall trend data not available for test counts.</div>'
              }
            </div>
            <div class="trend-chart"><h3 class="chart-title-header">Execution Duration Trends</h3>
              ${
                trendData && trendData.overall && trendData.overall.length > 0
                  ? generateDurationTrendChart(trendData)
                  : '<div class="no-data">Overall trend data not available for durations.</div>'
              }
              </div>
          </div>
          <h2 class="tab-main-title">Test Distribution by Worker ${infoTooltip}</h2>
          <div class="trend-charts-row">
             <div class="trend-chart">
                ${generateWorkerDistributionChart(results)}
            </div>
          </div>
          <h2 class="tab-main-title">Individual Test History</h2>
          ${
            trendData &&
            trendData.testRuns &&
            Object.keys(trendData.testRuns).length > 0
              ? generateTestHistoryContent(trendData)
              : '<div class="no-data">Individual test history data not available.</div>'
          }
        </div>
        <div id="ai-failure-analyzer" class="tab-content">
            <div class="tab-loading-placeholder">Loading failure analyzer...</div>
        </div>
        <footer style="padding: 0.5rem; box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05); text-align: center; font-family: 'Segoe UI', system-ui, sans-serif;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; color: #333; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.5px;">
                <span>Created by</span>
                <a href="https://github.com/Arghajit47" target="_blank" rel="noopener noreferrer" style="color: #7737BF; font-weight: 700; font-style: italic; text-decoration: none; transition: all 0.2s ease;" onmouseover="this.style.color='#BF5C37'" onmouseout="this.style.color='#7737BF'">Arghajit Singha</a>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #666;">Crafted with precision</div>
        </footer>
    </div>
    <script>
    // --- START: Client-side Data and Generators ---
    window._pulseData = ${JSON.stringify(pulseData)};
    const loadedTabs = new Set(['test-history']); // Test History is server-rendered

    // --- Helper Functions (globally available in this script) ---
    if (typeof formatDuration === 'undefined') { 
        function formatDuration(ms) { 
            if (ms === undefined || ms === null || ms < 0) return "0.0s"; 
            return (ms / 1000).toFixed(1) + "s"; 
        }
    }
    const sanitizeHTML = (str) => {
        if (str === null || str === undefined) return "";
        return String(str).replace(/[&<>"']/g, match => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[match] || match));
    };
    const getStatusClass = (status) => {
      switch (String(status).toLowerCase()) {
        case "passed": return "status-passed";
        case "failed": return "status-failed";
        case "skipped": return "status-skipped";
        default: return "status-unknown";
      }
    };
    const getStatusIcon = (status) => {
        switch (String(status).toLowerCase()) {
            case 'passed': return '✅'; case 'failed': return '❌';
            case 'skipped': return '⏭️'; default: return '❓';
        }
    };
    const formatPlaywrightError = (str) => {
        if (!str) return "";
        return str
            .replace(/^(\\s+)/gm, match => match.replace(/ /g, " ").replace(/\\t/g, "  "))
            .replace(/<red>/g, '<span style="color: red;">').replace(/<green>/g, '<span style="color: green;">')
            .replace(/<dim>/g, '<span style="opacity: 0.6;">').replace(/<intensity>/g, '<span style="font-weight: bold;">')
            .replace(/<\\/color>/g, "</span>").replace(/<\\/intensity>/g, "</span>")
            .replace(/\\n/g, "<br>");
    };
    const getAttachmentIcon = (contentType) => {
        if (!contentType) return "📎";
        const normalizedType = contentType.toLowerCase();
        if (normalizedType.includes("pdf")) return "📄";
        if (normalizedType.includes("json")) return "{ }";
        if (/html/.test(normalizedType)) return "🌐";
        if (normalizedType.includes("xml")) return "<>";
        if (normalizedType.includes("csv")) return "📊";
        if (normalizedType.startsWith("text/")) return "📝";
        return "📎";
    };

    // --- Tab Content Generators ---
    function generateDashboardTabHTML() {
        const data = window._pulseData;
        const runSummary = data.runSummary;
        const totalTestsOr1 = runSummary.totalTests || 1;
        const passPercentage = Math.round((runSummary.passed / totalTestsOr1) * 100);
        const failPercentage = Math.round((runSummary.failed / totalTestsOr1) * 100);
        const skipPercentage = Math.round(((runSummary.skipped || 0) / totalTestsOr1) * 100);
        const avgTestDuration = runSummary.totalTests > 0 ? formatDuration(runSummary.duration / runSummary.totalTests) : "0.0s";
        return \`
            <div class="dashboard-grid">
                <div class="summary-card"><h3>Total Tests</h3><div class="value">\${runSummary.totalTests}</div></div>
                <div class="summary-card status-passed"><h3>Passed</h3><div class="value">\${runSummary.passed}</div><div class="trend-percentage">\${passPercentage}%</div></div>
                <div class="summary-card status-failed"><h3>Failed</h3><div class="value">\${runSummary.failed}</div><div class="trend-percentage">\${failPercentage}%</div></div>
                <div class="summary-card status-skipped"><h3>Skipped</h3><div class="value">\${runSummary.skipped || 0}</div><div class="trend-percentage">\${skipPercentage}%</div></div>
                <div class="summary-card"><h3>Avg. Test Time</h3><div class="value">\${avgTestDuration}</div></div>
                <div class="summary-card"><h3>Run Duration</h3><div class="value">\${formatDuration(runSummary.duration)}</div></div>
            </div>
            <div class="dashboard-bottom-row">
                <div style="display: grid; gap: 20px">
                    \${generatePieChart(data.pieData, 400, 390)}
                    \${runSummary.environment && Object.keys(runSummary.environment).length > 0 ? generateEnvironmentDashboard(runSummary.environment) : '<div class="no-data">Environment data not available.</div>'}
                </div>
                \${generateSuitesWidget(data.suitesData)}
            </div>
        \`;
    }

    function generateTestRunSummaryTabHTML() {
        const data = window._pulseData;
        const results = data.results || [];
        if (results.length === 0) return '<div class="no-tests">No test results found in this run.</div>';

        const filtersHTML = \`
            <div class="filters">
                <input type="text" id="filter-name" placeholder="Filter by test name/path..." style="border-color: black; border-style: outset;">
                <select id="filter-status">
                    <option value="">All Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="skipped">Skipped</option>
                </select>
                <select id="filter-browser">
                    <option value="">All Browsers</option>
                    \${Array.from(new Set((results || []).map(test => test.browser || "unknown"))).map(browser => \`<option value="\${sanitizeHTML(browser)}">\${sanitizeHTML(browser)}</option>\`).join("")}
                </select>
                <button id="expand-all-tests">Expand All</button>
                <button id="collapse-all-tests">Collapse All</button>
                <button id="clear-run-summary-filters" class="clear-filters-btn">Clear Filters</button>
            </div>
        \`;

        const testListHTML = results.map((test, index) => {
            const browser = test.browser || "unknown";
            const testFileParts = test.name.split(" > ");
            const testTitle = testFileParts[testFileParts.length - 1] || "Unnamed Test";
            return \`
                <div class="test-case" data-status="\${test.status}" data-browser="\${sanitizeHTML(browser)}" data-tags="\${(test.tags || []).join(",").toLowerCase()}">
                    <div class="test-case-header" role="button" aria-expanded="false" data-test-index="\${index}">
                        <div class="test-case-summary">
                            <span class="status-badge \${getStatusClass(test.status)}">\${String(test.status).toUpperCase()}</span>
                            <span class="test-case-title" title="\${sanitizeHTML(test.name)}">\${sanitizeHTML(testTitle)}</span>
                            <span class="test-case-browser">(\${sanitizeHTML(browser)})</span>
                        </div>
                        <div class="test-case-meta">
                            \${test.tags && test.tags.length > 0 ? test.tags.map(t => \`<span class="tag">\${sanitizeHTML(t)}</span>\`).join(" ") : ""}
                            <span class="test-duration">\${formatDuration(test.duration)}</span>
                        </div>
                    </div>
                    <div class="test-case-content" id="test-details-\${index}" style="display: none;"></div>
                </div>
            \`;
        }).join("");

        return filtersHTML + '<div class="test-cases-list">' + testListHTML + '</div>';
    }

    function generateAIFailureAnalyzerTabHTML() {
        const results = window._pulseData.results || [];
        const failedTests = results.filter(test => test.status === 'failed');
        if (failedTests.length === 0) {
            return '<h2 class="tab-main-title">AI Failure Analysis</h2><div class="no-data">Congratulations! No failed tests in this run.</div>';
        }
        return \`
            <h2 class="tab-main-title">AI Failure Analysis</h2>
            <div class="ai-analyzer-stats">
                <div class="stat-item"><span class="stat-number">\${failedTests.length}</span><span class="stat-label">Failed Tests</span></div>
                <div class="stat-item"><span class="stat-number">\${new Set(failedTests.map(t => t.browser)).size}</span><span class="stat-label">Browsers</span></div>
                <div class="stat-item"><span class="stat-number">\${Math.round(failedTests.reduce((sum, test) => sum + (test.duration || 0), 0) / 1000)}s</span><span class="stat-label">Total Duration</span></div>
            </div>
            <p class="ai-analyzer-description">Analyze failed tests using AI to get suggestions and potential fixes. Click the AI Fix button for specific failed test.</p>
            <div class="compact-failure-list">
                \${failedTests.map(test => {
                    const testTitle = test.name.split(" > ").pop() || "Unnamed Test";
                    const testJson = btoa(JSON.stringify(test));
                    const truncatedError = (test.errorMessage || "No error message").slice(0, 150) + (test.errorMessage && test.errorMessage.length > 150 ? "..." : "");
                    return \`
                        <div class="compact-failure-item">
                            <div class="failure-header">
                                <div class="failure-main-info">
                                    <h3 class="failure-title" title="\${sanitizeHTML(test.name)}">\${sanitizeHTML(testTitle)}</h3>
                                    <div class="failure-meta">
                                        <span class="browser-indicator">\${sanitizeHTML(test.browser || 'unknown')}</span>
                                        <span class="duration-indicator">\${formatDuration(test.duration)}</span>
                                    </div>
                                </div>
                                <button class="compact-ai-btn" onclick="getAIFix(this)" data-test-json="\${testJson}"><span class="ai-text">AI Fix</span></button>
                            </div>
                            <div class="failure-error-preview">
                                <div class="error-snippet">\${formatPlaywrightError(truncatedError)}</div>
                                <button class="expand-error-btn" onclick="toggleErrorDetails(this)"><span class="expand-text">Show Full Error</span><span class="expand-icon">▼</span></button>
                            </div>
                            <div class="full-error-details" style="display: none;"><div class="full-error-content">\${formatPlaywrightError(test.errorMessage || "No detailed error message available")}</div></div>
                        </div>
                    \`;
                }).join('')}
            </div>
            <div id="ai-fix-modal" class="ai-modal-overlay" onclick="closeAiModal()">
                <div class="ai-modal-content" onclick="event.stopPropagation()">
                    <div class="ai-modal-header"><h3 id="ai-fix-modal-title">AI Analysis</h3><span class="ai-modal-close" onclick="closeAiModal()">×</span></div>
                    <div class="ai-modal-body" id="ai-fix-modal-content"></div>
                </div>
            </div>
        \`;
    }

    function generateTestDetailsHTML(testIndex) {
        const test = window._pulseData.results[testIndex];
        if (!test) return '<div class="no-data">Test data not found.</div>';
        const browser = test.browser || "unknown";
        const generateStepsHTML = (steps, depth = 0) => {
            if (!steps || steps.length === 0) return "<div class='no-steps'>No steps recorded.</div>";
            return steps.map((step) => {
                const hasNestedSteps = step.steps && step.steps.length > 0;
                const isHook = step.hookType;
                const stepClass = isHook ? \`step-hook step-hook-\${step.hookType}\` : "";
                const hookIndicator = isHook ? \` (\${step.hookType} hook)\` : "";
                return \`<div class="step-item" style="--depth: \${depth};">
                    <div class="step-header \${stepClass}" role="button" aria-expanded="false">
                        <span class="step-icon">\${getStatusIcon(step.status)}</span>
                        <span class="step-title">\${sanitizeHTML(step.title)}\${hookIndicator}</span>
                        <span class="step-duration">\${formatDuration(step.duration)}</span>
                    </div>
                    <div class="step-details" style="display: none;">
                        \${step.codeLocation ? \`<div class="step-info code-section"><strong>Location:</strong> \${sanitizeHTML(step.codeLocation)}</div>\` : ""}
                        \${step.errorMessage ? \`<div class="test-error-summary"><pre class="stack-trace">\${formatPlaywrightError(step.errorMessage)}</pre></div>\` : ""}
                        \${hasNestedSteps ? \`<div class="nested-steps">\${generateStepsHTML(step.steps, depth + 1)}</div>\` : ""}
                    </div>
                </div>\`;
            }).join("");
        };
        
        let html = \`
            <p><strong>Full Path:</strong> \${sanitizeHTML(test.name)}</p>
            <p><strong>Worker:</strong> \${sanitizeHTML(test.workerId)} / \${sanitizeHTML(test.totalWorkers)}</p>
            \${test.errorMessage ? \`<div class="test-error-summary"><pre>\${formatPlaywrightError(test.errorMessage)}</pre><button class="copy-btn" onclick="copyErrorToClipboard(this)">Copy</button></div>\` : ""}
            \${test.snippet ? \`<div class="code-section"><h4>Error Snippet</h4><pre><code>\${formatPlaywrightError(test.snippet)}</code></pre></div>\` : ""}
            <h4>Steps</h4>
            <div class="steps-list">\${generateStepsHTML(test.steps)}</div>
        \`;

        if (test.stdout && test.stdout.length > 0) {
            const logId = \`stdout-log-\${test.id || testIndex}\`;
            html += \`<div class="console-output-section"><h4>Console Output (stdout)<button class="copy-btn" onclick="copyLogContent('\${logId}', this)">Copy</button></h4><div class="log-wrapper"><pre id="\${logId}" class="console-log stdout-log">\${formatPlaywrightError(test.stdout.map(line => sanitizeHTML(line)).join("\\n"))}</pre></div></div>\`;
        }
        if (test.stderr && test.stderr.length > 0) {
            html += \`<div class="console-output-section"><h4>Console Output (stderr)</h4><pre class="console-log stderr-log">\${test.stderr.map(line => sanitizeHTML(line)).join("\\n")}</pre></div>\`;
        }
        if (test.screenshots && test.screenshots.length > 0) {
            html += \`<div class="attachments-section"><h4>Screenshots</h4><div class="attachments-grid">\${test.screenshots.map((screenshot, index) => \`
                <div class="attachment-item"><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="\${screenshot}" alt="Screenshot \${index + 1}" class="lazy-load-image"><div class="attachment-info"><div class="trace-actions"><a href="\${screenshot}" target="_blank" download="screenshot-\${index}.png">Download</a></div></div></div>
            \`).join("")}</div></div>\`;
        }
        if (test.videoPath && test.videoPath.length > 0) {
            html += \`<div class="attachments-section"><h4>Videos</h4><div class="attachments-grid">\${test.videoPath.map((video, index) => \`
                <div class="attachment-item video-item"><video controls preload="none" class="lazy-load-video"><source data-src="\${video.dataUri}" type="\${video.mimeType}"></video><div class="attachment-info"><div class="trace-actions"><a href="\${video.dataUri}" target="_blank" download="video-\${index}.\${video.extension}">Download</a></div></div></div>
            \`).join("")}</div></div>\`;
        }
        if (test.tracePath) {
            html += \`<div class="attachments-section"><h4>Trace File</h4><div class="attachments-grid"><div class="attachment-item generic-attachment"><div class="attachment-icon">📄</div><div class="attachment-caption"><span class="attachment-name">trace.zip</span></div><div class="attachment-info"><div class="trace-actions"><a href="#" data-href="\${test.tracePath}" class="lazy-load-attachment" download="trace.zip">Download</a></div></div></div></div></div>\`;
        }
        if (test.attachments && test.attachments.length > 0) {
            html += \`<div class="attachments-section"><h4>Other Attachments</h4><div class="attachments-grid">\${test.attachments.map(attachment => \`<div class="attachment-item generic-attachment"><div class="attachment-icon">\${getAttachmentIcon(attachment.contentType)}</div><div class="attachment-caption"><span class="attachment-name" title="\${sanitizeHTML(attachment.name)}">\${sanitizeHTML(attachment.name)}</span><span class="attachment-type">\${sanitizeHTML(attachment.contentType)}</span></div><div class="attachment-info"><div class="trace-actions"><a href="\${attachment.dataUri}" target="_blank" class="view-full">View</a><a href="\${attachment.dataUri}" download="\${sanitizeHTML(attachment.name)}">Download</a></div></div></div>\`).join("")}</div></div>\`;
        }
        return html;
    }
    
    // --- START: Main Execution ---
    document.addEventListener('DOMContentLoaded', () => {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const contentGenerators = {
            'dashboard': generateDashboardTabHTML,
            'test-runs': generateTestRunSummaryTabHTML,
            'ai-failure-analyzer': generateAIFailureAnalyzerTabHTML,
        };

        const initLazyObserver = () => {
            const lazyLoadElements = document.querySelectorAll('.lazy-load-chart, .lazy-load-image, .lazy-load-video, .lazy-load-attachment');
            if ('IntersectionObserver' in window) {
                let lazyObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const element = entry.target;
                            if (element.classList.contains('lazy-load-image')) { if (element.dataset.src) element.src = element.dataset.src; }
                            else if (element.classList.contains('lazy-load-video')) { const source = element.querySelector('source'); if (source && source.dataset.src) { source.src = source.dataset.src; element.load(); } }
                            else if (element.classList.contains('lazy-load-attachment')) { if (element.dataset.href) element.href = element.dataset.href; }
                            else if (element.classList.contains('lazy-load-chart')) { const renderFn = element.dataset.renderFunctionName; if(renderFn && window[renderFn]) window[renderFn](); }
                            observer.unobserve(element);
                        }
                    });
                }, { rootMargin: "0px 0px 200px 0px" });
                lazyLoadElements.forEach(el => lazyObserver.observe(el));
            } else { // Fallback
                lazyLoadElements.forEach(el => {
                    if (el.classList.contains('lazy-load-image') && el.dataset.src) el.src = el.dataset.src;
                    else if (el.classList.contains('lazy-load-video')) { const s = el.querySelector('source'); if (s && s.dataset.src) { s.src = s.dataset.src; el.load(); } }
                    else if (el.classList.contains('lazy-load-attachment') && el.dataset.href) el.href = el.dataset.href;
                    else if (el.classList.contains('lazy-load-chart')) { const r = el.dataset.renderFunctionName; if(r && window[r]) window[r](); }
                });
            }
        };

        const loadTabContent = (tabId) => {
            const activeContent = document.getElementById(tabId);
            if (!activeContent || loadedTabs.has(tabId)) return;

            if (contentGenerators[tabId]) {
                activeContent.innerHTML = contentGenerators[tabId]();
                loadedTabs.add(tabId);
                // Re-initialize event listeners and observers for new content
                if (tabId === 'test-runs') setupTestRunSummaryInteractivity();
            }
            initLazyObserver(); // Always re-run observer for new charts/media
        };

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                loadTabContent(tabId);
                document.getElementById(tabId)?.classList.add('active');
            });
        });
        
        loadTabContent('dashboard'); // Initial load for the default active tab
        initLazyObserver(); // Initial observer for Test History tab
    });
    
    function setupTestRunSummaryInteractivity() {
        // --- Test Run Summary Filters ---
        const nameFilter = document.getElementById('filter-name');
        const statusFilter = document.getElementById('filter-status');
        const browserFilter = document.getElementById('filter-browser');
        const clearBtn = document.getElementById('clear-run-summary-filters');
        
        const filterTestCases = () => {
            const nameVal = nameFilter.value.toLowerCase();
            const statusVal = statusFilter.value;
            const browserVal = browserFilter.value;
            document.querySelectorAll('#test-runs .test-case').forEach(el => {
                const titleEl = el.querySelector('.test-case-title');
                const fullName = titleEl ? titleEl.getAttribute('title').toLowerCase() : "";
                const nameMatch = fullName.includes(nameVal);
                const statusMatch = !statusVal || el.getAttribute('data-status') === statusVal;
                const browserMatch = !browserVal || el.getAttribute('data-browser') === browserVal;
                el.style.display = (nameMatch && statusMatch && browserMatch) ? '' : 'none';
            });
        };
        nameFilter.addEventListener('input', filterTestCases);
        statusFilter.addEventListener('change', filterTestCases);
        browserFilter.addEventListener('change', filterTestCases);
        clearBtn.addEventListener('click', () => { nameFilter.value = ''; statusFilter.value = ''; browserFilter.value = ''; filterTestCases(); });

        // --- Test Detail Expansion ---
        document.querySelectorAll('#test-runs .test-case-header').forEach(header => {
            header.addEventListener('click', () => {
                const testIndex = header.dataset.testIndex;
                const contentDiv = document.getElementById(\`test-details-\${testIndex}\`);
                const isExpanded = header.getAttribute('aria-expanded') === 'true';

                if (contentDiv) {
                    if (!isExpanded && contentDiv.innerHTML.trim() === '') {
                        // First time opening: generate and inject content
                        contentDiv.innerHTML = generateTestDetailsHTML(testIndex);
                        // Setup step toggles within this new content
                        contentDiv.querySelectorAll('.step-header').forEach(stepHeader => {
                            stepHeader.addEventListener('click', () => {
                                const details = stepHeader.nextElementSibling;
                                if (details) {
                                    const isStepExpanded = details.style.display === 'block';
                                    details.style.display = isStepExpanded ? 'none' : 'block';
                                    stepHeader.setAttribute('aria-expanded', String(!isStepExpanded));
                                }
                            });
                        });
                    }
                    contentDiv.style.display = isExpanded ? 'none' : 'block';
                }
                header.setAttribute('aria-expanded', String(!isExpanded));
            });
        });
        
        document.getElementById('expand-all-tests')?.addEventListener('click', () => {
            document.querySelectorAll('#test-runs .test-case-header').forEach(header => {
                if(header.getAttribute('aria-expanded') !== 'true') header.click();
            });
        });
        document.getElementById('collapse-all-tests')?.addEventListener('click', () => {
            document.querySelectorAll('#test-runs .test-case-header').forEach(header => {
                if(header.getAttribute('aria-expanded') === 'true') header.click();
            });
        });
    }

    // --- Global Utility Functions needed by generated HTML ---
    function copyLogContent(elementId, button) {
        const logEl = document.getElementById(elementId);
        if (!logEl) return;
        navigator.clipboard.writeText(logEl.innerText).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => { button.textContent = 'Copy'; }, 2000);
        }).catch(() => { button.textContent = 'Failed'; });
    }
    function copyErrorToClipboard(button) {
      const errorContainer = button.closest('.test-error-summary');
      if (!errorContainer) return;
      let errorText;
      const preEl = errorContainer.querySelector('pre');
      if (preEl) { errorText = preEl.textContent; } else {
        const cloned = errorContainer.cloneNode(true);
        cloned.querySelector('button')?.remove();
        errorText = cloned.textContent;
      }
      if (!errorText) return;
      navigator.clipboard.writeText(errorText.trim()).then(() => { button.textContent = 'Copied!'; setTimeout(() => { button.textContent = 'Copy'; }, 2000); });
    }
    function getAIFix(button) {
        const modal = document.getElementById('ai-fix-modal');
        const modalContent = document.getElementById('ai-fix-modal-content');
        const modalTitle = document.getElementById('ai-fix-modal-title');
        modal.style.display = 'flex';
        modalTitle.textContent = 'Analyzing...';
        modalContent.innerHTML = '<div class="ai-loader"></div>';

        try {
            const test = JSON.parse(atob(button.dataset.testJson));
            const shortTestName = test.name.split(' > ').pop();
            modalTitle.textContent = \`Analysis for: \${shortTestName}\`;
            
            fetch('https://ai-test-analyser.netlify.app/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testName: test.name,
                    failureLogsAndErrors: test.errorMessage || '',
                    codeSnippet: test.snippet || '',
                }),
            })
            .then(res => res.ok ? res.json() : res.text().then(text => Promise.reject(new Error(text || 'API Error'))))
            .then(data => {
                const escapeHtml = (unsafe) => unsafe.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
                let html = \`<h4>Analysis</h4><p>\${escapeHtml(data.rootCause || 'N/A')}</p><h4>Suggestions</h4><div class="suggestions-list">\`;
                if (data.suggestedFixes && data.suggestedFixes.length > 0) {
                    html += data.suggestedFixes.map(fix => \`
                        <div class="suggestion-item"><p><b>\${escapeHtml(fix.description)}</b></p>
                        \${fix.codeSnippet ? \`<div class="code-section"><pre><code>\${escapeHtml(fix.codeSnippet)}</code></pre></div>\` : ''}
                        </div>
                    \`).join('');
                } else { html += '<p>No suggestions provided.</p>'; }
                html += '</div>';
                modalContent.innerHTML = html;
            })
            .catch(err => {
                modalContent.innerHTML = \`<div class="test-error-summary"><strong>Error:</strong> \${err.message}</div>\`;
            });
        } catch (e) {
            modalTitle.textContent = 'Error';
            modalContent.innerHTML = \`<div class="test-error-summary">Could not process test data.</div>\`;
        }
    }
    function closeAiModal() { document.getElementById('ai-fix-modal').style.display = 'none'; }
    function toggleErrorDetails(button) {
        const errorDetails = button.closest('.compact-failure-item').querySelector('.full-error-details');
        const expandText = button.querySelector('.expand-text');
        const isExpanded = errorDetails.style.display === 'block';
        errorDetails.style.display = isExpanded ? 'none' : 'block';
        expandText.textContent = isExpanded ? 'Show Full Error' : 'Hide Full Error';
        button.classList.toggle('expanded', !isExpanded);
    }
    </script>
</body>
</html>
  `;
}
async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`Executing script: ${scriptPath}...`));
    const process = fork(scriptPath, [], {
      stdio: "inherit",
    });

    process.on("error", (err) => {
      console.error(chalk.red(`Failed to start script: ${scriptPath}`), err);
      reject(err);
    });

    process.on("exit", (code) => {
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
        (file) => file.startsWith(HISTORY_FILE_PREFIX) && file.endsWith(".json")
      )
      .map((file) => {
        const timestampPart = file
          .replace(HISTORY_FILE_PREFIX, "")
          .replace(".json", "");
        return {
          name: file,
          path: path.join(historyDir, file),
          timestamp: parseInt(timestampPart, 10),
        };
      })
      .filter((file) => !isNaN(file.timestamp))
      .sort((a, b) => b.timestamp - a.timestamp);

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

  if (historicalRuns.length > 0) {
    historicalRuns.forEach((histRunReport) => {
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
            (test) => ({
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
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
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
main().catch((err) => {
  console.error(
    chalk.red.bold(`Unhandled error during script execution: ${err.message}`)
  );
  console.error(err.stack);
  process.exit(1);
});
