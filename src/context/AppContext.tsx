import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { LeetCodeProblem, UserProgress, ProblemProgress, ReviewHistoryEntry, AppSettings } from '../types';
import { loadUserProgress, saveUserProgress, updateProblemProgress, loadProblems, saveProblems } from '../utils/storage';
import { stateManager, type DailyQueueData } from '../utils/stateManager';
import { updateSM2, initSM2, applyFuzzFactor } from '../utils/sm2';
import type { SM2Params } from '../utils/sm2';
import { debouncedSendSnapshot } from '../utils/snapshotService';

// Configuration constants
const MAX_UNDO_HISTORY = 10; // Maximum number of reviews to keep for undo

interface AppContextType {
  problems: LeetCodeProblem[];
  userProgress: UserProgress;
  dailyQueue: LeetCodeProblem[]; // Problems in today's queue (due + new cards)
  dailyQueueNewCardIds: number[]; // IDs of new cards in today's queue (for UI to show remove button)
  moreProblems: LeetCodeProblem[]; // Actionable problems not in daily queue
  reviewedProblems: LeetCodeProblem[]; // Problems already reviewed and not due (review again)
  submitReview: (problemId: number, quality: number) => void;
  undoLastReview: () => boolean; // Returns true if undo was successful
  canUndo: boolean;
  isLoading: boolean;
  setProblems: (problems: LeetCodeProblem[]) => void;
  clearAllProgress: () => void;
  leechProblems: LeetCodeProblem[]; // Problems that are leeches
  reloadState: () => void; // Reload all state from localStorage
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  removeFromDailyQueue: (problemId: number) => void; // Remove a new problem from today's queue
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Load daily queue data from localStorage
 */
function loadDailyQueue(): DailyQueueData {
  const data = stateManager.loadDailyQueue();
  // Check if it's still today
  if (data.date === getTodayString()) {
    return data;
  }
  // Return fresh queue for today
  return stateManager.getDefaultDailyQueue();
}

/**
 * Save daily queue data to localStorage
 */
function saveDailyQueue(data: DailyQueueData): void {
  stateManager.saveDailyQueue(data);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [problems, setProblems] = useState<LeetCodeProblem[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Daily queue tracking - persisted in localStorage
  const [dailyQueueData, setDailyQueueData] = useState<DailyQueueData>(() => loadDailyQueue());
  
  // Settings - persisted in localStorage
  const [settings, setSettings] = useState<AppSettings>(() => stateManager.loadSettings());
  
  // Undo history - kept in memory only (not persisted)
  const [undoHistory, setUndoHistory] = useState<ReviewHistoryEntry[]>([]);

  // Load problems from localStorage on mount
  useEffect(() => {
    const storedProblems = loadProblems();
    setProblems(storedProblems);
    console.log(`Loaded ${storedProblems.length} problems from localStorage`);
    setIsLoading(false);
  }, []);

  // Function to set problems (used by file upload)
  const handleSetProblems = useCallback((newProblems: LeetCodeProblem[]) => {
    saveProblems(newProblems);
    setProblems(newProblems);
    console.log(`Updated problems: ${newProblems.length} problems loaded`);
  }, []);

  // Load user progress from localStorage on mount
  useEffect(() => {
    const progress = loadUserProgress();
    setUserProgress(progress);
    console.log('Loaded user progress:', progress);
  }, []);

  // Check if daily queue needs to be reset (new day)
  useEffect(() => {
    const today = getTodayString();
    if (dailyQueueData.date !== today) {
      const newData = { date: today, newCardIds: [] };
      setDailyQueueData(newData);
      saveDailyQueue(newData);
      console.log('New day detected, reset daily queue');
    }
  }, [dailyQueueData.date]);

  // Populate daily queue with new cards when needed (dedicated effect for reliability)
  useEffect(() => {
    if (problems.length === 0) return; // Wait for problems to load
    
    // Find new problems (no progress yet)
    const newProblems = problems.filter(p => !userProgress[p.id]);
    if (newProblems.length === 0) return; // No new problems to add
    
    // Check how many slots remain
    const slotsRemaining = settings.newCardsPerDay - dailyQueueData.newCardIds.length;
    if (slotsRemaining <= 0) return; // Already at limit
    
    // Find new cards to add (not already in queue and not skipped)
    const existingIds = new Set(dailyQueueData.newCardIds);
    const skippedIds = new Set(dailyQueueData.skippedCardIds || []);
    const cardsToAdd: number[] = [];
    
    for (const problem of newProblems) {
      if (cardsToAdd.length >= slotsRemaining) break;
      if (!existingIds.has(problem.id) && !skippedIds.has(problem.id)) {
        cardsToAdd.push(problem.id);
      }
    }
    
    if (cardsToAdd.length > 0) {
      const newData = {
        ...dailyQueueData,
        newCardIds: [...dailyQueueData.newCardIds, ...cardsToAdd],
      };
      setDailyQueueData(newData);
      saveDailyQueue(newData);
      console.log(`Added ${cardsToAdd.length} new cards to daily queue:`, cardsToAdd);
    }
  }, [problems, userProgress, dailyQueueData, settings.newCardsPerDay]);

  // Track if we've done the initial load to avoid sending snapshot on mount
  const hasInitialized = useRef(false);

  // Send snapshot to LCD dashboard on userProgress changes (debounced)
  useEffect(() => {
    // Skip initial mount - only send on actual changes
    if (!hasInitialized.current) {
      if (Object.keys(userProgress).length > 0 || problems.length > 0) {
        hasInitialized.current = true;
      }
      return;
    }

    // Only send if we have both the endpoint configured and problems loaded
    if (settings.snapshotApiEndpoint && settings.snapshotApiKey && problems.length > 0) {
      debouncedSendSnapshot(settings, problems, userProgress);
    }
  }, [userProgress, settings, problems]);

  // Calculate daily queue: due reviews + new cards from dailyQueueData
  const dailyQueue = useMemo(() => {
    const now = Date.now();
    
    // Get problems that are due for review
    const reviewProblems: Array<{ problem: LeetCodeProblem; progress: ProblemProgress }> = [];
    
    for (const problem of problems) {
      const progress = userProgress[problem.id];
      if (progress && progress.nextReview <= now) {
        reviewProblems.push({ problem, progress });
      }
    }
    
    // Sort review problems by priority:
    // 1. Most overdue first (oldest nextReview)
    // 2. Then by lowest EF (struggling cards)
    reviewProblems.sort((a, b) => {
      const overdueA = a.progress.nextReview - now;
      const overdueB = b.progress.nextReview - now;
      
      const DAY_MS = 24 * 60 * 60 * 1000;
      if (Math.abs(overdueA - overdueB) < DAY_MS) {
        return a.progress.easinessFactor - b.progress.easinessFactor;
      }
      
      return overdueA - overdueB;
    });
    
    // Get new cards from daily queue data (that are still new/unreviewed)
    const newCardsInQueue = dailyQueueData.newCardIds
      .filter(id => !userProgress[id]) // Still new (not reviewed yet)
      .map(id => problems.find(p => p.id === id))
      .filter((p): p is LeetCodeProblem => p !== undefined);
    
    // Combine: reviews first, then new cards
    const result = [
      ...reviewProblems.map(r => r.problem),
      ...newCardsInQueue,
    ];
    
    console.log(`Daily queue: ${reviewProblems.length} reviews, ${newCardsInQueue.length} new cards (limit: ${settings.newCardsPerDay})`);
    
    return result;
  }, [problems, userProgress, dailyQueueData, settings.newCardsPerDay]);

  // Compute "More Problems" - actionable problems not in the daily queue
  const moreProblems = useMemo(() => {
    const now = Date.now();
    const dailyQueueIds = new Set(dailyQueue.map(p => p.id));
    
    return problems.filter(problem => {
      // Skip if already in daily queue
      if (dailyQueueIds.has(problem.id)) return false;
      
      const progress = userProgress[problem.id];
      // Include if new (no progress) or due for review
      return !progress || progress.nextReview <= now;
    });
  }, [problems, userProgress, dailyQueue]);

  // Compute "Reviewed Problems" - problems with progress that are not due
  const reviewedProblems = useMemo(() => {
    const now = Date.now();
    // Sort by next review date (soonest first) to group by due date
    return problems
      .filter(problem => {
        const progress = userProgress[problem.id];
        return progress && progress.nextReview > now;
      })
      .sort((a, b) => {
        const progA = userProgress[a.id];
        const progB = userProgress[b.id];
        return progA.nextReview - progB.nextReview;
      });
  }, [problems, userProgress]);

  // Get leech problems
  const leechProblems = useMemo(() => {
    return problems.filter(problem => {
      const progress = userProgress[problem.id];
      return progress?.isLeech === true;
    });
  }, [problems, userProgress]);

  // Submit review for a problem
  const submitReview = useCallback((problemId: number, quality: number) => {
    const currentProgress = userProgress[problemId];
    
    // Save current state for undo before making changes
    const historyEntry: ReviewHistoryEntry = {
      problemId,
      previousProgress: currentProgress ? { ...currentProgress } : null,
      timestamp: Date.now(),
    };
    
    // Initialize if this is the first review
    const sm2Params: SM2Params = currentProgress 
      ? {
          iterations: currentProgress.iterations,
          easinessFactor: currentProgress.easinessFactor,
          interval: currentProgress.interval,
          lapseCount: currentProgress.lapseCount ?? 0,
        }
      : initSM2();

    // Update SM-2 parameters
    const updated = updateSM2(sm2Params, quality);
    
    // Apply fuzz factor to prevent review clustering
    const fuzzedInterval = applyFuzzFactor(updated.interval);

    // Calculate next review date aligned to midnight (start of day)
    const now = Date.now();
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(fuzzedInterval));
    nextReviewDate.setHours(0, 0, 0, 0);
    const nextReview = nextReviewDate.getTime();

    const newProgress: ProblemProgress = {
      iterations: updated.iterations,
      easinessFactor: updated.easinessFactor,
      interval: updated.interval, // Store the un-fuzzed interval for display
      lapseCount: updated.lapseCount,
      isLeech: updated.isLeech,
      lastReviewed: now,
      nextReview,
    };

    // Update state and localStorage
    setUserProgress(prev => {
      const updatedProgress = { ...prev, [problemId]: newProgress };
      saveUserProgress(updatedProgress);
      return updatedProgress;
    });
    
    // Add to undo history (limit to MAX_UNDO_HISTORY entries)
    setUndoHistory(prev => {
      const newHistory = [historyEntry, ...prev].slice(0, MAX_UNDO_HISTORY);
      return newHistory;
    });
    
    updateProblemProgress(problemId, newProgress);
    console.log(`Review submitted for problem ${problemId} with quality ${quality}:`, {
      ...newProgress,
      fuzzedInterval,
      originalInterval: updated.interval,
    });
  }, [userProgress]);

  // Undo the last review
  const undoLastReview = useCallback((): boolean => {
    if (undoHistory.length === 0) {
      console.log('No reviews to undo');
      return false;
    }
    
    const [lastReview, ...remainingHistory] = undoHistory;
    const { problemId, previousProgress } = lastReview;
    
    setUserProgress(prev => {
      const updated = { ...prev };
      
      if (previousProgress === null) {
        // This was the first review - remove progress entirely
        delete updated[problemId];
        console.log(`Undo: Removed progress for problem ${problemId} (was first review)`);
      } else {
        // Restore previous progress
        updated[problemId] = previousProgress;
        console.log(`Undo: Restored progress for problem ${problemId}:`, previousProgress);
      }
      
      saveUserProgress(updated);
      return updated;
    });
    
    setUndoHistory(remainingHistory);
    return true;
  }, [undoHistory]);

  // Clear all user progress
  const clearAllProgress = useCallback(() => {
    setUserProgress({});
    saveUserProgress({});
    setUndoHistory([]);
    // Reset daily queue
    const freshQueue = stateManager.getDefaultDailyQueue();
    setDailyQueueData(freshQueue);
    saveDailyQueue(freshQueue);
    console.log('Cleared all user progress and daily queue');
  }, []);

  // Reload all state from localStorage (useful after importing state)
  const reloadState = useCallback(() => {
    const storedProblems = loadProblems();
    handleSetProblems(storedProblems);
    
    const progress = loadUserProgress();
    setUserProgress(progress);
    
    const queueData = loadDailyQueue();
    setDailyQueueData(queueData);
    
    const loadedSettings = stateManager.loadSettings();
    setSettings(loadedSettings);
    
    setUndoHistory([]); // Clear undo history on reload
    
    console.log('Reloaded all state from localStorage');
  }, [handleSetProblems]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      stateManager.saveSettings(updated);
      console.log('Settings updated:', updated);
      return updated;
    });
  }, []);

  // Remove a new problem from today's queue (move back to "New Problems")
  const removeFromDailyQueue = useCallback((problemId: number) => {
    // Only allow removing NEW cards (not due reviews)
    if (!dailyQueueData.newCardIds.includes(problemId)) {
      console.log(`Problem ${problemId} is not a new card in today's queue, cannot remove`);
      return;
    }
    
    const newData = {
      ...dailyQueueData,
      newCardIds: dailyQueueData.newCardIds.filter(id => id !== problemId),
      // Add to skipped list so it won't be re-added today
      skippedCardIds: [...(dailyQueueData.skippedCardIds || []), problemId],
    };
    setDailyQueueData(newData);
    saveDailyQueue(newData);
    console.log(`Removed problem ${problemId} from daily queue (skipped for today)`);
  }, [dailyQueueData]);

  return (
    <AppContext.Provider
      value={{
        problems,
        userProgress,
        dailyQueue,
        dailyQueueNewCardIds: dailyQueueData.newCardIds,
        moreProblems,
        reviewedProblems,
        submitReview,
        undoLastReview,
        canUndo: undoHistory.length > 0,
        isLoading,
        setProblems: handleSetProblems,
        clearAllProgress,
        leechProblems,
        reloadState,
        settings,
        updateSettings,
        removeFromDailyQueue,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
