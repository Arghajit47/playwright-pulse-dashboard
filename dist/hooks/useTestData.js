'use client';
import { useState, useEffect, useCallback } from 'react';
export function useTestData() {
    const [data, setData] = useState({
        currentRun: null,
        historicalTrends: [],
        loadingCurrent: true,
        loadingHistorical: true,
        errorCurrent: null,
        errorHistorical: null,
    });
    const fetchCurrentRun = useCallback(async () => {
        const apiUrl = '/api/current-run';
        if (!data.currentRun && !data.errorCurrent) {
            setData(prev => ({ ...prev, loadingCurrent: true }));
        }
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
                }
                catch (e) {
                    console.warn(`Could not parse error response body as JSON for ${apiUrl}:`, e);
                }
                throw new Error(`Failed to fetch current run from ${apiUrl}: ${errorDetails}`);
            }
            const result = await response.json();
            setData(prev => ({ ...prev, currentRun: result, loadingCurrent: false, errorCurrent: null }));
        }
        catch (error) {
            console.error(`PulseDashboard Fetch Error (currentRun at ${apiUrl}):`, error);
            let detailedErrorMessage = `An unknown error occurred while fetching current run data from ${apiUrl}.`;
            if (error instanceof TypeError && error.message.toLowerCase() === 'failed to fetch') {
                detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection. Also, ensure your Next.js server is running, accessible, and that there are no errors in the Next.js server's console output related to this API route.`;
            }
            else if (error instanceof Error) {
                detailedErrorMessage = error.message;
            }
            else {
                detailedErrorMessage = String(error);
            }
            setData(prev => ({ ...prev, loadingCurrent: false, errorCurrent: detailedErrorMessage }));
        }
    }, [data.currentRun, data.errorCurrent]);
    const fetchHistoricalTrends = useCallback(async () => {
        const apiUrl = '/api/historical-trends';
        if (data.historicalTrends.length === 0 && !data.errorHistorical) {
            setData(prev => ({ ...prev, loadingHistorical: true }));
        }
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
                }
                catch (e) {
                    console.warn(`Could not parse historical trends error response body as JSON for ${apiUrl}:`, e);
                }
                throw new Error(`Failed to fetch historical trends from ${apiUrl}: ${errorDetails}`);
            }
            const result = await response.json();
            setData(prev => ({ ...prev, historicalTrends: result, loadingHistorical: false, errorHistorical: null }));
        }
        catch (error) {
            console.error(`PulseDashboard Fetch Error (historicalTrends at ${apiUrl}):`, error);
            let detailedErrorMessage = `An unknown error occurred while fetching historical trends from ${apiUrl}.`;
            if (error instanceof TypeError && error.message.toLowerCase() === 'failed to fetch') {
                detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection. Also, ensure your Next.js server is running, accessible, and that there are no errors in the Next.js server's console output related to this API route.`;
            }
            else if (error instanceof Error) {
                detailedErrorMessage = error.message;
            }
            else {
                detailedErrorMessage = String(error);
            }
            setData(prev => ({ ...prev, loadingHistorical: false, errorHistorical: detailedErrorMessage }));
        }
    }, [data.historicalTrends.length, data.errorHistorical]);
    useEffect(() => {
        fetchCurrentRun();
        fetchHistoricalTrends();
    }, [fetchCurrentRun, fetchHistoricalTrends]);
    return data;
}
//# sourceMappingURL=useTestData.js.map