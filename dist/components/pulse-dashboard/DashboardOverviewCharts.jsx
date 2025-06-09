'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardOverviewCharts = DashboardOverviewCharts;
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const skeleton_1 = require("@/components/ui/skeleton");
const alert_1 = require("@/components/ui/alert");
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const react_1 = __importStar(require("react"));
const html2canvas_1 = __importDefault(require("html2canvas"));
const tooltip_1 = require("@/components/ui/tooltip");
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
        const titleText = String(label); // Main title for the tooltip (e.g., browser name, date, suite name)
        const dataPoint = payload[0].payload; // The raw data object for this tick
        const isStackedBarTooltip = dataPoint.total !== undefined && payload.length > 0; // Check if it's a stacked bar (browser or suite)
        const isPieChartTooltip = dataPoint.percentage !== undefined && dataPoint.name;
        return (<div className="bg-card p-3 border border-border rounded-md shadow-lg">
        <p className="label text-sm font-semibold text-foreground truncate max-w-xs" title={titleText}>
          {dataPoint.fullTestName ? formatTestNameForChart(dataPoint.fullTestName) : titleText}
        </p>
        {payload.map((entry, index) => (<p key={`item-${index}`} style={{ color: entry.color || entry.payload.fill }} className="text-xs">
            {`${entry.name}: ${entry.value.toLocaleString()}${entry.unit || ''}`}
            {isPieChartTooltip && entry.name === dataPoint.name && ` (${dataPoint.percentage}%)`}
          </p>))}
        {isStackedBarTooltip && (<p className="text-xs font-bold mt-1 text-foreground">
            Total: {dataPoint.total.toLocaleString()}
          </p>)}
      </div>);
    }
    return null;
};
// This function normalizes for ICON display only. Chart labels will use the raw browser string.
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
        return <lucide_react_1.Chrome className={(0, utils_1.cn)("h-4 w-4", className)}/>;
    }
    if (normalizedForIcon === 'Safari' || normalizedForIcon === 'Mobile Safari') {
        return <lucide_react_1.Compass className={(0, utils_1.cn)("h-4 w-4", className)}/>;
    }
    return <lucide_react_1.Globe className={(0, utils_1.cn)("h-4 w-4", className)}/>;
};
const ActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const centerNameTextFill = payload.name === 'Passed' ? COLORS.passed : 'hsl(var(--foreground))';
    return (<g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={centerNameTextFill} className="text-lg font-bold">
        {payload.name}
      </text>
      <recharts_1.Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
      <recharts_1.Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill}/>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>);
};
function DashboardOverviewCharts({ currentRun, loading, error }) {
    const [activeIndex, setActiveIndex] = react_1.default.useState(0);
    const testDistributionChartRef = (0, react_1.useRef)(null);
    const browserChartRef = (0, react_1.useRef)(null);
    const failedDurationChartRef = (0, react_1.useRef)(null);
    const slowestTestsChartRef = (0, react_1.useRef)(null);
    const testsPerSuiteChartRef = (0, react_1.useRef)(null);
    const handleDownloadChart = async (chartRef, fileName) => {
        if (chartRef.current) {
            try {
                const canvas = await (0, html2canvas_1.default)(chartRef.current, {
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
            }
            catch (err) {
                console.error('Error downloading chart:', err);
            }
        }
    };
    const onPieEnter = react_1.default.useCallback((_, index) => {
        setActiveIndex(index);
    }, [setActiveIndex]);
    if (loading) {
        return (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {[...Array(4)].map((_, i) => (<card_1.Card key={i} className="shadow-md">
            <card_1.CardHeader>
              <skeleton_1.Skeleton className="h-5 w-3/4"/>
              <skeleton_1.Skeleton className="h-4 w-1/2 mt-1"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <skeleton_1.Skeleton className="h-48 w-full"/>
            </card_1.CardContent>
          </card_1.Card>))}
      </div>);
    }
    if (error) {
        return (<alert_1.Alert variant="destructive" className="mt-6">
        <lucide_react_1.Terminal className="h-4 w-4"/>
        <alert_1.AlertTitle>Error Loading Chart Data</alert_1.AlertTitle>
        <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (!currentRun || !currentRun.run || !currentRun.results) {
        return (<alert_1.Alert className="mt-6">
        <lucide_react_1.Info className="h-4 w-4"/>
        <alert_1.AlertTitle>No Data for Charts</alert_1.AlertTitle>
        <alert_1.AlertDescription>Current run data is not available to display charts.</alert_1.AlertDescription>
      </alert_1.Alert>);
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
        .filter(test => test.status === 'failed' || test.status === 'timedOut')
        .map(test => {
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
        .map(test => {
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
    return (<tooltip_1.TooltipProvider>
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
      <card_1.Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <div>
            <card_1.CardTitle className="text-lg font-semibold text-foreground">Test Distribution</card_1.CardTitle>
            <card_1.CardDescription className="text-xs">Passed, Failed, Skipped for the current run.</card_1.CardDescription>
          </div>
          <tooltip_1.Tooltip>
            <tooltip_1.TooltipTrigger asChild>
              <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(testDistributionChartRef, 'test-distribution.png')} aria-label="Download Test Distribution Chart">
                <lucide_react_1.Download className="h-4 w-4"/>
              </button_1.Button>
            </tooltip_1.TooltipTrigger>
            <tooltip_1.TooltipContent>
              <p>Download as PNG</p>
            </tooltip_1.TooltipContent>
          </tooltip_1.Tooltip>
        </card_1.CardHeader>
        <card_1.CardContent className="flex justify-center items-center min-h-[280px]">
          <div ref={testDistributionChartRef} className="w-full h-[280px]">
            {testDistributionData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <recharts_1.Pie activeIndex={activeIndex} activeShape={ActiveShape} data={testDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" onMouseEnter={onPieEnter} paddingAngle={2} stroke="hsl(var(--card))">
                    {testDistributionData.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={entry.fill}/>))}
                  </recharts_1.Pie>
                  <recharts_1.Tooltip content={<CustomTooltip />}/>
                  <recharts_1.Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                </recharts_1.PieChart>
              </recharts_1.ResponsiveContainer>) : (<div className="text-center text-muted-foreground">No test distribution data.</div>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <div>
            <card_1.CardTitle className="text-lg font-semibold text-foreground">Tests by Browser</card_1.CardTitle>
            <card_1.CardDescription className="text-xs">Breakdown of test outcomes per browser.</card_1.CardDescription>
          </div>
          <tooltip_1.Tooltip>
            <tooltip_1.TooltipTrigger asChild>
              <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(browserChartRef, 'tests-by-browser.png')} aria-label="Download Tests by Browser Chart">
                <lucide_react_1.Download className="h-4 w-4"/>
              </button_1.Button>
            </tooltip_1.TooltipTrigger>
            <tooltip_1.TooltipContent>
              <p>Download as PNG</p>
            </tooltip_1.TooltipContent>
          </tooltip_1.Tooltip>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div ref={browserChartRef} className="w-full h-[250px]">
          {browserChartData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.BarChart data={browserChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <recharts_1.XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}/>
                <recharts_1.YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={150} tickFormatter={(value) => value.length > 20 ? value.substring(0, 17) + '...' : value} interval={0}/>
                <recharts_1.Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <recharts_1.Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <recharts_1.Bar dataKey="passed" name="Passed" stackId="a" fill={COLORS.passed} barSize={20}/>
                <recharts_1.Bar dataKey="failed" name="Failed" stackId="a" fill={COLORS.failed} barSize={20}/>
                <recharts_1.Bar dataKey="skipped" name="Skipped" stackId="a" fill={COLORS.skipped} barSize={20}/>
                {showPendingInBrowserChart && (<recharts_1.Bar dataKey="pending" name="Pending" stackId="a" fill={COLORS.pending} barSize={20}/>)}
              </recharts_1.BarChart>
            </recharts_1.ResponsiveContainer>) : (<div className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No browser data.</div>)}
          </div>
           <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
            {browserChartData.map(b => (<div key={b.name} className="flex items-center gap-1" title={b.name}>
                    <BrowserIcon browserName={b.name} className="mr-1"/>
                    <span className="truncate max-w-[150px]">{b.name}</span>
                </div>))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Note: Icons are representative. Full browser name (including version) is shown in tooltip.</p>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <div>
            <card_1.CardTitle className="text-lg font-semibold text-foreground">Failed Tests Duration</card_1.CardTitle>
            <card_1.CardDescription className="text-xs">Duration of failed or timed out tests (Top 10).</card_1.CardDescription>
          </div>
          <tooltip_1.Tooltip>
            <tooltip_1.TooltipTrigger asChild>
              <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(failedDurationChartRef, 'failed-tests-duration.png')} aria-label="Download Failed Tests Duration Chart">
                <lucide_react_1.Download className="h-4 w-4"/>
              </button_1.Button>
            </tooltip_1.TooltipTrigger>
            <tooltip_1.TooltipContent>
              <p>Download as PNG</p>
            </tooltip_1.TooltipContent>
          </tooltip_1.Tooltip>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div ref={failedDurationChartRef} className="w-full h-[250px]">
            {failedTestsDurationData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={failedTestsDurationData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <recharts_1.XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-40} textAnchor="end" interval={0}/>
                  <recharts_1.YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(value) => formatDurationForChart(value)} domain={[0, (dataMax) => dataMax > 0 ? Math.round(dataMax * 1.20) : 100]}/>
                  <recharts_1.Tooltip content={({ active, payload, label }) => {
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
                  <recharts_1.Bar dataKey="duration" name="Duration" fill={COLORS.failed} barSize={20}>
                      <recharts_1.LabelList dataKey="durationFormatted" position="top" style={{ fontSize: '10px', fill: 'hsl(var(--destructive))' }}/>
                  </recharts_1.Bar>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>) : (<div className="flex flex-col items-center justify-center h-[250px] text-center">
                  <lucide_react_1.CheckCircle className="h-12 w-12 text-green-500 mb-2"/>
                  <p className="text-muted-foreground">No failed tests in this run!</p>
              </div>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <div>
            <card_1.CardTitle className="text-lg font-semibold text-foreground">Slowest Tests (Top 5)</card_1.CardTitle>
            <card_1.CardDescription className="text-xs">Top 5 longest running tests in this run. Full names in tooltip.</card_1.CardDescription>
          </div>
          <tooltip_1.Tooltip>
            <tooltip_1.TooltipTrigger asChild>
              <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(slowestTestsChartRef, 'slowest-tests.png')} aria-label="Download Slowest Tests Chart">
                <lucide_react_1.Download className="h-4 w-4"/>
              </button_1.Button>
            </tooltip_1.TooltipTrigger>
            <tooltip_1.TooltipContent>
              <p>Download as PNG</p>
            </tooltip_1.TooltipContent>
          </tooltip_1.Tooltip>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div ref={slowestTestsChartRef} className="w-full h-[250px]">
            {slowestTestsData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={slowestTestsData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <recharts_1.XAxis dataKey="name" tickLine={false} tickFormatter={() => ''} stroke="hsl(var(--muted-foreground))"/>
                  <recharts_1.YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(value) => formatDurationForChart(value)} domain={[0, (dataMax) => dataMax > 0 ? Math.round(dataMax * 1.20) : 100]}/>
                  <recharts_1.Tooltip content={({ active, payload, label }) => {
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
                  <recharts_1.Bar dataKey="duration" name="Duration" barSize={20}>
                      {slowestTestsData.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={entry.status === 'passed' ? COLORS.passed : entry.status === 'failed' || entry.status === 'timedOut' ? COLORS.failed : COLORS.skipped}/>))}
                      <recharts_1.LabelList dataKey="durationFormatted" position="top" style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}/>
                  </recharts_1.Bar>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>) : (<p className="text-muted-foreground h-[250px] flex items-center justify-center">No test data to display for slowest tests.</p>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <div>
            <card_1.CardTitle className="text-lg font-semibold text-foreground">Tests per Suite</card_1.CardTitle>
            <card_1.CardDescription className="text-xs">Breakdown of test outcomes per suite.</card_1.CardDescription>
          </div>
          <tooltip_1.Tooltip>
            <tooltip_1.TooltipTrigger asChild>
              <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(testsPerSuiteChartRef, 'tests-per-suite.png')} aria-label="Download Tests per Suite Chart">
                <lucide_react_1.Download className="h-4 w-4"/>
              </button_1.Button>
            </tooltip_1.TooltipTrigger>
            <tooltip_1.TooltipContent>
              <p>Download as PNG</p>
            </tooltip_1.TooltipContent>
          </tooltip_1.Tooltip>
        </card_1.CardHeader>
        <card_1.CardContent className="max-h-[400px] overflow-y-auto">
          <div ref={testsPerSuiteChartRef} className="w-full" style={{ height: Math.max(250, testsPerSuiteChartData.length * 45 + 60) }}> {/* Adjusted height for potentially more bars */}
          {testsPerSuiteChartData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.BarChart data={testsPerSuiteChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <recharts_1.XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}/>
                <recharts_1.YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={150} tickFormatter={(value) => value.length > 20 ? value.substring(0, 17) + '...' : value} interval={0}/>
                <recharts_1.Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <recharts_1.Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <recharts_1.Bar dataKey="passed" name="Passed" stackId="suiteStack" fill={COLORS.passed} barSize={15}/>
                <recharts_1.Bar dataKey="failed" name="Failed" stackId="suiteStack" fill={COLORS.failed} barSize={15}/>
                <recharts_1.Bar dataKey="skipped" name="Skipped" stackId="suiteStack" fill={COLORS.skipped} barSize={15}/>
                {showPendingInSuiteChart && (<recharts_1.Bar dataKey="pending" name="Pending" stackId="suiteStack" fill={COLORS.pending} barSize={15}/>)}
              </recharts_1.BarChart>
            </recharts_1.ResponsiveContainer>) : (<div className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No suite data.</div>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

    </div>
    </tooltip_1.TooltipProvider>);
}
//# sourceMappingURL=DashboardOverviewCharts.jsx.map