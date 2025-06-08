'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Repeat, Terminal, CheckCircle, XCircle, SkipForward, Clock, CalendarDays, BarChartHorizontalBig } from 'lucide-react';
import { cn } from '@/lib/utils';
function StatusBadge({ status }) {
    let variant = "secondary";
    let icon = _jsx(Clock, { className: "h-3 w-3 mr-1" });
    let text = status;
    switch (status) {
        case 'passed':
            variant = 'default'; // Primary theme color for passed (often green-ish via theme)
            icon = _jsx(CheckCircle, { className: "h-3 w-3 mr-1 text-green-500" });
            text = "Passed";
            break;
        case 'failed':
        case 'timedOut':
            variant = 'destructive';
            icon = _jsx(XCircle, { className: "h-3 w-3 mr-1" });
            text = status === 'failed' ? "Failed" : "Timed Out";
            break;
        case 'skipped':
            variant = 'outline';
            icon = _jsx(SkipForward, { className: "h-3 w-3 mr-1 text-orange-500" });
            text = "Skipped";
            break;
        case 'pending':
            icon = _jsx(Clock, { className: "h-3 w-3 mr-1 text-blue-500" });
            text = "Pending";
            break;
    }
    return (_jsxs(Badge, { variant: variant, className: cn("capitalize text-xs px-2 py-0.5 whitespace-nowrap", {
            'bg-green-100 text-green-700 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600': status === 'passed',
            'bg-red-100 text-red-700 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600': status === 'failed' || status === 'timedOut',
            'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-700/30 dark:text-orange-300 dark:border-orange-600': status === 'skipped',
            'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-700/30 dark:text-blue-300 dark:border-blue-600': status === 'pending',
        }), children: [icon, text] }));
}
export function FlakyTestsWidget() {
    const [flakyTests, setFlakyTests] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            // const result = await getFlakyTestsAnalysis(); // Commented out for package build
            // Simulating no data for build purposes, real app would need prop injection
            const result = { success: true, flakyTests: [], error: 'Data fetching disabled for package build.' };
            if (result.success && result.flakyTests) {
                setFlakyTests(result.flakyTests);
            }
            else {
                setError(result.error || 'Failed to fetch flaky test analysis.');
            }
            setIsLoading(false);
        }
        // fetchData(); // Commented out call for package build
        // Simulate initial loading state for build purposes
        setFlakyTests([]);
        setIsLoading(false);
        setError('Flaky test analysis data fetching is handled by the consuming application.');
    }, []);
    if (isLoading) {
        return (_jsxs(Card, { className: "shadow-xl", children: [_jsxs(CardHeader, { children: [_jsx(Skeleton, { className: "h-7 w-48 mb-1" }), _jsx(Skeleton, { className: "h-4 w-3/4" })] }), _jsx(CardContent, { className: "space-y-4", children: [...Array(3)].map((_, i) => (_jsxs("div", { className: "p-4 border rounded-lg space-y-2", children: [_jsx(Skeleton, { className: "h-5 w-2/3" }), _jsx(Skeleton, { className: "h-4 w-1/2" }), _jsx(Skeleton, { className: "h-4 w-1/3" })] }, i))) })] }));
    }
    if (error) {
        return (_jsxs(Alert, { variant: "destructive", children: [_jsx(Terminal, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "Flaky Test Analysis Information" }), _jsx(AlertDescription, { children: error })] }));
    }
    if (!flakyTests || flakyTests.length === 0) {
        return (_jsxs(Card, { className: "shadow-xl", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-2xl font-headline text-primary flex items-center", children: [_jsx(Repeat, { className: "h-7 w-7 mr-2" }), "Flaky Test Analysis"] }), _jsx(CardDescription, { children: "Analysis of tests that have shown inconsistent pass/fail behavior across historical runs. (Data to be provided by consuming application)" })] }), _jsx(CardContent, { children: _jsxs(Alert, { children: [_jsx(CheckCircle, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "No Flaky Tests Data" }), _jsx(AlertDescription, { children: "The consuming application is responsible for fetching and providing flaky test data." })] }) })] }));
    }
    const formatTestNameForDisplay = (fullName) => {
        if (!fullName)
            return 'Unknown Test';
        const parts = fullName.split(' > ');
        return parts[parts.length - 1] || fullName;
    };
    return (_jsxs(Card, { className: "shadow-xl", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-2xl font-headline text-primary flex items-center", children: [_jsx(Repeat, { className: "h-7 w-7 mr-2" }), "Flaky Test Analysis (", flakyTests.length, ")"] }), _jsx(CardDescription, { children: "Tests that have shown inconsistent pass/fail behavior across historical runs. Click on a test to see its run history." })] }), _jsx(CardContent, { children: _jsx(Accordion, { type: "multiple", className: "w-full space-y-3", children: flakyTests.map((test, index) => (_jsxs(AccordionItem, { value: `flaky-${test.id}-${index}`, className: "border rounded-lg bg-card hover:bg-muted/20 transition-colors", children: [_jsx(AccordionTrigger, { className: "p-4 text-left hover:no-underline", children: _jsxs("div", { className: "flex flex-col w-full", children: [_jsx(Link, { href: `/test/${test.id}`, className: "hover:underline text-base font-semibold text-primary", onClick: (e) => e.stopPropagation(), children: formatTestNameForDisplay(test.name) }), _jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: ["Suite: ", test.suiteName] }), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs mt-2 items-center", children: [_jsxs(Badge, { variant: "outline", className: "border-green-500 text-green-600", children: [_jsx(CheckCircle, { className: "h-3 w-3 mr-1.5" }), " ", test.passedCount, " Passed"] }), _jsxs(Badge, { variant: "outline", className: "border-red-500 text-red-600", children: [_jsx(XCircle, { className: "h-3 w-3 mr-1.5" }), " ", test.failedCount, " Failed"] }), _jsxs(Badge, { variant: "secondary", children: [_jsx(BarChartHorizontalBig, { className: "h-3 w-3 mr-1.5" }), " ", test.totalRuns, " Total Runs"] }), _jsxs(Badge, { variant: "outline", className: "text-xs", children: [_jsx(CalendarDays, { className: "h-3 w-3 mr-1.5" }), "Seen: ", new Date(test.firstSeen).toLocaleDateString(), " - ", new Date(test.lastSeen).toLocaleDateString()] })] })] }) }), _jsxs(AccordionContent, { className: "p-4 pt-0", children: [_jsxs("h4", { className: "text-sm font-semibold mb-2 text-foreground", children: ["Run History (", test.occurrences.length, "):"] }), _jsx("div", { className: "max-h-60 overflow-y-auto space-y-1.5 pr-2", children: test.occurrences.map((occ, occIndex) => (_jsxs("div", { className: "flex justify-between items-center text-xs p-1.5 bg-muted/30 rounded-md", children: [_jsx("span", { children: new Date(occ.runTimestamp).toLocaleString() }), _jsx(StatusBadge, { status: occ.status })] }, occIndex))) })] })] }, test.id + index))) }) })] }));
}
//# sourceMappingURL=FlakyTestsWidget.js.map