
'use client';

import { useTestData } from '@/hooks/useTestData.js';
import type { DetailedTestResult } from '@/types/playwright.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { ListX, Terminal, Info, CheckCircle, ChevronRight, SearchSlash } from 'lucide-react';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategorizedFailureGroup {
  categoryName: string;
  count: number;
  tests: DetailedTestResult[];
  exampleErrorMessages: string[];
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

function stripAnsiCodes(str: string): string {
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
    if (!currentRun?.results) return [];

    const failedTests = currentRun.results.filter(
      (test: DetailedTestResult) => test.status === 'failed' || test.status === 'timedOut'
    );

    const categoriesMap = new Map<string, { tests: DetailedTestResult[], exampleErrorMessages: string[] }>();

    failedTests.forEach((test: DetailedTestResult) => {
      const currentErrorMessage = stripAnsiCodes(test.errorMessage || 'Unknown error').toLowerCase();
      let assignedCategory = false;

      for (const category of CATEGORIES_CONFIG) {
        if (category.keywords.some(keyword => currentErrorMessage.includes(keyword.toLowerCase()))) {
          if (!categoriesMap.has(category.name)) {
            categoriesMap.set(category.name, { tests: [], exampleErrorMessages: [] });
          }
          categoriesMap.get(category.name)!.tests.push(test);
          if (categoriesMap.get(category.name)!.exampleErrorMessages.length < 3 && test.errorMessage) {
             categoriesMap.get(category.name)!.exampleErrorMessages.push(stripAnsiCodes(test.errorMessage));
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
         if (categoriesMap.get(OTHER_ERRORS_CATEGORY)!.exampleErrorMessages.length < 3 && test.errorMessage) {
            categoriesMap.get(OTHER_ERRORS_CATEGORY)!.exampleErrorMessages.push(stripAnsiCodes(test.errorMessage));
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
    return result;

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
  
  const totalFailures = currentRun.results.filter((t: DetailedTestResult) => t.status === 'failed' || t.status === 'timedOut').length;

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
  
  if (categorizedFailures.length === 0 && totalFailures > 0) {
     return (
      <Alert className="shadow-md">
        <SearchSlash className="h-4 w-4" />
        <AlertTitle>Failures Present, But Not Categorized</AlertTitle>
        <AlertDescription>
          There are {totalFailures} failures in the current report, but they did not match any predefined categories. They might be listed under "Other Errors" if that category appears.
        </AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="space-y-6">
      {categorizedFailures.map(group => {
        const categoryConfig = CATEGORIES_CONFIG.find(c => c.name === group.categoryName);
        return (
          <Card key={group.categoryName} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-primary flex items-center">
                <ListX className="h-6 w-6 mr-2" />
                {group.categoryName} <Badge variant="secondary" className="ml-3 text-sm">{group.count} tests</Badge>
              </CardTitle>
              {categoryConfig?.description && (
                <CardDescription className="text-xs mt-1">{categoryConfig.description}</CardDescription>
              )}
              {group.categoryName === OTHER_ERRORS_CATEGORY && group.exampleErrorMessages.length > 0 && (
                 <CardDescription className="text-xs mt-1 italic">
                    Example errors: "{group.exampleErrorMessages[0].substring(0, 100)}{group.exampleErrorMessages[0].length > 100 ? '...' : ''}"
                 </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {group.tests.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-2">
                  {group.tests.map(test => (
                    <AccordionItem value={test.id} key={test.id} className="border rounded-md bg-card hover:bg-muted/20 transition-colors px-1">
                      <AccordionTrigger className="p-3 text-left hover:no-underline text-sm">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-medium text-foreground truncate" title={test.name}>{formatTestName(test.name)}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-90 transition-transform" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-3 pt-0">
                        <Link href={`/test/${test.id}`} className="text-xs text-primary hover:underline mb-2 block">View full test details</Link>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">Error Message:</h5>
                        <ScrollArea className="max-h-32 w-full">
                          <pre className="text-xs whitespace-pre-wrap break-words font-code bg-muted/30 p-2 rounded-sm text-destructive">
                            {stripAnsiCodes(test.errorMessage || 'No error message captured.')}
                          </pre>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground">No tests found in this category.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
       {categorizedFailures.length === 0 && (
         <Alert className="shadow-md">
            <SearchSlash className="h-4 w-4" />
            <AlertTitle>No Failures Categorized</AlertTitle>
            <AlertDescription>
              Could not categorize any failures based on the current rules.
            </AlertDescription>
          </Alert>
       )}
    </div>
  );
}
