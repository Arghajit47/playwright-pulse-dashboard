import type { PlaywrightPulseReport } from '@/types/playwright';
import React from 'react';
interface DashboardOverviewChartsProps {
    currentRun: PlaywrightPulseReport | null;
    loading: boolean;
    error: string | null;
}
export declare function DashboardOverviewCharts({ currentRun, loading, error }: DashboardOverviewChartsProps): React.JSX.Element;
export {};
//# sourceMappingURL=DashboardOverviewCharts.d.ts.map