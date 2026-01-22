import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ProblemCard } from './ProblemCard';
import { FileUploadModal } from './FileUploadModal';
import { SettingsModal } from './SettingsModal';
import { getUnifiedProblemList } from '../utils/problemUtils';
import type { LeetCodeProblem } from '../types';

export function DailyQueue() {
  const { problems, dailyQueue, isLoading, submitReview, undoLastReview, canUndo, userProgress, dailyQueueNewCardIds, removeFromDailyQueue } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { problemId } = useParams<{ problemId?: string }>();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousProblemIdRef = useRef<string | undefined>(problemId);

  // Build daily queue ID set for shared sorting logic
  const dailyQueueIds = useMemo(() => new Set(dailyQueue.map(p => p.id)), [dailyQueue]);

  // Build unified list matching ProblemList.tsx order for consistent navigation
  const unifiedList = useMemo(() => {
    return getUnifiedProblemList(problems, userProgress, dailyQueueIds);
  }, [problems, userProgress, dailyQueueIds]);

  // 1. Determine the Current Problem
  // -------------------------------
  const problemIdInt = problemId ? parseInt(problemId, 10) : null;
  
  // Extract just the problems from unifiedList for navigation (same order as ProblemList sidebar)
  const unifiedProblems = useMemo(() => unifiedList.map(item => item.problem), [unifiedList]);
  
  // Determine current problem and active list for navigation
  const { currentProblem, activeList, activeIndex } = useMemo(() => {
    let current: LeetCodeProblem | undefined;
    let active: LeetCodeProblem[] = [];
    let index = -1;

    if (problemIdInt) {
      // Always use unified list for consistent navigation
      const unifiedIndex = unifiedProblems.findIndex(p => p.id === problemIdInt);
      if (unifiedIndex !== -1) {
        current = unifiedProblems[unifiedIndex];
        active = unifiedProblems;
        index = unifiedIndex;
      } else {
        // Fallback if not found
        const inAll = problems.find(p => p.id === problemIdInt);
        if (inAll) {
          current = inAll;
          active = unifiedProblems;
          index = -1;
        }
      }
    } else {
      // Default to first item in unified list (prioritizes due items)
      if (unifiedProblems.length > 0) {
        current = unifiedProblems[0];
        active = unifiedProblems;
        index = 0;
      }
    }

    return { currentProblem: current, activeList: active, activeIndex: index };
  }, [problemIdInt, unifiedProblems, problems]);

  // 2. Navigation Helpers
  // ---------------------
  const navigateToId = useCallback((id: number) => {
    navigate(`/problem/${id}`);
  }, [navigate]);

  // Calculate Next Problem ID
  const calculateNextProblemId = useCallback((): number | null => {
    if (activeList.length === 0) return null;

    if (activeIndex < activeList.length - 1) {
      // Go to next item in list
      return activeList[activeIndex + 1].id;
    } 
    
    // At end of list - wrap to beginning
    return activeList[0].id;
  }, [activeList, activeIndex]);

  // Calculate Previous Problem ID
  const calculatePrevProblemId = useCallback((): number | null => {
    if (activeList.length === 0) return null;

    if (activeIndex > 0) {
      // Go to prev item in list
      return activeList[activeIndex - 1].id;
    }

    // At start of list - wrap to end
    return activeList[activeList.length - 1].id;
  }, [activeList, activeIndex]);

  const handleNext = useCallback(() => {
    const nextId = calculateNextProblemId();
    if (nextId !== null && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        navigateToId(nextId);
        setTimeout(() => setIsTransitioning(false), 25);
      }, 75);
    }
  }, [calculateNextProblemId, isTransitioning, navigateToId]);

  const handlePrevious = useCallback(() => {
    const prevId = calculatePrevProblemId();
    if (prevId !== null && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        navigateToId(prevId);
        setTimeout(() => setIsTransitioning(false), 25);
      }, 75);
    }
  }, [calculatePrevProblemId, isTransitioning, navigateToId]);

  // Fast nav for keyboard (skips transition delay for snappiness)
  const handleKeyboardNext = useCallback(() => {
    const nextId = calculateNextProblemId();
    if (nextId !== null) {
      setIsTransitioning(true);
      navigateToId(nextId);
      setTimeout(() => setIsTransitioning(false), 25);
    }
  }, [calculateNextProblemId, navigateToId]);

  const handleKeyboardPrevious = useCallback(() => {
    const prevId = calculatePrevProblemId();
    if (prevId !== null) {
      setIsTransitioning(true);
      navigateToId(prevId);
      setTimeout(() => setIsTransitioning(false), 25);
    }
  }, [calculatePrevProblemId, navigateToId]);


  // Handle review submission + navigation
  const handleReview = useCallback((quality: number) => {
    if (!currentProblem) return;

    // 1. Calculate Destination (Pre-Update)
    // We navigate to the next logical problem.
    // For 'reviewed' lists, items move, but 'next' implies chronological progression.
    // For 'daily'/'more', items are removed, so 'next' implies the one shifting in or next list.
    // calculateNextProblemId handles these transitions.
    const nextProblemId = calculateNextProblemId();

    // 2. Submit Review (Updates State)
    submitReview(currentProblem.id, quality);

    // 3. Navigate (if target found)
    if (nextProblemId !== null) {
      setIsTransitioning(true);
      // Navigate immediately to the pre-calculated ID
      navigateToId(nextProblemId);
      setTimeout(() => setIsTransitioning(false), 25);
    }
  }, [calculateNextProblemId, currentProblem, submitReview, navigateToId]);


  // 4. Effects
  // ----------
  
  // Default redirect if nothing selected - use unified list order
  useEffect(() => {
    if (!problemId && unifiedProblems.length > 0) {
      navigate(`/problem/${unifiedProblems[0].id}`, { replace: true });
    }
  }, [problemId, unifiedProblems, navigate]);

  // Transition effect
  useEffect(() => {
    const handleNavigationStart = () => setIsTransitioning(true);
    window.addEventListener('problem-navigation-start', handleNavigationStart);
    return () => window.removeEventListener('problem-navigation-start', handleNavigationStart);
  }, []);

  useEffect(() => {
    if (previousProblemIdRef.current !== undefined && previousProblemIdRef.current !== problemId) {
      const timer = setTimeout(() => setIsTransitioning(false), 25);
      return () => clearTimeout(timer);
    }
    previousProblemIdRef.current = problemId;
  }, [problemId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

      // Quality keys 0-5 (only without modifier keys to avoid conflicts with browser shortcuts like CMD+1)
      // Prevent rapid submitting while transitioning to avoid race conditions
      if (event.key >= '0' && event.key <= '5' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && currentProblem && !isTransitioning) {
        event.preventDefault();
        handleReview(parseInt(event.key, 10));
        return;
      }
      
      // Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undoLastReview();
        return;
      }

      // Arrows
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        handleKeyboardPrevious();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleKeyboardNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProblem, undoLastReview, handleKeyboardPrevious, handleKeyboardNext, handleReview, isTransitioning]);


  // 5. Render
  // ---------
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black h-full">
        <div className="text-lg text-gray-400">Loading problems...</div>
      </div>
    );
  }

  if (problems.length === 0) return <FileUploadModal variant="fullpage" />;

  // "No problems" state
  // Show if: No ID selected (and no problems) OR ID selected but not found
  if ((!problemId && unifiedProblems.length === 0) || (problemId && !currentProblem)) {
    // Count due problems for display (problems in "today" section)
    const dueCount = unifiedList.filter(p => p.section === 'today').length;
    
    return (
      <div className="flex-1 bg-black pt-14 md:pt-4 pb-4 md:pb-8 px-2 md:px-4 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg shadow-md p-8 text-center border border-gray-800">
            <p className="text-lg text-gray-400">
              {unifiedProblems.length === 0 
                ? "No problems loaded yet" 
                : dueCount === 0 
                  ? "🎉 No problems due for review today!" 
                  : "Problem not found"}
            </p>
            {unifiedProblems.length === 0 && (
               <p className="text-sm text-gray-500 mt-2">
                 Use the upload button in the sidebar to load problems.
               </p>
            )}
            {unifiedProblems.length > 0 && dueCount === 0 && (
               <p className="text-sm text-gray-500 mt-2">
                 Check the sidebar to explore new problems or review scheduled ones.
               </p>
            )}
          </div>
          
          {/* Footer for this state */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-3">
               <span className="text-xs text-gray-600 font-mono">{__APP_VERSION__.slice(0, 7)}</span>
               {canUndo && (
                <>
                  <span className="text-xs text-gray-600">•</span>
                  <button onClick={undoLastReview} className="text-xs text-amber-500 flex items-center gap-1">
                     Undo
                  </button>
                </>
               )}
               <span className="text-xs text-gray-600">•</span>
               <button onClick={() => setIsSettingsOpen(true)} className="text-xs text-gray-500">Settings</button>
            </div>
          </div>
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // Active Problem State
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= activeList.length - 1;
  const showNavButtons = activeList.length > 1;

  return (
    <div className="flex-1 bg-black pt-14 md:pt-4 pb-4 md:pb-8 px-2 md:px-4 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="md:flex md:items-center md:justify-between md:gap-2">
            <h1 className="text-lg md:text-xl font-bold text-white text-center md:text-left md:truncate">
              Leetcode Spaced Repetition
            </h1>
            
            {/* Desktop Nav */}
            {showNavButtons && (
              <div className="hidden md:flex gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={isFirst || isTransitioning}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                    isFirst || isTransitioning
                      ? 'border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed'
                      : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLast || isTransitioning}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                    isLast || isTransitioning
                      ? 'border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed'
                      : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  →
                </button>
              </div>
            )}
          </div>

           {/* Mobile Nav */}
           {showNavButtons && (
            <div className="flex justify-center gap-2 mt-3 md:hidden">
              <button
                onClick={handlePrevious}
                disabled={isFirst || isTransitioning}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border ${
                    isFirst || isTransitioning ? 'border-gray-800 text-gray-600' : 'border-gray-700 text-gray-300'
                }`}
              >
                ←
              </button>
              <button
                onClick={handleNext}
                disabled={isLast || isTransitioning}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border ${
                    isLast || isTransitioning ? 'border-gray-800 text-gray-600' : 'border-gray-700 text-gray-300'
                }`}
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="relative">
           <div
             key={currentProblem?.id}
             className={`transition-all duration-100 ${
               isTransitioning ? 'opacity-0 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'
             }`}
           >
             {currentProblem && (
               <ProblemCard
                 problem={currentProblem}
                 currentIndex={activeIndex}
                 totalCount={activeList.length}
                 onReviewSubmitted={handleReview}
                 canSkip={dailyQueueNewCardIds.includes(currentProblem.id)}
                 onSkip={() => {
                   const nextId = calculateNextProblemId();
                   removeFromDailyQueue(currentProblem!.id);
                   if (nextId !== null && nextId !== currentProblem!.id) {
                     navigateToId(nextId);
                   }
                 }}
               />
             )}
           </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-xs text-gray-600 font-mono">{__APP_VERSION__.slice(0, 7)}</span>
              {canUndo && (
                <>
                  <span className="text-xs text-gray-600">•</span>
                  <button onClick={undoLastReview} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                    Undo (Z)
                  </button>
                </>
              )}
              <span className="text-xs text-gray-600">•</span>
              <button onClick={() => setIsSettingsOpen(true)} className="text-xs text-gray-500 hover:text-gray-400">Settings</button>
              <span className="text-xs text-gray-600">•</span>
              <a href="https://github.com/jhead" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-400">@jhead</a>
            </div>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
