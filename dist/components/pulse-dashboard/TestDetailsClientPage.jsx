'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDetailsClientPage = TestDetailsClientPage;
const navigation_1 = require("next/navigation");
const useTestData_1 = require("@/hooks/useTestData");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const tabs_1 = require("@/components/ui/tabs");
const skeleton_1 = require("@/components/ui/skeleton");
const alert_1 = require("@/components/ui/alert");
const scroll_area_1 = require("@/components/ui/scroll-area");
const lucide_react_1 = require("lucide-react");
const image_1 = __importDefault(require("next/image"));
const badge_1 = require("@/components/ui/badge");
const react_1 = require("react");
const TestStepItemRecursive_1 = require("./TestStepItemRecursive");
const actions_1 = require("@/app/actions");
const recharts_1 = require("recharts");
const utils_1 = require("@/lib/utils");
const html2canvas_1 = __importDefault(require("html2canvas"));
const tooltip_1 = require("@/components/ui/tooltip");
const StatusDot = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload)
        return null;
    let color = 'hsl(var(--muted-foreground))'; // Default color
    if (payload.status === 'passed')
        color = 'hsl(var(--chart-3))'; // green
    else if (payload.status === 'failed' || payload.status === 'timedOut')
        color = 'hsl(var(--destructive))'; // red
    else if (payload.status === 'skipped')
        color = 'hsl(var(--accent))'; // orange
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(var(--card))" strokeWidth={1}/>;
};
const HistoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (<div className="bg-card p-3 border border-border rounded-lg shadow-lg">
        <p className="label text-sm font-semibold text-foreground">{`Date: ${new Date(data.date).toLocaleDateString()}`}</p>
        <p className="text-xs text-foreground">{`Duration: ${formatDuration(data.duration)}`}</p>
        <p className="text-xs" style={{ color: data.status === 'passed' ? 'hsl(var(--chart-3))' : data.status === 'failed' || data.status === 'timedOut' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))' }}>
          {`Status: ${data.status}`}
        </p>
      </div>);
    }
    return null;
};
function StatusIcon({ status }) {
    switch (status) {
        case 'passed':
            return <lucide_react_1.CheckCircle2 className="h-6 w-6 text-green-500"/>;
        case 'failed':
            return <lucide_react_1.XCircle className="h-6 w-6 text-destructive"/>;
        case 'skipped':
            return <lucide_react_1.AlertCircle className="h-6 w-6 text-accent"/>;
        case 'timedOut':
            return <lucide_react_1.Clock className="h-6 w-6 text-destructive"/>;
        case 'pending':
            return <lucide_react_1.Clock className="h-6 w-6 text-primary animate-pulse"/>;
        default:
            return null;
    }
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    const seconds = parseFloat((ms / 1000).toFixed(2));
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = parseFloat((seconds % 60).toFixed(2));
    return `${minutes}m ${remainingSeconds}s`;
}
function formatTestName(fullName) {
    if (!fullName)
        return '';
    const parts = fullName.split(" > ");
    return parts[parts.length - 1] || fullName;
}
function getStatusBadgeClass(status) {
    switch (status) {
        case 'passed':
            return 'bg-[hsl(var(--chart-3))] text-primary-foreground hover:bg-[hsl(var(--chart-3))]';
        case 'failed':
        case 'timedOut':
            return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
        case 'skipped':
            return 'bg-[hsl(var(--accent))] text-accent-foreground hover:bg-[hsl(var(--accent))]';
        case 'pending':
            return 'bg-primary text-primary-foreground hover:bg-primary/90';
        default:
            return 'bg-muted text-muted-foreground';
    }
}
function getAssetPath(jsonPath) {
    if (!jsonPath || typeof jsonPath !== 'string') {
        return '#';
    }
    const trimmedPath = jsonPath.trim();
    if (trimmedPath === '') {
        return '#';
    }
    if (trimmedPath.startsWith('data:image')) {
        return trimmedPath; // It's a data URI
    }
    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
        return trimmedPath; // Absolute external URL
    }
    if (trimmedPath.startsWith('/')) {
        // Assumed to be an already correct absolute web path from server root
        // e.g., /pulse-report/attachments/... or /some-other-custom-path/...
        return trimmedPath;
    }
    // Handle relative file paths like "attachments/RUN_ID/image.png" or "RUN_ID/image.png"
    // These are assumed relative to "public/pulse-report/"
    // So, prepend "/pulse-report/"
    const normalizedRelativePath = trimmedPath
        .split('/')
        .filter(part => part && part !== '.') // Filter out empty strings and single dots
        .join('/');
    return `/pulse-report/${normalizedRelativePath}`;
}
function TestDetailsClientPage({ testId }) {
    const router = (0, navigation_1.useRouter)();
    const { currentRun, loadingCurrent, errorCurrent } = (0, useTestData_1.useTestData)();
    const [test, setTest] = (0, react_1.useState)(null);
    const [testHistory, setTestHistory] = (0, react_1.useState)([]);
    const [loadingHistory, setLoadingHistory] = (0, react_1.useState)(true);
    const [errorHistory, setErrorHistory] = (0, react_1.useState)(null);
    const historyChartRef = (0, react_1.useRef)(null);
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
    (0, react_1.useEffect)(() => {
        if (currentRun?.results) {
            const foundTest = currentRun.results.find(t => t.id === testId);
            setTest(foundTest || null);
        }
    }, [currentRun, testId]);
    (0, react_1.useEffect)(() => {
        if (!testId)
            return;
        const fetchTestHistory = async () => {
            setLoadingHistory(true);
            setErrorHistory(null);
            try {
                const rawReports = await (0, actions_1.getRawHistoricalReports)();
                const historyData = [];
                rawReports.forEach(report => {
                    const historicalTest = report.results.find(r => r.id === testId);
                    if (historicalTest) {
                        historyData.push({
                            date: report.run.timestamp,
                            duration: historicalTest.duration,
                            status: historicalTest.status,
                        });
                    }
                });
                historyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setTestHistory(historyData);
            }
            catch (error) {
                console.error("Error fetching test history:", error);
                setErrorHistory(error instanceof Error ? error.message : "Failed to load test history");
            }
            finally {
                setLoadingHistory(false);
            }
        };
        fetchTestHistory();
    }, [testId]);
    if (loadingCurrent && !test) {
        return (<div className="container mx-auto px-4 py-8 space-y-6">
        <skeleton_1.Skeleton className="h-10 w-48 mb-4 rounded-md"/>
        <card_1.Card className="shadow-xl rounded-lg">
          <card_1.CardHeader>
            <skeleton_1.Skeleton className="h-8 w-3/4 mb-2 rounded-md"/>
            <skeleton_1.Skeleton className="h-4 w-1/2 rounded-md"/>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <skeleton_1.Skeleton className="h-10 w-1/3 mb-4 rounded-md"/>
            <skeleton_1.Skeleton className="h-40 w-full rounded-md"/>
          </card_1.CardContent>
        </card_1.Card>
      </div>);
    }
    if (errorCurrent) {
        return (<div className="container mx-auto px-4 py-8">
        <alert_1.Alert variant="destructive" className="rounded-lg">
          <alert_1.AlertTitle>Error loading test data</alert_1.AlertTitle>
          <alert_1.AlertDescription>{errorCurrent}</alert_1.AlertDescription>
        </alert_1.Alert>
        <button_1.Button onClick={() => router.push('/')} variant="outline" className="mt-4 rounded-md">
          <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/> Back
        </button_1.Button>
      </div>);
    }
    if (!test) {
        return (<div className="container mx-auto px-4 py-8 text-center">
        <alert_1.Alert className="rounded-lg">
            <alert_1.AlertTitle>Test Not Found</alert_1.AlertTitle>
            <alert_1.AlertDescription>The test with ID '{testId}' could not be found in the current report.</alert_1.AlertDescription>
        </alert_1.Alert>
        <button_1.Button onClick={() => router.push('/')} variant="outline" className="mt-6 rounded-md">
          <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard
        </button_1.Button>
      </div>);
    }
    const currentScreenshots = (test.screenshots || [])
        .map(p => (typeof p === 'string' ? p.trim() : ''))
        .filter(p => p && p !== '');
    const displayName = formatTestName(test.name);
    const hasVideo = !!test.videoPath;
    const hasTrace = !!test.tracePath;
    let totalAttachmentsCount = currentScreenshots.length;
    if (hasVideo)
        totalAttachmentsCount++;
    if (hasTrace)
        totalAttachmentsCount++;
    return (<div className="container mx-auto px-4 py-8 space-y-6">
      <button_1.Button onClick={() => router.push('/')} variant="outline" size="sm" className="mb-6 rounded-md">
        <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard
      </button_1.Button>

      <card_1.Card className="shadow-xl rounded-lg">
        <card_1.CardHeader>
          <div className="flex items-start justify-between">
            <div>
                <card_1.CardTitle className="text-2xl font-headline text-primary flex items-center" title={test.name}>
                <StatusIcon status={test.status}/>
                <span className="ml-3">{displayName}</span>
                </card_1.CardTitle>
                {test.suiteName && <card_1.CardDescription className="mt-1 text-md">From suite: {test.suiteName}</card_1.CardDescription>}
                 <div className="mt-1 text-xs text-muted-foreground">
                    <p>ID: {test.id}</p>
                    {test.browser && <p>Browser: {test.browser}</p>}
                    {test.codeSnippet && <p>Defined at: {test.codeSnippet}</p>}
                 </div>
            </div>
            <div className="text-right flex-shrink-0">
                 <badge_1.Badge className={(0, utils_1.cn)("capitalize text-sm px-3 py-1 border-transparent rounded-full", getStatusBadgeClass(test.status))}>
                    {test.status}
                  </badge_1.Badge>
                <p className="text-sm text-muted-foreground mt-1">Duration: {formatDuration(test.duration)}</p>
                <p className="text-xs text-muted-foreground">Retries: {test.retries}</p>
                {test.tags && test.tags.length > 0 && (<div className="mt-1 space-x-1">
                        {test.tags.map(tag => <badge_1.Badge key={tag} variant="secondary" className="text-xs rounded-full">{tag}</badge_1.Badge>)}
                    </div>)}
            </div>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent>
          <tabs_1.Tabs defaultValue="steps" className="w-full">
            <tabs_1.TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 rounded-lg">
              <tabs_1.TabsTrigger value="steps">Execution Steps ({test.steps?.length || 0})</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="attachments">Attachments ({totalAttachmentsCount})</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="logs"><lucide_react_1.FileText className="h-4 w-4 mr-2"/>Logs</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="history">Test Run History</tabs_1.TabsTrigger>
            </tabs_1.TabsList>

            <tabs_1.TabsContent value="steps" className="mt-4 p-1 md:p-4 border rounded-lg bg-card shadow-inner">
              <h3 className="text-lg font-semibold text-foreground mb-3 px-3 md:px-0">Test Execution Steps</h3>
              {test.errorMessage && (<div className="mb-4 p-3 md:p-0">
                  <h4 className="font-semibold text-md text-destructive mb-1">Overall Test Error:</h4>
                  <pre className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg whitespace-pre-wrap break-all font-code overflow-x-auto">{test.errorMessage}</pre>
                </div>)}
              {test.steps && test.steps.length > 0 ? (<scroll_area_1.ScrollArea className="h-[600px] w-full">
                  <div className="pr-4">
                    {test.steps.map((step, index) => (<TestStepItemRecursive_1.TestStepItemRecursive key={step.id || index} step={step}/>))}
                  </div>
                </scroll_area_1.ScrollArea>) : (<p className="text-muted-foreground p-3 md:p-0">No detailed execution steps available for this test.</p>)}
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="attachments" className="mt-4 p-1 md:p-4 border rounded-lg bg-card shadow-inner">
              <tabs_1.Tabs defaultValue="sub-screenshots" className="w-full">
                <tabs_1.TabsList className="grid w-full grid-cols-3 mb-4 rounded-lg">
                  <tabs_1.TabsTrigger value="sub-screenshots">
                    <lucide_react_1.ImageIcon className="h-4 w-4 mr-2"/>
                    Screenshots ({currentScreenshots.length})
                  </tabs_1.TabsTrigger>
                  <tabs_1.TabsTrigger value="sub-video" disabled={!hasVideo}>
                    <lucide_react_1.Film className="h-4 w-4 mr-2"/>
                    Video {hasVideo ? '(1)' : '(0)'}
                  </tabs_1.TabsTrigger>
                  <tabs_1.TabsTrigger value="sub-trace" disabled={!hasTrace}>
                    <lucide_react_1.Archive className="h-4 w-4 mr-2"/>
                    Trace {hasTrace ? '(1)' : '(0)'}
                  </tabs_1.TabsTrigger>
                </tabs_1.TabsList>

                <tabs_1.TabsContent value="sub-screenshots" className="mt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Screenshots</h3>
                  {currentScreenshots.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {currentScreenshots.map((path, index) => {
                const imageSrc = getAssetPath(path);
                if (imageSrc === '#') {
                    return null;
                }
                return (<a key={`img-preview-${index}`} href={imageSrc} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all shadow-md hover:shadow-lg">
                            <image_1.default src={imageSrc} alt={`Screenshot ${index + 1}`} fill={true} style={{ objectFit: "cover" }} className="group-hover:scale-105 transition-transform duration-300"/>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                              <p className="text-white text-xs text-center break-all">{`Screenshot ${index + 1}`}</p>
                            </div>
                          </a>);
            })}
                    </div>) : (<p className="text-muted-foreground">No screenshots available for this test.</p>)}
                </tabs_1.TabsContent>

                <tabs_1.TabsContent value="sub-video" className="mt-4">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Video Recording</h3>
                  {hasVideo && test.videoPath ? (<div className="p-4 border rounded-lg bg-muted/30 shadow-sm">
                      <a href={getAssetPath(test.videoPath)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline text-base">
                        <lucide_react_1.Download className="h-5 w-5 mr-2"/> View/Download Video
                      </a>
                      <p className="text-xs text-muted-foreground mt-2">Path: {test.videoPath}</p>
                    </div>) : (<alert_1.Alert className="rounded-lg">
                        <lucide_react_1.Info className="h-4 w-4"/>
                        <alert_1.AlertTitle>No Video Available</alert_1.AlertTitle>
                        <alert_1.AlertDescription>There is no video recording associated with this test run.</alert_1.AlertDescription>
                    </alert_1.Alert>)}
                </tabs_1.TabsContent>

                <tabs_1.TabsContent value="sub-trace" className="mt-4">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Trace File</h3>
                  {hasTrace && test.tracePath ? (<div className="p-4 border rounded-lg bg-muted/30 space-y-3 shadow-sm">
                       <a href={getAssetPath(test.tracePath)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline text-base" download>
                        <lucide_react_1.Download className="h-5 w-5 mr-2"/> Download Trace File (.zip)
                      </a>
                      <p className="text-xs text-muted-foreground">Path: {test.tracePath}</p>
                       <alert_1.Alert className="rounded-lg">
                          <lucide_react_1.Info className="h-4 w-4"/>
                          <alert_1.AlertTitle>Using Trace Files</alert_1.AlertTitle>
                          <alert_1.AlertDescription>
                              Trace files (.zip) can be viewed using the Playwright CLI: <code className="bg-muted px-1 py-0.5 rounded-sm">npx playwright show-trace /path/to/your/trace.zip</code>.
                              Or by uploading them to <a href="https://trace.playwright.dev/" target="_blank" rel="noopener noreferrer" className="underline">trace.playwright.dev</a>.
                          </alert_1.AlertDescription>
                      </alert_1.Alert>
                    </div>) : (<alert_1.Alert className="rounded-lg">
                        <lucide_react_1.Info className="h-4 w-4"/>
                        <alert_1.AlertTitle>No Trace File Available</alert_1.AlertTitle>
                        <alert_1.AlertDescription>There is no Playwright trace file associated with this test run.</alert_1.AlertDescription>
                    </alert_1.Alert>)}
                </tabs_1.TabsContent>
              </tabs_1.Tabs>
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="logs" className="mt-4 p-4 border rounded-lg bg-card space-y-6 shadow-inner">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <lucide_react_1.Terminal className="h-5 w-5 mr-2 text-primary"/>Console Logs / Standard Output
                </h3>
                <scroll_area_1.ScrollArea className="h-48 w-full rounded-lg border p-3 bg-muted/30 shadow-sm">
                  <pre className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {(test.stdout && Array.isArray(test.stdout) && test.stdout.length > 0)
            ? test.stdout.join('\n')
            : "No standard output logs captured for this test."}
                  </pre>
                </scroll_area_1.ScrollArea>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <lucide_react_1.AlertCircle className="h-5 w-5 mr-2 text-destructive"/>Error Messages / Standard Error
                </h3>
                {test.errorMessage && test.errorMessage.trim() !== '' ? (<scroll_area_1.ScrollArea className="h-48 w-full rounded-lg border bg-destructive/5 shadow-sm">
                    <pre className="text-sm text-destructive p-3 whitespace-pre-wrap break-all font-code">
                      {test.errorMessage}
                    </pre>
                  </scroll_area_1.ScrollArea>) : (<p className="text-muted-foreground p-3">No errors captured for this test.</p>)}
              </div>
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="history" className="mt-4 p-4 border rounded-lg bg-card shadow-inner">
             <tooltip_1.TooltipProvider>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <lucide_react_1.LineChart className="h-5 w-5 mr-2 text-primary"/>
                  Individual Test Run History
                </h3>
                  <tooltip_1.Tooltip>
                    <tooltip_1.TooltipTrigger asChild>
                      <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(historyChartRef, `test-history-${testId}.png`)} aria-label="Download Test History Chart" className="rounded-md">
                        <lucide_react_1.Download className="h-4 w-4"/>
                      </button_1.Button>
                    </tooltip_1.TooltipTrigger>
                    <tooltip_1.TooltipContent className="rounded-md">
                      <p>Download as PNG</p>
                    </tooltip_1.TooltipContent>
                  </tooltip_1.Tooltip>
              </div>
              </tooltip_1.TooltipProvider>
              {loadingHistory && (<div className="space-y-3">
                  <skeleton_1.Skeleton className="h-6 w-3/4 rounded-md"/>
                  <skeleton_1.Skeleton className="h-64 w-full rounded-lg"/>
                </div>)}
              {errorHistory && !loadingHistory && (<alert_1.Alert variant="destructive" className="rounded-lg">
                  <lucide_react_1.AlertCircle className="h-4 w-4"/>
                  <alert_1.AlertTitle>Error Loading Test History</alert_1.AlertTitle>
                  <alert_1.AlertDescription>{errorHistory}</alert_1.AlertDescription>
                </alert_1.Alert>)}
              {!loadingHistory && !errorHistory && testHistory.length === 0 && (<alert_1.Alert className="rounded-lg">
                  <lucide_react_1.Info className="h-4 w-4"/>
                  <alert_1.AlertTitle>No Historical Data</alert_1.AlertTitle>
                  <alert_1.AlertDescription>
                    No historical run data found for this specific test (ID: {testId}).
                  </alert_1.AlertDescription>
                </alert_1.Alert>)}
              {!loadingHistory && !errorHistory && testHistory.length > 0 && (<div ref={historyChartRef} className="w-full h-[300px] bg-card p-4 rounded-lg shadow-inner">
                  <recharts_1.ResponsiveContainer width="100%" height="100%">
                    <recharts_1.LineChart data={testHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                      <recharts_1.XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40}/>
                      <recharts_1.YAxis tickFormatter={(tick) => formatDuration(tick)} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={80}/>
                      <recharts_1.Tooltip content={<HistoryTooltip />}/>
                      <recharts_1.Legend wrapperStyle={{ fontSize: "12px" }}/>
                      <recharts_1.Line type="monotone" dataKey="duration" name="Duration" stroke="hsl(var(--primary))" strokeWidth={2} dot={<StatusDot />} activeDot={{ r: 7 }}/>
                    </recharts_1.LineChart>
                  </recharts_1.ResponsiveContainer>
                </div>)}
            </tabs_1.TabsContent>

          </tabs_1.Tabs>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=TestDetailsClientPage.jsx.map