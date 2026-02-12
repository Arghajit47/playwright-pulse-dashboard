import { DetailedTestResult } from "@/types/playwright";

/**
 * Determines the effective status of a test based on strict precedence rules.
 * 
 * Rules:
 * 1. If test.outcome === 'flaky', return 'flaky'.
 * 2. If test.status === 'flaky', return 'flaky'.
 * 3. Fallback: If test.status === 'passed' and has retries, return 'flaky'.
 * 4. Otherwise return test.status.
 */
export function getEffectiveTestStatus(test: DetailedTestResult): 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedOut' | 'pending' {
  // 1. Explicit outcome
  if (test.outcome === 'flaky') {
    return 'flaky';
  }

  // 2. Explicit status
  if (test.status === 'flaky') {
    return 'flaky';
  }

  // 3. Fallback logic: Passed with actual retries is flaky
  // We ONLY check retryHistory for actual retries. test.retries is often the *configured* max retries.
  // CRITICAL FIX: Only consider it flaky if there is at least one FAILED attempt in history.
  // Repeated successful runs should not be counted as flaky.
  if (test.status === 'passed' && test.retryHistory && test.retryHistory.length > 0) {
      const hasFailedAttempt = test.retryHistory.some(attempt => 
          attempt.status === 'failed' || attempt.status === 'timedOut'
      );
      if (hasFailedAttempt) {
          return 'flaky';
      }
  }

  // 4. Fallback: If final_status is present and different (e.g. for custom logic), use it
  if (test.retryHistory && test.retryHistory.length > 0 && test.final_status) {
      // If final status is 'flaky', return it. 
      if (test.final_status === 'flaky') return 'flaky';
  }
  
  return test.status;
}
