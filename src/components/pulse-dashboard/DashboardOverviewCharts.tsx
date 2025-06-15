
'use client';

import type { PlaywrightPulseReport, DetailedTestResult } from '@/types/playwright.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Info, GanttChartSquare } from 'lucide-react';
import React, { useMemo, useEffect } from 'react'; // Added useEffect

// Import Highcharts
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsGantt from 'highcharts/modules/gantt';

// --- Component Props and Data Interfaces ---
interface DashboardOverviewChartsProps {
  currentRun: PlaywrightPulseReport | null;
  loading: boolean;
  error: string | null;
}

const COLORS = {
  passed: 'hsl(var(--chart-3))',
  failed: 'hsl(var(--destructive))',
  skipped: 'hsl(var(--accent))',
  timedOut: 'hsl(var(--destructive))',
  pending: 'hsl(var(--muted-foreground))',
};

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// --- Main Component ---
export function DashboardOverviewCharts({ currentRun, loading, error }: DashboardOverviewChartsProps) {
  // Initialize Gantt module on client-side after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure this runs only in the browser
      if (typeof Highcharts === 'object' && Highcharts !== null) {
        if (typeof HighchartsGantt === 'function') {
          try {
            HighchartsGantt(Highcharts);
          } catch (e) {
             console.error('Error applying Highcharts Gantt module:', e);
          }
        } else {
          console.error('Failed to initialize Highcharts Gantt: Imported HighchartsGantt is not a function.');
        }
      } else {
        console.error('Highcharts object is not available for Gantt initialization.');
      }
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // --- Base Highcharts Options ---
  const highchartsBaseOptions = useMemo((): Highcharts.Options => ({
    credits: { enabled: false },
    title: { text: undefined },
    chart: {
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'inherit',
      },
    },
    tooltip: {
      backgroundColor: 'hsl(var(--card))',
      borderColor: 'hsl(var(--border))',
      style: {
        color: 'hsl(var(--foreground))',
      },
      outside: true,
    },
    legend: {
      itemStyle: {
        color: 'hsl(var(--muted-foreground))',
      },
      itemHoverStyle: {
        color: 'hsl(var(--foreground))',
      },
    },
  }), []);

  // --- Chart 1: Test Distribution (Pie Chart) ---
  const testDistributionData = useMemo(() => {
    if (!currentRun?.run) return [];
    const { passed, failed, skipped, timedOut = 0, pending = 0 } = currentRun.run;
    return [
      { name: 'Passed', y: passed, color: COLORS.passed },
      { name: 'Failed', y: failed + timedOut, color: COLORS.failed },
      { name: 'Skipped', y: skipped, color: COLORS.skipped },
      ...(pending > 0 ? [{ name: 'Pending', y: pending, color: COLORS.pending }] : []),
    ].filter(d => d.y > 0);
  }, [currentRun]);

  const testDistributionOptions = useMemo((): Highcharts.Options => ({
    ...highchartsBaseOptions,
    chart: { ...highchartsBaseOptions.chart, type: 'pie' },
    tooltip: { pointFormat: '{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' },
    plotOptions: {
      pie: {
        innerSize: '60%',
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: { enabled: false },
        showInLegend: true,
        borderWidth: 2,
        borderColor: 'hsl(var(--background))',
      },
    },
    series: [{
      type: 'pie',
      name: 'Tests',
      data: testDistributionData,
    }],
  }), [highchartsBaseOptions, testDistributionData]);

  // --- Chart 2: Tests by Browser (Stacked Bar Chart) ---
  const browserDistributionRaw = useMemo(() => {
    if (!currentRun?.results) return { categories: [], passed: [], failed: [], skipped: [] };
    const acc = currentRun.results.reduce((acc, test: DetailedTestResult) => {
        const browserName = test.browser || 'Unknown';
        if (!acc[browserName]) {
            acc[browserName] = { passed: 0, failed: 0, skipped: 0 };
        }
        if (test.status === 'passed') acc[browserName].passed++;
        else if (test.status === 'failed' || test.status === 'timedOut') acc[browserName].failed++;
        else if (test.status === 'skipped') acc[browserName].skipped++;
        return acc;
    }, {} as Record<string, { passed: number; failed: number; skipped: number;}>);
    
    const categories = Object.keys(acc);
    return {
        categories,
        passed: categories.map(cat => acc[cat].passed),
        failed: categories.map(cat => acc[cat].failed),
        skipped: categories.map(cat => acc[cat].skipped),
    };
  }, [currentRun]);

  const testsByBrowserOptions = useMemo((): Highcharts.Options => ({
    ...highchartsBaseOptions,
    chart: { ...highchartsBaseOptions.chart, type: 'bar' },
    xAxis: {
        categories: browserDistributionRaw.categories,
        labels: { style: { color: 'hsl(var(--muted-foreground))' } },
    },
    yAxis: {
        min: 0,
        title: { text: 'Number of Tests', style: { color: 'hsl(var(--muted-foreground))' } },
        labels: { style: { color: 'hsl(var(--muted-foreground))' } },
        gridLineColor: 'hsl(var(--border))',
        stackLabels: {
            enabled: true,
            style: { color: 'hsl(var(--foreground))', textOutline: 'none' }
        }
    },
    plotOptions: { bar: { stacking: 'normal' } },
    colors: [COLORS.passed, COLORS.failed, COLORS.skipped],
    series: [
        { type: 'bar', name: 'Passed', data: browserDistributionRaw.passed },
        { type: 'bar', name: 'Failed', data: browserDistributionRaw.failed },
        { type: 'bar', name: 'Skipped', data: browserDistributionRaw.skipped },
    ],
  }), [highchartsBaseOptions, browserDistributionRaw]);

  // --- Chart 3: Failed Tests Duration ---
  const failedTestsChartData = useMemo(() => {
    if (!currentRun?.results) return { categories: [], data: [] };
    const failedTests = currentRun.results
        .filter(test => (test.status === 'failed' || test.status === 'timedOut') && test.duration > 0)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    return {
        categories: failedTests.map(t => t.name.split(' > ').pop() || t.name),
        data: failedTests.map(t => t.duration),
    };
  }, [currentRun]);

  const failedTestsOptions = useMemo((): Highcharts.Options => ({
    ...highchartsBaseOptions,
    chart: { ...highchartsBaseOptions.chart, type: 'column' },
    xAxis: {
        categories: failedTestsChartData.categories,
        labels: {
            style: { color: 'hsl(var(--muted-foreground))' },
            rotation: -45,
            align: 'right',
        },
    },
    yAxis: {
        title: { text: 'Duration', style: { color: 'hsl(var(--muted-foreground))' } },
        labels: {
            formatter: function() { return formatDuration(this.value as number); },
            style: { color: 'hsl(var(--muted-foreground))' }
        },
        gridLineColor: 'hsl(var(--border))',
    },
    tooltip: {
        formatter: function() {
            return `<b>${this.key}</b><br/>Duration: ${formatDuration(this.y as number)}`;
        }
    },
    legend: { enabled: false },
    series: [{
        type: 'column',
        name: 'Duration',
        data: failedTestsChartData.data,
        color: COLORS.failed
    }]
  }), [highchartsBaseOptions, failedTestsChartData]);

  // --- Chart 4: Slowest Tests ---
  const slowestTestsChartData = useMemo(() => {
      if (!currentRun?.results) return { categories: [], data: [] };
      const slowestTests = [...currentRun.results]
          .sort((a,b) => b.duration - a.duration)
          .slice(0, 5);
      return {
          categories: slowestTests.map(t => t.name.split(' > ').pop() || t.name),
          data: slowestTests.map(t => ({
              y: t.duration,
              color: COLORS[t.status as keyof typeof COLORS] || COLORS.pending,
              status: t.status 
          })),
      };
  }, [currentRun]);

  const slowestTestsOptions = useMemo((): Highcharts.Options => ({
      ...highchartsBaseOptions,
      chart: { ...highchartsBaseOptions.chart, type: 'column' },
      xAxis: {
          categories: slowestTestsChartData.categories,
          labels: { style: { color: 'hsl(var(--muted-foreground))' } }
      },
      yAxis: {
          title: { text: 'Duration', style: { color: 'hsl(var(--muted-foreground))' } },
          labels: { formatter: function() { return formatDuration(this.value as number); }, style: { color: 'hsl(var(--muted-foreground))' } },
          gridLineColor: 'hsl(var(--border))',
      },
      tooltip: {
        formatter: function() {
            const point = this.point as any;
            return `<b>${this.key}</b><br/>Status: ${point.status}<br/>Duration: ${formatDuration(this.y as number)}`;
        }
    },
      legend: { enabled: false },
      series: [{
          type: 'column',
          name: 'Duration',
          data: slowestTestsChartData.data,
      }]
  }), [highchartsBaseOptions, slowestTestsChartData]);
  
  // --- Chart 5: Tests per Suite (Stacked Bar Chart) ---
  const testsPerSuiteChartData = useMemo(() => {
    if (!currentRun?.results) return { categories: [], passed: [], failed: [], skipped: [], pending: [] };
    
    const suiteDistributionRaw = currentRun.results.reduce((acc, test: DetailedTestResult) => {
        const suiteName = test.suiteName || 'Unknown Suite';
        if (!acc[suiteName]) {
            acc[suiteName] = { passed: 0, failed: 0, skipped: 0, pending: 0 };
        }
        if (test.status === 'passed') acc[suiteName].passed++;
        else if (test.status === 'failed' || test.status === 'timedOut') acc[suiteName].failed++;
        else if (test.status === 'skipped') acc[suiteName].skipped++;
        else if (test.status === 'pending') acc[suiteName].pending++;
        return acc;
    }, {} as Record<string, { passed: number; failed: number; skipped: number; pending: number; }>);

    const categories = Object.keys(suiteDistributionRaw);
    const showPending = categories.some(cat => suiteDistributionRaw[cat].pending > 0);

    return {
        categories,
        passed: categories.map(cat => suiteDistributionRaw[cat].passed),
        failed: categories.map(cat => suiteDistributionRaw[cat].failed),
        skipped: categories.map(cat => suiteDistributionRaw[cat].skipped),
        pending: categories.map(cat => suiteDistributionRaw[cat].pending),
        showPending,
    };
  }, [currentRun]);

  const testsPerSuiteOptions = useMemo((): Highcharts.Options => {
    const seriesData = [
        { type: 'bar' as const, name: 'Passed', data: testsPerSuiteChartData.passed, color: COLORS.passed },
        { type: 'bar' as const, name: 'Failed', data: testsPerSuiteChartData.failed, color: COLORS.failed },
        { type: 'bar' as const, name: 'Skipped', data: testsPerSuiteChartData.skipped, color: COLORS.skipped },
    ];
    if (testsPerSuiteChartData.showPending) {
        seriesData.push({ type: 'bar' as const, name: 'Pending', data: testsPerSuiteChartData.pending, color: COLORS.pending });
    }
    return {
        ...highchartsBaseOptions,
        chart: { ...highchartsBaseOptions.chart, type: 'bar', height: Math.max(250, testsPerSuiteChartData.categories.length * 40 + 80) },
        xAxis: {
            categories: testsPerSuiteChartData.categories,
            labels: { style: { color: 'hsl(var(--muted-foreground))' } },
        },
        yAxis: {
            min: 0,
            title: { text: 'Number of Tests', style: { color: 'hsl(var(--muted-foreground))' } },
            labels: { style: { color: 'hsl(var(--muted-foreground))' } },
            gridLineColor: 'hsl(var(--border))',
            stackLabels: {
                enabled: true,
                style: { color: 'hsl(var(--foreground))', textOutline: 'none' }
            }
        },
        plotOptions: { bar: { stacking: 'normal' } },
        series: seriesData,
    };
  }, [highchartsBaseOptions, testsPerSuiteChartData]);

  // --- Chart 6: Worker Utilization (Gantt Chart) ---
  const workerGanttData = useMemo(() => {
    if (!currentRun?.run || !currentRun.results) return [];
    const runStartTime = new Date(currentRun.run.timestamp).getTime();
    if (isNaN(runStartTime)) return [];

    return currentRun.results
      .filter(test => 
        test.workerId != null && 
        test.startTime && !isNaN(new Date(test.startTime).getTime()) &&
        typeof test.duration === 'number' && test.duration >= 0 // Ensure duration is non-negative
      )
      .map(test => {
        const testStartTime = new Date(test.startTime).getTime();
        const startOffset = testStartTime - runStartTime;
        return {
          id: test.id,
          name: test.name.split(' > ').pop() || test.name,
          workerId: String(test.workerId), // Ensure workerId is string for categories
          startOffset: startOffset < 0 ? 0 : startOffset, // Ensure no negative start offset
          duration: test.duration,
          color: COLORS[test.status as keyof typeof COLORS] || COLORS.pending,
          status: test.status,
        };
      });
  }, [currentRun]);
  
  const ganttTimeDomain = useMemo(() => {
    if (workerGanttData.length === 0) return [0, 1000]; // Default if no data
    const maxEndTime = Math.max(0, ...workerGanttData.map(d => d.startOffset + d.duration));
    return [0, Math.max(1000, Math.ceil(maxEndTime / 1000) * 1000)]; // Round up to nearest second, ensure min 1s
  }, [workerGanttData]);
  
  const workerCategories = useMemo(() => 
    Array.from(new Set(workerGanttData.map(d => d.workerId))).sort((a,b) => parseInt(a) - parseInt(b))
  , [workerGanttData]);

  const workerUtilizationOptions = useMemo((): Highcharts.Options => ({
    ...highchartsBaseOptions,
    chart: {
      ...highchartsBaseOptions.chart,
      // type: 'gantt', // constructorType handles this
      height: Math.max(200, workerCategories.length * 35 + 100)
    },
    title: { text: undefined },
    xAxis: {
      type: 'linear',
      min: ganttTimeDomain[0],
      max: ganttTimeDomain[1],
      labels: {
        style: { color: 'hsl(var(--muted-foreground))' },
        formatter: function() { return formatDuration(this.value as number); }
      },
      gridLineColor: 'hsl(var(--border))',
      opposite: true,
    },
    yAxis: {
      type: 'category',
      categories: workerCategories,
      labels: { style: { color: 'hsl(var(--muted-foreground))' } },
      gridLineColor: 'hsl(var(--border))',
    },
    tooltip: {
      formatter: function() {
        const point = this.point as any;
        if (!point || !point.options || !point.options.custom) return '';
        return `<b>${point.options.name}</b><br/>Worker: ${point.yCategory}<br/>Status: ${point.options.custom.status}<br/>Duration: ${formatDuration(point.options.custom.duration)}`;
      }
    },
    series: [{
      type: 'gantt',
      name: 'Tests',
      data: workerGanttData.map(d => ({
        id: d.id,
        name: d.name,
        start: d.startOffset,
        end: d.startOffset + d.duration,
        y: workerCategories.indexOf(d.workerId),
        color: d.color,
        custom: { duration: d.duration, status: d.status }
      })),
      dataLabels: {
        enabled: true,
        align: 'left',
        format: '{point.name}',
        style: {
          fontSize: '9px',
          fontWeight: 'normal',
          color: 'hsl(var(--foreground))',
          textOutline: 'none',
        },
        padding: 3,
        allowOverlap: true,
      }
    }],
    plotOptions: {
      gantt: {
        pathfinder: {
          enabled: true,
          lineWidth: 1,
          dashStyle: 'dot',
          lineColor: 'hsl(var(--muted-foreground))'
        },
        dataLabels: {
          style: {
            textOutline: 'none'
          }
        }
      }
    },
    credits: { enabled: false }
  }), [highchartsBaseOptions, workerGanttData, workerCategories, ganttTimeDomain]);

  const canRenderGantt = workerGanttData.length > 0 && workerCategories.length > 0;
  let ganttAlertMessage: string | null = null;
  if (!loading && currentRun && !canRenderGantt) {
    if (!currentRun.results || currentRun.results.length === 0) {
      ganttAlertMessage = "No test results found in the current run to generate the Gantt chart.";
    } else {
      let issues: string[] = [];
      const hasAnyWorkerId = currentRun.results.some(t => t.workerId != null);
      const hasAnyValidStartTime = currentRun.results.some(t => t.startTime && !isNaN(new Date(t.startTime).getTime()));
      const hasAnyValidDuration = currentRun.results.some(t => typeof t.duration === 'number' && t.duration >= 0);

      if (!hasAnyWorkerId) issues.push("no tests have 'workerId'");
      else if (currentRun.results.some(t => t.workerId == null && (t.startTime && typeof t.duration === 'number' && t.duration >=0))) {
        issues.push("some tests are missing 'workerId'");
      }

      if (!hasAnyValidStartTime) issues.push("no tests have a valid 'startTime'");
      else if (currentRun.results.some(t => (!t.startTime || isNaN(new Date(t.startTime).getTime())) && (t.workerId != null && typeof t.duration === 'number' && t.duration >=0))) {
        issues.push("some tests have invalid or missing 'startTime'");
      }
      
      if (!hasAnyValidDuration) issues.push("no tests have a valid 'duration'");
      else if (currentRun.results.some(t => (typeof t.duration !== 'number' || t.duration < 0) && (t.workerId != null && t.startTime))) {
        issues.push("some tests have invalid or missing 'duration'");
      }
      
      if (issues.length > 0) {
          ganttAlertMessage = `Data for the worker utilization chart could not be generated. Issues found: ${issues.join(', ')}.`;
      } else if (workerGanttData.length === 0 && currentRun.results.length > 0) {
          ganttAlertMessage = "Worker utilization data could not be generated. This might be because all tests have zero duration or other data inconsistencies preventing their display on the timeline.";
      } else {
          ganttAlertMessage = "Worker utilization data could not be generated. Ensure tests have valid 'workerId', 'startTime', and 'duration >= 0'.";
      }
    }
  }
  
  // --- Render Logic ---
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="shadow-lg rounded-xl"><CardHeader><Skeleton className="h-5 w-3/4 rounded-md" /><Skeleton className="h-4 w-1/2 mt-1 rounded-md" /></CardHeader><CardContent><Skeleton className="h-48 w-full rounded-lg" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (error && !currentRun) {
    return (
      <Alert variant="destructive" className="mt-6 rounded-lg"><Terminal className="h-4 w-4" /><AlertTitle>Error Loading Chart Data</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
    );
  }

  if (!currentRun || !currentRun.run) {
    return (
      <Alert className="mt-6 rounded-lg border-primary/30 bg-primary/5 text-primary"><Info className="h-4 w-4 text-primary" /><AlertTitle>No Data for Charts</AlertTitle><AlertDescription>Current run data is not available to display charts. Error: {error || "Report might be empty or malformed."}</AlertDescription></Alert>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Test Distribution</CardTitle>
            <CardDescription className="text-xs">Passed, Failed, Skipped for this run.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
            {testDistributionData.length > 0 ? 
                <HighchartsReact highcharts={Highcharts} options={testDistributionOptions} /> :
                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No data for Test Distribution.</p></div>
            }
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader>
            <CardTitle>Tests by Browser</CardTitle>
            <CardDescription className="text-xs">Test outcomes per browser.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
            {browserDistributionRaw.categories.length > 0 ?
                <HighchartsReact highcharts={Highcharts} options={testsByBrowserOptions} /> :
                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No data for Tests by Browser.</p></div>
            }
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader>
            <CardTitle>Failed Tests Duration</CardTitle>
            <CardDescription className="text-xs">Duration of failed/timed out tests (Top 10).</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
             {failedTestsChartData.data.length > 0 ?
                <HighchartsReact highcharts={Highcharts} options={failedTestsOptions} /> :
                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No failed tests with duration.</p></div>
            }
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader>
            <CardTitle>Slowest Tests (Top 5)</CardTitle>
            <CardDescription className="text-xs">Longest running tests in this run.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
            {slowestTestsChartData.data.length > 0 ?
                <HighchartsReact highcharts={Highcharts} options={slowestTestsOptions} /> :
                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No tests to display for slowest tests.</p></div>
            }
        </CardContent>
      </Card>
      <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader>
            <CardTitle>Tests per Suite</CardTitle>
            <CardDescription className="text-xs">Breakdown of test outcomes per suite.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto styled-scrollbar">
            {testsPerSuiteChartData.categories.length > 0 ?
                <HighchartsReact highcharts={Highcharts} options={testsPerSuiteOptions} /> :
                <div className="flex items-center justify-center h-[200px]"><p className="text-muted-foreground">No data for Tests per Suite.</p></div>
            }
        </CardContent>
      </Card>
      <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><GanttChartSquare className="h-5 w-5 mr-2 text-primary" /> Worker Utilization</CardTitle>
          <CardDescription className="text-xs">Timeline of test execution per worker for the current run.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px] overflow-x-auto">
          {canRenderGantt ? (
            <HighchartsReact 
              highcharts={Highcharts} 
              constructorType={'ganttChart'} 
              options={workerUtilizationOptions} 
            />
          ) : (
            <Alert className="rounded-lg border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-700 dark:text-amber-300">Worker Utilization Chart Not Available</AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                {ganttAlertMessage || "Could not generate worker utilization chart. Ensure tests have valid 'workerId', 'startTime', and 'duration >= 0'."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

