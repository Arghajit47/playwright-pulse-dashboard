import type { PlaywrightPulseReport, FlakyTestDetail } from '@/types/playwright';
export declare function getCurrentRunReport(): Promise<PlaywrightPulseReport | null>;
export declare function getRawHistoricalReports(): Promise<PlaywrightPulseReport[]>;
export declare function getFlakyTestsAnalysis(): Promise<{
    success: boolean;
    currentFlakyTests?: FlakyTestDetail[];
    historicalFlakyTests?: FlakyTestDetail[];
    error?: string;
}>;
//# sourceMappingURL=actions.d.ts.map