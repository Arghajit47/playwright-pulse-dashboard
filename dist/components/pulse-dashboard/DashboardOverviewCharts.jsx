'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart as RechartsPieChart, Pie, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsRechartsTooltip, Legend, ResponsiveContainer, Cell, LabelList, Sector } from 'recharts';
import { Terminal, CheckCircle, Info, Chrome, Globe, Compass, Users, ListFilter, RotateCcw, Search } from 'lucide-react'; // Added Search
import { cn } from '@/lib/utils';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
// Import UI components for filters
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// --- FIX: Import Tooltip components for the reset button ---
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
const LazyChartWrapper = ({ children, placeholderHeight = '300px' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, {
            rootMargin: '0px 0px 200px 0px',
        });
        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }
        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);
    return (<div ref={ref} style={{ minHeight: !isVisible ? placeholderHeight : undefined }}>
      {isVisible ? children : <Skeleton className="w-full rounded-lg" style={{ height: placeholderHeight }}/>}
    </div>);
};
const COLORS = {
    passed: 'hsl(var(--chart-3))',
    failed: 'hsl(var(--destructive))',
    skipped: 'hsl(var(--accent))',
    timedOut: 'hsl(var(--destructive))',
    pending: 'hsl(var(--muted-foreground))',
    default1: 'hsl(var(--chart-1))',
    default2: 'hsl(var(--chart-2))',
    default3: 'hsl(var(--chart-4))',
    default4: 'hsl(var(--chart-5))',
    default5: 'hsl(var(--chart-3))',
};
function formatDurationForChart(ms) {
    if (ms === 0)
        return '0s';
    const seconds = parseFloat((ms / 1000).toFixed(1));
    return `${seconds}s`;
}
function formatTestNameForChart(fullName) {
    if (!fullName)
        return '';
    const parts = fullName.split(" > ");
    return parts[parts.length - 1] || fullName;
}
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const isStackedBarTooltip = dataPoint && dataPoint.total !== undefined && payload.length > 0;
        const isPieChartTooltip = dataPoint && dataPoint.percentage !== undefined && dataPoint.name;
        let displayTitle;
        if (isPieChartTooltip && dataPoint?.name) {
            displayTitle = dataPoint.name;
        }
        else if (dataPoint?.fullTestName) {
            displayTitle = formatTestNameForChart(dataPoint.fullTestName);
        }
        else {
            displayTitle = String(label);
        }
        if (displayTitle === "undefined" && payload[0]?.name !== undefined) {
            displayTitle = String(payload[0].name);
        }
        if (displayTitle === "undefined") {
            displayTitle = "Details";
        }
        return (<div className="bg-card p-3 border border-border rounded-md shadow-lg">
        <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={displayTitle}>
          {displayTitle}
        </p>
        {payload.map((entry, index) => (<p key={`item-${index}`} style={{ color: entry.color || entry.payload?.fill }} className="text-xs">
            {`${entry.name || 'Value'}: ${entry.value?.toLocaleString()}${entry.unit || ''}`}
            {isPieChartTooltip && dataPoint && entry.name === dataPoint.name && ` (${dataPoint.percentage}%)`}
          </p>))}
        {isStackedBarTooltip && dataPoint && (<p className="text-xs font-bold mt-1 text-foreground">
            Total: {dataPoint.total.toLocaleString()}
          </p>)}
      </div>);
    }
    return null;
};
function normalizeBrowserNameForIcon(rawBrowserName) {
    if (!rawBrowserName)
        return 'Unknown';
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
const BrowserIcon = ({ browserName, className }) => {
    const normalizedForIcon = normalizeBrowserNameForIcon(browserName);
    if (normalizedForIcon === 'Chrome' || normalizedForIcon === 'Chrome Mobile') {
        return <Chrome className={cn("h-4 w-4", className)}/>;
    }
    if (normalizedForIcon === 'Safari' || normalizedForIcon === 'Mobile Safari') {
        return <Compass className={cn("h-4 w-4", className)}/>;
    }
    return <Globe className={cn("h-4 w-4", className)}/>;
};
const ActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill, payload, percent, value = 0 } = props;
    const sin = Math.sin(-RADIAN * (midAngle ?? 0));
    const cos = Math.cos(-RADIAN * (midAngle ?? 0));
    const sx = (cx ?? 0) + (outerRadius + 10) * cos;
    const sy = (cy ?? 0) + (outerRadius + 10) * sin;
    const mx = (cx ?? 0) + (outerRadius + 30) * cos;
    const my = (cy ?? 0) + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const centerNameTextFill = payload?.name === 'Passed' ? COLORS.passed : 'hsl(var(--foreground))';
    return (<g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={centerNameTextFill} className="text-lg font-bold">
        {payload?.name}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill}/>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`(Rate ${((percent ?? 0) * 100).toFixed(2)}%)`}
      </text>
    </g>);
};
export function DashboardOverviewCharts({ currentRun, loading, error }) {
    const [testNameFilter, setTestNameFilter] = useState('');
    const [suiteFilter, setSuiteFilter] = useState('all');
    const [workerFilter, setWorkerFilter] = useState([]);
    const availableSuites = useMemo(() => {
        if (!currentRun?.results)
            return [];
        const suites = new Set(currentRun.results.map(t => t.suiteName).filter(name => name));
        return Array.from(suites).sort();
    }, [currentRun?.results]);
    const availableWorkers = useMemo(() => {
        if (!currentRun?.results)
            return [];
        const workerIds = currentRun.results
            .map(t => t.workerId)
            .filter(id => id != null && id !== '' && String(id) !== '-1')
            .map(id => String(id));
        const uniqueWorkerIds = Array.from(new Set(workerIds));
        return uniqueWorkerIds.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [currentRun?.results]);
    useEffect(() => {
        if (availableWorkers.length > 0) {
            setWorkerFilter(availableWorkers);
        }
    }, [availableWorkers]);
    const workerDonutData = useMemo(() => {
        if (!currentRun?.results)
            return [];
        const filteredTests = currentRun.results.filter(test => {
            const workerIdStr = test.workerId != null ? String(test.workerId) : '';
            if (workerFilter.length > 0 && !workerFilter.includes(workerIdStr)) {
                return false;
            }
            if (suiteFilter !== 'all' && test.suiteName !== suiteFilter) {
                return false;
            }
            if (testNameFilter && !test.name.toLowerCase().includes(testNameFilter.toLowerCase())) {
                return false;
            }
            if (workerIdStr === '-1' || workerIdStr === '') {
                return false;
            }
            return test.startTime && typeof test.duration === 'number';
        });
        const testsByWorker = filteredTests.reduce((acc, test) => {
            const workerId = test.workerId != null ? String(test.workerId) : 'unknown';
            if (!acc[workerId]) {
                acc[workerId] = [];
            }
            acc[workerId].push(test);
            return acc;
        }, {});
        return Object.entries(testsByWorker)
            .map(([workerId, tests]) => ({
            workerId,
            tests: tests.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
            totalDuration: tests.reduce((sum, test) => sum + test.duration, 0)
        }))
            .sort((a, b) => a.workerId.localeCompare(b.workerId, undefined, { numeric: true }));
    }, [currentRun?.results, testNameFilter, suiteFilter, workerFilter]);
    const [activeIndex, setActiveIndex] = useState(0);
    const onPieEnter = useCallback((_, index) => {
        setActiveIndex(index);
    }, []);
    const onPieMouseLeave = useCallback(() => {
        setActiveIndex(0);
    }, []);
    const isFiltered = useMemo(() => {
        return testNameFilter !== '' || suiteFilter !== 'all' || workerFilter.length !== availableWorkers.length;
    }, [testNameFilter, suiteFilter, workerFilter, availableWorkers]);
    const handleResetFilters = useCallback(() => {
        setTestNameFilter('');
        setSuiteFilter('all');
        setWorkerFilter(availableWorkers);
    }, [availableWorkers]);
    if (loading) {
        return (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {[...Array(5)].map((_, i) => (<Card key={i} className="shadow-md rounded-xl">
            <CardHeader>
              <Skeleton className="h-5 w-3/4 rounded-md"/>
              <Skeleton className="h-4 w-1/2 mt-1 rounded-md"/>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full rounded-lg"/>
            </CardContent>
          </Card>))}
      </div>);
    }
    if (error) {
        return (<Alert variant="destructive" className="mt-6 rounded-lg">
        <Terminal className="h-4 w-4"/>
        <AlertTitle>Error Loading Chart Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (!currentRun || !currentRun.run || !currentRun.results) {
        return (<Alert className="mt-6 rounded-lg">
        <Info className="h-4 w-4"/>
        <AlertTitle>No Data for Charts</AlertTitle>
        <AlertDescription>Current run data is not available to display charts.</AlertDescription>
      </Alert>);
    }
    const { passed, failed, skipped, timedOut = 0, pending = 0 } = currentRun.run;
    const totalTestsForPie = passed + failed + skipped + timedOut + pending;
    const testDistributionData = [
        { name: 'Passed', value: passed, fill: COLORS.passed },
        { name: 'Failed', value: failed + timedOut, fill: COLORS.failed },
        { name: 'Skipped', value: skipped, fill: COLORS.skipped },
        ...(pending > 0 ? [{ name: 'Pending', value: pending, fill: COLORS.pending }] : []),
    ]
        .filter(d => d.value > 0)
        .map(d => ({ ...d, name: d.name, value: d.value, fill: d.fill, percentage: totalTestsForPie > 0 ? ((d.value / totalTestsForPie) * 100).toFixed(1) : '0.0' }));
    const browserDistributionRaw = currentRun.results.reduce((acc, test) => {
        const browserName = test.browser || 'Unknown';
        if (!acc[browserName]) {
            acc[browserName] = { name: browserName, passed: 0, failed: 0, skipped: 0, pending: 0, total: 0 };
        }
        if (test.status === 'passed')
            acc[browserName].passed++;
        else if (test.status === 'failed' || test.status === 'timedOut')
            acc[browserName].failed++;
        else if (test.status === 'skipped')
            acc[browserName].skipped++;
        else if (test.status === 'pending')
            acc[browserName].pending++;
        acc[browserName].total++;
        return acc;
    }, {});
    const browserChartData = Object.values(browserDistributionRaw).sort((a, b) => b.total - a.total);
    const failedTestsDurationData = currentRun.results
        .filter((test) => test.status === 'failed' || test.status === 'timedOut')
        .map((test) => {
        const shortName = formatTestNameForChart(test.name);
        return {
            name: shortName.length > 50 ? shortName.substring(0, 47) + '...' : shortName,
            duration: test.duration,
            durationFormatted: formatDurationForChart(test.duration),
            fullTestName: test.name,
        };
    })
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    const suiteDistributionRaw = currentRun.results.reduce((acc, test) => {
        const suiteName = test.suiteName || 'Unknown Suite';
        if (!acc[suiteName]) {
            acc[suiteName] = { name: suiteName, passed: 0, failed: 0, skipped: 0, pending: 0, total: 0 };
        }
        if (test.status === 'passed')
            acc[suiteName].passed++;
        else if (test.status === 'failed' || test.status === 'timedOut')
            acc[suiteName].failed++;
        else if (test.status === 'skipped')
            acc[suiteName].skipped++;
        else if (test.status === 'pending')
            acc[suiteName].pending++;
        acc[suiteName].total++;
        return acc;
    }, {});
    const testsPerSuiteChartData = Object.values(suiteDistributionRaw).sort((a, b) => b.total - a.total);
    const slowestTestsData = [...currentRun.results]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map((test) => {
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
    return (<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Test Distribution</CardTitle>
            <CardDescription className="text-xs">Passed, Failed, Skipped for the current run.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[280px]">
          <div className="w-full h-[280px]">
            {testDistributionData.length > 0 ? (<ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} onMouseLeave={onPieMouseLeave}>
                  <Pie activeIndex={activeIndex} activeShape={ActiveShape} data={testDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" onMouseEnter={onPieEnter} paddingAngle={2} stroke="hsl(var(--card))">
                    {testDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill}/>))}
                  </Pie>
                  <RechartsRechartsTooltip content={<CustomTooltip />}/>
                  <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                </RechartsPieChart>
              </ResponsiveContainer>) : (<div className="text-center text-muted-foreground">No test distribution data.</div>)}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Tests by Browser</CardTitle>
            <CardDescription className="text-xs">Breakdown of test outcomes per browser.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[250px]">
          {browserChartData.length > 0 ? (<ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={browserChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}/>
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={150} tickFormatter={(value) => value.length > 20 ? value.substring(0, 17) + '...' : value} interval={0}/>
                <RechartsRechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <Bar dataKey="passed" name="Passed" stackId="a" fill={COLORS.passed} barSize={20}/>
                <Bar dataKey="failed" name="Failed" stackId="a" fill={COLORS.failed} barSize={20}/>
                <Bar dataKey="skipped" name="Skipped" stackId="a" fill={COLORS.skipped} barSize={20}/>
                {showPendingInBrowserChart && (<Bar dataKey="pending" name="Pending" stackId="a" fill={COLORS.pending} barSize={20}/>)}
              </RechartsBarChart>
            </ResponsiveContainer>) : (<div className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No browser data.</div>)}
          </div>
           <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
            {browserChartData.map(b => (<div key={b.name} className="flex items-center gap-1" title={b.name}>
                    <BrowserIcon browserName={b.name} className="mr-1"/>
                    <span className="truncate max-w-[150px]">{b.name}</span>
                </div>))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Note: Icons are representative. Full browser name (including version) is shown in tooltip.</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Failed Tests Duration</CardTitle>
            <CardDescription className="text-xs">Duration of failed or timed out tests (Top 10).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[250px]">
            {failedTestsDurationData.length > 0 ? (<ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={failedTestsDurationData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-40} textAnchor="end" interval={0}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(value) => formatDurationForChart(value)} domain={[0, (dataMax) => dataMax > 0 ? Math.round(dataMax * 1.20) : 100]}/>
                  <RechartsRechartsTooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (<div className="bg-card p-3 border border-border rounded-md shadow-lg">
                                  <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={data.fullTestName}>{formatTestNameForChart(data.fullTestName)}</p>
                                  <p className="text-xs" style={{ color: COLORS.failed }}>
                                  Duration: {formatDurationForChart(data.duration)}
                                  </p>
                              </div>);
                }
                return null;
            }} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                  <Bar dataKey="duration" name="Duration" fill={COLORS.failed} barSize={20}>
                      <LabelList dataKey="durationFormatted" position="top" style={{ fontSize: '10px', fill: 'hsl(var(--destructive))' }}/>
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>) : (<div className="flex flex-col items-center justify-center h-[250px] text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2"/>
                  <p className="text-muted-foreground">No failed tests in this run!</p>
              </div>)}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Slowest Tests (Top 5)</CardTitle>
            <CardDescription className="text-xs">Top 5 longest running tests in this run. Full names in tooltip.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[250px]">
            {slowestTestsData.length > 0 ? (<ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={slowestTestsData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="name" tickLine={false} tickFormatter={() => ''} stroke="hsl(var(--muted-foreground))"/>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(value) => formatDurationForChart(value)} domain={[0, (dataMax) => dataMax > 0 ? Math.round(dataMax * 1.20) : 100]}/>
                  <RechartsRechartsTooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (<div className="bg-card p-3 border border-border rounded-md shadow-lg">
                                  <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={data.fullTestName}>{formatTestNameForChart(data.fullTestName)}</p>
                                  <p className="text-xs" style={{ color: data.status === 'passed' ? COLORS.passed : data.status === 'failed' || data.status === 'timedOut' ? COLORS.failed : COLORS.skipped }}>
                                  Duration: {formatDurationForChart(data.duration)} (Status: {data.status})
                                  </p>
                              </div>);
                }
                return null;
            }} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                  <Bar dataKey="duration" name="Duration" barSize={20}>
                      {slowestTestsData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.status === 'passed' ? COLORS.passed : entry.status === 'failed' || entry.status === 'timedOut' ? COLORS.failed : COLORS.skipped}/>))}
                      <LabelList dataKey="durationFormatted" position="top" style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}/>
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>) : (<p className="text-muted-foreground h-[250px] flex items-center justify-center">No test data to display for slowest tests.</p>)}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Tests per Suite</CardTitle>
            <CardDescription className="text-xs">Breakdown of test outcomes per suite.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          <div className="w-full" style={{ height: Math.max(250, testsPerSuiteChartData.length * 45 + 60) }}>
          {testsPerSuiteChartData.length > 0 ? (<ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={testsPerSuiteChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}/>
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={150} tickFormatter={(value) => value.length > 20 ? value.substring(0, 17) + '...' : value} interval={0}/>
                <RechartsRechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <Bar dataKey="passed" name="Passed" stackId="suiteStack" fill={COLORS.passed} barSize={15}/>
                <Bar dataKey="failed" name="Failed" stackId="suiteStack" fill={COLORS.failed} barSize={15}/>
                <Bar dataKey="skipped" name="Skipped" stackId="suiteStack" fill={COLORS.skipped} barSize={15}/>
                {showPendingInSuiteChart && (<Bar dataKey="pending" name="Pending" stackId="suiteStack" fill={COLORS.pending} barSize={15}/>)}
              </RechartsBarChart>
            </ResponsiveContainer>) : (<div className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No suite data.</div>)}
          </div>
        </CardContent>
      </Card>

      
      <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary flex items-center">
              <Users className="h-5 w-5 mr-2"/> Worker Utilization
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Filter and inspect tests chronologically for each worker. Slice size represents test duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Filter by test name..." value={testNameFilter} onChange={(e) => setTestNameFilter(e.target.value)} className="pl-8 w-full"/>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select value={suiteFilter} onValueChange={setSuiteFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by suite"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suites</SelectItem>
                  {availableSuites.map(suite => (<SelectItem key={suite} value={suite}>{suite}</SelectItem>))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[180px] justify-between">
                    <span>Workers ({workerFilter.length}/{availableWorkers.length})</span>
                    <ListFilter className="h-4 w-4"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>Visible Workers</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableWorkers.length > 0 ? availableWorkers.map(workerId => (<DropdownMenuCheckboxItem key={workerId} checked={workerFilter.includes(workerId)} onCheckedChange={(checked) => {
                setWorkerFilter(prev => checked ? [...prev, workerId] : prev.filter(id => id !== workerId));
            }}>
                      Worker {workerId}
                    </DropdownMenuCheckboxItem>)) : <DropdownMenuLabel className="font-normal text-muted-foreground">No workers found</DropdownMenuLabel>}
                </DropdownMenuContent>
              </DropdownMenu>

              {isFiltered && (<TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleResetFilters}>
                        <RotateCcw className="h-4 w-4"/>
                        <span className="sr-only">Reset Filters</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset Filters</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>)}
            </div>
          </div>
          
          {workerDonutData.length > 0 ? (<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {workerDonutData.map(({ workerId, tests, totalDuration }) => (<LazyChartWrapper key={workerId}>
                  <div className="flex flex-col items-center">
                    <h4 className="font-semibold text-center mb-2">Worker {workerId}</h4>
                    <div className="w-full h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={tests} dataKey="duration" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} stroke="hsl(var(--card))">
                            {tests.map((test, index) => (<Cell key={`cell-${index}`} fill={COLORS[test.status] || COLORS.default1}/>))}
                          </Pie>
                          <RechartsRechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (<div className="bg-background p-3 border border-border rounded-md shadow-lg max-w-sm">
                                    <p className="label text-sm font-semibold text-foreground truncate" title={data.name}>
                                      {formatTestNameForChart(data.name)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Suite: {data.suiteName || 'N/A'}</p>
                                    <p className="text-xs" style={{ color: payload[0].color || COLORS.default1 }}>
                                      Status: {data.status}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Duration: {formatDurationForChart(data.duration)}
                                    </p>
                                  </div>);
                    }
                    return null;
                }}/>
                          <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} payload={[
                    { value: 'Passed', type: 'square', id: 'ID01', color: COLORS.passed },
                    { value: 'Failed', type: 'square', id: 'ID02', color: COLORS.failed },
                    { value: 'Skipped', type: 'square', id: 'ID03', color: COLORS.skipped }
                ]}/>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" style={{ marginTop: '-20px' }}>
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-lg font-bold text-foreground">{formatDurationForChart(totalDuration)}</div>
                      </div>
                    </div>
                  </div>
                </LazyChartWrapper>))}
            </div>) : (<div className="flex flex-col items-center justify-center h-[200px] text-center p-4 rounded-lg bg-muted/60">
                <Info className="h-8 w-8 text-muted-foreground mb-3"/>
                <p className="font-semibold text-foreground">No Matching Data</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Adjust your filters or verify the run data.
                </p>
            </div>)}
        </CardContent>
      </Card>


    </div>);
}
//# sourceMappingURL=DashboardOverviewCharts.jsx.map