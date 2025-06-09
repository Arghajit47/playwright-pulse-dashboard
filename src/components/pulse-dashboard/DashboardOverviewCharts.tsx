
'use client';

import type { PlaywrightPulseReport, DetailedTestResult } from '@/types/playwright.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart as RechartsPieChart, Pie, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, LabelList, Sector } from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie.d.ts'; // .d.ts for specific type import
import { Terminal, CheckCircle, XCircle, SkipForward, Info, Chrome, Globe, Compass, AlertTriangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { NameType, ValueType, TooltipProps as RechartsTooltipProps } from 'recharts/types/component/DefaultTooltipContent.d.ts';


interface DashboardOverviewChartsProps {
  currentRun: PlaywrightPulseReport | null;
  loading: boolean;
  error: string | null;
}

// Local definition for ActiveShapeProps
interface ActiveShapeProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius: number;
  outerRadius?: number;
  startAngle: number;
  endAngle: number;
  fill: string; // fill color of the sector
  payload: PieSectorDataItem; // The original data item for this sector
  percent?: number; // Percentage (0-1)
  value: number;    // The numerical value of the sector
  name?: string;    // The name of the sector, often same as payload.name
}


const COLORS = {
  passed: 'hsl(var(--chart-3))',
  failed: 'hsl(var(--destructive))',
  skipped: 'hsl(var(--accent))',
  timedOut: 'hsl(var(--destructive))', // Group with failed for coloring
  pending: 'hsl(var(--muted-foreground))', // A neutral color for pending
  default1: 'hsl(var(--chart-1))',
  default2: 'hsl(var(--chart-2))',
  default3: 'hsl(var(--chart-4))',
  default4: 'hsl(var(--chart-5))',
  default5: 'hsl(var(--chart-3))',
};


function formatDurationForChart(ms: number): string {
  if (ms === 0) return '0s';
  const seconds = parseFloat((ms / 1000).toFixed(1));
  return `${seconds}s`;
}

function formatTestNameForChart(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split(" > ");
  return parts[parts.length - 1] || fullName;
}

const CustomTooltip = ({ active, payload, label }: RechartsTooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const titleText = String(label);
    const dataPoint = payload[0].payload as any; // Using any here for flexibility as payload structure varies

    const isStackedBarTooltip = dataPoint.total !== undefined && payload.length > 0;
    const isPieChartTooltip = dataPoint.percentage !== undefined && dataPoint.name;


    return (
      <div className="bg-card p-3 border border-border rounded-md shadow-lg">
        <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={titleText}>
          {dataPoint.fullTestName ? formatTestNameForChart(dataPoint.fullTestName) : titleText}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.payload.fill }} className="text-xs">
            {`${entry.name}: ${entry.value?.toLocaleString()}${entry.unit || ''}`}
            {isPieChartTooltip && entry.name === dataPoint.name && ` (${dataPoint.percentage}%)`}
          </p>
        ))}
        {isStackedBarTooltip && (
          <p className="text-xs font-bold mt-1 text-foreground">
            Total: {dataPoint.total.toLocaleString()}
          </p>
        )}
      </div>
    );
  }
  return null;
};


// This function normalizes for ICON display only. Chart labels will use the raw browser string.
function normalizeBrowserNameForIcon(rawBrowserName: string | undefined): string {
  if (!rawBrowserName) return 'Unknown';
  const lowerName = rawBrowserName.toLowerCase();

  if ((lowerName.includes('chrome') || lowerName.includes('chromium')) && (lowerName.includes('mobile') || lowerName.includes('android'))) {
    return 'Chrome Mobile';
  }
  if (lowerName.includes('safari') && lowerName.includes('mobile')) {
    return 'Mobile Safari';
  }
  if (lowerName.includes('chrome') || lowerName.includes('chromium')) {
    return 'Chrome';
  }
  if (lowerName.includes('firefox')) {
    return 'Firefox';
  }
  if (lowerName.includes('msedge') || lowerName.includes('edge')) {
    return 'Edge';
  }
  if (lowerName.includes('safari') || lowerName.includes('webkit')) {
    return 'Safari';
  }

  return 'Unknown';
}

const BrowserIcon = ({ browserName, className }: { browserName: string, className?: string }) => {
  const normalizedForIcon = normalizeBrowserNameForIcon(browserName);

  if (normalizedForIcon === 'Chrome' || normalizedForIcon === 'Chrome Mobile') {
    return <Chrome className={cn("h-4 w-4", className)} />;
  }
  if (normalizedForIcon === 'Safari' || normalizedForIcon === 'Mobile Safari') {
    return <Compass className={cn("h-4 w-4", className)} />;
  }
  return <Globe className={cn("h-4 w-4", className)} />;
};


const ActiveShape = (props: ActiveShapeProps) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * (midAngle ?? 0));
  const cos = Math.cos(-RADIAN * (midAngle ?? 0));
  const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
  const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
  const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
  const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  const centerNameTextFill = payload.name === 'Passed' ? COLORS.passed : 'hsl(var(--foreground))';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={centerNameTextFill} className="text-lg font-bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={(outerRadius ?? 0) + 6}
        outerRadius={(outerRadius ?? 0) + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`(Rate ${( (percent ?? 0) * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export function DashboardOverviewCharts({ currentRun, loading, error }: DashboardOverviewChartsProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const testDistributionChartRef = useRef<HTMLDivElement>(null);
  const browserChartRef = useRef<HTMLDivElement>(null);
  const failedDurationChartRef = useRef<HTMLDivElement>(null);
  const slowestTestsChartRef = useRef<HTMLDivElement>(null);
  const testsPerSuiteChartRef = useRef<HTMLDivElement>(null);

  const handleDownloadChart = async (chartRef: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: null,
          logging: false,
          useCORS: true,
          scale: 2,
        });
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error downloading chart:', err);
      }
    }
  };


  const onPieEnter = React.useCallback(
    (_data: PieSectorDataItem, index: number) => {
      setActiveIndex(index);
    },
    [setActiveIndex]
  );

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-md">
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Chart Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!currentRun || !currentRun.run || !currentRun.results) {
    return (
      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>No Data for Charts</AlertTitle>
        <AlertDescription>Current run data is not available to display charts.</AlertDescription>
      </Alert>
    );
  }

  const { passed, failed, skipped, timedOut = 0, pending = 0 } = currentRun.run;
  const totalTestsForPie = passed + failed + skipped + timedOut + pending;

  const testDistributionData = [
    { name: 'Passed', value: passed, fill: COLORS.passed },
    { name: 'Failed', value: failed, fill: COLORS.failed },
    { name: 'Skipped', value: skipped, fill: COLORS.skipped },
    ...(timedOut > 0 ? [{ name: 'Timed Out', value: timedOut, fill: COLORS.timedOut }] : []),
    ...(pending > 0 ? [{ name: 'Pending', value: pending, fill: COLORS.pending }] : []),
  ]
  .filter(d => d.value > 0)
  .map(d => ({ ...d, name: d.name, value: d.value, fill: d.fill, percentage: totalTestsForPie > 0 ? ((d.value / totalTestsForPie) * 100).toFixed(1) : '0.0' }));


  const browserDistributionRaw = currentRun.results.reduce((acc, test: DetailedTestResult) => {
    const browserName = test.browser || 'Unknown';
    if (!acc[browserName]) {
      acc[browserName] = { name: browserName, passed: 0, failed: 0, skipped: 0, pending: 0, total: 0 };
    }
    if (test.status === 'passed') acc[browserName].passed++;
    else if (test.status === 'failed' || test.status === 'timedOut') acc[browserName].failed++;
    else if (test.status === 'skipped') acc[browserName].skipped++;
    else if (test.status === 'pending') acc[browserName].pending++;
    acc[browserName].total++;
    return acc;
  }, {} as Record<string, { name: string; passed: number; failed: number; skipped: number; pending: number; total: number }>);

  const browserChartData = Object.values(browserDistributionRaw).sort((a, b) => b.total - a.total);


  const failedTestsDurationData = currentRun.results
    .filter((test: DetailedTestResult) => test.status === 'failed' || test.status === 'timedOut')
    .map((test: DetailedTestResult) => {
      const shortName = formatTestNameForChart(test.name);
      return {
        name: shortName.length > 50 ? shortName.substring(0, 47) + '...' : shortName,
        duration: test.duration,
        durationFormatted: formatDurationForChart(test.duration),
        fullTestName: test.name,
      };
    })
    .sort((a,b) => b.duration - a.duration)
    .slice(0, 10);

  const suiteDistributionRaw = currentRun.results.reduce((acc, test: DetailedTestResult) => {
    const suiteName = test.suiteName || 'Unknown Suite';
    if (!acc[suiteName]) {
      acc[suiteName] = { name: suiteName, passed: 0, failed: 0, skipped: 0, pending: 0, total: 0 };
    }
    if (test.status === 'passed') acc[suiteName].passed++;
    else if (test.status === 'failed' || test.status === 'timedOut') acc[suiteName].failed++;
    else if (test.status === 'skipped') acc[suiteName].skipped++;
    else if (test.status === 'pending') acc[suiteName].pending++;
    acc[suiteName].total++;
    return acc;
  }, {} as Record<string, { name: string; passed: number; failed: number; skipped: number; pending: number; total: number }>);

  const testsPerSuiteChartData = Object.values(suiteDistributionRaw).sort((a, b) => b.total - a.total);


  const slowestTestsData = [...currentRun.results]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map((test: DetailedTestResult) => {
      const shortName = formatTestNameForChart(test.name);
      return {
        name: shortName,
        duration: test.duration,
        durationFormatted: formatDurationForChart(test.duration),
        fullTestName: test.name,
        status: test.status,
      };
    });

  const showPendingInBrowserChart = browserChartData.some(d => d.pending > 0);
  const showPendingInSuiteChart = testsPerSuiteChartData.some(s => s.pending > 0);

  return (
    <TooltipProvider>
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Test Distribution</CardTitle>
            <CardDescription className="text-xs">Passed, Failed, Skipped for the current run.</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => handleDownloadChart(testDistributionChartRef, 'test-distribution.png')} aria-label="Download Test Distribution Chart">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download as PNG</p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[280px]">
          <div ref={testDistributionChartRef} className="w-full h-[280px]">
            {testDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={ActiveShape as any} // Use 'as any' if ActiveShapeProps is locally defined and causes issues here
                    data={testDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                  >
                    {testDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    iconSize={10}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
               <div className="text-center text-muted-foreground">No test distribution data.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Tests by Browser</CardTitle>
            <CardDescription className="text-xs">Breakdown of test outcomes per browser.</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => handleDownloadChart(browserChartRef, 'tests-by-browser.png')} aria-label="Download Tests by Browser Chart">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download as PNG</p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div ref={browserChartRef} className="w-full h-[250px]">
          {browserChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={browserChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={150}
                    tickFormatter={(value: string) => value.length > 20 ? value.substring(0,17) + '...' : value}
                    interval={0}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} />
                <Bar dataKey="passed" name="Passed" stackId="a" fill={COLORS.passed} barSize={20} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill={COLORS.failed} barSize={20} />
                <Bar dataKey="skipped" name="Skipped" stackId="a" fill={COLORS.skipped} barSize={20} />
                {showPendingInBrowserChart && (
                    <Bar dataKey="pending" name="Pending" stackId="a" fill={COLORS.pending} barSize={20} />
                )}
              </RechartsBarChart>
            </ResponsiveContainer>
             ) : (
                <div className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No browser data.</div>
            )}
          </div>
           <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
            {browserChartData.map(b => (
                <div key={b.name} className="flex items-center gap-1" title={b.name}>
                    <BrowserIcon browserName={b.name} className="mr-1"/>
                    <span className="truncate max-w-[150px]">{b.name}</span>
                </div>
            ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Note: Icons are representative. Full browser name (including version) is shown in tooltip.</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Failed Tests Duration</CardTitle>
            <CardDescription className="text-xs">Duration of failed or timed out tests (Top 10).</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => handleDownloadChart(failedDurationChartRef, 'failed-tests-duration.png')} aria-label="Download Failed Tests Duration Chart">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download as PNG</p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div ref={failedDurationChartRef} className="w-full h-[250px]">
            {failedTestsDurationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={failedTestsDurationData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-40} textAnchor="end" interval={0} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickFormatter={(value: number) => formatDurationForChart(value)}
                    domain={[0, (dataMax: number) => dataMax > 0 ? Math.round(dataMax * 1.20) : 100]}
                  />
                  <RechartsTooltip
                      content={({ active, payload, label }: RechartsTooltipProps<ValueType, NameType>) => {
                          if (active && payload && payload.length) {
                              const data = payload[0].payload as {duration: number; fullTestName: string;};
                              return (
                              <div className="bg-card p-3 border border-border rounded-md shadow-lg">
                                  <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={data.fullTestName}>{formatTestNameForChart(data.fullTestName)}</p>
                                  <p className="text-xs" style={{ color: COLORS.failed }}>
                                  Duration: {formatDurationForChart(data.duration)}
                                  </p>
                              </div>
                              );
                          }
                          return null;
                      }}
                      cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
                  />
                  <Bar dataKey="duration" name="Duration" fill={COLORS.failed} barSize={20}>
                      <LabelList dataKey="durationFormatted" position="top" style={{ fontSize: '10px', fill: 'hsl(var(--destructive))' }} />
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2"/>
                  <p className="text-muted-foreground">No failed tests in this run!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Slowest Tests (Top 5)</CardTitle>
            <CardDescription className="text-xs">Top 5 longest running tests in this run. Full names in tooltip.</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => handleDownloadChart(slowestTestsChartRef, 'slowest-tests.png')} aria-label="Download Slowest Tests Chart">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download as PNG</p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div ref={slowestTestsChartRef} className="w-full h-[250px]">
            {slowestTestsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={slowestTestsData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickFormatter={() => ''}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickFormatter={(value: number) => formatDurationForChart(value)}
                    domain={[0, (dataMax: number) => dataMax > 0 ? Math.round(dataMax * 1.20) : 100]}
                  />
                  <RechartsTooltip
                      content={({ active, payload, label }: RechartsTooltipProps<ValueType, NameType>) => {
                          if (active && payload && payload.length) {
                              const data = payload[0].payload as {duration: number; fullTestName: string; status: DetailedTestResult['status']};
                              return (
                              <div className="bg-card p-3 border border-border rounded-md shadow-lg">
                                  <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={data.fullTestName}>{formatTestNameForChart(data.fullTestName)}</p>
                                  <p className="text-xs" style={{ color: data.status === 'passed' ? COLORS.passed : data.status === 'failed' || data.status === 'timedOut' ? COLORS.failed : COLORS.skipped }}>
                                  Duration: {formatDurationForChart(data.duration)} (Status: {data.status})
                                  </p>
                              </div>
                              );
                          }
                          return null;
                      }}
                      cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
                  />
                  <Bar dataKey="duration" name="Duration" barSize={20}>
                      {slowestTestsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.status === 'passed' ? COLORS.passed : entry.status === 'failed' || entry.status === 'timedOut' ? COLORS.failed : COLORS.skipped } />
                      ))}
                      <LabelList dataKey="durationFormatted" position="top" style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }} />
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground h-[250px] flex items-center justify-center">No test data to display for slowest tests.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Tests per Suite</CardTitle>
            <CardDescription className="text-xs">Breakdown of test outcomes per suite.</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => handleDownloadChart(testsPerSuiteChartRef, 'tests-per-suite.png')} aria-label="Download Tests per Suite Chart">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download as PNG</p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          <div ref={testsPerSuiteChartRef} className="w-full" style={{ height: Math.max(250, testsPerSuiteChartData.length * 45 + 60) }}> {/* Adjusted height for potentially more bars */}
          {testsPerSuiteChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={testsPerSuiteChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={150}
                    tickFormatter={(value: string) => value.length > 20 ? value.substring(0,17) + '...' : value}
                    interval={0}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} />
                <Bar dataKey="passed" name="Passed" stackId="suiteStack" fill={COLORS.passed} barSize={15} />
                <Bar dataKey="failed" name="Failed" stackId="suiteStack" fill={COLORS.failed} barSize={15} />
                <Bar dataKey="skipped" name="Skipped" stackId="suiteStack" fill={COLORS.skipped} barSize={15} />
                {showPendingInSuiteChart && (
                    <Bar dataKey="pending" name="Pending" stackId="suiteStack" fill={COLORS.pending} barSize={15} />
                )}
              </RechartsBarChart>
            </ResponsiveContainer>
            ) : (
                 <div className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No suite data.</div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
    </TooltipProvider>
  );
}

    