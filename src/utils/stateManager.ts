import type { UserProgress, LeetCodeProblem } from '../types';
import LZString from 'lz-string';

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

/**
 * Sync state (without problems) - used for QR code and sync operations
 * Assumes problems are already loaded on the target device
 */
export interface SyncState {
  userProgress: UserProgress;
  dailyQueue: DailyQueueData;
  version: string;
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
   * Serialize and compress state for QR code (excludes problems)
   * Returns a compressed string that can be encoded in a QR code
   * Assumes problems are already loaded on the target device
   */
  serializeForQR(): string {
    const state = this.loadAll();
    // Exclude problems from sync - assume they're already loaded
    const syncState: SyncState = {
      userProgress: state.userProgress,
      dailyQueue: state.dailyQueue,
      version: state.version,
    };
    const jsonString = JSON.stringify(syncState);
    const originalSize = jsonString.length;
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const compressedSize = compressed.length;
    console.log(`QR code data: ${originalSize} chars → ${compressedSize} chars (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);
    return compressed;
  },

  /**
   * Deserialize compressed state from QR code (without problems)
   * Decompresses and validates the structure
   * Merges with existing problems from localStorage
   * Falls back to regular deserialize if decompression fails (for backward compatibility)
   */
  deserializeFromQR(compressedString: string): AppState {
    // Try to decompress first (for new compressed QR codes)
    const decompressed = LZString.decompressFromEncodedURIComponent(compressedString);
    if (decompressed) {
      // Successfully decompressed, deserialize the decompressed data
      return this.deserializeSyncState(decompressed);
    }
    
    // Decompression returned null - might be uncompressed data (backward compatibility)
    // Try to deserialize directly
    try {
      return this.deserializeSyncState(compressedString);
    } catch (error) {
      // If both fail, throw a helpful error
      throw new Error('Failed to decode QR code data. The data may be corrupted or in an unsupported format.');
    }
  },

  /**
   * Deserialize sync state (without problems) and merge with existing problems
   */
  deserializeSyncState(jsonString: string): AppState {
    try {
      const parsed = JSON.parse(jsonString) as unknown;
      
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid state: must be an object');
      }

      const state = parsed as Partial<SyncState | AppState>;

      // Check if this is a full AppState (backward compatibility) or SyncState
      const isFullState = 'problems' in state && Array.isArray(state.problems);
      
      if (isFullState) {
        // Full state with problems - use regular deserialize
        return this.deserialize(jsonString);
      }

      // Sync state without problems - validate and merge with existing problems
      const syncState = state as Partial<SyncState>;

      if (typeof syncState.userProgress !== 'object' || syncState.userProgress === null) {
        throw new Error('Invalid state: userProgress must be an object');
      }

      if (!syncState.dailyQueue || typeof syncState.dailyQueue !== 'object') {
        throw new Error('Invalid state: dailyQueue must be an object');
      }

      if (!syncState.dailyQueue.date || typeof syncState.dailyQueue.date !== 'string') {
        throw new Error('Invalid state: dailyQueue.date must be a string');
      }

      if (!Array.isArray(syncState.dailyQueue.newCardIds)) {
        throw new Error('Invalid state: dailyQueue.newCardIds must be an array');
      }

      // Merge with existing problems from localStorage
      const existingProblems = this.loadProblems();

      // Return merged state
      return {
        problems: existingProblems, // Use existing problems
        userProgress: syncState.userProgress || {},
        dailyQueue: syncState.dailyQueue,
        version: syncState.version || CURRENT_STATE_VERSION,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
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
   * Handles both full state (with problems) and sync state (without problems)
   */
  importState(jsonString: string): void {
    // Try to deserialize as sync state first (handles both cases)
    const state = this.deserializeSyncState(jsonString);
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
