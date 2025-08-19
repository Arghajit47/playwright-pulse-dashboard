import type { PlaywrightPulseReport, FlakyTestDetail } from '@/types/playwright';
export declare function getRawHistoricalReports(): Promise<PlaywrightPulseReport[]>;
export declare function getFlakyTestsAnalysis(): Promise<{
    success: boolean;
    flakyTests?: FlakyTestDetail[];
    error?: string;
}>;
//# sourceMappingURL=actions.d.ts.map