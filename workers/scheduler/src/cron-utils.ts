// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CronExpressionParser } = require('cron-parser');

/**
 * Check if a cron expression should run in the current minute.
 * This is the core scheduling logic - it checks if the current minute matches the cron pattern.
 * 
 * @param cronExpr - Cron expression (e.g., every minute, every 5 minutes)
 * @param lastRunAt - Timestamp of last run (to prevent duplicate runs in same minute)
 * @returns true if the job should run this minute
 */
export function shouldRunThisMinute(cronExpr: string, lastRunAt: number | null): boolean {
  try {
    const now = new Date();
    
    // Get the start of the current minute (seconds and ms set to 0)
    const currentMinuteStart = new Date(now);
    currentMinuteStart.setUTCSeconds(0);
    currentMinuteStart.setUTCMilliseconds(0);
    
    // Normalize the cron expression (handle "L" etc.)
    const normalized = normalizeCronExpression(cronExpr);
    
    // Parse cron with currentDate set to current minute start + 1 second
    // This ensures prev() will return the current minute if it matches
    const cron = CronExpressionParser.parse(normalized, {
      currentDate: new Date(currentMinuteStart.getTime() + 1000),
      tz: 'UTC',
    });
    
    // Get the previous occurrence from the current minute
    const prev = cron.prev();
    const prevTime = prev.toDate().getTime();
    
    // If prev equals current minute start, this minute matches the cron expression
    if (prevTime === currentMinuteStart.getTime()) {
      // Check we haven't already run in this minute
      if (!lastRunAt) {
        return true;
      }
      
      // Get the start of the minute when the job last ran
      const lastRunMinute = new Date(lastRunAt);
      lastRunMinute.setUTCSeconds(0);
      lastRunMinute.setUTCMilliseconds(0);
      
      // Only run if we're in a different minute than the last run
      return lastRunMinute.getTime() < currentMinuteStart.getTime();
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check cron expression:', cronExpr, error);
    return false;
  }
}

/**
 * Check if an interval-based job should run.
 * 
 * @param intervalSec - Interval in seconds
 * @param lastRunAt - Timestamp of last run (null if never run)
 * @returns true if the job should run now
 */
export function hasIntervalPassed(intervalSec: number, lastRunAt: number | null): boolean {
  // Never run before - run now
  if (!lastRunAt) {
    return true;
  }
  
  const now = Date.now();
  const timeSinceLastRun = now - lastRunAt;
  const intervalMs = intervalSec * 1000;
  
  // Run if interval has passed (with 30 second tolerance to account for worker timing)
  return timeSinceLastRun >= intervalMs - 30000;
}

/**
 * Normalize cron expression by handling special characters like "L" (last day of month)
 * cron-parser doesn't support "L" directly, so we need to convert it
 */
export function normalizeCronExpression(cronExpr: string): string {
  // Check if expression contains "L" (last day of month)
  if (cronExpr.includes('L')) {
    // For "L" in day of month position (e.g., "59 23 L * *")
    // We'll convert it to a valid day number based on current month
    // Note: This is a simplified approach - for production, you might want
    // to calculate the actual last day of the month dynamically
    const parts = cronExpr.split(' ');
    if (parts.length >= 3 && parts[2] === 'L') {
      // Replace "L" with 28-31 range (covers all months)
      // This is a workaround - the actual last day varies by month
      // For now, we'll use 31 which is the maximum
      parts[2] = '31';
      return parts.join(' ');
    }
  }
  return cronExpr;
}

/**
 * Validate cron expression format
 * Returns true if valid, false otherwise
 */
export function validateCronExpression(cronExpr: string): boolean {
  if (!cronExpr || typeof cronExpr !== 'string') {
    return false;
  }

  // Basic format check: should have 5 parts separated by spaces
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  // Try to parse with cron-parser to validate
  try {
    const normalized = normalizeCronExpression(cronExpr);
    CronExpressionParser.parse(normalized, {
      currentDate: new Date(),
      tz: 'UTC',
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Calculate the next run time for a cron job or interval-based job
 * 
 * @param cronExpr - Cron expression or null
 * @param intervalSec - Interval in seconds or null
 * @returns Next run timestamp in milliseconds
 */
export function calculateNextRun(
  cronExpr: string | null,
  intervalSec: number | null
): number {
  const now = Date.now();

  // Priority 1: Cron expression
  if (cronExpr) {
    try {
      // Normalize expression (handle "L" and other special characters)
      const normalized = normalizeCronExpression(cronExpr);

      // Calculate the start of the next minute to use as baseDate
      // This ensures we always get the NEXT occurrence, not the current one
      const currentDate = new Date(now);
      const nextMinuteStart = new Date(currentDate);
      nextMinuteStart.setUTCSeconds(0);
      nextMinuteStart.setUTCMilliseconds(0);
      nextMinuteStart.setUTCMinutes(nextMinuteStart.getUTCMinutes() + 1);
      
      // Use next minute start + 1 second to ensure we're definitely in the future
      const baseDate = new Date(nextMinuteStart.getTime() + 1000);
      
      const cron = CronExpressionParser.parse(normalized, {
        currentDate: baseDate,
        tz: 'UTC', // Always use UTC for consistency
      });

      // Get next occurrence - this should already be in the future due to baseDate offset
      let next = cron.next();
      let nextTime = next.toDate().getTime();

      // Double-check: ensure next run is in the future (at least 1 second from now)
      const maxIterations = 10;
      let iterations = 0;
      while (nextTime <= now && iterations < maxIterations) {
        next = cron.next();
        nextTime = next.toDate().getTime();
        iterations++;
      }
      
      if (iterations >= maxIterations && nextTime <= now) {
        console.error('Failed to calculate future time for cron expression:', cronExpr);
        // Fallback to interval if available
      } else if (nextTime > now) {
        return nextTime;
      }

      // If we reach here, nextTime calculation failed, fall through to interval or default
    } catch (error) {
      console.error('Failed to parse cron expression:', cronExpr, error);
      // Fall through to interval or default
    }
  }

  // Priority 2: Interval-based scheduling with randomization
  // Add ±30% randomization for more natural distribution throughout the day
  if (intervalSec && intervalSec > 0) {
    // Only randomize for intervals >= 30 minutes (1800 sec) to avoid too frequent changes
    let actualInterval = intervalSec;
    if (intervalSec >= 1800) {
      // Random factor between 0.7 and 1.3 (±30%)
      const randomFactor = 0.7 + Math.random() * 0.6;
      actualInterval = Math.round(intervalSec * randomFactor);
    }
    const nextTime = now + actualInterval * 1000;
    // Ensure minimum 1 second in the future
    return Math.max(nextTime, now + 1000);
  }

  // Default: 5 minutes from now (fallback)
  return now + 300000;
}

