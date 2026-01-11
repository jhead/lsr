import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ProblemCard } from './ProblemCard';
import { FileUpload } from './FileUpload';

export function DailyQueue() {
  const { problems, dueProblems, isLoading } = useApp();
  const { problemId } = useParams<{ problemId?: string }>();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Find current problem index based on URL or default to first
  const currentIndex = problemId
    ? dueProblems.findIndex((p) => p.id === parseInt(problemId, 10))
    : 0;
  
  const effectiveIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentProblem = dueProblems[effectiveIndex];

  // Navigate to problem URL
  const navigateToProblem = useCallback((index: number) => {
    if (index >= 0 && index < dueProblems.length) {
      navigate(`/problem/${dueProblems[index].id}`);
    }
  }, [dueProblems, navigate]);

  // Navigate to first problem if no problemId in URL and we have problems
  useEffect(() => {
    if (!problemId && dueProblems.length > 0) {
      navigate(`/problem/${dueProblems[0].id}`, { replace: true });
    }
  }, [problemId, dueProblems, navigate]);

  const handlePrevious = useCallback(() => {
    if (effectiveIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      // Wait for fade-out animation (300ms), then navigate
      setTimeout(() => {
        navigateToProblem(effectiveIndex - 1);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    }
  }, [effectiveIndex, isTransitioning, navigateToProblem]);

  const handleNext = useCallback(() => {
    if (effectiveIndex < dueProblems.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      // Wait for fade-out animation (300ms), then navigate
      setTimeout(() => {
        navigateToProblem(effectiveIndex + 1);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    }
  }, [effectiveIndex, dueProblems.length, isTransitioning, navigateToProblem]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black h-full">
        <div className="text-lg text-gray-400">Loading problems...</div>
      </div>
    );
  }

  // Show file upload if no problems are loaded
  if (problems.length === 0) {
    return <FileUpload />;
  }

  const isFirst = effectiveIndex === 0;
  const isLast = effectiveIndex === dueProblems.length - 1;

  if (!currentProblem && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black h-full">
        <div className="text-lg text-gray-400">Problem not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-black py-8 px-4 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Leetcode Spaced Repetition
          </h1>
          {dueProblems.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handlePrevious}
                disabled={isFirst || isTransitioning}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                  isFirst || isTransitioning
                    ? 'border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white'
                }`}
                aria-label="Previous problem"
                title="Previous problem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                onClick={handleNext}
                disabled={isLast || isTransitioning}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                  isLast || isTransitioning
                    ? 'border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white'
                }`}
                aria-label="Next problem"
                title="Next problem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {dueProblems.length === 0 ? (
          <div className="bg-gray-900 rounded-lg shadow-md p-8 text-center border border-gray-800">
            <p className="text-lg text-gray-400">
              🎉 No problems due for review today!
            </p>
          </div>
        ) : (
          <div>
            {/* Current problem with transition */}
            <div className="relative">
              <div
                key={currentProblem?.id}
                className={`transition-all duration-300 ${
                  isTransitioning
                    ? 'opacity-0 blur-sm scale-95'
                    : 'opacity-100 blur-0 scale-100'
                }`}
              >
                {currentProblem && (
                  <ProblemCard
                    problem={currentProblem}
                    currentIndex={effectiveIndex}
                    totalCount={dueProblems.length}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
