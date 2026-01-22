import type { LeetCodeProblem, UserProgress, AppSettings } from '../types';

// Mastery classification thresholds
const THRESHOLDS = {
  STRONG: { minEF: 2.5, minInterval: 7 },
  LEARNING: { minEF: 2.0, minInterval: 1 },
};

export interface MasteryCounts {
  strong: number;
  learning: number;
  weak: number;
  leech: number;
  unknown: number;
  total: number;
}

/**
 * Calculate mastery counts from problems and userProgress
 *
 * Classification logic:
 * - Strong: easinessFactor >= 2.5 AND interval >= 7
 * - Learning: easinessFactor >= 2.0 AND interval >= 1
 * - Weak: Below learning thresholds
 * - Leech: isLeech === true (8+ lapses)
 * - Unknown: No progress entry exists
 */
export function calculateMasteryCounts(
  problems: LeetCodeProblem[],
  userProgress: UserProgress
): MasteryCounts {
  const counts: MasteryCounts = {
    strong: 0,
    learning: 0,
    weak: 0,
    leech: 0,
    unknown: 0,
    total: problems.length,
  };

  for (const problem of problems) {
    const progress = userProgress[problem.id];

    if (!progress) {
      counts.unknown++;
      continue;
    }

    // Check leech first (takes priority)
    if (progress.isLeech) {
      counts.leech++;
      continue;
    }

    const { easinessFactor, interval } = progress;

    // Check strong
    if (easinessFactor >= THRESHOLDS.STRONG.minEF && interval >= THRESHOLDS.STRONG.minInterval) {
      counts.strong++;
      continue;
    }

    // Check learning
    if (easinessFactor >= THRESHOLDS.LEARNING.minEF && interval >= THRESHOLDS.LEARNING.minInterval) {
      counts.learning++;
      continue;
    }

    // Otherwise weak
    counts.weak++;
  }

  return counts;
}

// Debounce state
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 5000; // 5 seconds

/**
 * Send a mastery snapshot to the configured endpoint (debounced)
 */
export function debouncedSendSnapshot(
  settings: AppSettings,
  problems: LeetCodeProblem[],
  userProgress: UserProgress
): void {
  // Clear any existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    await sendSnapshot(settings, problems, userProgress);
  }, DEBOUNCE_MS);
}

/**
 * Actually send the snapshot to the API
 */
async function sendSnapshot(
  settings: AppSettings,
  problems: LeetCodeProblem[],
  userProgress: UserProgress
): Promise<void> {
  const { snapshotApiEndpoint, snapshotApiKey } = settings;

  if (!snapshotApiEndpoint || !snapshotApiKey) {
    return;
  }

  const counts = calculateMasteryCounts(problems, userProgress);
  const timestamp = Date.now();

  try {
    const response = await fetch(`${snapshotApiEndpoint}/api/lsr/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': snapshotApiKey,
      },
      body: JSON.stringify({ timestamp, counts }),
    });

    if (!response.ok) {
      console.error(`Failed to send snapshot: ${response.status} ${response.statusText}`);
      return;
    }

    console.log('LSR snapshot sent successfully:', counts);
  } catch (error) {
    console.error('Error sending LSR snapshot:', error);
  }
}
