'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlakyTestsWidget = FlakyTestsWidget;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const actions_1 = require("@/app/actions");
const card_1 = require("@/components/ui/card");
const skeleton_1 = require("@/components/ui/skeleton");
const alert_1 = require("@/components/ui/alert");
const accordion_1 = require("@/components/ui/accordion");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
function StatusBadge({ status }) {
    let variant = "secondary";
    let icon = <lucide_react_1.Clock className="h-3 w-3 mr-1"/>;
    let text = status;
    switch (status) {
        case 'passed':
            variant = 'default';
            icon = <lucide_react_1.CheckCircle className="h-3 w-3 mr-1 text-green-500"/>;
            text = "Passed";
            break;
        case 'failed':
        case 'timedOut':
            variant = 'destructive';
            icon = <lucide_react_1.XCircle className="h-3 w-3 mr-1"/>;
            text = status === 'failed' ? "Failed" : "Timed Out";
            break;
        case 'skipped':
            variant = 'outline';
            icon = <lucide_react_1.SkipForward className="h-3 w-3 mr-1 text-orange-500"/>;
            text = "Skipped";
            break;
        case 'pending':
            icon = <lucide_react_1.Clock className="h-3 w-3 mr-1 text-blue-500"/>;
            text = "Pending";
            break;
    }
    return (<badge_1.Badge variant={variant} className={(0, utils_1.cn)("capitalize text-xs px-2 py-0.5 whitespace-nowrap", {
            'bg-green-100 text-green-700 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600': status === 'passed',
            'bg-red-100 text-red-700 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600': status === 'failed' || status === 'timedOut',
            'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-700/30 dark:text-orange-300 dark:border-orange-600': status === 'skipped',
            'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-700/30 dark:text-blue-300 dark:border-blue-600': status === 'pending',
        })}>
      {icon}
      {text}
    </badge_1.Badge>);
}
function FlakyTestsWidget() {
    const [flakyTests, setFlakyTests] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            const result = await (0, actions_1.getFlakyTestsAnalysis)();
            if (result.success && result.flakyTests) {
                setFlakyTests(result.flakyTests);
            }
            else {
                setError(result.error || 'Failed to fetch flaky test analysis.');
            }
            setIsLoading(false);
        }
        fetchData();
    }, []);
    if (isLoading) {
        return (<card_1.Card className="shadow-xl">
        <card_1.CardHeader>
          <skeleton_1.Skeleton className="h-7 w-48 mb-1"/>
          <skeleton_1.Skeleton className="h-4 w-3/4"/>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (<div key={i} className="p-4 border rounded-lg space-y-2">
              <skeleton_1.Skeleton className="h-5 w-2/3"/>
              <skeleton_1.Skeleton className="h-4 w-1/2"/>
              <skeleton_1.Skeleton className="h-4 w-1/3"/>
            </div>))}
        </card_1.CardContent>
      </card_1.Card>);
    }
    if (error) {
        return (<alert_1.Alert variant="destructive">
        <lucide_react_1.Terminal className="h-4 w-4"/>
        <alert_1.AlertTitle>Flaky Test Analysis Error</alert_1.AlertTitle>
        <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (!flakyTests || flakyTests.length === 0) {
        return (<card_1.Card className="shadow-xl">
        <card_1.CardHeader>
          <card_1.CardTitle className="text-2xl font-headline text-primary flex items-center">
            <lucide_react_1.Repeat className="h-7 w-7 mr-2"/>
            Flaky Test Analysis
          </card_1.CardTitle>
          <card_1.CardDescription>
            Analysis of tests that have shown inconsistent pass/fail behavior across historical runs.
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <alert_1.Alert>
            <lucide_react_1.CheckCircle className="h-4 w-4"/>
            <alert_1.AlertTitle>No Flaky Tests Identified</alert_1.AlertTitle>
            <alert_1.AlertDescription>
              No tests were identified as flaky based on the available historical data.
            </alert_1.AlertDescription>
          </alert_1.Alert>
        </card_1.CardContent>
      </card_1.Card>);
    }
    const formatTestNameForDisplay = (fullName) => {
        if (!fullName)
            return 'Unknown Test';
        const parts = fullName.split(' > ');
        return parts[parts.length - 1] || fullName;
    };
    return (<card_1.Card className="shadow-xl">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-headline text-primary flex items-center">
          <lucide_react_1.Repeat className="h-7 w-7 mr-2"/>
          Flaky Test Analysis ({flakyTests.length})
        </card_1.CardTitle>
        <card_1.CardDescription>
          Tests that have shown inconsistent pass/fail behavior across historical runs. Click on a test to see its run history.
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <accordion_1.Accordion type="multiple" className="w-full space-y-3">
          {flakyTests.map((test, index) => (<accordion_1.AccordionItem value={`flaky-${test.id}-${index}`} key={test.id + index} className="border rounded-lg bg-card hover:bg-muted/20 transition-colors">
              <accordion_1.AccordionTrigger className="p-4 text-left hover:no-underline">
                <div className="flex flex-col w-full">
                  <link_1.default href={`/test/${test.id}`} className="hover:underline text-base font-semibold text-primary" onClick={(e) => e.stopPropagation()}>
                    {formatTestNameForDisplay(test.name)}
                  </link_1.default>
                  <p className="text-xs text-muted-foreground mt-0.5">Suite: {test.suiteName}</p>
                  <div className="flex flex-wrap gap-2 text-xs mt-2 items-center">
                    <badge_1.Badge variant="outline" className="border-green-500 text-green-600">
                      <lucide_react_1.CheckCircle className="h-3 w-3 mr-1.5"/> {test.passedCount} Passed
                    </badge_1.Badge>
                    <badge_1.Badge variant="outline" className="border-red-500 text-red-600">
                      <lucide_react_1.XCircle className="h-3 w-3 mr-1.5"/> {test.failedCount} Failed
                    </badge_1.Badge>
                    <badge_1.Badge variant="secondary">
                      <lucide_react_1.BarChartHorizontalBig className="h-3 w-3 mr-1.5"/> {test.totalRuns} Total Runs
                    </badge_1.Badge>
                    <badge_1.Badge variant="outline" className="text-xs">
                        <lucide_react_1.CalendarDays className="h-3 w-3 mr-1.5"/> 
                        Seen: {new Date(test.firstSeen).toLocaleDateString()} - {new Date(test.lastSeen).toLocaleDateString()}
                    </badge_1.Badge>
                  </div>
                </div>
              </accordion_1.AccordionTrigger>
              <accordion_1.AccordionContent className="p-4 pt-0">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Run History ({test.occurrences.length}):</h4>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2">
                  {test.occurrences.map((occ, occIndex) => (<div key={occIndex} className="flex justify-between items-center text-xs p-1.5 bg-muted/30 rounded-md">
                      <span>{new Date(occ.runTimestamp).toLocaleString()}</span>
                      <StatusBadge status={occ.status}/>
                    </div>))}
                </div>
              </accordion_1.AccordionContent>
            </accordion_1.AccordionItem>))}
        </accordion_1.Accordion>
      </card_1.CardContent>
    </card_1.Card>);
}
//# sourceMappingURL=FlakyTestsWidget.jsx.map