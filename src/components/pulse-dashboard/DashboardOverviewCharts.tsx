
'use client';

import type { PlaywrightPulseReport, DetailedTestResult } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart as RechartsPieChart, Pie, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Terminal, CheckCircle, XCircle, SkipForward, Info, Chrome, Globe, Compass, BarChartHorizontalBig, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardOverviewChartsProps {
  currentRun: PlaywrightPulseReport | null;
  loading: boolean;
  error: string | null;
}

const COLORS = {
  passed: 'hsl(var(--chart-3))', // Green
  failed: 'hsl(var(--destructive))', // Red
  skipped: 'hsl(var(--accent))', // Orange
  timedOut: 'hsl(var(--destructive))',
  pending: 'hsl(var(--muted-foreground))',
  default1: 'hsl(var(--chart-1))',
  default2: 'hsl(var(--chart-2))',
  default3: 'hsl(var(--chart-4))',
  default4: 'hsl(var(--chart-5))',
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // Don't render label for small slices

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
      {`${name} (${value})`}
    </text>
  );
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 border border-border rounded-md shadow-lg">
        <p className="label text-sm font-semibold text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.payload.fill }} className="text-xs">
            {`${entry.name}: ${entry.value.toLocaleString()}${entry.unit || ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BrowserIcon = ({ browserName, className }: { browserName: string, className?: string }) => {
  const lowerBrowserName = browserName.toLowerCase();
  if (lowerBrowserName.includes('chrome')) return <Chrome className={cn("h-4 w-4", className)} />;
  if (lowerBrowserName.includes('safari') || lowerBrowserName.includes('webkit')) return <Compass className={cn("h-4 w-4", className)} />;
  return <Globe className={cn("h-4 w-4", className)} />; // Default for Firefox and others
};


export function DashboardOverviewCharts({ currentRun, loading, error }: DashboardOverviewChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
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
  const testDistributionData = [
    { name: 'Passed', value: passed, fill: COLORS.passed },
    { name: 'Failed', value: failed, fill: COLORS.failed },
    { name: 'Skipped', value: skipped, fill: COLORS.skipped },
    ...(timedOut > 0 ? [{ name: 'Timed Out', value: timedOut, fill: COLORS.timedOut }] : []),
    ...(pending > 0 ? [{ name: 'Pending', value: pending, fill: COLORS.pending }] : []),
  ].filter(d => d.value > 0);

  const browserDistribution = currentRun.results.reduce((acc, test) => {
    const browser = test.browser || 'Unknown';
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const browserChartData = Object.entries(browserDistribution).map(([name, value], index) => ({
    name,
    value,
    fill: [COLORS.default1, COLORS.default2, COLORS.default3, COLORS.default4][index % 4]
  }));

  const failedTestsDurationData = currentRun.results
    .filter(test => test.status === 'failed' || test.status === 'timedOut')
    .map(test => {
      const shortName = formatTestNameForChart(test.name);
      return {
        name: shortName.length > 50 ? shortName.substring(0, 47) + '...' : shortName,
        duration: test.duration,
        durationFormatted: formatDurationForChart(test.duration),
        fullTestName: test.name, // For tooltip
      };
    })
    .sort((a,b) => b.duration - a.duration)
    .slice(0, 10); // Show top 10 failed test durations

  const testsPerSuite = currentRun.results.reduce((acc, test) => {
    const suite = test.suiteName || 'Default Suite';
    acc[suite] = (acc[suite] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const testsPerSuiteChartData = Object.entries(testsPerSuite).map(([name, value], index) => ({
    name,
    value,
    fill: [COLORS.default1, COLORS.default2, COLORS.default3, COLORS.default4][index % 4]
  }));
  
  const slowestTestsData = [...currentRun.results]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map(test => {
      const shortName = formatTestNameForChart(test.name);
      return {
        name: shortName.length > 40 ? shortName.substring(0, 37) + '...' : shortName,
        duration: test.duration,
        durationFormatted: formatDurationForChart(test.duration),
        fullTestName: test.name, // For tooltip
        status: test.status,
      };
    });


  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mt-8">
      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Test Distribution</CardTitle>
          <CardDescription className="text-xs">Passed, Failed, Skipped for the current run.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={testDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
            </RechartsPieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Tests by Browser</CardTitle>
          <CardDescription className="text-xs">Number of tests executed per browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={browserChartData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={100} tickFormatter={(value) => value.length > 15 ? value.substring(0,12) + '...' : value} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{fontSize: "12px"}}/>
              <Bar dataKey="value" name="Tests" barSize={20}>
                {browserChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                 <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
           <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
            {browserChartData.map(b => (
                <div key={b.name} className="flex items-center gap-1">
                    <BrowserIcon browserName={b.name} /> {b.name}
                </div>
            ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Note: Icons are representative. Specific logos may vary.</p>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Failed Tests Duration</CardTitle>
           <CardDescription className="text-xs">Duration of failed or timed out tests (Top 10).</CardDescription>
        </CardHeader>
        <CardContent>
          {failedTestsDurationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={failedTestsDurationData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-40} textAnchor="end" interval={0} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} unit="s" tickFormatter={(value) => formatDurationForChart(value)}/>
                <Tooltip 
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                            <div className="bg-card p-3 border border-border rounded-md shadow-lg">
                                <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={data.fullTestName}>{data.fullTestName}</p>
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
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 xl:col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Tests per Suite</CardTitle>
          <CardDescription className="text-xs">Number of test cases in each suite.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={testsPerSuiteChartData.length * 40 + 50 < 250 ? 250 : testsPerSuiteChartData.length * 40 + 50}>
            <RechartsBarChart data={testsPerSuiteChartData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} interval={0} tickFormatter={(value) => value.length > 20 ? value.substring(0,17) + '...' : value} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tests" barSize={15}>
                {testsPerSuiteChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-1 xl:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Slowest Tests (Top 5)</CardTitle>
           <CardDescription className="text-xs">Top 5 longest running tests in this run.</CardDescription>
        </CardHeader>
        <CardContent>
          {slowestTestsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={slowestTestsData} margin={{ top: 5, right: 5, left: 5, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-45} textAnchor="end" interval={0} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} unit="s" tickFormatter={(value) => formatDurationForChart(value)}/>
                <Tooltip 
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                            <div className="bg-card p-3 border border-border rounded-md shadow-lg">
                                <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={data.fullTestName}>{data.fullTestName}</p>
                                <p className="text-xs" style={{ color: data.status === 'passed' ? COLORS.passed : COLORS.failed }}>
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
        </CardContent>
      </Card>

    </div>
  );
}
