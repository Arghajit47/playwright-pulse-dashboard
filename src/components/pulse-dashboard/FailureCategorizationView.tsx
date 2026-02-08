
'use client';

import { useTestData } from '@/hooks/useTestData';
import type { DetailedTestResult } from '@/types/playwright.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { ListX, Terminal, Info, CheckCircle, ChevronRight, SearchSlash } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ansiToHtml } from '@/lib/utils';

interface CategorizedFailureGroup {
  categoryName: string;
  count: number;
  tests: DetailedTestResult[];
  exampleErrorMessages: (string | null | undefined)[]; // Can contain original error messages
}

const CATEGORIES_CONFIG: { name: string; keywords: string[]; description?: string }[] = [
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

// This utility is now only used for the categorization logic, not for display
function stripAnsiCodesForLogic(str: string): string {
  if (!str) return '';
  return str.replace(/\u001b\[[0-9;]*[mGKH]/g, '');
}

function formatTestName(fullName: string): string {
  if (!fullName) return 'Unknown Test';
  const parts = fullName.split(" > ");
  return parts[parts.length - 1] || fullName;
}


export function FailureCategorizationView() {
  const { currentRun, loadingCurrent, errorCurrent } = useTestData();

  const categorizedFailures = useMemo(() => {
    if (!currentRun?.results) return { categories: [], totalFailed: 0 };

    // Get all failed tests
    const allFailedTests = currentRun.results.filter(
      (test: DetailedTestResult) => test.status === 'failed' || test.status === 'timedOut'
    );

    // Deduplicate by test name - each unique test name should appear once
    const uniqueFailedTestsMap = new Map<string, DetailedTestResult>();
    allFailedTests.forEach((test: DetailedTestResult) => {
      if (!uniqueFailedTestsMap.has(test.name)) {
        uniqueFailedTestsMap.set(test.name, test);
      }
    });

    const failedTests = Array.from(uniqueFailedTestsMap.values());

    const categoriesMap = new Map<string, { tests: DetailedTestResult[], exampleErrorMessages: (string | null | undefined)[] }>();

    failedTests.forEach((test: DetailedTestResult) => {
      // For categorization logic, use stripped and lowercased error message
      const logicalErrorMessage = stripAnsiCodesForLogic(test.errorMessage || 'Unknown error').toLowerCase();
      let assignedCategory = false;

      for (const category of CATEGORIES_CONFIG) {
        if (category.keywords.some(keyword => logicalErrorMessage.includes(keyword.toLowerCase()))) {
          if (!categoriesMap.has(category.name)) {
            categoriesMap.set(category.name, { tests: [], exampleErrorMessages: [] });
          }
          categoriesMap.get(category.name)!.tests.push(test);
          // Store original error message for display
          if (categoriesMap.get(category.name)!.exampleErrorMessages.length < 3) {
             categoriesMap.get(category.name)!.exampleErrorMessages.push(test.errorMessage);
          }
          assignedCategory = true;
          break;
        }
      }

      if (!assignedCategory) {
        if (!categoriesMap.has(OTHER_ERRORS_CATEGORY)) {
          categoriesMap.set(OTHER_ERRORS_CATEGORY, { tests: [], exampleErrorMessages: [] });
        }
        categoriesMap.get(OTHER_ERRORS_CATEGORY)!.tests.push(test);
        // Store original error message for display
         if (categoriesMap.get(OTHER_ERRORS_CATEGORY)!.exampleErrorMessages.length < 3 ) {
            categoriesMap.get(OTHER_ERRORS_CATEGORY)!.exampleErrorMessages.push(test.errorMessage);
         }
      }
    });

    const result: CategorizedFailureGroup[] = [];
    categoriesMap.forEach((data, categoryName) => {
      result.push({
        categoryName,
        count: data.tests.length,
        tests: data.tests,
        exampleErrorMessages: data.exampleErrorMessages,
      });
    });

    result.sort((a,b) => b.count - a.count); // Sort by count descending
    
    return {
      categories: result,
      totalFailed: failedTests.length, // Use total count of all failed tests
    };

  }, [currentRun]);

  if (loadingCurrent) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-7 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (errorCurrent) {
    return (
      <Alert variant="destructive" className="shadow-md">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{errorCurrent}</AlertDescription>
      </Alert>
    );
  }

  if (!currentRun || !currentRun.results) {
    return (
      <Alert className="shadow-md">
        <Info className="h-4 w-4" />
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>
          The current run report ('playwright-pulse-report.json') could not be loaded or is empty.
        </AlertDescription>
      </Alert>
    );
  }

  const totalFailures = categorizedFailures.totalFailed;

  if (totalFailures === 0) {
    return (
      <Alert variant="default" className="shadow-md border-green-500 bg-green-50 dark:bg-green-900/30">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">No Failures Found!</AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300">
          Excellent! There are no failed or timed out tests in the current run report.
        </AlertDescription>
      </Alert>
    );
  }

  if (categorizedFailures.categories.length === 0 && totalFailures > 0) {
    return (
      <Alert className="shadow-md">
        <SearchSlash className="h-4 w-4" />
        <AlertTitle>Failures Present, But Not Categorized</AlertTitle>
        <AlertDescription>
          There are {totalFailures} failures in the current report, but they did
          not match any predefined categories. They might be listed under "Other
          Errors" if that category appears.
        </AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl border-0 bg-gradient-to-br from-destructive/10 via-card to-card/95">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Failures
                </p>
                <p className="text-3xl font-bold text-destructive mt-2">
                  {totalFailures}
                </p>
              </div>
              <ListX className="h-12 w-12 text-destructive opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl border-0 bg-gradient-to-br from-primary/10 via-card to-card/95">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Categories
                </p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {categorizedFailures.categories.length}
                </p>
              </div>
              <Terminal className="h-12 w-12 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl border-0 bg-gradient-to-br from-accent/10 via-card to-card/95">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Most Common
                </p>
                <p className="text-lg font-bold text-foreground mt-2 truncate">
                  {categorizedFailures.categories[0]?.categoryName || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {categorizedFailures.categories[0]?.count || 0} tests
                </p>
              </div>
              <Info className="h-12 w-12 text-accent opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categorized Failures */}
      {categorizedFailures.categories.map((group, index) => {
        const categoryConfig = CATEGORIES_CONFIG.find(
          (c) => c.name === group.categoryName,
        );
        const firstExampleError = group.exampleErrorMessages[0];
        const exampleErrorHtml = firstExampleError
          ? ansiToHtml(firstExampleError.substring(0, 150))
          : "";
        const showEllipsis =
          firstExampleError && firstExampleError.length > 150;

        return (
          <Card
            key={group.categoryName}
            className="shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl border-0 bg-gradient-to-br from-card via-card to-card/95 group"
          >
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
                    <ListX className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      {group.categoryName}
                      <Badge
                        variant="destructive"
                        className="text-xs font-semibold"
                      >
                        {group.count}
                      </Badge>
                    </CardTitle>
                    {categoryConfig?.description && (
                      <CardDescription className="text-xs mt-1">
                        {categoryConfig.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Category #{index + 1}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {((group.count / totalFailures) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              {group.categoryName === OTHER_ERRORS_CATEGORY &&
                firstExampleError && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Example error snippet:
                    </p>
                    <p className="text-xs text-foreground font-mono">
                      <span
                        dangerouslySetInnerHTML={{ __html: exampleErrorHtml }}
                      />
                      {showEllipsis ? "..." : ""}
                    </p>
                  </div>
                )}
            </CardHeader>
            <CardContent className="pt-4">
              {group.tests.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-3">
                  {group.tests.map((test, testIndex) => (
                    <AccordionItem
                      value={`${group.categoryName}-${test.id}-${testIndex}`}
                      key={`${group.categoryName}-${test.id}-${testIndex}`}
                      className="border border-border/50 rounded-lg bg-card hover:bg-muted/30 transition-all duration-200 hover:shadow-md overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline group/trigger">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-medium text-sm text-foreground group-hover/trigger:text-primary transition-colors truncate"
                              title={formatTestName(test.name)}
                            >
                              {formatTestName(test.name)}
                            </p>
                            <p
                              className="text-xs text-muted-foreground mt-0.5 truncate"
                              title={test.suiteName}
                            >
                              Suite: {test.suiteName || "N/A"}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 bg-muted/10">
                        <div className="space-y-3">
                          <Link
                            href={`/test/${test.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <ChevronRight className="h-3 w-3" />
                            View full test details
                          </Link>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Terminal className="h-3 w-3 text-destructive" />
                              <h5 className="text-xs font-semibold text-foreground">
                                Error Message:
                              </h5>
                            </div>
                            <ScrollArea className="max-h-40 w-full rounded-lg border border-border/30">
                              <pre className="text-xs whitespace-pre-wrap break-words font-mono bg-muted/50 p-3">
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: ansiToHtml(
                                      test.errorMessage ||
                                        "No error message captured.",
                                    ),
                                  }}
                                />
                              </pre>
                            </ScrollArea>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8">
                  <SearchSlash className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No tests found in this category.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {categorizedFailures.categories.length === 0 && (
        <Alert className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-muted/50 to-card">
          <SearchSlash className="h-5 w-5" />
          <AlertTitle className="text-lg">No Failures Categorized</AlertTitle>
          <AlertDescription>
            Could not categorize any failures based on the current rules.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
