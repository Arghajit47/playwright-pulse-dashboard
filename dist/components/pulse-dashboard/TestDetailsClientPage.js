'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRouter } from 'next/navigation';
import { useTestData } from '@/hooks/useTestData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, LineChart, Info, Download, Film, Archive, Terminal } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef } from 'react';
import { TestStepItemRecursive } from './TestStepItemRecursive';
// import { getRawHistoricalReports } from '@/app/actions'; // Commented out for package build
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    return _jsx("circle", { cx: cx, cy: cy, r: 5, fill: color, stroke: "hsl(var(--card))", strokeWidth: 1 });
};
const HistoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (_jsxs("div", { className: "bg-card p-3 border border-border rounded-md shadow-lg", children: [_jsx("p", { className: "label text-sm font-semibold text-foreground", children: `Date: ${new Date(data.date).toLocaleDateString()}` }), _jsx("p", { className: "text-xs text-foreground", children: `Duration: ${formatDuration(data.duration)}` }), _jsx("p", { className: "text-xs", style: { color: data.status === 'passed' ? 'hsl(var(--chart-3))' : data.status === 'failed' || data.status === 'timedOut' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))' }, children: `Status: ${data.status}` })] }));
    }
    return null;
};
function StatusIcon({ status }) {
    switch (status) {
        case 'passed':
            return _jsx(CheckCircle2, { className: "h-6 w-6 text-green-500" });
        case 'failed':
            return _jsx(XCircle, { className: "h-6 w-6 text-destructive" });
        case 'skipped':
            return _jsx(AlertCircle, { className: "h-6 w-6 text-accent" });
        case 'timedOut':
            return _jsx(Clock, { className: "h-6 w-6 text-destructive" });
        case 'pending':
            return _jsx(Clock, { className: "h-6 w-6 text-primary animate-pulse" });
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
export function TestDetailsClientPage({ testId }) {
    const router = useRouter();
    const { currentRun, loadingCurrent, errorCurrent } = useTestData();
    const [test, setTest] = useState(null);
    const [testHistory, setTestHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [errorHistory, setErrorHistory] = useState(null);
    const historyChartRef = useRef(null);
    const handleDownloadChart = async (chartRef, fileName) => {
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
            }
            catch (err) {
                console.error('Error downloading chart:', err);
            }
        }
    };
    useEffect(() => {
        if (currentRun?.results) {
            const foundTest = currentRun.results.find(t => t.id === testId);
            setTest(foundTest || null);
        }
    }, [currentRun, testId]);
    useEffect(() => {
        if (!testId)
            return;
        const fetchTestHistory = async () => {
            setLoadingHistory(true);
            setErrorHistory(null);
            try {
                // const rawReports: PlaywrightPulseReport[] = await getRawHistoricalReports(); // Commented out for package build
                // Simulating no data for build purposes
                const rawReports = [];
                setErrorHistory('Test history data fetching is handled by the consuming application.');
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
        // fetchTestHistory(); // Commented out call for package build
        setLoadingHistory(false); // Ensure loading completes for build
        setErrorHistory('Test history data fetching is handled by the consuming application.');
    }, [testId]);
    if (loadingCurrent && !test) {
        return (_jsxs("div", { className: "container mx-auto px-4 py-8 space-y-6", children: [_jsx(Skeleton, { className: "h-10 w-48 mb-4" }), _jsxs(Card, { className: "shadow-xl", children: [_jsxs(CardHeader, { children: [_jsx(Skeleton, { className: "h-8 w-3/4 mb-2" }), _jsx(Skeleton, { className: "h-4 w-1/2" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-10 w-1/3 mb-4" }), _jsx(Skeleton, { className: "h-40 w-full" })] })] })] }));
    }
    if (errorCurrent) {
        return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTitle, { children: "Error loading test data" }), _jsx(AlertDescription, { children: errorCurrent })] }), _jsxs(Button, { onClick: () => router.push('/'), variant: "outline", className: "mt-4", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"] })] }));
    }
    if (!test) {
        return (_jsxs("div", { className: "container mx-auto px-4 py-8 text-center", children: [_jsxs(Alert, { children: [_jsx(AlertTitle, { children: "Test Not Found" }), _jsxs(AlertDescription, { children: ["The test with ID '", testId, "' could not be found in the current report."] })] }), _jsxs(Button, { onClick: () => router.push('/'), variant: "outline", className: "mt-6", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back to Dashboard"] })] }));
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
    return (_jsxs("div", { className: "container mx-auto px-4 py-8 space-y-6", children: [_jsxs(Button, { onClick: () => router.push('/'), variant: "outline", size: "sm", className: "mb-6", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back to Dashboard"] }), _jsxs(Card, { className: "shadow-xl", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs(CardTitle, { className: "text-2xl font-headline text-primary flex items-center", title: test.name, children: [_jsx(StatusIcon, { status: test.status }), _jsx("span", { className: "ml-3", children: displayName })] }), test.suiteName && _jsxs(CardDescription, { className: "mt-1 text-md", children: ["From suite: ", test.suiteName] }), _jsxs("div", { className: "mt-1 text-xs text-muted-foreground", children: [_jsxs("p", { children: ["ID: ", test.id] }), test.browser && _jsxs("p", { children: ["Browser: ", test.browser] }), test.codeSnippet && _jsxs("p", { children: ["Defined at: ", test.codeSnippet] })] })] }), _jsxs("div", { className: "text-right flex-shrink-0", children: [_jsx(Badge, { className: cn("capitalize text-sm px-3 py-1 border-transparent", getStatusBadgeClass(test.status)), children: test.status }), _jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: ["Duration: ", formatDuration(test.duration)] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Retries: ", test.retries] }), test.tags && test.tags.length > 0 && (_jsx("div", { className: "mt-1 space-x-1", children: test.tags.map(tag => _jsx(Badge, { variant: "secondary", className: "text-xs", children: tag }, tag)) }))] })] }) }), _jsx(CardContent, { children: _jsxs(Tabs, { defaultValue: "steps", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2 md:grid-cols-4 mb-4", children: [_jsxs(TabsTrigger, { value: "steps", children: ["Execution Steps (", test.steps?.length || 0, ")"] }), _jsxs(TabsTrigger, { value: "attachments", children: ["Attachments (", totalAttachmentsCount, ")"] }), _jsxs(TabsTrigger, { value: "logs", children: [_jsx(FileText, { className: "h-4 w-4 mr-2" }), "Logs"] }), _jsx(TabsTrigger, { value: "history", children: "Test Run History" })] }), _jsxs(TabsContent, { value: "steps", className: "mt-4 p-1 md:p-4 border rounded-md bg-card", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground mb-3 px-3 md:px-0", children: "Test Execution Steps" }), test.errorMessage && (_jsxs("div", { className: "mb-4 p-3 md:p-0", children: [_jsx("h4", { className: "font-semibold text-md text-destructive mb-1", children: "Overall Test Error:" }), _jsx("pre", { className: "bg-destructive/10 text-destructive text-sm p-4 rounded-md whitespace-pre-wrap break-all font-code overflow-x-auto", children: test.errorMessage })] })), test.steps && test.steps.length > 0 ? (_jsx(ScrollArea, { className: "h-[600px] w-full", children: _jsx("div", { className: "pr-4", children: test.steps.map((step, index) => (_jsx(TestStepItemRecursive, { step: step }, step.id || index))) }) })) : (_jsx("p", { className: "text-muted-foreground p-3 md:p-0", children: "No detailed execution steps available for this test." }))] }), _jsx(TabsContent, { value: "attachments", className: "mt-4 p-1 md:p-4 border rounded-md bg-card", children: _jsxs(Tabs, { defaultValue: "sub-screenshots", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-3 mb-4", children: [_jsxs(TabsTrigger, { value: "sub-screenshots", children: [_jsx(ImageIcon, { className: "h-4 w-4 mr-2" }), "Screenshots (", currentScreenshots.length, ")"] }), _jsxs(TabsTrigger, { value: "sub-video", disabled: !hasVideo, children: [_jsx(Film, { className: "h-4 w-4 mr-2" }), "Video ", hasVideo ? '(1)' : '(0)'] }), _jsxs(TabsTrigger, { value: "sub-trace", disabled: !hasTrace, children: [_jsx(Archive, { className: "h-4 w-4 mr-2" }), "Trace ", hasTrace ? '(1)' : '(0)'] })] }), _jsxs(TabsContent, { value: "sub-screenshots", className: "mt-4", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground mb-4", children: "Screenshots" }), currentScreenshots.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: currentScreenshots.map((path, index) => {
                                                            const imageSrc = getAssetPath(path);
                                                            if (imageSrc === '#') {
                                                                return null;
                                                            }
                                                            return (_jsxs("a", { href: imageSrc, target: "_blank", rel: "noopener noreferrer", className: "relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all", children: [_jsx(Image, { src: imageSrc, alt: `Screenshot ${index + 1}`, fill: true, style: { objectFit: "cover" }, className: "group-hover:scale-105 transition-transform duration-300" }), _jsx("div", { className: "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2", children: _jsx("p", { className: "text-white text-xs text-center break-all", children: `Screenshot ${index + 1}` }) })] }, `img-preview-${index}`));
                                                        }) })) : (_jsx("p", { className: "text-muted-foreground", children: "No screenshots available for this test." }))] }), _jsxs(TabsContent, { value: "sub-video", className: "mt-4", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground mb-4", children: "Video Recording" }), hasVideo && test.videoPath ? (_jsxs("div", { className: "p-4 border rounded-md bg-muted/30", children: [_jsxs("a", { href: getAssetPath(test.videoPath), target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center text-primary hover:underline text-base", children: [_jsx(Download, { className: "h-5 w-5 mr-2" }), " View/Download Video"] }), _jsxs("p", { className: "text-xs text-muted-foreground mt-2", children: ["Path: ", test.videoPath] })] })) : (_jsxs(Alert, { children: [_jsx(Info, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "No Video Available" }), _jsx(AlertDescription, { children: "There is no video recording associated with this test run." })] }))] }), _jsxs(TabsContent, { value: "sub-trace", className: "mt-4", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground mb-4", children: "Trace File" }), hasTrace && test.tracePath ? (_jsxs("div", { className: "p-4 border rounded-md bg-muted/30 space-y-3", children: [_jsxs("a", { href: getAssetPath(test.tracePath), target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center text-primary hover:underline text-base", download: true, children: [_jsx(Download, { className: "h-5 w-5 mr-2" }), " Download Trace File (.zip)"] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Path: ", test.tracePath] }), _jsxs(Alert, { children: [_jsx(Info, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "Using Trace Files" }), _jsxs(AlertDescription, { children: ["Trace files (.zip) can be viewed using the Playwright CLI: ", _jsx("code", { className: "bg-muted px-1 py-0.5 rounded-sm", children: "npx playwright show-trace /path/to/your/trace.zip" }), ". Or by uploading them to ", _jsx("a", { href: "https://trace.playwright.dev/", target: "_blank", rel: "noopener noreferrer", className: "underline", children: "trace.playwright.dev" }), "."] })] })] })) : (_jsxs(Alert, { children: [_jsx(Info, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "No Trace File Available" }), _jsx(AlertDescription, { children: "There is no Playwright trace file associated with this test run." })] }))] })] }) }), _jsxs(TabsContent, { value: "logs", className: "mt-4 p-4 border rounded-md bg-card space-y-6", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold text-foreground mb-3 flex items-center", children: [_jsx(Terminal, { className: "h-5 w-5 mr-2 text-primary" }), "Console Logs / Standard Output"] }), _jsx(ScrollArea, { className: "h-48 w-full rounded-md border p-3 bg-muted/30", children: _jsx("pre", { className: "text-sm text-foreground whitespace-pre-wrap break-words", children: (test.stdout && Array.isArray(test.stdout) && test.stdout.length > 0)
                                                            ? test.stdout.join('\n')
                                                            : "No standard output logs captured for this test." }) })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold text-foreground mb-3 flex items-center", children: [_jsx(AlertCircle, { className: "h-5 w-5 mr-2 text-destructive" }), "Error Messages / Standard Error"] }), test.errorMessage && test.errorMessage.trim() !== '' ? (_jsx(ScrollArea, { className: "h-48 w-full rounded-md border bg-destructive/5", children: _jsx("pre", { className: "text-sm text-destructive p-3 whitespace-pre-wrap break-all font-code", children: test.errorMessage }) })) : (_jsx("p", { className: "text-muted-foreground p-3", children: "No errors captured for this test." }))] })] }), _jsxs(TabsContent, { value: "history", className: "mt-4 p-4 border rounded-md bg-card", children: [_jsx(TooltipProvider, { children: _jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsxs("h3", { className: "text-lg font-semibold text-foreground flex items-center", children: [_jsx(LineChart, { className: "h-5 w-5 mr-2 text-primary" }), "Individual Test Run History"] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", size: "icon", onClick: () => handleDownloadChart(historyChartRef, `test-history-${testId}.png`), "aria-label": "Download Test History Chart", children: _jsx(Download, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: _jsx("p", { children: "Download as PNG" }) })] })] }) }), loadingHistory && (_jsxs("div", { className: "space-y-3", children: [_jsx(Skeleton, { className: "h-6 w-3/4" }), _jsx(Skeleton, { className: "h-64 w-full" })] })), errorHistory && !loadingHistory && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "Test History Information" }), _jsx(AlertDescription, { children: errorHistory })] })), !loadingHistory && !errorHistory && testHistory.length === 0 && (_jsxs(Alert, { children: [_jsx(Info, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "No Historical Data" }), _jsxs(AlertDescription, { children: ["No historical run data found for this specific test (ID: ", testId, "). Or, data fetching is handled by the consuming application."] })] })), !loadingHistory && !errorHistory && testHistory.length > 0 && (_jsx("div", { ref: historyChartRef, className: "w-full h-[300px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsLineChart, { data: testHistory, margin: { top: 5, right: 20, left: -20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))" }), _jsx(XAxis, { dataKey: "date", tickFormatter: (tick) => new Date(tick).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), stroke: "hsl(var(--muted-foreground))", tick: { fontSize: 10 }, angle: -30, textAnchor: "end", height: 40 }), _jsx(YAxis, { tickFormatter: (tick) => formatDuration(tick), stroke: "hsl(var(--muted-foreground))", tick: { fontSize: 10 }, width: 80 }), _jsx(RechartsTooltip, { content: _jsx(HistoryTooltip, {}) }), _jsx(Legend, { wrapperStyle: { fontSize: "12px" } }), _jsx(Line, { type: "monotone", dataKey: "duration", name: "Duration", stroke: "hsl(var(--primary))", strokeWidth: 2, dot: _jsx(StatusDot, {}), activeDot: { r: 7 } })] }) }) }))] })] }) })] })] }));
}
//# sourceMappingURL=TestDetailsClientPage.js.map