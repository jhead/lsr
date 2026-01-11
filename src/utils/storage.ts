import type { UserProgress, LeetCodeProblem } from '../types';
import { stateManager } from './stateManager';

/**
 * Loads user progress from localStorage
 * @deprecated Use stateManager.loadUserProgress() instead
 */
export function loadUserProgress(): UserProgress {
  return stateManager.loadUserProgress();
}

/**
 * Saves user progress to localStorage
 * @deprecated Use stateManager.saveUserProgress() instead
 */
export function saveUserProgress(progress: UserProgress): void {
  stateManager.saveUserProgress(progress);
}

/**
 * Updates progress for a specific problem
 * @deprecated Use stateManager.updateProblemProgress() instead
 */
export function updateProblemProgress(
  problemId: number,
  progress: UserProgress[number]
): void {
  stateManager.updateProblemProgress(problemId, progress);
}

/**
 * Gets progress for a specific problem, or returns undefined if not found
 * @deprecated Use stateManager.getProblemProgress() instead
 */
export function getProblemProgress(problemId: number): UserProgress[number] | undefined {
  return stateManager.getProblemProgress(problemId);
}

/**
 * Loads problems from localStorage
 * @deprecated Use stateManager.loadProblems() instead
 */
export function loadProblems(): LeetCodeProblem[] {
  return stateManager.loadProblems();
}

/**
 * Saves problems to localStorage
 * @deprecated Use stateManager.saveProblems() instead
 */
export function saveProblems(problems: LeetCodeProblem[]): void {
  stateManager.saveProblems(problems);
}
