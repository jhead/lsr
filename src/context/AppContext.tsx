import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { LeetCodeProblem, UserProgress, ProblemProgress, ReviewHistoryEntry } from '../types';
import { loadUserProgress, saveUserProgress, updateProblemProgress, loadProblems, saveProblems } from '../utils/storage';
import { updateSM2, initSM2, applyFuzzFactor } from '../utils/sm2';
import type { SM2Params } from '../utils/sm2';

// Configuration constants
const MAX_UNDO_HISTORY = 10; // Maximum number of reviews to keep for undo
const NEW_CARDS_PER_DAY = 20; // Maximum new cards to introduce per day
const DAILY_QUEUE_KEY = 'lcsr-daily-queue';

interface DailyQueueData {
  date: string; // YYYY-MM-DD format
  newCardIds: number[]; // IDs of new cards added to queue today
}

interface AppContextType {
  problems: LeetCodeProblem[];
  userProgress: UserProgress;
  dailyQueue: LeetCodeProblem[]; // Problems in today's queue (due + new cards)
  moreProblems: LeetCodeProblem[]; // Actionable problems not in daily queue
  reviewedProblems: LeetCodeProblem[]; // Problems already reviewed and not due (review again)
  submitReview: (problemId: number, quality: number) => void;
  undoLastReview: () => boolean; // Returns true if undo was successful
  canUndo: boolean;
  isLoading: boolean;
  setProblems: (problems: LeetCodeProblem[]) => void;
  clearAllProgress: () => void;
  leechProblems: LeetCodeProblem[]; // Problems that are leeches
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
  try {
    const stored = localStorage.getItem(DAILY_QUEUE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as DailyQueueData;
      // Check if it's still today
      if (data.date === getTodayString()) {
        return data;
      }
    }
  } catch (e) {
    console.error('Error loading daily queue:', e);
  }
  // Return fresh queue for today
  return { date: getTodayString(), newCardIds: [] };
}

/**
 * Save daily queue data to localStorage
 */
function saveDailyQueue(data: DailyQueueData): void {
  try {
    localStorage.setItem(DAILY_QUEUE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving daily queue:', e);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [problems, setProblems] = useState<LeetCodeProblem[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Daily queue tracking - persisted in localStorage
  const [dailyQueueData, setDailyQueueData] = useState<DailyQueueData>(() => loadDailyQueue());
  
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

  // Calculate daily queue: due reviews + limited new cards (persisted)
  const dailyQueue = useMemo(() => {
    const now = Date.now();
    
    // Get problems that are due for review
    const reviewProblems: Array<{ problem: LeetCodeProblem; progress: ProblemProgress }> = [];
    const newProblems: LeetCodeProblem[] = [];
    
    for (const problem of problems) {
      const progress = userProgress[problem.id];
      if (!progress) {
        newProblems.push(problem);
      } else if (progress.nextReview <= now) {
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
    
    // Get new cards for today's queue
    // Include any new cards already added to today's queue (that are still new/unreviewed)
    const existingNewCardsInQueue = dailyQueueData.newCardIds
      .filter(id => !userProgress[id]) // Still new (not reviewed yet)
      .map(id => problems.find(p => p.id === id))
      .filter((p): p is LeetCodeProblem => p !== undefined);
    
    // Only add more new cards if we haven't hit the daily limit of ADDED cards
    // (not based on unreviewed cards - once 20 are added, no more for the day)
    const existingIds = new Set(dailyQueueData.newCardIds);
    const additionalNewCards: LeetCodeProblem[] = [];
    const slotsRemaining = NEW_CARDS_PER_DAY - dailyQueueData.newCardIds.length;
    
    for (const problem of newProblems) {
      if (additionalNewCards.length >= slotsRemaining) break;
      if (!existingIds.has(problem.id)) {
        additionalNewCards.push(problem);
      }
    }
    
    // Update daily queue data if we added new cards
    if (additionalNewCards.length > 0) {
      const newIds = [...dailyQueueData.newCardIds, ...additionalNewCards.map(p => p.id)];
      const newData = { ...dailyQueueData, newCardIds: newIds };
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        setDailyQueueData(newData);
        saveDailyQueue(newData);
      }, 0);
    }
    
    // Combine: reviews first, then unreviewed new cards
    const queueNewCards = [...existingNewCardsInQueue, ...additionalNewCards];
    const result = [
      ...reviewProblems.map(r => r.problem),
      ...queueNewCards,
    ];
    
    console.log(`Daily queue: ${reviewProblems.length} reviews, ${queueNewCards.length} new cards (${dailyQueueData.newCardIds.length} total added today)`);
    
    return result;
  }, [problems, userProgress, dailyQueueData]);

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
    
    // Calculate next review date (current time + fuzzed interval days in milliseconds)
    const now = Date.now();
    const intervalMs = fuzzedInterval * 24 * 60 * 60 * 1000;
    const nextReview = now + intervalMs;

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
    const freshQueue = { date: getTodayString(), newCardIds: [] };
    setDailyQueueData(freshQueue);
    saveDailyQueue(freshQueue);
    console.log('Cleared all user progress and daily queue');
  }, []);

  return (
    <AppContext.Provider
      value={{
        problems,
        userProgress,
        dailyQueue,
        moreProblems,
        reviewedProblems,
        submitReview,
        undoLastReview,
        canUndo: undoHistory.length > 0,
        isLoading,
        setProblems: handleSetProblems,
        clearAllProgress,
        leechProblems,
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
