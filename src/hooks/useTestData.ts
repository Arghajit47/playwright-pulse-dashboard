
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
    loadingCurrent: true,
    loadingHistorical: true,
    errorCurrent: null,
    errorHistorical: null,
  });

  const fetchCurrentRun = useCallback(async () => {
    const apiUrl = '/api/current-run';
    // loadingCurrent is true initially for the first load.
    // Subsequent polls won't set it to true to avoid UI flicker, unless data.currentRun is null.
    if (data.currentRun === null && !data.errorCurrent) {
        setData(prev => ({ ...prev, loadingCurrent: true, errorCurrent: null }));
    }

    try {
      console.log(`Attempting to fetch current run data from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let extractedMessageFromServer = '';
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
            extractedMessageFromServer = errorBody.message;
          } else if (errorBody && typeof errorBody === 'object' && errorBody !== null) {
            // If message is not a string or empty, but body exists, stringify it.
            extractedMessageFromServer = `Server error details: ${JSON.stringify(errorBody)}`;
          }
        } catch (e) {
          // Failed to parse JSON body, or no JSON body sent.
          console.warn(`Could not parse error response body as JSON for ${apiUrl}. Status: ${response.status}`, e);
        }

        const errorDetails = extractedMessageFromServer || `${response.status} ${response.statusText || 'Server Error'}`;
        throw new Error(`Failed to fetch current run from ${apiUrl}: ${errorDetails}`);
      }
      const result: PlaywrightPulseReport = await response.json();
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
      setData(prev => ({ ...prev, currentRun: null, loadingCurrent: false, errorCurrent: detailedErrorMessage }));
    }
  }, [data.currentRun, data.errorCurrent]); // Dependencies ensure loading state is correctly managed

  const fetchHistoricalTrends = useCallback(async () => {
    const apiUrl = '/api/historical-trends';
    if (data.historicalTrends.length === 0 && !data.errorHistorical) {
        setData(prev => ({ ...prev, loadingHistorical: true, errorHistorical: null }));
    }
    try {
      console.log(`Attempting to fetch historical trends data from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let extractedMessageFromServer = '';
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
            extractedMessageFromServer = errorBody.message;
          } else if (errorBody && typeof errorBody === 'object' && errorBody !== null) {
            extractedMessageFromServer = `Server error details: ${JSON.stringify(errorBody)}`;
          }
        } catch (e) {
          console.warn(`Could not parse historical trends error response body as JSON for ${apiUrl}. Status: ${response.status}`, e);
        }
        const errorDetails = extractedMessageFromServer || `${response.status} ${response.statusText || 'Server Error'}`;
        throw new Error(`Failed to fetch historical trends from ${apiUrl}: ${errorDetails}`);
      }
      const result: HistoricalTrend[] = await response.json();
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
      setData(prev => ({ ...prev, historicalTrends: [], loadingHistorical: false, errorHistorical: detailedErrorMessage }));
    }
  }, [data.historicalTrends.length, data.errorHistorical]); // Dependencies ensure loading state is correctly managed

  useEffect(() => {
    fetchCurrentRun();
    fetchHistoricalTrends();

    const intervalId = setInterval(() => {
      console.log('Polling for current run data...');
      fetchCurrentRun();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchCurrentRun, fetchHistoricalTrends]);

  return data;
}
