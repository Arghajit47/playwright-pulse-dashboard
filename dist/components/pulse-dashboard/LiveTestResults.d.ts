import type { PlaywrightPulseReport } from '@/types/playwright';
declare const testStatuses: readonly ["all", "passed", "failed", "skipped", "flaky"];
export type TestStatusFilter = typeof testStatuses[number];
interface LiveTestResultsProps {
    report: PlaywrightPulseReport | null;
    loading: boolean;
    error: string | null;
    initialFilter?: TestStatusFilter;
}
export declare function LiveTestResults({ report, loading, error, initialFilter }: LiveTestResultsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=LiveTestResults.d.ts.map