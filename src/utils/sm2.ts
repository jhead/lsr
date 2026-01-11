/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo 2 algorithm with enhancements
 */

export interface SM2Params {
  iterations: number;
  easinessFactor: number;
  interval: number;
  lapseCount?: number; // Track repeated failures (leeches)
}

export interface SM2Result {
  iterations: number;
  easinessFactor: number;
  interval: number;
  lapseCount: number;
  isLeech: boolean; // Flag if this card is a leech (8+ lapses)
}

const MIN_EF = 1.3;
const MAX_INTERVAL = 14; // Maximum interval in days to prevent cards from disappearing for years
const LEECH_THRESHOLD = 8; // Number of lapses before a card is considered a leech

/**
 * Updates SM-2 parameters based on quality score (0-5)
 * @param params Current SM-2 parameters
 * @param quality Quality score (0-5) representing recall quality
 * @returns Updated SM-2 parameters
 */
export function updateSM2(params: SM2Params, quality: number): SM2Result {
  let { iterations, easinessFactor, interval, lapseCount = 0 } = params;

  // Update easiness factor
  const efChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easinessFactor = easinessFactor + efChange;
  
  // Constraint: EF must not drop below 1.3
  if (easinessFactor < MIN_EF) {
    easinessFactor = MIN_EF;
  }

  // Update interval and iterations based on quality
  if (quality < 3) {
    // Reset if quality is poor - this is a "lapse"
    iterations = 0;
    interval = 1;
    lapseCount += 1;
    console.log(`Card lapsed. Lapse count: ${lapseCount}`);
  } else {
    // Calculate new interval based on current iterations (before incrementing)
    if (iterations === 0) {
      interval = 1;
    } else if (iterations === 1) {
      interval = 3;
    } else {
      // n > 1: I = I_prev × EF, capped at MAX_INTERVAL
      interval = Math.min(Math.round(interval * easinessFactor), MAX_INTERVAL);
    }

    // Update iterations after calculating interval
    iterations += 1;
  }

  const isLeech = lapseCount >= LEECH_THRESHOLD;
  if (isLeech) {
    console.log(`Card is a leech with ${lapseCount} lapses!`);
  }

  return {
    iterations,
    easinessFactor,
    interval,
    lapseCount,
    isLeech,
  };
}

/**
 * Initializes SM-2 parameters for a new problem
 */
export function initSM2(): SM2Params {
  return {
    iterations: 0,
    easinessFactor: 2.5,
    interval: 1,
    lapseCount: 0,
  };
}

/**
 * Adds a fuzz factor to the interval to prevent review clustering
 * @param intervalDays The base interval in days
 * @returns Interval with ±4% random variance applied
 */
export function applyFuzzFactor(intervalDays: number): number {
  // Don't fuzz very short intervals
  if (intervalDays <= 2) {
    return intervalDays;
  }
  // Apply ±4% random variance
  const fuzzRange = 0.04;
  const fuzz = 1 + (Math.random() * 2 * fuzzRange - fuzzRange);
  return Math.round(intervalDays * fuzz);
}
