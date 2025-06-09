import type { PlaywrightPulseReport, HistoricalTrend } from '@/types/playwright';
interface TestDataState {
    currentRun: PlaywrightPulseReport | null;
    historicalTrends: HistoricalTrend[];
    loadingCurrent: boolean;
    loadingHistorical: boolean;
    errorCurrent: string | null;
    errorHistorical: string | null;
}
export declare function useTestData(): TestDataState;
export {};
//# sourceMappingURL=useTestData.d.ts.map