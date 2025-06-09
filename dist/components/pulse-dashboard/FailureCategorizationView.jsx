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
exports.FailureCategorizationView = FailureCategorizationView;
const useTestData_1 = require("@/hooks/useTestData");
const card_1 = require("@/components/ui/card");
const accordion_1 = require("@/components/ui/accordion");
const alert_1 = require("@/components/ui/alert");
const skeleton_1 = require("@/components/ui/skeleton");
const lucide_react_1 = require("lucide-react");
const react_1 = __importStar(require("react"));
const link_1 = __importDefault(require("next/link"));
const badge_1 = require("@/components/ui/badge");
const scroll_area_1 = require("@/components/ui/scroll-area");
const CATEGORIES_CONFIG = [
    {
        name: 'Timeout Errors',
        keywords: ['timeout', 'exceeded'],
        description: "Tests that failed due to exceeding a specified time limit for an operation."
    },
    {
        name: 'Locator/Selector Errors',
        keywords: ['locator', 'selector', 'getByRole', 'getByText', 'getByLabel', 'getByPlaceholder', 'element not found', 'no element found'],
        description: "Failures related to finding or interacting with UI elements on the page."
    },
    {
        name: 'Assertion Errors',
        keywords: ['expect(', 'expected', 'assertion failed'],
        description: "Tests where a specific condition or value did not meet the expected criteria."
    },
    {
        name: 'Strict Mode Violations',
        keywords: ['strict mode violation'],
        description: "Failures caused by Playwright's strict mode, often when a locator resolves to multiple elements."
    },
    {
        name: 'Navigation Errors',
        keywords: ['navigation failed', 'page.goto', 'frame.goto'],
        description: "Errors that occurred during page navigation actions."
    },
];
const OTHER_ERRORS_CATEGORY = 'Other Errors';
function stripAnsiCodes(str) {
    if (!str)
        return '';
    return str.replace(/\u001b\[[0-9;]*[mGKH]/g, '');
}
function formatTestName(fullName) {
    if (!fullName)
        return 'Unknown Test';
    const parts = fullName.split(" > ");
    return parts[parts.length - 1] || fullName;
}
function FailureCategorizationView() {
    const { currentRun, loadingCurrent, errorCurrent } = (0, useTestData_1.useTestData)();
    const categorizedFailures = (0, react_1.useMemo)(() => {
        if (!currentRun?.results)
            return [];
        const failedTests = currentRun.results.filter(test => test.status === 'failed' || test.status === 'timedOut');
        const categoriesMap = new Map();
        failedTests.forEach(test => {
            const currentErrorMessage = stripAnsiCodes(test.errorMessage || 'Unknown error').toLowerCase();
            let assignedCategory = false;
            for (const category of CATEGORIES_CONFIG) {
                if (category.keywords.some(keyword => currentErrorMessage.includes(keyword.toLowerCase()))) {
                    if (!categoriesMap.has(category.name)) {
                        categoriesMap.set(category.name, { tests: [], exampleErrorMessages: [] });
                    }
                    categoriesMap.get(category.name).tests.push(test);
                    if (categoriesMap.get(category.name).exampleErrorMessages.length < 3 && test.errorMessage) {
                        categoriesMap.get(category.name).exampleErrorMessages.push(stripAnsiCodes(test.errorMessage));
                    }
                    assignedCategory = true;
                    break;
                }
            }
            if (!assignedCategory) {
                if (!categoriesMap.has(OTHER_ERRORS_CATEGORY)) {
                    categoriesMap.set(OTHER_ERRORS_CATEGORY, { tests: [], exampleErrorMessages: [] });
                }
                categoriesMap.get(OTHER_ERRORS_CATEGORY).tests.push(test);
                if (categoriesMap.get(OTHER_ERRORS_CATEGORY).exampleErrorMessages.length < 3 && test.errorMessage) {
                    categoriesMap.get(OTHER_ERRORS_CATEGORY).exampleErrorMessages.push(stripAnsiCodes(test.errorMessage));
                }
            }
        });
        const result = [];
        categoriesMap.forEach((data, categoryName) => {
            result.push({
                categoryName,
                count: data.tests.length,
                tests: data.tests,
                exampleErrorMessages: data.exampleErrorMessages,
            });
        });
        result.sort((a, b) => b.count - a.count); // Sort by count descending
        return result;
    }, [currentRun]);
    if (loadingCurrent) {
        return (<div className="space-y-6">
        {[...Array(3)].map((_, i) => (<card_1.Card key={i} className="shadow-lg">
            <card_1.CardHeader>
              <skeleton_1.Skeleton className="h-7 w-1/2 mb-2"/>
              <skeleton_1.Skeleton className="h-4 w-3/4"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <skeleton_1.Skeleton className="h-10 w-full"/>
              <skeleton_1.Skeleton className="h-10 w-full mt-2"/>
            </card_1.CardContent>
          </card_1.Card>))}
      </div>);
    }
    if (errorCurrent) {
        return (<alert_1.Alert variant="destructive" className="shadow-md">
        <lucide_react_1.Terminal className="h-4 w-4"/>
        <alert_1.AlertTitle>Error Fetching Data</alert_1.AlertTitle>
        <alert_1.AlertDescription>{errorCurrent}</alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (!currentRun || !currentRun.results) {
        return (<alert_1.Alert className="shadow-md">
        <lucide_react_1.Info className="h-4 w-4"/>
        <alert_1.AlertTitle>No Data Available</alert_1.AlertTitle>
        <alert_1.AlertDescription>
          The current run report ('playwright-pulse-report.json') could not be loaded or is empty.
        </alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    const totalFailures = currentRun.results.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
    if (totalFailures === 0) {
        return (<alert_1.Alert variant="default" className="shadow-md border-green-500 bg-green-50 dark:bg-green-900/30">
        <lucide_react_1.CheckCircle className="h-5 w-5 text-green-600"/>
        <alert_1.AlertTitle className="text-green-700 dark:text-green-400">No Failures Found!</alert_1.AlertTitle>
        <alert_1.AlertDescription className="text-green-600 dark:text-green-300">
          Excellent! There are no failed or timed out tests in the current run report.
        </alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (categorizedFailures.length === 0 && totalFailures > 0) {
        return (<alert_1.Alert className="shadow-md">
        <lucide_react_1.SearchSlash className="h-4 w-4"/>
        <alert_1.AlertTitle>Failures Present, But Not Categorized</alert_1.AlertTitle>
        <alert_1.AlertDescription>
          There are {totalFailures} failures in the current report, but they did not match any predefined categories. They might be listed under "Other Errors" if that category appears.
        </alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    return (<div className="space-y-6">
      {categorizedFailures.map(group => {
            const categoryConfig = CATEGORIES_CONFIG.find(c => c.name === group.categoryName);
            return (<card_1.Card key={group.categoryName} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <card_1.CardHeader>
              <card_1.CardTitle className="text-xl font-semibold text-primary flex items-center">
                <lucide_react_1.ListX className="h-6 w-6 mr-2"/>
                {group.categoryName} <badge_1.Badge variant="secondary" className="ml-3 text-sm">{group.count} tests</badge_1.Badge>
              </card_1.CardTitle>
              {categoryConfig?.description && (<card_1.CardDescription className="text-xs mt-1">{categoryConfig.description}</card_1.CardDescription>)}
              {group.categoryName === OTHER_ERRORS_CATEGORY && group.exampleErrorMessages.length > 0 && (<card_1.CardDescription className="text-xs mt-1 italic">
                    Example errors: "{group.exampleErrorMessages[0].substring(0, 100)}{group.exampleErrorMessages[0].length > 100 ? '...' : ''}"
                 </card_1.CardDescription>)}
            </card_1.CardHeader>
            <card_1.CardContent>
              {group.tests.length > 0 ? (<accordion_1.Accordion type="multiple" className="w-full space-y-2">
                  {group.tests.map(test => (<accordion_1.AccordionItem value={test.id} key={test.id} className="border rounded-md bg-card hover:bg-muted/20 transition-colors px-1">
                      <accordion_1.AccordionTrigger className="p-3 text-left hover:no-underline text-sm">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-medium text-foreground truncate" title={test.name}>{formatTestName(test.name)}</span>
                          <lucide_react_1.ChevronRight className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-90 transition-transform"/>
                        </div>
                      </accordion_1.AccordionTrigger>
                      <accordion_1.AccordionContent className="p-3 pt-0">
                        <link_1.default href={`/test/${test.id}`} className="text-xs text-primary hover:underline mb-2 block">View full test details</link_1.default>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">Error Message:</h5>
                        <scroll_area_1.ScrollArea className="max-h-32 w-full">
                          <pre className="text-xs whitespace-pre-wrap break-words font-code bg-muted/30 p-2 rounded-sm text-destructive">
                            {stripAnsiCodes(test.errorMessage || 'No error message captured.')}
                          </pre>
                        </scroll_area_1.ScrollArea>
                      </accordion_1.AccordionContent>
                    </accordion_1.AccordionItem>))}
                </accordion_1.Accordion>) : (<p className="text-sm text-muted-foreground">No tests found in this category.</p>)}
            </card_1.CardContent>
          </card_1.Card>);
        })}
       {categorizedFailures.length === 0 && (<alert_1.Alert className="shadow-md">
            <lucide_react_1.SearchSlash className="h-4 w-4"/>
            <alert_1.AlertTitle>No Failures Categorized</alert_1.AlertTitle>
            <alert_1.AlertDescription>
              Could not categorize any failures based on the current rules.
            </alert_1.AlertDescription>
          </alert_1.Alert>)}
    </div>);
}
//# sourceMappingURL=FailureCategorizationView.jsx.map