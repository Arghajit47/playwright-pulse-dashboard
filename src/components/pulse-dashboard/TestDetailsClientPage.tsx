
'use client';

import { useRouter } from 'next/navigation';
import { useTestData } from '@/hooks/useTestData';
import type { DetailedTestResult, PlaywrightPulseReport, TestStep } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, Paperclip, ImageIcon, FileText, LineChart, Info, Download, Film, FileZip } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef } from 'react';
import { TestStepItemRecursive } from './TestStepItemRecursive';
import { getRawHistoricalReports } from '@/app/actions';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, DotProps } from 'recharts';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  if (payload.status === 'passed') color = 'hsl(var(--chart-3))'; // green
  else if (payload.status === 'failed' || payload.status === 'timedOut') color = 'hsl(var(--destructive))'; // red
  else if (payload.status === 'skipped') color = 'hsl(var(--accent))'; // orange

  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(var(--card))" strokeWidth={1}/>;
};

const HistoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TestRunHistoryData;
    return (
      <div className="bg-card p-3 border border-border rounded-md shadow-lg">
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
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    case 'failed':
      return <XCircle className="h-6 w-6 text-destructive" />;
    case 'skipped':
      return <AlertCircle className="h-6 w-6 text-accent" />;
    case 'timedOut':
      return <Clock className="h-6 w-6 text-destructive" />;
    case 'pending':
      return <Clock className="h-6 w-6 text-primary animate-pulse" />;
    default:
      return null;
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

function getStatusBadgeClass(status: DetailedTestResult['status']): string {
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

export function TestDetailsClientPage({ testId }: { testId: string }) {
  const router = useRouter();
  const { currentRun, loadingCurrent, errorCurrent } = useTestData();
  const [test, setTest] = useState<DetailedTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestRunHistoryData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const historyChartRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (currentRun?.results) {
      const foundTest = currentRun.results.find(t => t.id === testId);
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
          const historicalTest = report.results.find(r => r.id === testId); 
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


  if (loadingCurrent && !test) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-1/3 mb-4" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorCurrent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Error loading test data</AlertTitle>
          <AlertDescription>{errorCurrent}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert>
            <AlertTitle>Test Not Found</AlertTitle>
            <AlertDescription>The test with ID '{testId}' could not be found in the current report.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const imageScreenshots = test.screenshots?.filter(s => s.contentType?.startsWith('image/')) || [];
  const displayName = formatTestName(test.name);
  const hasVideo = !!test.videoPath;
  const hasTrace = !!test.tracePath;

  let totalAttachmentsCount = imageScreenshots.length;
  if (hasVideo) totalAttachmentsCount++;
  if (hasTrace) totalAttachmentsCount++;


  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button onClick={() => router.push('/')} variant="outline" size="sm" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
                <CardTitle className="text-2xl font-headline text-primary flex items-center" title={test.name}>
                <StatusIcon status={test.status} />
                <span className="ml-3">{displayName}</span>
                </CardTitle>
                {test.suiteName && <CardDescription className="mt-1 text-md">From suite: {test.suiteName}</CardDescription>}
                 <div className="mt-1 text-xs text-muted-foreground">
                    <p>ID: {test.id}</p>
                    {test.browser && <p>Browser: {test.browser}</p>}
                    {test.codeSnippet && <p>Defined at: {test.codeSnippet}</p>}
                 </div>
            </div>
            <div className="text-right flex-shrink-0">
                 <Badge
                    className={cn(
                      "capitalize text-sm px-3 py-1 border-transparent",
                      getStatusBadgeClass(test.status)
                    )}
                  >
                    {test.status}
                  </Badge>
                <p className="text-sm text-muted-foreground mt-1">Duration: {formatDuration(test.duration)}</p>
                <p className="text-xs text-muted-foreground">Retries: {test.retries}</p>
                {test.tags && test.tags.length > 0 && (
                    <div className="mt-1 space-x-1">
                        {test.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    </div>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-3 lg:w-[600px] mb-4">
              <TabsTrigger value="steps">Execution Steps ({test.steps?.length || 0})</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({totalAttachmentsCount})</TabsTrigger>
              <TabsTrigger value="history">Test Run History</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-4 p-1 md:p-4 border rounded-md bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-3 px-3 md:px-0">Test Execution Steps</h3>
              {test.error && (
                 <div className="mb-4 p-3 md:p-0">
                  <h4 className="font-semibold text-md text-destructive mb-1">Overall Test Error:</h4>
                  <pre className="bg-destructive/10 text-destructive text-sm p-4 rounded-md whitespace-pre-wrap break-all font-code overflow-x-auto">{test.error}</pre>
                </div>
              )}
              {test.steps && test.steps.length > 0 ? (
                <ScrollArea className="h-[600px] w-full">
                  <div className="pr-4">
                    {test.steps.map((step, index) => (
                      <TestStepItemRecursive key={step.id || index} step={step} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground p-3 md:p-0">No detailed execution steps available for this test.</p>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-4 p-1 md:p-4 border rounded-md bg-card">
              <Tabs defaultValue="sub-screenshots" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="sub-screenshots">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Screenshots ({imageScreenshots.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="sub-video" disabled={!hasVideo}>
                    <Film className="h-4 w-4 mr-2" />
                    Video {hasVideo ? '(1)' : '(0)'}
                  </TabsTrigger>
                  <TabsTrigger value="sub-trace" disabled={!hasTrace}>
                    <FileZip className="h-4 w-4 mr-2" />
                    Trace {hasTrace ? '(1)' : '(0)'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sub-screenshots" className="mt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Screenshots</h3>
                  {imageScreenshots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imageScreenshots.map((att, index) => (
                        <a key={`img-preview-${index}`} href={att.path.startsWith('http') || att.path.startsWith('/') ? att.path : `/${att.path}`} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all">
                          <Image
                            src={att.path.startsWith('http') || att.path.startsWith('/') ? att.path : `/${att.path}`}
                            alt={att.name || `screenshot ${index + 1}`}
                            fill={true}
                            style={{objectFit: "cover"}}
                            className="group-hover:scale-105 transition-transform duration-300"
                            data-ai-hint={att['data-ai-hint'] || 'screenshot test detail'}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                            <p className="text-white text-xs text-center break-all">{att.name || `Screenshot ${index + 1}`}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No screenshots available for this test.</p>
                  )}
                </TabsContent>

                <TabsContent value="sub-video" className="mt-4">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Video Recording</h3>
                  {hasVideo ? (
                    <div className="p-4 border rounded-md bg-muted/30">
                      <a
                        href={test.videoPath!.startsWith('http') || test.videoPath!.startsWith('/') ? test.videoPath! : `/${test.videoPath!}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline text-base"
                      >
                        <Download className="h-5 w-5 mr-2" /> View/Download Video
                      </a>
                      <p className="text-xs text-muted-foreground mt-2">Path: {test.videoPath}</p>
                    </div>
                  ) : (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Video Available</AlertTitle>
                        <AlertDescription>There is no video recording associated with this test run.</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="sub-trace" className="mt-4">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Trace File</h3>
                  {hasTrace ? (
                    <div className="p-4 border rounded-md bg-muted/30 space-y-3">
                       <a
                        href={test.tracePath!.startsWith('http') || test.tracePath!.startsWith('/') ? test.tracePath! : `/${test.tracePath!}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline text-base"
                        download 
                      >
                        <Download className="h-5 w-5 mr-2" /> Download Trace File (.zip)
                      </a>
                      <p className="text-xs text-muted-foreground">Path: {test.tracePath}</p>
                       <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Using Trace Files</AlertTitle>
                          <AlertDescription>
                              Trace files (.zip) can be viewed using the Playwright CLI: <code className="bg-muted px-1 py-0.5 rounded-sm">npx playwright show-trace /path/to/your/trace.zip</code>.
                              Or by uploading them to <a href="https://trace.playwright.dev/" target="_blank" rel="noopener noreferrer" className="underline">trace.playwright.dev</a>.
                          </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Trace File Available</AlertTitle>
                        <AlertDescription>There is no Playwright trace file associated with this test run.</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>


            <TabsContent value="history" className="mt-4 p-4 border rounded-md bg-card">
             <TooltipProvider>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-primary"/>
                  Individual Test Run History
                </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => handleDownloadChart(historyChartRef, `test-history-${testId}.png`)} aria-label="Download Test History Chart">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download as PNG</p>
                    </TooltipContent>
                  </Tooltip>
              </div>
              </TooltipProvider>
              {loadingHistory && (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-64 w-full" />
                </div>
              )}
              {errorHistory && !loadingHistory && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading History</AlertTitle>
                  <AlertDescription>{errorHistory}</AlertDescription>
                </Alert>
              )}
              {!loadingHistory && !errorHistory && testHistory.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Historical Data</AlertTitle>
                  <AlertDescription>
                    No historical run data found for this specific test (ID: {testId}).
                    Ensure `trend-*.json` files in `public/pulse-report/history/` contain results for this test ID.
                  </AlertDescription>
                </Alert>
              )}
              {!loadingHistory && !errorHistory && testHistory.length > 0 && (
                <div ref={historyChartRef} className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={testHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})}
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        tickFormatter={(tick) => formatDuration(tick)}
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                        width={80}
                      />
                      <RechartsTooltip content={<HistoryTooltip />}/>
                      <Legend wrapperStyle={{fontSize: "12px"}}/>
                      <Line
                        type="monotone"
                        dataKey="duration"
                        name="Duration"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={<StatusDot />}
                        activeDot={{ r: 7 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

