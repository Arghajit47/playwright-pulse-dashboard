'use client';
import { useState, useMemo, useEffect } from 'react';
import { TestItem } from './TestItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Terminal, Info, ChevronDown, XCircle, FilterX, Repeat1, ListChecks, CheckCircle2, SkipForward, Clock, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
const testStatuses = ['all', 'passed', 'failed', 'skipped', 'timedOut', 'pending'];
const suiteColorsCssVars = [
    '--suite-color-1-hsl',
    '--suite-color-2-hsl',
    '--suite-color-3-hsl',
    '--suite-color-4-hsl',
    '--suite-color-5-hsl',
];
export function LiveTestResults({ report, loading, error, initialFilter }) {
    const [statusFilter, setStatusFilter] = useState(initialFilter || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
    const [selectedBrowser, setSelectedBrowser] = useState('all');
    const [allBrowsers, setAllBrowsers] = useState(['all']);
    const [selectedSuite, setSelectedSuite] = useState('all');
    const [allSuites, setAllSuites] = useState(['all']);
    const [showRetriesOnly, setShowRetriesOnly] = useState(false);
    const { toast } = useToast();
    useEffect(() => {
        if (initialFilter) {
            setStatusFilter(initialFilter);
        }
    }, [initialFilter]);
    useEffect(() => {
        if (report?.results) {
            const uniqueTags = new Set();
            const uniqueBrowsers = new Set();
            const uniqueSuites = new Set();
            report.results.forEach((test) => {
                test.tags?.forEach((tag) => uniqueTags.add(tag));
                if (test.browser)
                    uniqueBrowsers.add(test.browser);
                if (test.suiteName)
                    uniqueSuites.add(test.suiteName);
                else
                    uniqueSuites.add("Untitled Suite");
            });
            setAllTags(Array.from(uniqueTags).sort());
            setAllBrowsers(['all', ...Array.from(uniqueBrowsers).sort()]);
            setAllSuites(['all', ...Array.from(uniqueSuites).sort()]);
        }
    }, [report]);
    const isAnyFilterActive = useMemo(() => {
        return statusFilter !== 'all' ||
            searchTerm !== '' ||
            selectedTags.length > 0 ||
            selectedBrowser !== 'all' ||
            selectedSuite !== 'all' ||
            showRetriesOnly;
    }, [statusFilter, searchTerm, selectedTags, selectedBrowser, selectedSuite, showRetriesOnly]);
    const handleClearAllFilters = () => {
        setStatusFilter('all');
        setSearchTerm('');
        setSelectedTags([]);
        setSelectedBrowser('all');
        setSelectedSuite('all');
        setShowRetriesOnly(false);
    };
    const groupedAndFilteredSuites = useMemo(() => {
        if (!report?.results)
            return [];
        const filteredTests = report.results.filter((test) => {
            const statusMatch = statusFilter === 'all' || test.status === statusFilter || (statusFilter === 'failed' && test.status === 'timedOut');
            const searchTermMatch = (test.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (test.suiteName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const tagMatch = selectedTags.length === 0 || (test.tags && test.tags.some((tag) => selectedTags.includes(tag)));
            const browserMatch = selectedBrowser === 'all' || test.browser === selectedBrowser;
            const currentSuiteName = test.suiteName || "Untitled Suite";
            const suiteMatch = selectedSuite === 'all' || currentSuiteName === selectedSuite;
            const retriesMatch = !showRetriesOnly || (showRetriesOnly && test.retries > 0);
            return statusMatch && searchTermMatch && tagMatch && browserMatch && suiteMatch && retriesMatch;
        });
        const suitesMap = new Map();
        filteredTests.forEach((test) => {
            const suiteName = test.suiteName || 'Untitled Suite';
            if (!suitesMap.has(suiteName)) {
                suitesMap.set(suiteName, {
                    tests: [],
                    stats: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 },
                });
            }
            const currentSuiteData = suitesMap.get(suiteName);
            currentSuiteData.tests.push(test);
            currentSuiteData.stats.total++;
            if (test.status === 'passed')
                currentSuiteData.stats.passed++;
            else if (test.status === 'failed' || test.status === 'timedOut')
                currentSuiteData.stats.failed++;
            else if (test.status === 'skipped')
                currentSuiteData.stats.skipped++;
            else if (test.status === 'pending')
                currentSuiteData.stats.pending++;
        });
        return Array.from(suitesMap.entries()).map(([title, data]) => ({
            title,
            tests: data.tests,
            stats: data.stats,
        })).sort((a, b) => b.stats.failed - a.stats.failed || b.stats.total - a.stats.total || a.title.localeCompare(b.title));
    }, [report, statusFilter, searchTerm, selectedTags, selectedBrowser, selectedSuite, showRetriesOnly]);
    const handleExportCsv = () => {
        if (!report || !report.results || report.results.length === 0) {
            toast({
                title: "Export Failed",
                description: "No data available to export.",
                variant: "destructive",
            });
            return;
        }
        const headers = ["id", "name", "suiteName", "status", "duration", "startTime", "endTime", "browser", "retries", "tags", "stdout", "stderr", "workerId"];
        const escapeCsvCell = (cellData) => {
            if (cellData === null || cellData === undefined) {
                return '';
            }
            let cellString = String(cellData);
            if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
                cellString = `"${cellString.replace(/"/g, '""')}"`;
            }
            return cellString;
        };
        let csvContent = headers.map(escapeCsvCell).join(',') + '\n';
        report.results.forEach((item) => {
            const row = headers.map(header => {
                let value;
                switch (header) {
                    case 'tags':
                        value = item.tags ? item.tags.join('; ') : '';
                        break;
                    case 'stdout':
                        value = item.stdout ? item.stdout.join('\\n') : '';
                        break;
                    case 'stderr':
                        value = item.errorMessage || '';
                        break;
                    case 'workerId':
                        value = item.workerId !== undefined && item.workerId !== null ? String(item.workerId) : '';
                        break;
                    default:
                        value = item[header];
                }
                return escapeCsvCell(value);
            });
            csvContent += row.join(',') + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        let fileRunIdPart = 'data';
        if (report.run && report.run.id && typeof report.run.id === 'string' && report.run.id.trim() !== '') {
            const idStr = report.run.id.trim();
            const parts = idStr.split('-');
            if (parts.length > 1 && parts[0].toLowerCase() === 'run' && parts[1] && parts[1].trim() !== '') {
                fileRunIdPart = parts[1];
            }
            else if (parts.length > 0 && parts[0].trim() !== '') {
                fileRunIdPart = parts[0];
            }
        }
        else if (report.run && report.run.timestamp) {
            try {
                fileRunIdPart = String(new Date(report.run.timestamp).getTime());
            }
            catch (e) {
                // fallback to 'data' already set
            }
        }
        const fileName = `run-${fileRunIdPart}.csv`;
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
            title: "Export Successful",
            description: `${fileName} has been downloaded.`,
        });
    };
    if (loading) {
        return (<Card className="shadow-xl">
        <CardHeader>
          <Skeleton className="h-6 w-48"/>
          <Skeleton className="h-4 w-64 mt-1"/>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-6 border rounded-xl bg-muted/50 shadow-lg">
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/> 
            <Skeleton className="h-10 w-full"/>
          </div>
          {[...Array(3)].map((_, i) => (<div key={i} className="space-y-2 p-2 border rounded-lg shadow-md">
              <Skeleton className="h-5 w-1/3"/>
              <Skeleton className="h-8 w-full"/>
              <Skeleton className="h-8 w-full"/>
            </div>))}
        </CardContent>
      </Card>);
    }
    if (error) {
        return (<Alert variant="destructive" className="mt-4 shadow-md">
        <Terminal className="h-4 w-4"/>
        <AlertTitle>Error Fetching Live Test Results</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (!report || !report.results || report.results.length === 0) {
        return (<Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
            {(report?.metadata?.generatedAt || report?.run?.timestamp) && (<CardDescription>
                Last updated: {new Date(report.metadata?.generatedAt || report.run?.timestamp || Date.now()).toLocaleString()}
              </CardDescription>)}
          </div>
        </CardHeader>
        <CardContent>
           <Alert className="shadow-sm rounded-lg">
            <Info className="h-4 w-4"/>
            <AlertTitle>No Test Data</AlertTitle>
            <AlertDescription>No test results available. Ensure 'playwright-pulse-report.json' exists in 'pulse-report/' and is correctly formatted, or that the data source is providing results.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>);
    }
    return (<Card className="shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
          {(report.metadata?.generatedAt || report.run?.timestamp) && (<CardDescription>
              Last updated: {new Date(report.metadata.generatedAt || report.run.timestamp).toLocaleString()}
            </CardDescription>)}
        </div>
        <Button onClick={handleExportCsv} variant="outline" size="sm" className="ml-auto rounded-md shadow-md">
          <FileSpreadsheet className="mr-2 h-4 w-4"/>
          Export as CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 border rounded-xl bg-muted/50 shadow-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger id="status-filter" className="w-full bg-background shadow-inner rounded-md">
                  <SelectValue placeholder="Select status"/>
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {testStatuses.map(status => (<SelectItem key={status} value={status} className="capitalize">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground">Search by Name/Suite</Label>
              <Input id="search-filter" type="text" placeholder="Enter test or suite name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background shadow-inner rounded-md"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Filter by Tags</Label>
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full bg-background shadow-inner justify-between rounded-md">
                          {selectedTags.length > 0 ? `Tags (${selectedTags.length})` : "Select Tags"}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50"/>
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-md" align="start">
                      <div className="p-2 border-b">
                          <p className="text-sm font-medium">Filter by Tags</p>
                      </div>
                      <ScrollArea className="h-48">
                          <div className="p-2 space-y-1">
                          {allTags.length > 0 ? allTags.map(tag => (<Label key={tag} htmlFor={`tag-${tag}`} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent/10 cursor-pointer">
                                  <Checkbox id={`tag-${tag}`} checked={selectedTags.includes(tag)} onCheckedChange={(checked) => {
                setSelectedTags(prev => checked === true
                    ? [...prev, tag]
                    : prev.filter(t => t !== tag));
            }} className="rounded-sm"/>
                                  <span>{tag}</span>
                              </Label>)) : <p className="text-xs text-muted-foreground p-2">No tags available in this report.</p>}
                          </div>
                      </ScrollArea>
                      {selectedTags.length > 0 && (<div className="p-2 border-t flex justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>Clear selected</Button>
                          </div>)}
                  </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="browser-filter" className="text-sm font-medium text-muted-foreground">Filter by Browser</Label>
              <Select value={selectedBrowser} onValueChange={setSelectedBrowser}>
                <SelectTrigger id="browser-filter" className="w-full bg-background shadow-inner rounded-md">
                  <SelectValue placeholder="Select browser"/>
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {allBrowsers.map(browser => (<SelectItem key={browser} value={browser} className="capitalize">
                      {browser === 'all' ? 'All Browsers' : browser}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suite-filter" className="text-sm font-medium text-muted-foreground">Filter by Test Suite</Label>
              <Select value={selectedSuite} onValueChange={setSelectedSuite}>
                <SelectTrigger id="suite-filter" className="w-full bg-background shadow-inner rounded-md">
                  <SelectValue placeholder="Select test suite"/>
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {allSuites.map(suite => (<SelectItem key={suite} value={suite} className="capitalize truncate">
                      {suite === 'all' ? 'All Suites' : (suite.length > 40 ? suite.substring(0, 37) + '...' : suite)}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-5"> 
              <Checkbox id="retries-filter" checked={showRetriesOnly} onCheckedChange={(checked) => setShowRetriesOnly(Boolean(checked))} className="rounded-sm"/>
              <Label htmlFor="retries-filter" className="text-sm font-medium text-muted-foreground cursor-pointer flex items-center">
                <Repeat1 className="h-4 w-4 mr-1.5 text-muted-foreground"/>
                Retries Only
              </Label>
            </div>
          </div>
          {isAnyFilterActive && (<div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={handleClearAllFilters} className="text-sm rounded-md">
                <FilterX className="mr-2 h-4 w-4"/>
                Clear All Filters
              </Button>
            </div>)}
        </div>
        
        {selectedTags.length > 0 && (<div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Active tags:</span>
                {selectedTags.map(tag => (<Badge key={tag} variant="secondary" className="flex items-center rounded-full">
                        {tag}
                        <button type="button" aria-label={`Remove ${tag} filter`} onClick={() => {
                    setSelectedTags(prev => prev.filter(t => t !== tag));
                }} className="ml-1.5 p-0.5 rounded-full hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring">
                            <XCircle className="h-3.5 w-3.5"/>
                        </button>
                    </Badge>))}
            </div>)}

        {groupedAndFilteredSuites.length > 0 ? (<Accordion type="multiple" className="w-full space-y-3">
            {groupedAndFilteredSuites.map((suite, index) => (<AccordionItem value={`suite-${suite.title.replace(/\s+/g, '-')}-${index}`} key={`suite-${suite.title.replace(/\s+/g, '-')}-${index}`} className="border rounded-xl shadow-lg bg-card hover:shadow-xl transition-shadow duration-300">
                <AccordionTrigger className="p-4 hover:no-underline text-left w-full group">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex-grow min-w-0">
                      <h3 className="text-lg font-semibold group-hover:opacity-80 transition-opacity" title={suite.title} style={{ color: `hsl(var(${suiteColorsCssVars[index % suiteColorsCssVars.length]}))` }}>
                        {suite.title}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                        <Badge variant="outline" className="text-xs border-muted-foreground/50">
                            <ListChecks className="mr-1.5 h-3 w-3 text-muted-foreground"/>Total: {suite.stats.total}
                        </Badge>
                        <Badge variant="outline" className="text-xs" style={{ color: 'hsl(var(--chart-3))', borderColor: 'hsl(var(--chart-3) / 0.5)' }}>
                            <CheckCircle2 className="mr-1.5 h-3 w-3"/>Passed: {suite.stats.passed}
                        </Badge>
                        <Badge variant="outline" className="text-xs" style={{ color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.5)' }}>
                            <XCircle className="mr-1.5 h-3 w-3"/>Failed: {suite.stats.failed}
                        </Badge>
                        <Badge variant="outline" className="text-xs" style={{ color: 'hsl(var(--accent))', borderColor: 'hsl(var(--accent) / 0.5)' }}>
                            <SkipForward className="mr-1.5 h-3 w-3"/>Skipped: {suite.stats.skipped}
                        </Badge>
                        {suite.stats.pending > 0 && (<Badge variant="outline" className="text-xs" style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.5)' }}>
                              <Clock className="mr-1.5 h-3 w-3"/>Pending: {suite.stats.pending}
                          </Badge>)}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  {suite.tests.length > 0 ? (<div className="space-y-1 mt-2">
                      {suite.tests.map(test => (<TestItem key={test.id} test={test}/>))}
                    </div>) : (<p className="text-sm text-muted-foreground mt-2">No tests in this suite match the current filters.</p>)}
                </AccordionContent>
              </AccordionItem>))}
          </Accordion>) : (<div className="text-center py-8">
             <p className="text-muted-foreground text-lg">No test results match your current filters.</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting the status, search term, or tag filters.</p>
           </div>)}
      </CardContent>
    </Card>);
}
//# sourceMappingURL=LiveTestResults.jsx.map