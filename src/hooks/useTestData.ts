
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

// Polling has been removed. Data is fetched once on load.
// const POLLING_INTERVAL = 5000; 

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
    // Ensure loadingCurrent is true only if data isn't already loaded or an explicit refresh is intended.
    // For this version, it's primarily for initial load.
    if (!data.currentRun && !data.errorCurrent) {
      setData(prev => ({ ...prev, loadingCurrent: true }));
    }
    try {
      const response = await fetch('/api/current-run');
      if (!response.ok) {
        let errorDetails = response.statusText; 
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorDetails = errorBody.message;
          }
        } catch (e) {
          console.warn("Could not parse error response body as JSON:", e);
        }
        throw new Error(`Failed to fetch current run: ${errorDetails}`);
      }
      const result: PlaywrightPulseReport = await response.json();
      setData(prev => ({ ...prev, currentRun: result, loadingCurrent: false, errorCurrent: null }));
    } catch (error) {
      console.error("PulseDashboard Fetch Error (currentRun):", error); 
      let detailedErrorMessage = "An unknown error occurred while fetching current run data.";
      if (error instanceof TypeError && error.message.toLowerCase() === 'failed to fetch') {
        detailedErrorMessage = "Network error: Could not connect to the server to fetch current run data. Please check your network connection and ensure the server is running and the API endpoint '/api/current-run' is accessible.";
      } else if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else {
        detailedErrorMessage = String(error);
      }
      setData(prev => ({ ...prev, loadingCurrent: false, errorCurrent: detailedErrorMessage }));
    }
  }, [data.currentRun, data.errorCurrent]); // Added dependencies to avoid stale closures if we reintroduce manual refresh

  const fetchHistoricalTrends = useCallback(async () => {
    // Similar logic for loading state, primarily for initial load.
    if (data.historicalTrends.length === 0 && !data.errorHistorical) {
     setData(prev => ({ ...prev, loadingHistorical: true }));
    }
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
      console.error("PulseDashboard Fetch Error (historicalTrends):", error);
      let detailedErrorMessage = "An unknown error occurred while fetching historical trends.";
      if (error instanceof TypeError && error.message.toLowerCase() === 'failed to fetch') {
        detailedErrorMessage = "Network error: Could not connect to the server to fetch historical trends. Please check your network connection and ensure the server is running and the API endpoint '/api/historical-trends' is accessible.";
      } else if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else {
        detailedErrorMessage = String(error);
      }
      setData(prev => ({ ...prev, loadingHistorical: false, errorHistorical: detailedErrorMessage }));
    }
  }, [data.historicalTrends.length, data.errorHistorical]); // Added dependencies

  useEffect(() => {
    fetchCurrentRun();
    fetchHistoricalTrends();

    // Polling interval has been removed.
    // const intervalId = setInterval(fetchCurrentRun, POLLING_INTERVAL);
    // return () => clearInterval(intervalId);
  }, [fetchCurrentRun, fetchHistoricalTrends]);

  return data;
}

