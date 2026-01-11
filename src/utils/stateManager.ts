import type { UserProgress, LeetCodeProblem } from '../types';

/**
 * Daily queue data structure
 */
export interface DailyQueueData {
  date: string; // YYYY-MM-DD format
  newCardIds: number[]; // IDs of new cards added to queue today
}

/**
 * Complete application state that can be serialized/deserialized
 */
export interface AppState {
  problems: LeetCodeProblem[];
  userProgress: UserProgress;
  dailyQueue: DailyQueueData;
  version: string; // For future compatibility checks
}

// Storage keys (keeping existing keys for backward compatibility)
const STORAGE_KEYS = {
  USER_PROGRESS: 'lsr_user_progress',
  PROBLEMS: 'lsr_problems',
  DAILY_QUEUE: 'lcsr-daily-queue',
} as const;

const CURRENT_STATE_VERSION = '1.0.0';

/**
 * Unified state manager for the application
 * Handles all localStorage operations in a single place
 */
export const stateManager = {
  /**
   * Load all state from localStorage
   */
  loadAll(): AppState {
    const problems = this.loadProblems();
    const userProgress = this.loadUserProgress();
    const dailyQueue = this.loadDailyQueue();
    
    return {
      problems,
      userProgress,
      dailyQueue,
      version: CURRENT_STATE_VERSION,
    };
  },

  /**
   * Save all state to localStorage
   */
  saveAll(state: AppState): void {
    this.saveProblems(state.problems);
    this.saveUserProgress(state.userProgress);
    this.saveDailyQueue(state.dailyQueue);
    console.log('Saved all application state to localStorage');
  },

  /**
   * Load user progress from localStorage
   */
  loadUserProgress(): UserProgress {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
      if (!stored) {
        return {};
      }
      return JSON.parse(stored) as UserProgress;
    } catch (error) {
      console.error('Error loading user progress:', error);
      return {};
    }
  },

  /**
   * Save user progress to localStorage
   */
  saveUserProgress(progress: UserProgress): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  },

  /**
   * Updates progress for a specific problem
   */
  updateProblemProgress(
    problemId: number,
    progress: UserProgress[number]
  ): void {
    const current = this.loadUserProgress();
    current[problemId] = progress;
    this.saveUserProgress(current);
  },

  /**
   * Gets progress for a specific problem, or returns undefined if not found
   */
  getProblemProgress(problemId: number): UserProgress[number] | undefined {
    const progress = this.loadUserProgress();
    return progress[problemId];
  },

  /**
   * Load problems from localStorage
   */
  loadProblems(): LeetCodeProblem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROBLEMS);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored) as LeetCodeProblem[];
    } catch (error) {
      console.error('Error loading problems:', error);
      return [];
    }
  },

  /**
   * Save problems to localStorage
   */
  saveProblems(problems: LeetCodeProblem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROBLEMS, JSON.stringify(problems));
      console.log(`Saved ${problems.length} problems to localStorage`);
    } catch (error) {
      console.error('Error saving problems:', error);
      throw error;
    }
  },

  /**
   * Load daily queue data from localStorage
   */
  loadDailyQueue(): DailyQueueData {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DAILY_QUEUE);
      if (stored) {
        const data = JSON.parse(stored) as DailyQueueData;
        // Validate structure
        if (data.date && Array.isArray(data.newCardIds)) {
          return data;
        }
      }
    } catch (e) {
      console.error('Error loading daily queue:', e);
    }
    // Return default queue
    return this.getDefaultDailyQueue();
  },

  /**
   * Save daily queue data to localStorage
   */
  saveDailyQueue(data: DailyQueueData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_QUEUE, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving daily queue:', e);
    }
  },

  /**
   * Get default daily queue for today
   */
  getDefaultDailyQueue(): DailyQueueData {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { date, newCardIds: [] };
  },

  /**
   * Serialize all state to JSON string for copy/paste
   */
  serialize(): string {
    const state = this.loadAll();
    return JSON.stringify(state, null, 2);
  },

  /**
   * Deserialize state from JSON string
   * Validates the structure and returns the state if valid
   */
  deserialize(jsonString: string): AppState {
    try {
      const parsed = JSON.parse(jsonString) as unknown;
      
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid state: must be an object');
      }

      const state = parsed as Partial<AppState>;

      // Validate required fields
      if (!Array.isArray(state.problems)) {
        throw new Error('Invalid state: problems must be an array');
      }

      if (typeof state.userProgress !== 'object' || state.userProgress === null) {
        throw new Error('Invalid state: userProgress must be an object');
      }

      if (!state.dailyQueue || typeof state.dailyQueue !== 'object') {
        throw new Error('Invalid state: dailyQueue must be an object');
      }

      if (!state.dailyQueue.date || typeof state.dailyQueue.date !== 'string') {
        throw new Error('Invalid state: dailyQueue.date must be a string');
      }

      if (!Array.isArray(state.dailyQueue.newCardIds)) {
        throw new Error('Invalid state: dailyQueue.newCardIds must be an array');
      }

      // Return validated state with defaults
      return {
        problems: state.problems,
        userProgress: state.userProgress || {},
        dailyQueue: state.dailyQueue,
        version: state.version || CURRENT_STATE_VERSION,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  },

  /**
   * Import state from JSON string and save to localStorage
   */
  importState(jsonString: string): void {
    const state = this.deserialize(jsonString);
    this.saveAll(state);
    console.log('Imported and saved application state');
  },

  /**
   * Clear all state from localStorage
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.PROBLEMS);
    localStorage.removeItem(STORAGE_KEYS.DAILY_QUEUE);
    console.log('Cleared all application state from localStorage');
  },
};
