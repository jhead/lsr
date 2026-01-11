/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo 2 algorithm
 */

export interface SM2Params {
  iterations: number;
  easinessFactor: number;
  interval: number;
}

export interface SM2Result {
  iterations: number;
  easinessFactor: number;
  interval: number;
}

const MIN_EF = 1.3;

/**
 * Updates SM-2 parameters based on quality score (0-5)
 * @param params Current SM-2 parameters
 * @param quality Quality score (0-5) representing recall quality
 * @returns Updated SM-2 parameters
 */
export function updateSM2(params: SM2Params, quality: number): SM2Result {
  let { iterations, easinessFactor, interval } = params;

  // Update easiness factor
  const efChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easinessFactor = easinessFactor + efChange;
  
  // Constraint: EF must not drop below 1.3
  if (easinessFactor < MIN_EF) {
    easinessFactor = MIN_EF;
  }

  // Update interval and iterations based on quality
  if (quality < 3) {
    // Reset if quality is poor
    iterations = 0;
    interval = 1;
  } else {
    // Calculate new interval based on current iterations (before incrementing)
    if (iterations === 0) {
      interval = 1;
    } else if (iterations === 1) {
      interval = 6;
    } else {
      // n > 1: I = I_prev × EF
      interval = Math.round(interval * easinessFactor);
    }

    // Update iterations after calculating interval
    iterations += 1;
  }

  return {
    iterations,
    easinessFactor,
    interval,
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
  };
}
