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
        userProjectDir: null,
    });
    const fetchCurrentRun = useCallback(async () => {
        const apiUrl = '/api/current-run';
        // Set loading state at the beginning of the fetch attempt
        setData(prev => ({ ...prev, loadingCurrent: true, errorCurrent: null }));
        try {
            console.log(`Attempting to fetch current run data from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                let errorDetails = `${response.status} ${response.statusText || 'Server Error'}`;
                try {
                    const errorBody = await response.json();
                    if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
                        errorDetails = errorBody.message;
                    }
                    else if (errorBody && typeof errorBody === 'object' && errorBody !== null) {
                        errorDetails = `Server error (${response.status}): ${JSON.stringify(errorBody)}`;
                    }
                }
                catch (e) {
                    console.warn(`Could not parse error response body as JSON for ${apiUrl}. Status: ${response.status}`, e);
                }
                throw new Error(`Failed to fetch current run from ${apiUrl}: ${errorDetails}`);
            }
            const result = await response.json();
            setData(prev => ({
                ...prev,
                currentRun: result,
                loadingCurrent: false,
                errorCurrent: null,
                userProjectDir: result?.metadata?.userProjectDir || null,
            }));
        }
        catch (error) {
            console.error(`PulseDashboard Fetch Error (currentRun at ${apiUrl}):`, error);
            let detailedErrorMessage = `An unknown error occurred while fetching current run data from ${apiUrl}.`;
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection and ensure the server is running.`;
            }
            else if (error instanceof Error) {
                detailedErrorMessage = error.message;
            }
            else {
                detailedErrorMessage = String(error);
            }
            setData(prev => ({ ...prev, currentRun: null, loadingCurrent: false, errorCurrent: detailedErrorMessage, userProjectDir: null }));
        }
    }, []); // Empty dependency array for useCallback as it only uses setData
    const fetchHistoricalTrends = useCallback(async () => {
        const apiUrl = '/api/historical-trends';
        // Set loading state at the beginning of the fetch attempt
        setData(prev => ({ ...prev, loadingHistorical: true, errorHistorical: null }));
        try {
            console.log(`Attempting to fetch historical trends data from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                let errorDetails = `${response.status} ${response.statusText || 'Server Error'}`;
                try {
                    const errorBody = await response.json();
                    if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim() !== '') {
                        errorDetails = errorBody.message;
                    }
                    else if (errorBody && typeof errorBody === 'object' && errorBody !== null) {
                        errorDetails = `Server error (${response.status}): ${JSON.stringify(errorBody)}`;
                    }
                }
                catch (e) {
                    console.warn(`Could not parse historical trends error response body as JSON for ${apiUrl}. Status: ${response.status}`, e);
                }
                throw new Error(`Failed to fetch historical trends from ${apiUrl}: ${errorDetails}`);
            }
            const result = await response.json();
            setData(prev => ({ ...prev, historicalTrends: result, loadingHistorical: false, errorHistorical: null }));
        }
        catch (error) {
            console.error(`PulseDashboard Fetch Error (historicalTrends at ${apiUrl}):`, error);
            let detailedErrorMessage = `An unknown error occurred while fetching historical trends from ${apiUrl}.`;
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                detailedErrorMessage = `Network error: Could not connect to the API endpoint (${apiUrl}). Please check your network connection and ensure the server is running.`;
            }
            else if (error instanceof Error) {
                detailedErrorMessage = error.message;
            }
            else {
                detailedErrorMessage = String(error);
            }
            setData(prev => ({ ...prev, historicalTrends: [], loadingHistorical: false, errorHistorical: detailedErrorMessage }));
        }
    }, []); // Empty dependency array for useCallback as it only uses setData
    useEffect(() => {
        // Fetch data on initial mount (which also occurs on browser refresh)
        fetchCurrentRun();
        fetchHistoricalTrends();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this effect runs only once on mount
    return data;
}
//# sourceMappingURL=useTestData.js.map