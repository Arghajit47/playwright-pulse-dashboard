'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveTestResults = LiveTestResults;
const react_1 = require("react");
const TestItem_1 = require("./TestItem");
const card_1 = require("@/components/ui/card");
const skeleton_1 = require("@/components/ui/skeleton");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
const input_1 = require("@/components/ui/input");
const select_1 = require("@/components/ui/select");
const label_1 = require("@/components/ui/label");
const button_1 = require("@/components/ui/button");
const popover_1 = require("@/components/ui/popover");
const checkbox_1 = require("@/components/ui/checkbox");
const scroll_area_1 = require("@/components/ui/scroll-area");
const badge_1 = require("@/components/ui/badge");
const testStatuses = ['all', 'passed', 'failed', 'skipped', 'timedOut', 'pending'];
function LiveTestResults({ report, loading, error, initialFilter }) {
    const [statusFilter, setStatusFilter] = (0, react_1.useState)(initialFilter || 'all');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedTags, setSelectedTags] = (0, react_1.useState)([]);
    const [allTags, setAllTags] = (0, react_1.useState)([]);
    const [tagPopoverOpen, setTagPopoverOpen] = (0, react_1.useState)(false);
    const [selectedBrowser, setSelectedBrowser] = (0, react_1.useState)('all');
    const [allBrowsers, setAllBrowsers] = (0, react_1.useState)(['all']);
    const [selectedSuite, setSelectedSuite] = (0, react_1.useState)('all');
    const [allSuites, setAllSuites] = (0, react_1.useState)(['all']);
    const [showRetriesOnly, setShowRetriesOnly] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (initialFilter) {
            setStatusFilter(initialFilter);
        }
    }, [initialFilter]);
    (0, react_1.useEffect)(() => {
        if (report?.results) {
            const uniqueTags = new Set();
            const uniqueBrowsers = new Set();
            const uniqueSuites = new Set();
            report.results.forEach(test => {
                test.tags?.forEach(tag => uniqueTags.add(tag));
                if (test.browser)
                    uniqueBrowsers.add(test.browser);
                if (test.suiteName)
                    uniqueSuites.add(test.suiteName);
            });
            setAllTags(Array.from(uniqueTags).sort());
            setAllBrowsers(['all', ...Array.from(uniqueBrowsers).sort()]);
            setAllSuites(['all', ...Array.from(uniqueSuites).sort()]);
        }
    }, [report]);
    const isAnyFilterActive = (0, react_1.useMemo)(() => {
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
    const groupedAndFilteredSuites = (0, react_1.useMemo)(() => {
        if (!report?.results)
            return [];
        const filteredTests = report.results.filter(test => {
            const statusMatch = statusFilter === 'all' || test.status === statusFilter;
            const searchTermMatch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                test.suiteName.toLowerCase().includes(searchTerm.toLowerCase());
            const tagMatch = selectedTags.length === 0 || (test.tags && test.tags.some(tag => selectedTags.includes(tag)));
            const browserMatch = selectedBrowser === 'all' || test.browser === selectedBrowser;
            const suiteMatch = selectedSuite === 'all' || test.suiteName === selectedSuite;
            const retriesMatch = !showRetriesOnly || (showRetriesOnly && test.retries > 0);
            return statusMatch && searchTermMatch && tagMatch && browserMatch && suiteMatch && retriesMatch;
        });
        const suitesMap = new Map();
        filteredTests.forEach(test => {
            const suiteTests = suitesMap.get(test.suiteName) || [];
            suiteTests.push(test);
            suitesMap.set(test.suiteName, suiteTests);
        });
        return Array.from(suitesMap.entries()).map(([title, tests]) => ({ title, tests }));
    }, [report, statusFilter, searchTerm, selectedTags, selectedBrowser, selectedSuite, showRetriesOnly]);
    if (loading) {
        return (<card_1.Card className="shadow-xl">
        <card_1.CardHeader>
          <skeleton_1.Skeleton className="h-6 w-48"/>
          <skeleton_1.Skeleton className="h-4 w-64 mt-1"/>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-6 border rounded-xl bg-muted/50 shadow-lg">
            <skeleton_1.Skeleton className="h-10 w-full"/>
            <skeleton_1.Skeleton className="h-10 w-full"/>
            <skeleton_1.Skeleton className="h-10 w-full"/>
            <skeleton_1.Skeleton className="h-10 w-full"/>
            <skeleton_1.Skeleton className="h-10 w-full"/>
            <skeleton_1.Skeleton className="h-10 w-full"/> 
            <skeleton_1.Skeleton className="h-10 w-full"/>
          </div>
          {[...Array(3)].map((_, i) => (<div key={i} className="space-y-2 p-2 border rounded-lg shadow-md">
              <skeleton_1.Skeleton className="h-5 w-1/3"/>
              <skeleton_1.Skeleton className="h-8 w-full"/>
              <skeleton_1.Skeleton className="h-8 w-full"/>
            </div>))}
        </card_1.CardContent>
      </card_1.Card>);
    }
    if (error) {
        return (<alert_1.Alert variant="destructive" className="mt-4 shadow-md">
        <lucide_react_1.Terminal className="h-4 w-4"/>
        <alert_1.AlertTitle>Error Fetching Live Test Results</alert_1.AlertTitle>
        <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (!report || !report.results || report.results.length === 0) {
        return (<card_1.Card className="shadow-xl">
        <card_1.CardHeader>
          <card_1.CardTitle className="text-2xl font-headline text-primary">Live Test Results</card_1.CardTitle>
           {(report?.metadata?.generatedAt || report?.run?.timestamp) && (<card_1.CardDescription>
              Last updated: {new Date(report.metadata?.generatedAt || report.run?.timestamp || Date.now()).toLocaleString()}
            </card_1.CardDescription>)}
        </card_1.CardHeader>
        <card_1.CardContent>
           <alert_1.Alert className="shadow-sm rounded-lg">
            <lucide_react_1.Info className="h-4 w-4"/>
            <alert_1.AlertTitle>No Test Data</alert_1.AlertTitle>
            <alert_1.AlertDescription>No test results available. Ensure 'playwright-pulse-report.json' exists in 'pulse-report/' and is correctly formatted, or that the data source is providing results.</alert_1.AlertDescription>
          </alert_1.Alert>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<card_1.Card className="shadow-xl">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-headline text-primary">Live Test Results</card_1.CardTitle>
        {(report.metadata?.generatedAt || report.run?.timestamp) && (<card_1.CardDescription>
            Last updated: {new Date(report.metadata.generatedAt || report.run.timestamp).toLocaleString()}
          </card_1.CardDescription>)}
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-6">
        <div className="p-6 border rounded-xl bg-muted/50 shadow-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <label_1.Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Filter by Status</label_1.Label>
              <select_1.Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <select_1.SelectTrigger id="status-filter" className="w-full bg-background shadow-inner rounded-md">
                  <select_1.SelectValue placeholder="Select status"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent className="rounded-md">
                  {testStatuses.map(status => (<select_1.SelectItem key={status} value={status} className="capitalize">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
            <div className="space-y-1.5">
              <label_1.Label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground">Search by Name/Suite</label_1.Label>
              <input_1.Input id="search-filter" type="text" placeholder="Enter test or suite name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background shadow-inner rounded-md"/>
            </div>
            <div className="space-y-1.5">
              <label_1.Label className="text-sm font-medium text-muted-foreground">Filter by Tags</label_1.Label>
              <popover_1.Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <popover_1.PopoverTrigger asChild>
                      <button_1.Button variant="outline" className="w-full bg-background shadow-inner justify-between rounded-md">
                          {selectedTags.length > 0 ? `Tags (${selectedTags.length})` : "Select Tags"}
                          <lucide_react_1.ChevronDown className="ml-2 h-4 w-4 opacity-50"/>
                      </button_1.Button>
                  </popover_1.PopoverTrigger>
                  <popover_1.PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-md" align="start">
                      <div className="p-2 border-b">
                          <p className="text-sm font-medium">Filter by Tags</p>
                      </div>
                      <scroll_area_1.ScrollArea className="h-48">
                          <div className="p-2 space-y-1">
                          {allTags.length > 0 ? allTags.map(tag => (<label_1.Label key={tag} htmlFor={`tag-${tag}`} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent/10 cursor-pointer">
                                  <checkbox_1.Checkbox id={`tag-${tag}`} checked={selectedTags.includes(tag)} onCheckedChange={(checked) => {
                setSelectedTags(prev => checked
                    ? [...prev, tag]
                    : prev.filter(t => t !== tag));
            }} className="rounded-sm"/>
                                  <span>{tag}</span>
                              </label_1.Label>)) : <p className="text-xs text-muted-foreground p-2">No tags available in this report.</p>}
                          </div>
                      </scroll_area_1.ScrollArea>
                      {selectedTags.length > 0 && (<div className="p-2 border-t flex justify-end">
                              <button_1.Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>Clear selected</button_1.Button>
                          </div>)}
                  </popover_1.PopoverContent>
              </popover_1.Popover>
            </div>
            <div className="space-y-1.5">
              <label_1.Label htmlFor="browser-filter" className="text-sm font-medium text-muted-foreground">Filter by Browser</label_1.Label>
              <select_1.Select value={selectedBrowser} onValueChange={setSelectedBrowser}>
                <select_1.SelectTrigger id="browser-filter" className="w-full bg-background shadow-inner rounded-md">
                  <select_1.SelectValue placeholder="Select browser"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent className="rounded-md">
                  {allBrowsers.map(browser => (<select_1.SelectItem key={browser} value={browser} className="capitalize">
                      {browser === 'all' ? 'All Browsers' : browser}
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
            <div className="space-y-1.5">
              <label_1.Label htmlFor="suite-filter" className="text-sm font-medium text-muted-foreground">Filter by Test Suite</label_1.Label>
              <select_1.Select value={selectedSuite} onValueChange={setSelectedSuite}>
                <select_1.SelectTrigger id="suite-filter" className="w-full bg-background shadow-inner rounded-md">
                  <select_1.SelectValue placeholder="Select test suite"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent className="rounded-md">
                  {allSuites.map(suite => (<select_1.SelectItem key={suite} value={suite} className="capitalize truncate">
                      {suite === 'all' ? 'All Suites' : (suite.length > 40 ? suite.substring(0, 37) + '...' : suite)}
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
            <div className="flex items-center space-x-2 pt-5"> {/* Adjusted pt- for alignment */}
              <checkbox_1.Checkbox id="retries-filter" checked={showRetriesOnly} onCheckedChange={(checked) => setShowRetriesOnly(Boolean(checked))} className="rounded-sm"/>
              <label_1.Label htmlFor="retries-filter" className="text-sm font-medium text-muted-foreground cursor-pointer flex items-center">
                <lucide_react_1.Repeat1 className="h-4 w-4 mr-1.5 text-muted-foreground"/>
                Retries Only
              </label_1.Label>
            </div>
          </div>
          {isAnyFilterActive && (<div className="mt-4 flex justify-end">
              <button_1.Button variant="ghost" onClick={handleClearAllFilters} className="text-sm rounded-md">
                <lucide_react_1.FilterX className="mr-2 h-4 w-4"/>
                Clear All Filters
              </button_1.Button>
            </div>)}
        </div>
        
        {selectedTags.length > 0 && (<div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Active tags:</span>
                {selectedTags.map(tag => (<badge_1.Badge key={tag} variant="secondary" className="flex items-center rounded-full">
                        {tag}
                        <button type="button" aria-label={`Remove ${tag} filter`} onClick={() => {
                    setSelectedTags(prev => prev.filter(t => t !== tag));
                }} className="ml-1.5 p-0.5 rounded-full hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring">
                            <lucide_react_1.XCircle className="h-3.5 w-3.5"/>
                        </button>
                    </badge_1.Badge>))}
            </div>)}

        {groupedAndFilteredSuites.length > 0 ? (groupedAndFilteredSuites.map((suite, index) => (<div key={index} className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary/30">{suite.title}</h3>
              {suite.tests.length > 0 ? (<div className="space-y-1">
                  {suite.tests.map(test => (<TestItem_1.TestItem key={test.id} test={test}/>))}
                </div>) : (<p className="text-sm text-muted-foreground pl-4">No tests in this suite match the current filters.</p>)}
            </div>))) : (<div className="text-center py-8">
             <p className="text-muted-foreground text-lg">No test results match your current filters.</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting the status, search term, or tag filters.</p>
           </div>)}
      </card_1.CardContent>
    </card_1.Card>);
}
//# sourceMappingURL=LiveTestResults.jsx.map