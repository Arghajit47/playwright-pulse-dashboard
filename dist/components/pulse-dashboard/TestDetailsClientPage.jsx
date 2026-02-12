"use client";
import { useRouter } from "next/navigation";
import { useTestData } from "@/hooks/useTestData";
import { getEffectiveTestStatus } from "@/lib/testUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, LineChart, Info, Download, Film, Archive, Terminal, FileJson, FileSpreadsheet, FileCode, File as FileIcon, Sparkles, Lightbulb, Wrench, } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TestStepItemRecursive } from "./TestStepItemRecursive";
import { getRawHistoricalReports } from "@/app/actions";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, } from "recharts";
import { cn, ansiToHtml, getAssetPath as getUtilAssetPath } from "@/lib/utils";
const StatusDot = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload)
        return null;
    let color = "hsl(var(--muted-foreground))"; // Default color
    if (payload.status === "passed")
        color = "hsl(var(--chart-3))";
    else if (payload.status === "flaky")
        color = "hsl(var(--flaky))";
    else if (payload.status === "failed" || payload.status === "timedOut")
        color = "hsl(var(--destructive))";
    else if (payload.status === "skipped")
        color = "hsl(var(--accent))";
    return (<circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(var(--card))" strokeWidth={1}/>);
};
const HistoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (<div className="bg-card p-3 border border-border rounded-md shadow-lg">
        <p className="label text-sm font-semibold text-foreground">{`Date: ${new Date(data.date).toLocaleString()}`}</p>
        <p className="text-xs text-foreground">{`Duration: ${formatDuration(data.duration)}`}</p>
        <p className="text-xs capitalize font-medium" style={{
                color: data.status === "passed"
                    ? "hsl(var(--chart-3))"
                    : data.status === "flaky"
                        ? "hsl(var(--flaky))"
                        : data.status === "failed" || data.status === "timedOut"
                            ? "hsl(var(--destructive))"
                            : "hsl(var(--accent))",
            }}>
          {`Status: ${data.status}`}
        </p>
      </div>);
    }
    return null;
};
function StatusIcon({ status }) {
    switch (status) {
        case "passed":
            return <CheckCircle2 className="h-6 w-6 text-[hsl(var(--chart-3))]"/>;
        case "failed":
            return <XCircle className="h-6 w-6 text-destructive"/>;
        case "skipped":
            return <AlertCircle className="h-6 w-6 text-[hsl(var(--accent))]"/>;
        case "timedOut":
            return <Clock className="h-6 w-6 text-destructive"/>;
        case "pending":
            return <Clock className="h-6 w-6 text-primary animate-pulse"/>;
        default:
            return <Info className="h-6 w-6 text-muted-foreground"/>;
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
        return "";
    const parts = fullName.split(" > ");
    return parts[parts.length - 1] || fullName;
}
function getStatusBadgeStyle(status) {
    switch (status) {
        case "passed":
            return {
                backgroundColor: "hsl(var(--chart-3))",
                color: "hsl(var(--primary-foreground))",
            };
        case "failed":
        case "timedOut":
            return {
                backgroundColor: "hsl(var(--destructive))",
                color: "hsl(var(--destructive-foreground))",
            };
        case "skipped":
            return {
                backgroundColor: "hsl(var(--accent))",
                color: "hsl(var(--accent-foreground))",
            };
        case "pending":
            return {
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
            };
        case "flaky":
            return {
                backgroundColor: "hsl(var(--flaky))",
                color: "hsl(var(--flaky-foreground))",
            };
        default:
            return {
                backgroundColor: "hsl(var(--muted))",
                color: "hsl(var(--muted-foreground))",
            };
    }
}
function AttachmentIcon({ contentType }) {
    const lowerContentType = contentType.toLowerCase();
    if (lowerContentType.includes("html"))
        return <FileCode className="h-6 w-6 text-blue-500"/>;
    if (lowerContentType.includes("pdf"))
        return <FileText className="h-6 w-6 text-red-500"/>;
    if (lowerContentType.includes("json"))
        return <FileJson className="h-6 w-6 text-yellow-500"/>;
    if (lowerContentType.includes("csv") ||
        lowerContentType.startsWith("text/plain"))
        return <FileSpreadsheet className="h-6 w-6 text-green-500"/>;
    if (lowerContentType.startsWith("text/"))
        return <FileText className="h-6 w-6 text-gray-500"/>;
    return <FileIcon className="h-6 w-6 text-gray-400"/>;
}
function getAttachmentNameFromPath(path, defaultName = "Attachment") {
    if (!path || typeof path !== "string")
        return defaultName;
    const parts = path.split(/[/\\]/);
    return parts.pop() || defaultName;
}
// --- Reusable Tab Content Components ---
function StepsTabContent({ test }) {
    return (<div className="mt-4 p-1 md:p-4 border rounded-lg bg-card shadow-inner">
      <h3 className="text-lg font-semibold text-foreground mb-3 px-3 md:px-0">
        Test Execution Steps
      </h3>
      {test.errorMessage && (<div className="mb-4 p-3 md:p-0">
          <h4 className="font-semibold text-md text-destructive mb-1">
            Overall Test Error:
          </h4>
          <pre className="bg-destructive/10 text-sm p-4 rounded-lg whitespace-pre-wrap break-all font-code overflow-x-auto">
            <span dangerouslySetInnerHTML={{
                __html: ansiToHtml(test.errorMessage),
            }}/>
          </pre>
        </div>)}
      {test.annotations && test.annotations.length > 0 && (<div className="mb-4 p-3 md:p-0">
          <div style={{
                margin: "12px 0",
                padding: "12px",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderLeft: "4px solid #8b5cf6",
                borderRadius: "4px",
            }}>
            <h4 style={{
                marginTop: 0,
                marginBottom: "10px",
                color: "#8b5cf6",
                fontSize: "1.1em",
            }}>
              📌 Annotations
            </h4>
            {test.annotations.map((annotation, index) => (<div key={index} style={{
                    marginBottom: index === test.annotations.length - 1 ? "0" : "10px",
                }}>
                <strong style={{ color: "#8b5cf6" }}>Type:</strong>{" "}
                <span style={{
                    backgroundColor: "rgba(139, 92, 246, 0.2)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.9em",
                }}>
                  {annotation.type}
                </span>
                {annotation.description && (<>
                    <br />
                    <strong style={{ color: "#8b5cf6" }}>
                      Description:
                    </strong>{" "}
                    {annotation.description}
                  </>)}
                {annotation.location && (<div style={{
                        fontSize: "0.85em",
                        color: "#6b7280",
                        marginTop: "4px",
                    }}>
                    Location: {annotation.location.file}:
                    {annotation.location.line}:{annotation.location.column}
                  </div>)}
              </div>))}
          </div>
        </div>)}
      {test.steps && test.steps.length > 0 ? (<ScrollArea className="h-[600px] w-full">
          <div className="pr-4">
            {test.steps.map((step, index) => (<TestStepItemRecursive key={step.id || index} step={step}/>))}
          </div>
        </ScrollArea>) : (<p className="text-muted-foreground p-3 md:p-0">
          No detailed execution steps available for this test.
        </p>)}
    </div>);
}
function LogsTabContent({ test }) {
    return (<div className="mt-4 p-4 border rounded-lg bg-card space-y-6 shadow-inner">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
          <Terminal className="h-5 w-5 mr-2 text-primary"/>
          Console Logs / Standard Output
        </h3>
        <ScrollArea className="h-48 w-full rounded-lg border p-3 bg-muted/30 shadow-sm">
          <pre className="text-sm whitespace-pre-wrap break-words font-code">
            <span dangerouslySetInnerHTML={{
            __html: ansiToHtml(test.stdout &&
                Array.isArray(test.stdout) &&
                test.stdout.length > 0
                ? test.stdout.join("\n")
                : "No standard output logs captured for this test."),
        }}/>
          </pre>
        </ScrollArea>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-destructive"/>
          Error Messages / Standard Error
        </h3>
        <ScrollArea className="h-48 w-full rounded-lg border bg-destructive/5 shadow-sm">
          <pre className="text-sm p-3 whitespace-pre-wrap break-all font-code">
            <span dangerouslySetInnerHTML={{
            __html: ansiToHtml(test.errorMessage ||
                "No errors captured for this test."),
        }}/>
          </pre>
        </ScrollArea>
      </div>
      {test.snippet && (<div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
            <FileCode className="h-5 w-5 mr-2 text-primary"/>
            Test Case Snippet
          </h3>
          <ScrollArea className="h-48 w-full rounded-lg border p-3 bg-muted/30 shadow-sm">
            <pre className="text-sm whitespace-pre-wrap break-words font-code">
              <span dangerouslySetInnerHTML={{
                __html: ansiToHtml(test.snippet),
            }}/>
            </pre>
          </ScrollArea>
        </div>)}
    </div>);
}
function AttachmentsTabContent({ test }) {
    const screenshotAttachments = useMemo(() => {
        if (!test || !Array.isArray(test.screenshots))
            return [];
        return test.screenshots.map((path, index) => ({
            name: getAttachmentNameFromPath(path, `Screenshot ${index + 1}`),
            path: path,
            contentType: "image/png",
            "data-ai-hint": `screenshot ${index + 1}`,
        }));
    }, [test]);
    const videoAttachments = useMemo(() => {
        if (!test || !Array.isArray(test.videoPath))
            return [];
        return test.videoPath.map((path, index) => ({
            name: getAttachmentNameFromPath(path, `Video ${index + 1}`),
            path: path,
            contentType: "video/mp4",
            "data-ai-hint": `video ${index + 1}`,
        }));
    }, [test]);
    const traceAttachment = useMemo(() => {
        if (!test || typeof test.tracePath !== "string" || !test.tracePath)
            return null;
        return {
            name: getAttachmentNameFromPath(test.tracePath, "trace.zip"),
            path: test.tracePath,
            contentType: "application/zip",
        };
    }, [test]);
    const allOtherAttachments = useMemo(() => {
        if (!test || !Array.isArray(test.attachments))
            return [];
        return test.attachments.map((att, index) => ({
            name: att.name ||
                getAttachmentNameFromPath(att.path, `Attachment ${index + 1}`),
            path: att.path,
            contentType: att.contentType || "application/octet-stream",
            "data-ai-hint": att["data-ai-hint"],
        }));
    }, [test]);
    const htmlAttachments = useMemo(() => allOtherAttachments.filter((a) => a.contentType.toLowerCase().includes("html")), [allOtherAttachments]);
    const pdfAttachments = useMemo(() => allOtherAttachments.filter((a) => a.contentType.toLowerCase().includes("pdf")), [allOtherAttachments]);
    const jsonAttachments = useMemo(() => allOtherAttachments.filter((a) => a.contentType.toLowerCase().includes("json")), [allOtherAttachments]);
    const textCsvAttachments = useMemo(() => allOtherAttachments.filter((a) => a.contentType.toLowerCase().startsWith("text/") ||
        a.contentType.toLowerCase().includes("csv")), [allOtherAttachments]);
    const otherGenericAttachments = useMemo(() => allOtherAttachments.filter((a) => !htmlAttachments.includes(a) &&
        !pdfAttachments.includes(a) &&
        !jsonAttachments.includes(a) &&
        !textCsvAttachments.includes(a)), [
        allOtherAttachments,
        htmlAttachments,
        pdfAttachments,
        jsonAttachments,
        textCsvAttachments,
    ]);
    return (<div className="mt-4 p-1 md:p-4 border rounded-lg bg-card shadow-inner">
       <Tabs defaultValue="sub-screenshots" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-lg">
          <TabsList className="inline-grid w-max grid-flow-col mb-4 rounded-lg">
            <TabsTrigger value="sub-screenshots" disabled={screenshotAttachments.length === 0}>
              <ImageIcon className="h-4 w-4 mr-2"/>
              Screenshots ({screenshotAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="sub-video" disabled={videoAttachments.length === 0}>
              <Film className="h-4 w-4 mr-2"/>
              Videos ({videoAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="sub-trace" disabled={!traceAttachment}>
              <Archive className="h-4 w-4 mr-2"/>
              Trace {traceAttachment ? "(1)" : "(0)"}
            </TabsTrigger>
            <TabsTrigger value="sub-html" disabled={htmlAttachments.length === 0}>
              <FileCode className="h-4 w-4 mr-2"/>
              HTML ({htmlAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="sub-pdf" disabled={pdfAttachments.length === 0}>
              <FileText className="h-4 w-4 mr-2"/>
              PDF ({pdfAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="sub-json" disabled={jsonAttachments.length === 0}>
              <FileJson className="h-4 w-4 mr-2"/>
              JSON ({jsonAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="sub-text" disabled={textCsvAttachments.length === 0}>
              <FileText className="h-4 w-4 mr-2"/>
              Text/CSV ({textCsvAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="sub-other" disabled={otherGenericAttachments.length === 0}>
              <FileIcon className="h-4 w-4 mr-2"/>
              Others ({otherGenericAttachments.length})
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="sub-screenshots" className="mt-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Screenshots
          </h3>
          {screenshotAttachments.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshotAttachments.map((attachment, index) => {
                const imageSrc = getUtilAssetPath(attachment.path);
                if (imageSrc === "#")
                    return null;
                return (<a key={`img-preview-${index}`} href={imageSrc} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all shadow-md hover:shadow-lg">
                    <Image src={imageSrc} alt={attachment.name || `Screenshot ${index + 1}`} fill={true} style={{ objectFit: "cover" }} className="group-hover:scale-105 transition-transform duration-300" data-ai-hint={attachment["data-ai-hint"] || "test screenshot"}/>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                      <p className="text-white text-xs text-center break-all">
                        {attachment.name || `Screenshot ${index + 1}`}
                      </p>
                    </div>
                  </a>);
            })}
            </div>) : (<p className="text-muted-foreground">
              No screenshots available for this test.
            </p>)}
        </TabsContent>

        <TabsContent value="sub-video" className="mt-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Video Recording(s)
          </h3>
          <div className="space-y-4">
            {videoAttachments.length > 0 ? (videoAttachments.map((attachment, index) => (<div key={`video-${index}`} className="p-4 border rounded-lg bg-muted/30 shadow-sm flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate" title={attachment.name}>
                    {attachment.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <a href={getUtilAssetPath(attachment.path)} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={getUtilAssetPath(attachment.path)} download={attachment.name}>
                        <Download className="h-4 w-4 mr-2"/>
                        Download
                      </a>
                    </Button>
                  </div>
                </div>))) : (<Alert className="rounded-lg">
                <Info className="h-4 w-4"/>
                <AlertTitle>No Videos Available</AlertTitle>
                <AlertDescription>
                  There is no video recording associated with this test
                  run.
                </AlertDescription>
              </Alert>)}
          </div>
        </TabsContent>

        <TabsContent value="sub-trace" className="mt-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Trace File
          </h3>
          {traceAttachment ? (<div className="p-4 border rounded-lg bg-muted/30 space-y-3 shadow-sm">
              <a href={getUtilAssetPath(traceAttachment.path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline text-base" download={traceAttachment.name}>
                <Download className="h-5 w-5 mr-2"/> Download Trace
                File ({traceAttachment.name})
              </a>
              <p className="text-xs text-muted-foreground">
                Path: {traceAttachment.path}
              </p>
              <Alert className="rounded-lg">
                <Info className="h-4 w-4"/>
                <AlertTitle>Using Trace Files</AlertTitle>
                <AlertDescription>
                  Trace files (.zip) can be viewed using the Playwright
                  CLI:{" "}
                  <code className="bg-muted px-1 py-0.5 rounded-sm">
                    npx playwright show-trace /path/to/your/trace.zip
                  </code>
                  . Or by uploading them to{" "}
                  <a href="https://trace.playwright.dev/" target="_blank" rel="noopener noreferrer" className="underline">
                    trace.playwright.dev
                  </a>
                  .
                </AlertDescription>
              </Alert>
            </div>) : (<Alert className="rounded-lg">
              <Info className="h-4 w-4"/>
              <AlertTitle>No Trace File Available</AlertTitle>
              <AlertDescription>
                There is no Playwright trace file associated with this
                test run.
              </AlertDescription>
            </Alert>)}
        </TabsContent>

        {[
            {
                value: "sub-html",
                title: "HTML Files",
                attachments: htmlAttachments,
            },
            {
                value: "sub-pdf",
                title: "PDF Documents",
                attachments: pdfAttachments,
            },
            {
                value: "sub-json",
                title: "JSON Files",
                attachments: jsonAttachments,
            },
            {
                value: "sub-text",
                title: "Text & CSV Files",
                attachments: textCsvAttachments,
            },
            {
                value: "sub-other",
                title: "Other Files",
                attachments: otherGenericAttachments,
            },
        ].map((tab) => (<TabsContent key={tab.value} value={tab.value} className="mt-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {tab.title}
            </h3>
            <div className="space-y-3">
              {tab.attachments.length > 0 ? (tab.attachments.map((attachment, index) => (<div key={index} className="p-3 border rounded-lg bg-muted/30 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 truncate">
                      <AttachmentIcon contentType={attachment.contentType}/>
                      <div className="truncate">
                        <p className="text-sm font-medium text-foreground truncate" title={attachment.name}>
                          {attachment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.contentType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <a href={getUtilAssetPath(attachment.path)} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={getUtilAssetPath(attachment.path)} download={attachment.name}>
                          <Download className="h-4 w-4 mr-2"/>
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>))) : (<Alert className="rounded-lg">
                  <Info className="h-4 w-4"/>
                  <AlertTitle>No Files Available</AlertTitle>
                  <AlertDescription>
                    No attachments of this type were found for this
                    test.
                  </AlertDescription>
                </Alert>)}
            </div>
          </TabsContent>))}
      </Tabs>
    </div>);
}
function AiSuggestionsTabContent({ test }) {
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const [aiSuggestionError, setAiSuggestionError] = useState(null);
    const handleGenerateSuggestion = async () => {
        if (!test)
            return;
        setIsGeneratingSuggestion(true);
        setAiSuggestion(null);
        setAiSuggestionError(null);
        try {
            const response = await fetch("/api/analyze-test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    testName: test.name,
                    failureLogsAndErrors: test.errorMessage || "",
                    codeSnippet: test.snippet || "",
                }),
            });
            if (!response.ok) {
                const errorData = await response
                    .json()
                    .catch(() => ({ message: "Failed to parse error response" }));
                throw new Error(errorData.message ||
                    `API request failed with status ${response.status}`);
            }
            const result = await response.json();
            setAiSuggestion(result);
        }
        catch (error) {
            console.error("Error generating AI suggestion:", error);
            setAiSuggestionError(error instanceof Error ? error.message : "An unknown error occurred.");
        }
        finally {
            setIsGeneratingSuggestion(false);
        }
    };
    return (<div className="mt-4 p-4 border rounded-lg bg-card shadow-inner">
      <div className="flex flex-col items-center justify-center text-center p-2 md:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary"/>
          AI-Powered Failure Analysis
        </h3>

        {!(isGeneratingSuggestion ||
            aiSuggestion ||
            aiSuggestionError) && (<>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Get suggestions from AI to help diagnose the root cause
              of this test failure and find potential solutions.
            </p>
            <Button onClick={handleGenerateSuggestion} disabled={isGeneratingSuggestion}>
              <Sparkles className="h-4 w-4 mr-2"/>
              Generate Suggestion
            </Button>
          </>)}

        {isGeneratingSuggestion && (<div className="flex flex-col items-center justify-center py-10">
            <Sparkles className="h-8 w-8 text-primary animate-pulse mb-4"/>
            <p className="text-muted-foreground">
              Generating suggestion... Please wait.
            </p>
          </div>)}

        {aiSuggestionError && (<div className="w-full text-left">
            <Alert variant="destructive">
              <AlertTitle>Error Generating Suggestion</AlertTitle>
              <AlertDescription>{aiSuggestionError}</AlertDescription>
            </Alert>
            <Button onClick={handleGenerateSuggestion} variant="outline" size="sm" className="mt-4">
              <Sparkles className="h-4 w-4 mr-2"/>
              Try Again
            </Button>
          </div>)}

        {aiSuggestion && (<div className="text-left w-full mt-6 space-y-6">
            <Alert variant="default" className="border-primary/30 bg-primary/5">
              <Lightbulb className="h-5 w-5 text-primary"/>
              <AlertTitle className="text-primary font-semibold">
                Root Cause Analysis
              </AlertTitle>
              <AlertDescription className="text-primary/90">
                {aiSuggestion.rootCause ||
                "No root cause analysis provided."}
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Affected Tests:
              </h4>
              <div className="flex flex-wrap gap-2">
                {aiSuggestion.affectedTests?.map((testName) => (<Badge key={testName} variant="secondary">
                      {testName}
                    </Badge>)) || (<p className="text-sm text-muted-foreground">N/A</p>)}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center">
                <Wrench className="h-4 w-4 mr-2"/>
                Suggested Fixes
              </h4>
              <div className="space-y-4">
                {aiSuggestion.suggestedFixes?.map((fix, index) => (<Card key={index} className="bg-card/50 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Suggestion #{index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {fix.description}
                        </p>
                        {fix.codeSnippet && (<div>
                            <h5 className="text-xs font-semibold text-foreground mb-1 flex items-center">
                              <FileCode className="h-3 w-3 mr-1.5"/>
                              Code Snippet:
                            </h5>
                            <pre className="bg-muted text-sm p-3 rounded-md whitespace-pre-wrap font-code overflow-x-auto">
                              <code>{fix.codeSnippet}</code>
                            </pre>
                          </div>)}
                      </CardContent>
                    </Card>))}
                {(!aiSuggestion.suggestedFixes ||
                aiSuggestion.suggestedFixes.length === 0) && (<p className="text-sm text-muted-foreground">
                    No specific fixes were suggested.
                  </p>)}
              </div>
            </div>

            <Button onClick={handleGenerateSuggestion} variant="outline" size="sm" className="mt-4">
              <Sparkles className="h-4 w-4 mr-2"/>
              Regenerate Suggestion
            </Button>
          </div>)}
      </div>
    </div>);
}
export function TestDetailsClientPage({ testId }) {
    const router = useRouter();
    const { currentRun, loadingCurrent, errorCurrent } = useTestData();
    const [test, setTest] = useState(null);
    const [historicalReports, setHistoricalReports] = useState([]);
    const [testHistory, setTestHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [errorHistory, setErrorHistory] = useState(null);
    const historyChartRef = useRef(null);
    const [historyFetched, setHistoryFetched] = useState(false);
    const [selectedRunTimestamp, setSelectedRunTimestamp] = useState("current");
    const initialTest = useMemo(() => {
        return (currentRun?.results?.find((t) => t.id === testId) ||
            null);
    }, [currentRun, testId]);
    useEffect(() => {
        setTest(initialTest);
        // Reset history states when testId changes to allow refetching for the new test
        setHistoryFetched(false);
        setTestHistory([]);
        setErrorHistory(null);
    }, [initialTest, testId]);
    const fetchTestHistory = useCallback(async () => {
        if (!testId ||
            historyFetched ||
            !initialTest?.suiteName ||
            !currentRun?.run?.timestamp)
            return;
        setLoadingHistory(true);
        setErrorHistory(null);
        try {
            const allHistoricalReports = await getRawHistoricalReports();
            // Filter out the current run from the historical list to prevent duplicates
            const filteredReports = allHistoricalReports.filter((report) => report.run.timestamp !== currentRun.run.timestamp);
            setHistoricalReports(filteredReports);
            const historyData = [];
            filteredReports.forEach((report) => {
                const historicalTest = report.results.find((r) => r.id === testId && r.suiteName === initialTest.suiteName);
                if (historicalTest) {
                    const finalStatus = getEffectiveTestStatus(historicalTest);
                    historyData.push({
                        date: report.run.timestamp,
                        duration: historicalTest.duration,
                        status: finalStatus,
                    });
                }
            });
            // Add the current run to historyData so it shows up in the chart
            if (initialTest && currentRun?.run?.timestamp) {
                historyData.push({
                    date: currentRun.run.timestamp,
                    duration: initialTest.duration,
                    status: getEffectiveTestStatus(initialTest),
                });
            }
            historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTestHistory(historyData);
            setHistoryFetched(true);
        }
        catch (error) {
            console.error("Error fetching test history:", error);
            setErrorHistory(error instanceof Error ? error.message : "Failed to load test history");
        }
        finally {
            setLoadingHistory(false);
        }
    }, [testId, historyFetched, initialTest, currentRun]);
    useEffect(() => {
        if (selectedRunTimestamp === "current") {
            setTest(initialTest);
        }
        else {
            const report = historicalReports.find((r) => r.run.timestamp === selectedRunTimestamp);
            if (report?.results && initialTest) {
                const foundTest = report.results.find((t) => t.id === testId && t.suiteName === initialTest.suiteName);
                setTest(foundTest || null);
            }
        }
    }, [selectedRunTimestamp, initialTest, historicalReports, testId]);
    // Helper function to get color class based on test status
    const getStatusColorClass = (status) => {
        switch (status) {
            case "passed":
                return "bg-green-500";
            case "flaky":
                return "bg-sky-500";
            case "failed":
            case "timedOut":
                return "bg-red-500";
            case "skipped":
                return "bg-yellow-500";
            default:
                return "bg-gray-400";
        }
    };
    const isFailedTest = test?.status === "failed" || test?.status === "timedOut";
    // Calculate retry count by counting failed attempts in history
    const retryCount = test?.retryHistory
        ? test.retryHistory.filter((r) => r.status !== "passed" && r.status !== "skipped").length
        : 0;
    if (loadingCurrent && !test) {
        return (<div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-4 rounded-md"/>
        <Card className="shadow-xl rounded-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2 rounded-md"/>
            <Skeleton className="h-4 w-1/2 rounded-md"/>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-1/3 mb-4 rounded-md"/>
            <Skeleton className="h-40 w-full rounded-md"/>
          </CardContent>
        </Card>
      </div>);
    }
    if (errorCurrent && !test) {
        return (<div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="rounded-lg">
          <AlertTitle>Error loading test data</AlertTitle>
          <AlertDescription>{errorCurrent}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")} variant="outline" className="mt-4 rounded-lg">
          <ArrowLeft className="mr-2 h-4 w-4"/> Back
        </Button>
      </div>);
    }
    if (!test) {
        return (<div className="container mx-auto px-4 py-8 text-center">
        <Alert className="rounded-lg">
          <AlertTitle>Test Not Found</AlertTitle>
          <AlertDescription>
            The test with ID '{testId}' could not be found in the current
            report.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")} 
        // No variant needed, we are applying custom styles
        className="mt-6 inline-flex items-center justify-center rounded-xl border bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:bg-primary hover:text-primary-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard
        </Button>
      </div>);
    }
    const displayName = formatTestName(test.name);
    return (<div className="container mx-auto px-4 py-8 space-y-6">
      <Button onClick={() => router.push("/")} 
    // No variant needed, we are applying custom styles
    className="mt-6 inline-flex items-center justify-center rounded-xl border bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:bg-primary hover:text-primary-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard
      </Button>

      <Card className="shadow-xl rounded-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center" title={test.name}>
                <StatusIcon status={test.status}/>
                <span className="ml-3">{displayName}</span>
              </CardTitle>
              {test.suiteName && (<CardDescription className="mt-1 text-md">
                  From suite: {test.suiteName}
                </CardDescription>)}
              <p className="text-sm text-muted-foreground mt-2">
                Run Date:{" "}
                {selectedRunTimestamp === "current" ? (loadingCurrent ? (<span className="text-muted-foreground">Loading...</span>) : currentRun?.run?.timestamp ? (<span className="font-medium">
                      {new Date(currentRun.run.timestamp).toLocaleString()}
                    </span>) : errorCurrent && !currentRun?.run?.timestamp ? (<span className="text-destructive font-medium">
                      Error loading date
                    </span>) : (<span className="font-medium">Not available</span>)) : (<span className="font-medium">
                    {new Date(selectedRunTimestamp).toLocaleString()}
                  </span>)}
              </p>
              <div className="mt-1 text-xs text-muted-foreground">
                <p>ID: {test.id}</p>
                {test.browser && <p>Browser: {test.browser}</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {(() => {
            const effectiveStatus = getEffectiveTestStatus(test);
            return (<Badge variant="outline" className="capitalize text-sm px-3 py-1 rounded-full border" style={getStatusBadgeStyle(effectiveStatus)}>
                    {effectiveStatus}
                  </Badge>);
        })()}
              <p className="text-sm text-muted-foreground mt-1">
                Duration: {formatDuration(test.duration)}
              </p>
              {retryCount > 0 && (<Badge variant="secondary" className="mt-1">
                  Retry Count: {retryCount}
                </Badge>)}
              {/* Outcome Badge */}
              {retryCount > 0 && test.status === "passed" && (<Badge variant="outline" className="ml-2 mt-1 border-sky-500 text-sky-600 bg-sky-500/10">
                  Flaky
                </Badge>)}
               {/* Severity Badge */}
              {test.annotations?.map((note, i) => {
            if (note.type === 'severity' || note.type === 'priority') {
                return (<Badge key={i} variant="outline" className="ml-2 mt-1 border-blue-500 text-blue-600 bg-blue-500/10 capitalize">
                             {note.description || note.type}
                         </Badge>);
            }
            return null;
        })}
              {test.tags && test.tags.length > 0 && (<div className="mt-1 space-x-1">
                  {test.tags.map((tag) => (<Badge key={tag} variant="secondary" className="text-xs rounded-full">
                      {tag}
                    </Badge>))}
                </div>)}
            </div>
          </div>
          <div className="mt-4">
            <Select value={selectedRunTimestamp} onValueChange={setSelectedRunTimestamp} onOpenChange={(isOpen) => {
            if (isOpen && !historyFetched) {
                fetchTestHistory();
            }
        }}>
              <SelectTrigger className="w-full md:w-[350px] h-12 rounded-xl bg-card/50 border-2 border-transparent hover:border-primary/30 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-colors duration-200 group">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary"/>
                  <SelectValue placeholder="Switch to a past run"/>
                </div>
              </SelectTrigger>
              <SelectContent sideOffset={8} className="bg-card/80 backdrop-blur-lg border border-border/50 rounded-xl shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                <SelectItem value="current" className="rounded-lg">
                  Current Run
                </SelectItem>
                {loadingHistory && (<SelectItem value="loading" disabled className="rounded-lg">
                    Loading history...
                  </SelectItem>)}
                {testHistory
            .filter((run) => run.date !== currentRun?.run?.timestamp) // Avoid duplicating "Current Run" in dropdown
            .map((run) => (<SelectItem key={run.date} value={run.date} className="rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(run.status))} title={`Status: ${run.status}`}/>
                      <span className="text-sm">
                        {new Date(run.date).toLocaleString()} -{" "}
                        <span className="font-medium capitalize">
                          {run.status}
                        </span>
                      </span>
                    </div>
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steps" className="w-full" onValueChange={(value) => {
            if (value === "history" && !historyFetched) {
                fetchTestHistory();
            }
        }}>
            <TabsList className={cn("grid w-full mb-4 rounded-lg", isFailedTest
            ? "grid-cols-2 md:grid-cols-5"
            : "grid-cols-2 md:grid-cols-4")}>
              <TabsTrigger value="steps">
                Execution Steps ({test.steps?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="logs">
                <FileText className="h-4 w-4 mr-2"/>
                Logs
              </TabsTrigger>
              <TabsTrigger value="history">Test Run History</TabsTrigger>
              {isFailedTest && (<TabsTrigger value="ai-suggestions">
                  <Sparkles className="h-4 w-4 mr-2"/>
                  AI Suggestions
                </TabsTrigger>)}
            </TabsList>

            <TabsContent value="steps">
              {retryCount > 0 ? (<Tabs defaultValue="base-run" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="base-run" className="flex items-center gap-2">
                        Base Run
                        <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(test.status))}/>
                    </TabsTrigger>
                    {test.retryHistory?.map((retry, index) => (<TabsTrigger key={index} value={`retry-${index}`} className="flex items-center gap-2">
                        Retry {index + 1}
                        <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(retry.status))}/>
                      </TabsTrigger>))}
                  </TabsList>
                  <TabsContent value="base-run">
                    <StepsTabContent test={test}/>
                  </TabsContent>
                  {test.retryHistory?.map((retryTest, index) => (<TabsContent key={index} value={`retry-${index}`}>
                      <StepsTabContent test={retryTest}/>
                    </TabsContent>))}
                </Tabs>) : (<StepsTabContent test={test}/>)}
            </TabsContent>

            <TabsContent value="attachments">
              {retryCount > 0 ? (<Tabs defaultValue="base-run" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="base-run" className="flex items-center gap-2">
                        Base Run
                        <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(test.status))}/>
                    </TabsTrigger>
                    {test.retryHistory?.map((retry, index) => (<TabsTrigger key={index} value={`retry-${index}`} className="flex items-center gap-2">
                        Retry {index + 1}
                        <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(retry.status))}/>
                      </TabsTrigger>))}
                  </TabsList>
                  <TabsContent value="base-run">
                    <AttachmentsTabContent test={test}/>
                  </TabsContent>
                  {test.retryHistory?.map((retryTest, index) => (<TabsContent key={index} value={`retry-${index}`}>
                      <AttachmentsTabContent test={retryTest}/>
                    </TabsContent>))}
                </Tabs>) : (<AttachmentsTabContent test={test}/>)}
            </TabsContent>

            <TabsContent value="logs">
              {retryCount > 0 ? (<Tabs defaultValue="base-run" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="base-run" className="flex items-center gap-2">
                        Base Run
                        <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(test.status))}/>
                    </TabsTrigger>
                    {test.retryHistory?.map((retry, index) => (<TabsTrigger key={index} value={`retry-${index}`} className="flex items-center gap-2">
                         Retry {index + 1}
                         <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(retry.status))}/>
                      </TabsTrigger>))}
                  </TabsList>
                  <TabsContent value="base-run">
                    <LogsTabContent test={test}/>
                  </TabsContent>
                  {test.retryHistory?.map((retryTest, index) => (<TabsContent key={index} value={`retry-${index}`}>
                      <LogsTabContent test={retryTest}/>
                    </TabsContent>))}
                </Tabs>) : (<LogsTabContent test={test}/>)}
            </TabsContent>

            <TabsContent value="history" className="mt-4 p-4 border rounded-lg bg-card shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-primary"/>
                  Individual Test Run History
                </h3>
              </div>
              {loadingHistory && (<div className="space-y-3">
                  <Skeleton className="h-6 w-3/4 rounded-md"/>
                  <Skeleton className="h-64 w-full rounded-lg"/>
                </div>)}
              {errorHistory && !loadingHistory && (<Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="h-4 w-4"/>
                  <AlertTitle>Error Loading Test History</AlertTitle>
                  <AlertDescription>{errorHistory}</AlertDescription>
                </Alert>)}
              {!loadingHistory &&
            !errorHistory &&
            historyFetched &&
            testHistory.length === 0 && (<Alert className="rounded-lg">
                    <Info className="h-4 w-4"/>
                    <AlertTitle>No Historical Data</AlertTitle>
                    <AlertDescription>
                      No historical run data found for this specific test (ID:{" "}
                      {testId}) in this suite.
                    </AlertDescription>
                  </Alert>)}
              {!loadingHistory && !errorHistory && testHistory.length > 0 && (<div ref={historyChartRef} className="w-full h-[300px] bg-card p-4 rounded-lg shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={[...testHistory].reverse()} // Show oldest to newest
         margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                      <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
            })} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40}/>
                      <YAxis tickFormatter={(tick) => formatDuration(tick)} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={80}/>
                      <RechartsTooltip content={<HistoryTooltip />}/>
                      <Legend wrapperStyle={{ fontSize: "12px" }}/>
                      <Line type="monotone" dataKey="duration" name="Duration" stroke="hsl(var(--primary))" strokeWidth={2} dot={<StatusDot />} activeDot={{ r: 7 }}/>
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>)}
            </TabsContent>

            {isFailedTest && (<TabsContent value="ai-suggestions">
                {retryCount > 0 ? (<Tabs defaultValue="base-run" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="base-run" className="flex items-center gap-2">
                          Base Run
                          <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(test.status))}/>
                      </TabsTrigger>
                      {test.retryHistory?.map((retry, index) => (<TabsTrigger key={index} value={`retry-${index}`} className="flex items-center gap-2">
                           Retry {index + 1}
                           <span className={cn("h-2 w-2 rounded-full", getStatusColorClass(retry.status))}/>
                        </TabsTrigger>))}
                    </TabsList>
                    <TabsContent value="base-run">
                      <AiSuggestionsTabContent test={test}/>
                    </TabsContent>
                    {test.retryHistory?.map((retryTest, index) => (<TabsContent key={index} value={`retry-${index}`}>
                        <AiSuggestionsTabContent test={retryTest}/>
                      </TabsContent>))}
                  </Tabs>) : (<AiSuggestionsTabContent test={test}/>)}
              </TabsContent>)}
          </Tabs>
        </CardContent>
      </Card>
    </div>);
}
//# sourceMappingURL=TestDetailsClientPage.jsx.map