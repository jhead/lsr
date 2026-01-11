import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { LeetCodeProblem, UserProgress } from '../types';
import { loadUserProgress, saveUserProgress, updateProblemProgress, loadProblems, saveProblems } from '../utils/storage';
import { updateSM2, initSM2 } from '../utils/sm2';
import type { SM2Params } from '../utils/sm2';

interface AppContextType {
  problems: LeetCodeProblem[];
  userProgress: UserProgress;
  dueProblems: LeetCodeProblem[];
  submitReview: (problemId: number, quality: number) => void;
  isLoading: boolean;
  setProblems: (problems: LeetCodeProblem[]) => void;
  clearAllProgress: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [problems, setProblems] = useState<LeetCodeProblem[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [isLoading, setIsLoading] = useState(true);

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

  // Calculate due problems (problems where nextReview <= current time)
  const dueProblems = useMemo(() => {
    const now = Date.now();
    return problems.filter(problem => {
      const progress = userProgress[problem.id];
      if (!progress) {
        // If no progress exists, problem is due
        return true;
      }
      return progress.nextReview <= now;
    });
  }, [problems, userProgress]);

  // Submit review for a problem
  const submitReview = useCallback((problemId: number, quality: number) => {
    const currentProgress = userProgress[problemId];
    
    // Initialize if this is the first review
    const sm2Params: SM2Params = currentProgress 
      ? {
          iterations: currentProgress.iterations,
          easinessFactor: currentProgress.easinessFactor,
          interval: currentProgress.interval,
        }
      : initSM2();

    // Update SM-2 parameters
    const updated = updateSM2(sm2Params, quality);
    
    // Calculate next review date (current time + interval days in milliseconds)
    const now = Date.now();
    const intervalMs = updated.interval * 24 * 60 * 60 * 1000;
    const nextReview = now + intervalMs;

    const newProgress = {
      ...updated,
      lastReviewed: now,
      nextReview,
    };

    // Update state and localStorage
    setUserProgress(prev => {
      const updated = { ...prev, [problemId]: newProgress };
      saveUserProgress(updated);
      return updated;
    });
    
    updateProblemProgress(problemId, newProgress);
    console.log(`Review submitted for problem ${problemId} with quality ${quality}:`, newProgress);
  }, [userProgress]);

  // Clear all user progress
  const clearAllProgress = useCallback(() => {
    setUserProgress({});
    saveUserProgress({});
    console.log('Cleared all user progress');
  }, []);

  return (
    <AppContext.Provider
      value={{
        problems,
        userProgress,
        dueProblems,
        submitReview,
        isLoading,
        setProblems: handleSetProblems,
        clearAllProgress,
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
