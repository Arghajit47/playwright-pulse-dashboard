
'use client';

import { useRouter } from 'next/navigation';
import { useTestData } from '@/hooks/useTestData';
import type { DetailedTestResult, PlaywrightPulseReport, TestStep, ScreenshotAttachment } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, LineChart, Info, Download, Film, Archive, Terminal, FileJson, FileSpreadsheet, FileCode, File as FileIcon } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, useMemo } from 'react';
import { TestStepItemRecursive } from './TestStepItemRecursive';
import { getRawHistoricalReports } from '@/app/actions';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, DotProps } from 'recharts';
import { cn, ansiToHtml, getAssetPath as getUtilAssetPath } from '@/lib/utils';


interface TestRunHistoryData {
  date: string;
  duration: number; // in ms
  status: DetailedTestResult['status'];
}

interface CustomDotProps extends DotProps {
  payload?: TestRunHistoryData;
}

const StatusDot = (props: CustomDotProps) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  let color = 'hsl(var(--muted-foreground))'; // Default color
  if (payload.status === 'passed') color = 'hsl(var(--chart-3))';
  else if (payload.status === 'failed' || payload.status === 'timedOut') color = 'hsl(var(--destructive))';
  else if (payload.status === 'skipped') color = 'hsl(var(--accent))';

  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(var(--card))" strokeWidth={1}/>;
};

const HistoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TestRunHistoryData;
    return (
      <div className="custom-recharts-tooltip">
        <p className="label text-sm font-semibold text-foreground">{`Date: ${new Date(data.date).toLocaleDateString()}`}</p>
        <p className="text-xs text-foreground">{`Duration: ${formatDuration(data.duration)}`}</p>
        <p className="text-xs" style={{ color: data.status === 'passed' ? 'hsl(var(--chart-3))' : data.status === 'failed' || data.status === 'timedOut' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))' }}>
          {`Status: ${data.status}`}
        </p>
      </div>
    );
  }
  return null;
};


function StatusIcon({ status }: { status: DetailedTestResult['status'] }) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-6 w-6 text-[hsl(var(--chart-3))]" />;
    case 'failed':
      return <XCircle className="h-6 w-6 text-destructive" />;
    case 'skipped':
      return <AlertCircle className="h-6 w-6 text-[hsl(var(--accent))]" />;
    case 'timedOut':
      return <Clock className="h-6 w-6 text-destructive" />;
    case 'pending':
      return <Clock className="h-6 w-6 text-primary animate-pulse" />;
    default:
      return <Info className="h-6 w-6 text-muted-foreground"/>;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = parseFloat((ms / 1000).toFixed(2));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = parseFloat((seconds % 60).toFixed(2));
  return `${minutes}m ${remainingSeconds}s`;
}

function formatTestName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split(" > ");
  return parts[parts.length - 1] || fullName;
}

function getStatusBadgeStyle(status: DetailedTestResult['status']): React.CSSProperties {
  switch (status) {
    case 'passed':
      return { backgroundColor: 'hsl(var(--chart-3))', color: 'hsl(var(--primary-foreground))' };
    case 'failed':
    case 'timedOut':
      return { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' };
    case 'skipped':
      return { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' };
    case 'pending':
      return { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' };
    default:
      return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
  }
}

function AttachmentIcon({ contentType }: { contentType: string }) {
    const lowerContentType = contentType.toLowerCase();
    if (lowerContentType.includes('html')) return <FileCode className="h-6 w-6 text-blue-500" />;
    if (lowerContentType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (lowerContentType.includes('json')) return <FileJson className="h-6 w-6 text-yellow-500" />;
    if (lowerContentType.includes('csv') || lowerContentType.startsWith('text/plain')) return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    if (lowerContentType.startsWith('text/')) return <FileText className="h-6 w-6 text-gray-500" />;
    return <FileIcon className="h-6 w-6 text-gray-400" />;
}


export function TestDetailsClientPage({ testId }: { testId: string }) {
  const router = useRouter();
  const { currentRun, loadingCurrent, errorCurrent } = useTestData();
  const [test, setTest] = useState<DetailedTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestRunHistoryData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const historyChartRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (currentRun?.results) {
      const foundTest = currentRun.results.find((t: DetailedTestResult) => t.id === testId);
      setTest(foundTest || null);
    }
  }, [currentRun, testId]);

  useEffect(() => {
    if (!testId) return;

    const fetchTestHistory = async () => {
      setLoadingHistory(true);
      setErrorHistory(null);
      try {
        const rawReports: PlaywrightPulseReport[] = await getRawHistoricalReports();
        const historyData: TestRunHistoryData[] = [];
        rawReports.forEach(report => {
          const historicalTest = report.results.find((r: DetailedTestResult) => r.id === testId);
          if (historicalTest) {
            historyData.push({
              date: report.run.timestamp,
              duration: historicalTest.duration,
              status: historicalTest.status,
            });
          }
        });
        historyData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTestHistory(historyData);
      } catch (error) {
        console.error("Error fetching test history:", error);
        setErrorHistory(error instanceof Error ? error.message : "Failed to load test history");
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchTestHistory();
  }, [testId]);

  const screenshotAttachments = useMemo(() => test?.screenshots || [], [test]);
  const videoItem = useMemo(() => {
    if (!test?.videoPath) return null;
    return {
      name: test.videoPath.split(/[/\\]/).pop() || 'Video Recording',
      path: test.videoPath,
      contentType: 'video/mp4' // Assuming mp4, could be inferrred or passed if available
    };
  }, [test]);

  const traceFile = useMemo(() => {
    if (!test?.tracePath) return null;
    return {
      name: test.tracePath.split(/[/\\]/).pop() || 'trace.zip',
      path: test.tracePath,
      contentType: 'application/zip'
    };
  }, [test]);
  
  // These will be empty for now as their data source (generic attachments) is removed.
  const htmlAttachments: ScreenshotAttachment[] = []; 
  const pdfAttachments: ScreenshotAttachment[] = [];
  const jsonAttachments: ScreenshotAttachment[] = [];
  const textCsvAttachments: ScreenshotAttachment[] = [];
  const otherAttachments: ScreenshotAttachment[] = [];

  const totalAttachmentsCount = useMemo(() => {
    return (screenshotAttachments.length) +
           (videoItem ? 1 : 0) +
           (traceFile ? 1 : 0) +
           htmlAttachments.length +
           pdfAttachments.length +
           jsonAttachments.length +
           textCsvAttachments.length +
           otherAttachments.length;
  }, [screenshotAttachments, videoItem, traceFile]);


  if (loadingCurrent && !test) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-4 rounded-md" />
        <Card className="shadow-xl rounded-lg"><CardHeader><Skeleton className="h-8 w-3/4 mb-2 rounded-md" /><Skeleton className="h-4 w-1/2 rounded-md" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-1/3 mb-4 rounded-md" /><Skeleton className="h-40 w-full rounded-md" /></CardContent></Card>
      </div>
    );
  }

  if (errorCurrent && !test) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="rounded-lg"><AlertTitle>Error loading test data</AlertTitle><AlertDescription>{errorCurrent}</AlertDescription></Alert>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-4 rounded-lg"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert className="rounded-lg"><AlertTitle>Test Not Found</AlertTitle><AlertDescription>The test with ID '{testId}' could not be found in the current report.</AlertDescription></Alert>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-6 rounded-lg"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
      </div>
    );
  }

  const displayName = formatTestName(test.name);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button onClick={() => router.push('/')} variant="outline" size="sm" className="mb-6 rounded-lg">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-xl rounded-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
                <CardTitle className="text-2xl font-headline text-primary flex items-center" title={test.name}>
                <StatusIcon status={test.status} />
                <span className="ml-3">{displayName}</span>
                </CardTitle>
                {test.suiteName && <CardDescription className="mt-1 text-md">From suite: {test.suiteName}</CardDescription>}
                 <p className="text-sm text-muted-foreground mt-2">Latest Run Date: {loadingCurrent ? <span className="text-muted-foreground">Loading...</span> : currentRun?.run?.timestamp ? <span className="font-medium">{new Date(currentRun.run.timestamp).toLocaleString()}</span> : errorCurrent && !currentRun?.run?.timestamp ? <span className="text-destructive font-medium">Error loading date</span> : <span className="font-medium">Not available</span>}</p>
                 <div className="mt-1 text-xs text-muted-foreground"><p>ID: {test.id}</p>{test.browser && <p>Browser: {test.browser}</p>}{test.codeSnippet && <p>Defined at: {test.codeSnippet}</p>}</div>
            </div>
            <div className="text-right flex-shrink-0">
                 <Badge variant="outline" className="capitalize text-sm px-3 py-1 rounded-full border" style={getStatusBadgeStyle(test.status)}>{test.status}</Badge>
                <p className="text-sm text-muted-foreground mt-1">Duration: {formatDuration(test.duration)}</p>
                <p className="text-xs text-muted-foreground">Retries: {test.retries}</p>
                {test.tags && test.tags.length > 0 && (<div className="mt-1 space-x-1">{test.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs rounded-full">{tag}</Badge>)}</div>)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 rounded-lg">
              <TabsTrigger value="steps">Execution Steps ({test.steps?.length || 0})</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({totalAttachmentsCount})</TabsTrigger>
              <TabsTrigger value="logs"><FileText className="h-4 w-4 mr-2"/>Logs</TabsTrigger>
              <TabsTrigger value="history">Test Run History</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-4 p-1 md:p-4 border rounded-lg bg-card shadow-inner">
              <h3 className="text-lg font-semibold text-foreground mb-3 px-3 md:px-0">Test Execution Steps</h3>
              {test.errorMessage && (<div className="mb-4 p-3 md:p-0"><h4 className="font-semibold text-md text-destructive mb-1">Overall Test Error:</h4><pre className="bg-destructive/10 text-sm p-4 rounded-lg whitespace-pre-wrap break-all font-code overflow-x-auto"><span dangerouslySetInnerHTML={{ __html: ansiToHtml(test.errorMessage) }} /></pre></div>)}
              {test.steps && test.steps.length > 0 ? (<ScrollArea className="h-[600px] w-full"><div className="pr-4">{test.steps.map((step: TestStep, index: number) => (<TestStepItemRecursive key={step.id || index} step={step} />))}</div></ScrollArea>) : (<p className="text-muted-foreground p-3 md:p-0">No detailed execution steps available for this test.</p>)}
            </TabsContent>

            <TabsContent value="attachments" className="mt-4 p-1 md:p-4 border rounded-lg bg-card shadow-inner">
              <Tabs defaultValue="sub-screenshots" className="w-full">
                <ScrollArea className="w-full whitespace-nowrap rounded-lg">
                    <TabsList className="inline-grid w-max grid-flow-col mb-4 rounded-lg">
                    <TabsTrigger value="sub-screenshots" disabled={screenshotAttachments.length === 0}><ImageIcon className="h-4 w-4 mr-2" />Screenshots ({screenshotAttachments.length})</TabsTrigger>
                    <TabsTrigger value="sub-video" disabled={!videoItem}><Film className="h-4 w-4 mr-2" />Videos ({videoItem ? 1 : 0})</TabsTrigger>
                    <TabsTrigger value="sub-trace" disabled={!traceFile}><Archive className="h-4 w-4 mr-2" />Trace {traceFile ? '(1)' : '(0)'}</TabsTrigger>
                    <TabsTrigger value="sub-html" disabled={htmlAttachments.length === 0}><FileCode className="h-4 w-4 mr-2" />HTML ({htmlAttachments.length})</TabsTrigger>
                    <TabsTrigger value="sub-pdf" disabled={pdfAttachments.length === 0}><FileText className="h-4 w-4 mr-2" />PDF ({pdfAttachments.length})</TabsTrigger>
                    <TabsTrigger value="sub-json" disabled={jsonAttachments.length === 0}><FileJson className="h-4 w-4 mr-2" />JSON ({jsonAttachments.length})</TabsTrigger>
                    <TabsTrigger value="sub-text" disabled={textCsvAttachments.length === 0}><FileText className="h-4 w-4 mr-2" />Text/CSV ({textCsvAttachments.length})</TabsTrigger>
                    <TabsTrigger value="sub-other" disabled={otherAttachments.length === 0}><FileIcon className="h-4 w-4 mr-2" />Others ({otherAttachments.length})</TabsTrigger>
                    </TabsList>
                </ScrollArea>

                <TabsContent value="sub-screenshots" className="mt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Screenshots</h3>
                  {screenshotAttachments.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{screenshotAttachments.map((attachment, index) => {const imageSrc = getUtilAssetPath(attachment.path); if (imageSrc === '#') return null; return (<a key={`img-preview-${index}`} href={imageSrc} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all shadow-md hover:shadow-lg"><Image src={imageSrc} alt={attachment.name || `Screenshot ${index + 1}`} fill={true} style={{objectFit: "cover"}} className="group-hover:scale-105 transition-transform duration-300" data-ai-hint={attachment['data-ai-hint'] || "test screenshot"}/><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2"><p className="text-white text-xs text-center break-all">{attachment.name || `Screenshot ${index + 1}`}</p></div></a>);})}</div>) : (<p className="text-muted-foreground">No screenshots available for this test.</p>)}
                </TabsContent>

                <TabsContent value="sub-video" className="mt-4">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Video Recording</h3>
                    <div className="space-y-4">
                        {videoItem ? (
                            <div className="p-4 border rounded-lg bg-muted/30 shadow-sm flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground truncate" title={videoItem.name}>{videoItem.name}</p>
                                <div className="flex items-center gap-2">
                                    <Button asChild variant="ghost" size="sm"><a href={getUtilAssetPath(videoItem.path)} target="_blank" rel="noopener noreferrer">View</a></Button>
                                    <Button asChild variant="outline" size="sm"><a href={getUtilAssetPath(videoItem.path)} download={videoItem.name}><Download className="h-4 w-4 mr-2"/>Download</a></Button>
                                </div>
                            </div>
                        ) : (
                            <Alert className="rounded-lg"><Info className="h-4 w-4" /><AlertTitle>No Video Available</AlertTitle><AlertDescription>There is no video recording associated with this test run.</AlertDescription></Alert>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="sub-trace" className="mt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Trace File</h3>
                  {traceFile ? (
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-3 shadow-sm">
                      <a href={getUtilAssetPath(traceFile.path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline text-base" download={traceFile.name}>
                        <Download className="h-5 w-5 mr-2" /> Download Trace File ({traceFile.name})
                      </a>
                      <p className="text-xs text-muted-foreground">Path: {traceFile.path}</p>
                      <Alert className="rounded-lg">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Using Trace Files</AlertTitle>
                        <AlertDescription>
                          Trace files (.zip) can be viewed using the Playwright CLI: <code className="bg-muted px-1 py-0.5 rounded-sm">npx playwright show-trace /path/to/your/trace.zip</code>. Or by uploading them to <a href="https://trace.playwright.dev/" target="_blank" rel="noopener noreferrer" className="underline">trace.playwright.dev</a>.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Alert className="rounded-lg">
                      <Info className="h-4 w-4" />
                      <AlertTitle>No Trace File Available</AlertTitle>
                      <AlertDescription>There is no Playwright trace file associated with this test run.</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                {/* Placeholder for other attachment types if data source is identified later */}
                {[
                  { value: 'sub-html', title: 'HTML Files', attachments: htmlAttachments },
                  { value: 'sub-pdf', title: 'PDF Documents', attachments: pdfAttachments },
                  { value: 'sub-json', title: 'JSON Files', attachments: jsonAttachments },
                  { value: 'sub-text', title: 'Text & CSV Files', attachments: textCsvAttachments },
                  { value: 'sub-other', title: 'Other Files', attachments: otherAttachments },
                ].map(tab => (
                  <TabsContent key={tab.value} value={tab.value} className="mt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{tab.title}</h3>
                     <Alert className="rounded-lg"><Info className="h-4 w-4" /><AlertTitle>No Files Available</AlertTitle><AlertDescription>No attachments of this type were found for this test (data for this tab would come from a generic 'attachments' field if present).</AlertDescription></Alert>
                  </TabsContent>
                ))}

              </Tabs>
            </TabsContent>

            <TabsContent value="logs" className="mt-4 p-4 border rounded-lg bg-card space-y-6 shadow-inner">
              <div><h3 className="text-lg font-semibold text-foreground mb-3 flex items-center"><Terminal className="h-5 w-5 mr-2 text-primary"/>Console Logs / Standard Output</h3><ScrollArea className="h-48 w-full rounded-lg border p-3 bg-muted/30 shadow-sm"><pre className="text-sm whitespace-pre-wrap break-words font-code"><span dangerouslySetInnerHTML={{ __html: ansiToHtml((test.stdout && Array.isArray(test.stdout) && test.stdout.length > 0) ? test.stdout.join('\n') : "No standard output logs captured for this test.")}} /></pre></ScrollArea></div>
              <div><h3 className="text-lg font-semibold text-foreground mb-3 flex items-center"><AlertCircle className="h-5 w-5 mr-2 text-destructive"/>Error Messages / Standard Error</h3><ScrollArea className="h-48 w-full rounded-lg border bg-destructive/5 shadow-sm"><pre className="text-sm p-3 whitespace-pre-wrap break-all font-code"><span dangerouslySetInnerHTML={{ __html: ansiToHtml(test.errorMessage || "No errors captured for this test.")}} /></pre></ScrollArea></div>
            </TabsContent>

            <TabsContent value="history" className="mt-4 p-4 border rounded-lg bg-card shadow-inner">
              <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-semibold text-foreground flex items-center"><LineChart className="h-5 w-5 mr-2 text-primary"/>Individual Test Run History</h3></div>
              {loadingHistory && (<div className="space-y-3"><Skeleton className="h-6 w-3/4 rounded-md" /><Skeleton className="h-64 w-full rounded-lg" /></div>)}
              {errorHistory && !loadingHistory && (<Alert variant="destructive" className="rounded-lg"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Loading Test History</AlertTitle><AlertDescription>{errorHistory}</AlertDescription></Alert>)}
              {!loadingHistory && !errorHistory && testHistory.length === 0 && (<Alert className="rounded-lg"><Info className="h-4 w-4" /><AlertTitle>No Historical Data</AlertTitle><AlertDescription>No historical run data found for this specific test (ID: {testId}).</AlertDescription></Alert>)}
              {!loadingHistory && !errorHistory && testHistory.length > 0 && (<div ref={historyChartRef} className="w-full h-[300px] bg-card p-4 rounded-lg shadow-inner"><ResponsiveContainer width="100%" height="100%"><RechartsLineChart data={testHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40}/><YAxis tickFormatter={(tick) => formatDuration(tick)} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={80}/><RechartsTooltip content={<HistoryTooltip />}/><Legend wrapperStyle={{fontSize: "12px"}}/><Line type="monotone" dataKey="duration" name="Duration" stroke="hsl(var(--primary))" strokeWidth={2} dot={<StatusDot />} activeDot={{ r: 7 }}/></RechartsLineChart></ResponsiveContainer></div>)}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
