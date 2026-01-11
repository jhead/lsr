import type { UserProgress } from '../types';

const STORAGE_KEY = 'lsr_user_progress';

/**
 * Loads user progress from localStorage
 */
export function loadUserProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored) as UserProgress;
  } catch (error) {
    console.error('Error loading user progress:', error);
    return {};
  }
}

/**
 * Saves user progress to localStorage
 */
export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving user progress:', error);
  }
}

/**
 * Updates progress for a specific problem
 */
export function updateProblemProgress(
  problemId: number,
  progress: UserProgress[number]
): void {
  const current = loadUserProgress();
  current[problemId] = progress;
  saveUserProgress(current);
}

/**
 * Gets progress for a specific problem, or returns undefined if not found
 */
export function getProblemProgress(problemId: number): UserProgress[number] | undefined {
  const progress = loadUserProgress();
  return progress[problemId];
}
