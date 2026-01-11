import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ProblemCard } from './ProblemCard';
import { FileUploadModal } from './FileUploadModal';
import { SettingsModal } from './SettingsModal';
import type { LeetCodeProblem } from '../types';

export function DailyQueue() {
  const { problems, dailyQueue, moreProblems, reviewedProblems, isLoading, submitReview, undoLastReview, canUndo } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { problemId } = useParams<{ problemId?: string }>();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousProblemIdRef = useRef<string | undefined>(problemId);

  // 1. Determine the Current Problem
  // -------------------------------
  const problemIdInt = problemId ? parseInt(problemId, 10) : null;
  
  let currentProblem: LeetCodeProblem | undefined;
  let activeList: LeetCodeProblem[] = [];
  let activeListType: 'daily' | 'more' | 'reviewed' | 'all' = 'daily';
  let activeIndex = -1;

  if (problemIdInt) {
    // Priority: Daily Queue -> More Problems -> Reviewed -> All
    
    // 1. Daily Queue
    const inQueue = dailyQueue.find(p => p.id === problemIdInt);
    if (inQueue) {
      currentProblem = inQueue;
      activeList = dailyQueue;
      activeListType = 'daily';
      activeIndex = dailyQueue.findIndex(p => p.id === problemIdInt);
    } 
    // 2. More Problems
    else {
      const inMore = moreProblems.find(p => p.id === problemIdInt);
      if (inMore) {
        currentProblem = inMore;
        activeList = moreProblems;
        activeListType = 'more';
        activeIndex = moreProblems.findIndex(p => p.id === problemIdInt);
      }
      // 3. Reviewed Problems
      else {
        const inReviewed = reviewedProblems.find(p => p.id === problemIdInt);
        if (inReviewed) {
          currentProblem = inReviewed;
          activeList = reviewedProblems;
          activeListType = 'reviewed';
          activeIndex = reviewedProblems.findIndex(p => p.id === problemIdInt);
        }
        // 4. Fallback to all (should be rare given coverage above)
        else {
          const inAll = problems.find(p => p.id === problemIdInt);
          if (inAll) {
            currentProblem = inAll;
            activeList = problems; 
            activeListType = 'all';
            activeList = []; // Disable navigation for random access
            activeIndex = -1;
          }
        }
      }
    }
  } else {
    // Default to first item in Daily Queue
    if (dailyQueue.length > 0) {
      currentProblem = dailyQueue[0];
      activeList = dailyQueue;
      activeListType = 'daily';
      activeIndex = 0;
    }
  }

  // 2. Navigation Helpers
  // ---------------------
  const navigateToId = useCallback((id: number) => {
    navigate(`/problem/${id}`);
  }, [navigate]);

  // Calculate Next Problem ID (including cross-list navigation)
  const calculateNextProblemId = useCallback((): number | null => {
    if (activeList.length === 0) return null;

    if (activeIndex < activeList.length - 1) {
      // Go to next item in current list
      return activeList[activeIndex + 1].id;
    } 
    
    // At end of list - handle transitions
    if (activeListType === 'daily' && moreProblems.length > 0) {
      // Daily Queue -> More Problems
      return moreProblems[0].id;
    }
    
    if (activeListType === 'more' && dailyQueue.length > 0) {
      // More Problems -> Daily Queue (wrap)
      return dailyQueue[0].id;
    }

    // Default wrap behavior within same list if no other list available
    // or if in 'reviewed' list (which loops)
    if (activeList.length > 0) {
      return activeList[0].id;
    }

    return null;
  }, [activeList, activeListType, activeIndex, dailyQueue, moreProblems]);

  // Calculate Previous Problem ID (including cross-list navigation)
  const calculatePrevProblemId = useCallback((): number | null => {
    if (activeList.length === 0) return null;

    if (activeIndex > 0) {
      // Go to prev item in current list
      return activeList[activeIndex - 1].id;
    }

    // At start of list - handle transitions
    if (activeListType === 'more' && dailyQueue.length > 0) {
      // More Problems -> Daily Queue (last item)
      return dailyQueue[dailyQueue.length - 1].id;
    }

    if (activeListType === 'daily' && moreProblems.length > 0) {
      // Daily Queue -> More Problems (last item - wrap backwards)
      return moreProblems[moreProblems.length - 1].id;
    }

    // Default wrap behavior within same list
    if (activeList.length > 0) {
      return activeList[activeList.length - 1].id;
    }

    return null;
  }, [activeList, activeListType, activeIndex, dailyQueue, moreProblems]);

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
  
  // Default redirect if nothing selected
  useEffect(() => {
    if (!problemId && dailyQueue.length > 0) {
      navigate(`/problem/${dailyQueue[0].id}`, { replace: true });
    }
  }, [problemId, dailyQueue, navigate]);

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

      // Quality keys 0-5
      // Prevent rapid submitting while transitioning to avoid race conditions
      if (event.key >= '0' && event.key <= '5' && currentProblem && !isTransitioning) {
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
  // Show if: No ID selected (and queue empty) OR ID selected but not found
  if ((!problemId && dailyQueue.length === 0) || (problemId && !currentProblem)) {
    return (
      <div className="flex-1 bg-black pt-14 md:pt-4 pb-4 md:pb-8 px-2 md:px-4 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg shadow-md p-8 text-center border border-gray-800">
            <p className="text-lg text-gray-400">
              {dailyQueue.length === 0 ? "🎉 No problems due for review today!" : "Problem not found"}
            </p>
            {dailyQueue.length === 0 && (
               <div className="space-y-2 mt-2">
                 {moreProblems.length > 0 && (
                   <p className="text-sm text-gray-500">
                     Check "More Problems" in the sidebar for new challenges!
                   </p>
                 )}
                 {reviewedProblems.length > 0 && (
                   <p className="text-sm text-gray-500">
                     Or review your completed problems in the "Reviewed" section.
                   </p>
                 )}
               </div>
            )}
          </div>
          
          {/* Footer for this state */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-3">
               {canUndo && (
                <button onClick={undoLastReview} className="text-xs text-amber-500 flex items-center gap-1">
                   Undo
                </button>
               )}
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
                 currentIndex={activeListType !== 'all' ? activeIndex : undefined}
                 totalCount={activeListType !== 'all' ? activeList.length : undefined}
                 onReviewSubmitted={handleReview}
               />
             )}
           </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-3">
              {canUndo && (
                <button onClick={undoLastReview} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                  Undo (Z)
                </button>
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
