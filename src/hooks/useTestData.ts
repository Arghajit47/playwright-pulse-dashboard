
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
  userProjectDir: string | null; // To store the base path for file:/// URLs
}

export function useTestData() {
  const [data, setData] = useState<TestDataState>({
    currentRun: null,
    historicalTrends: [],
    loadingCurrent: true,
    loadingHistorical: true,
    errorCurrent: null,
    errorHistorical: null,
    userProjectDir: null,
  });

  const fetchCurrentRun = useCallback(async () => {
    const apiUrl = '/api/current-run';
    if (!data.currentRun && !data.loadingCurrent && !data.errorCurrent) {
        setData(prev => ({ ...prev, loadingCurrent: true, errorCurrent: null }));
    }

    try {
      console.log(`Attempting to fetch current run data from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorDetails = `${response.status} ${response.statusText || 'Server Error'}`;
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
            errorDetails = errorBody.message; 
          } else if (errorBody && typeof errorBody === 'object' && errorBody !== null) {
            errorDetails = `Server error (${response.status}): ${JSON.stringify(errorBody)}`;
          }
        } catch (e) {
          console.warn(`Could not parse error response body as JSON for ${apiUrl}. Status: ${response.status}`, e);
        }
        throw new Error(`Failed to fetch current run from ${apiUrl}: ${errorDetails}`);
      }
      const result: PlaywrightPulseReport = await response.json();
      setData(prev => ({ 
        ...prev, 
        currentRun: result, 
        loadingCurrent: false, 
        errorCurrent: null,
        userProjectDir: result?.metadata?.userProjectDir || null,
      }));
    } catch (error) {
      console.error(`PulseDashboard Fetch Error (currentRun at ${apiUrl}):`, error);
      let detailedErrorMessage = `An unknown error occurred while fetching current run data from ${apiUrl}.`;
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection and ensure the server is running.`;
      } else if (error instanceof Error) {
        detailedErrorMessage = error.message; 
      } else {
        detailedErrorMessage = String(error);
      }
      setData(prev => ({ ...prev, currentRun: null, loadingCurrent: false, errorCurrent: detailedErrorMessage, userProjectDir: null }));
    }
  }, [data.currentRun, data.loadingCurrent, data.errorCurrent]); // Added dependencies

  const fetchHistoricalTrends = useCallback(async () => {
    const apiUrl = '/api/historical-trends';
     if (!data.historicalTrends.length && !data.loadingHistorical && !data.errorHistorical) {
        setData(prev => ({ ...prev, loadingHistorical: true, errorHistorical: null }));
    }
    try {
      console.log(`Attempting to fetch historical trends data from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorDetails = `${response.status} ${response.statusText || 'Server Error'}`;
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
            errorDetails = errorBody.message;
          } else if (errorBody && typeof errorBody === 'object' && errorBody !== null) {
            errorDetails = `Server error (${response.status}): ${JSON.stringify(errorBody)}`;
          }
        } catch (e) {
          console.warn(`Could not parse historical trends error response body as JSON for ${apiUrl}. Status: ${response.status}`, e);
        }
        throw new Error(`Failed to fetch historical trends from ${apiUrl}: ${errorDetails}`);
      }
      const result: HistoricalTrend[] = await response.json();
      setData(prev => ({ ...prev, historicalTrends: result, loadingHistorical: false, errorHistorical: null }));
    } catch (error) {
      console.error(`PulseDashboard Fetch Error (historicalTrends at ${apiUrl}):`, error);
      let detailedErrorMessage = `An unknown error occurred while fetching historical trends from ${apiUrl}.`;
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection and ensure the server is running.`;
      } else if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else {
        detailedErrorMessage = String(error);
      }
      setData(prev => ({ ...prev, historicalTrends: [], loadingHistorical: false, errorHistorical: detailedErrorMessage }));
    }
  }, [data.historicalTrends.length, data.loadingHistorical, data.errorHistorical]); // Added dependencies

  useEffect(() => {
    if (data.loadingCurrent) fetchCurrentRun(); 
    if (data.loadingHistorical) fetchHistoricalTrends(); 

    const intervalId = setInterval(() => {
      console.log('Polling for current run data...');
      fetchCurrentRun();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchCurrentRun, fetchHistoricalTrends, data.loadingCurrent, data.loadingHistorical]);

  return data;
}
