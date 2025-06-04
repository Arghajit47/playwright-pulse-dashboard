
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
    if (!data.currentRun) {
      setData(prev => ({ ...prev, loadingCurrent: true }));
    }
    try {
      const response = await fetch('/api/current-run');
      if (!response.ok) {
        let errorDetails = response.statusText; // Default to statusText
        try {
          // Attempt to get a more specific message from the JSON response body
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorDetails = errorBody.message;
          }
        } catch (e) {
          // If the body isn't JSON or doesn't have a message, stick with statusText or a generic error
          console.warn("Could not parse error response body as JSON:", e);
        }
        throw new Error(`Failed to fetch current run: ${errorDetails}`);
      }
      const result: PlaywrightPulseReport = await response.json();
      setData(prev => ({ ...prev, currentRun: result, loadingCurrent: false, errorCurrent: null }));
    } catch (error) {
      console.error(error); // This will log the full error object to the browser console
      setData(prev => ({ ...prev, loadingCurrent: false, errorCurrent: error instanceof Error ? error.message : String(error) }));
    }
  }, [data.currentRun]);

  const fetchHistoricalTrends = useCallback(async () => {
    setData(prev => ({ ...prev, loadingHistorical: true }));
    try {
      const response = await fetch('/api/historical-trends');
      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorDetails = errorBody.message;
          }
        } catch (e) {
          console.warn("Could not parse historical trends error response body as JSON:", e);
        }
        throw new Error(`Failed to fetch historical trends: ${errorDetails}`);
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
