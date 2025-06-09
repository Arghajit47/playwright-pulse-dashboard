
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

export function useTestData() {
  const [data, setData] = useState<TestDataState>({
    currentRun: null,
    historicalTrends: [],
    loadingCurrent: true, // Initial loading state set to true
    loadingHistorical: true, // Initial loading state set to true
    errorCurrent: null,
    errorHistorical: null,
  });

  const fetchCurrentRun = useCallback(async () => {
    const apiUrl = '/api/current-run';
    // loadingCurrent is true initially. Subsequent polls won't set it to true to avoid UI flicker.
    try {
      console.log(`Attempting to fetch current run data from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorDetails = `${response.status} ${response.statusText}`; 
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorDetails = errorBody.message;
          }
        } catch (e) {
          console.warn(`Could not parse error response body as JSON for ${apiUrl}:`, e);
        }
        throw new Error(`Failed to fetch current run from ${apiUrl}: ${errorDetails}`);
      }
      const result: PlaywrightPulseReport = await response.json();
      // Set loadingCurrent to false on successful fetch.
      setData(prev => ({ ...prev, currentRun: result, loadingCurrent: false, errorCurrent: null }));
    } catch (error) {
      console.error(`PulseDashboard Fetch Error (currentRun at ${apiUrl}):`, error); 
      let detailedErrorMessage = `An unknown error occurred while fetching current run data from ${apiUrl}.`;
      if (error instanceof TypeError && error.message.toLowerCase() === 'failed to fetch') {
        detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection. Also, ensure your Next.js server is running, accessible, and that there are no errors in the Next.js server's console output related to this API route.`;
      } else if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else {
        detailedErrorMessage = String(error);
      }
      // Set loadingCurrent to false on error.
      setData(prev => ({ ...prev, loadingCurrent: false, errorCurrent: detailedErrorMessage }));
    }
  }, []); // Empty dependency array for useCallback makes this function stable

  const fetchHistoricalTrends = useCallback(async () => {
    const apiUrl = '/api/historical-trends';
    // loadingHistorical is true initially.
    try {
      console.log(`Attempting to fetch historical trends data from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorDetails = `${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorDetails = errorBody.message;
          }
        } catch (e) {
          console.warn(`Could not parse historical trends error response body as JSON for ${apiUrl}:`, e);
        }
        throw new Error(`Failed to fetch historical trends from ${apiUrl}: ${errorDetails}`);
      }
      const result: HistoricalTrend[] = await response.json();
      // Set loadingHistorical to false on successful fetch.
      setData(prev => ({ ...prev, historicalTrends: result, loadingHistorical: false, errorHistorical: null }));
    } catch (error) {
      console.error(`PulseDashboard Fetch Error (historicalTrends at ${apiUrl}):`, error);
      let detailedErrorMessage = `An unknown error occurred while fetching historical trends from ${apiUrl}.`;
      if (error instanceof TypeError && error.message.toLowerCase() === 'failed to fetch') {
        detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection. Also, ensure your Next.js server is running, accessible, and that there are no errors in the Next.js server's console output related to this API route.`;
      } else if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else {
        detailedErrorMessage = String(error);
      }
      // Set loadingHistorical to false on error.
      setData(prev => ({ ...prev, loadingHistorical: false, errorHistorical: detailedErrorMessage }));
    }
  }, []); // Empty dependency array for useCallback makes this function stable

  useEffect(() => {
    // Initial fetches
    fetchCurrentRun();
    fetchHistoricalTrends();

    // Setup polling for currentRun
    const intervalId = setInterval(() => {
      console.log('Polling for current run data...');
      fetchCurrentRun();
    }, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchCurrentRun, fetchHistoricalTrends]); // useEffect dependencies are now stable

  return data;
}
