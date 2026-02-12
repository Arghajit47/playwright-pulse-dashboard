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
export declare function getEffectiveTestStatus(test: DetailedTestResult): 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedOut' | 'pending';
//# sourceMappingURL=testUtils.d.ts.map