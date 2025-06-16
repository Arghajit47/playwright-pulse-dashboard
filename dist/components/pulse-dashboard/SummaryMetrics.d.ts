import type { PlaywrightPulseReport } from '@/types/playwright';
import type { TestStatusFilter } from './LiveTestResults';
interface SummaryMetricsProps {
    currentRun: PlaywrightPulseReport | null;
    loading: boolean;
    error: string | null;
    onMetricClick?: (filter: TestStatusFilter) => void;
}
export declare function SummaryMetrics({ currentRun, loading, error, onMetricClick }: SummaryMetricsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SummaryMetrics.d.ts.map