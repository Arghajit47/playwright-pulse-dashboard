
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlaywrightPulseReport, HistoricalTrend } from '@/types/playwright';

interface TestDataState {
  currentRun: PlaywrightPulseReport | null;
  historicalTrends: HistoricalTrend[];
  loadingCurrent: boolean;
  loadingHistorical: boolean;
  errorCurrent: string | null;
  errorHistorical: string | null;
}

const POLLING_INTERVAL = 5000; // 5 seconds

export function useTestData() {
  const [data, setData] = useState<TestDataState>({
    currentRun: null,
    historicalTrends: [],
    loadingCurrent: true,
    loadingHistorical: true,
    errorCurrent: null,
    errorHistorical: null,
  });

  const fetchCurrentRun = useCallback(async () => {
    // Only set loading if currentRun is null, to avoid flickering on poll
    if (!data.currentRun) {
      setData(prev => ({ ...prev, loadingCurrent: true }));
    }
    try {
      const response = await fetch('/api/current-run');
      if (!response.ok) {
        throw new Error(`Failed to fetch current run: ${response.statusText}`);
      }
      const result: PlaywrightPulseReport = await response.json();
      setData(prev => ({ ...prev, currentRun: result, loadingCurrent: false, errorCurrent: null }));
    } catch (error) {
      console.error(error);
      setData(prev => ({ ...prev, loadingCurrent: false, errorCurrent: error instanceof Error ? error.message : String(error) }));
    }
  }, [data.currentRun]); // Add data.currentRun to dependencies

  const fetchHistoricalTrends = useCallback(async () => {
    setData(prev => ({ ...prev, loadingHistorical: true }));
    try {
      const response = await fetch('/api/historical-trends');
      if (!response.ok) {
        throw new Error(`Failed to fetch historical trends: ${response.statusText}`);
      }
      const result: HistoricalTrend[] = await response.json();
      setData(prev => ({ ...prev, historicalTrends: result, loadingHistorical: false, errorHistorical: null }));
    } catch (error) {
      console.error(error);
      setData(prev => ({ ...prev, loadingHistorical: false, errorHistorical: error instanceof Error ? error.message : String(error) }));
    }
  }, []);

  useEffect(() => {
    fetchCurrentRun();
    fetchHistoricalTrends();

    const intervalId = setInterval(fetchCurrentRun, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchCurrentRun, fetchHistoricalTrends]);

  return data;
}
