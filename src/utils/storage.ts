import type { UserProgress, LeetCodeProblem } from '../types';

const STORAGE_KEY = 'lsr_user_progress';
const PROBLEMS_STORAGE_KEY = 'lsr_problems';

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

/**
 * Loads problems from localStorage
 */
export function loadProblems(): LeetCodeProblem[] {
  try {
    const stored = localStorage.getItem(PROBLEMS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as LeetCodeProblem[];
  } catch (error) {
    console.error('Error loading problems:', error);
    return [];
  }
}

/**
 * Saves problems to localStorage
 */
export function saveProblems(problems: LeetCodeProblem[]): void {
  try {
    localStorage.setItem(PROBLEMS_STORAGE_KEY, JSON.stringify(problems));
    console.log(`Saved ${problems.length} problems to localStorage`);
  } catch (error) {
    console.error('Error saving problems:', error);
    throw error;
  }
}
