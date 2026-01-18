import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CloudUpload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FileUploadModal } from './FileUploadModal';
import type { LeetCodeProblem } from '../types';

interface ProblemSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ProblemSidebar({ isOpen = true, onClose }: ProblemSidebarProps) {
  const { problems, dailyQueue, moreProblems } = useApp();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Extract problem ID from URL path
  const match = location.pathname.match(/\/problem\/(\d+)/);
  const currentProblemId = match ? parseInt(match[1], 10) : null;
  
  // Refs for scrolling to active problem
  const dailyQueueItemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const moreProblemsItemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const sidebarRef = useRef<HTMLDivElement>(null);

  const difficultyColors = {
    Easy: 'bg-green-900/30 text-green-300',
    Medium: 'bg-yellow-900/30 text-yellow-300',
    Hard: 'bg-red-900/30 text-red-300',
  };

  const getDifficultyLetter = (difficulty: 'Easy' | 'Medium' | 'Hard'): string => {
    return difficulty[0]; // E, M, or H
  };

  // Filter functions
  const filterBySearch = (problem: LeetCodeProblem) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const idMatch = problem.id.toString().includes(query);
    const titleMatch = problem.title.toLowerCase().includes(query);
    return idMatch || titleMatch;
  };

  // Daily queue filtered by search
  const filteredDailyQueue = dailyQueue.filter(filterBySearch);

  // More problems filtered by search
  const filteredMoreProblems = moreProblems.filter(filterBySearch);

  const handleProblemClick = (problemId: number) => {
    // If clicking the currently active problem, just close sidebar on mobile
    if (problemId === currentProblemId) {
      if (onClose && window.innerWidth < 768) {
        onClose();
      }
      return;
    }

    // Dispatch event to trigger transition before navigation
    window.dispatchEvent(new Event('problem-navigation-start'));
    // Close sidebar on mobile after navigation (not on desktop)
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  const renderProblemItem = (problem: LeetCodeProblem, isDailyQueue: boolean) => {
    const isActive = currentProblemId === problem.id;
    const refMap = isDailyQueue ? dailyQueueItemRefs : moreProblemsItemRefs;
    
    return (
      <li 
        key={problem.id}
        ref={(el) => {
          if (el) {
            refMap.current.set(problem.id, el);
          } else {
            refMap.current.delete(problem.id);
          }
        }}
      >
        <Link
          to={`/problem/${problem.id}`}
          onClick={() => handleProblemClick(problem.id)}
          className={`block px-3 py-2 rounded-md text-sm transition-colors no-underline focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-0 visited:text-gray-300 ${
            isActive
              ? 'bg-gray-800 text-white font-medium'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12 text-right flex-shrink-0">
              #{problem.id}
            </span>
            <span className="font-medium truncate flex-1 min-w-0">{problem.title}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium w-8 text-center flex-shrink-0 ${difficultyColors[problem.difficulty]}`}
            >
              {getDifficultyLetter(problem.difficulty)}
            </span>
          </div>
        </Link>
      </li>
    );
  };
  
  // Scroll to active problem when it changes
  useEffect(() => {
    if (!currentProblemId || !sidebarRef.current) return;
    
    // Check if problem is in Daily Queue
    const dailyQueueItem = dailyQueueItemRefs.current.get(currentProblemId);
    if (dailyQueueItem) {
      dailyQueueItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
      return;
    }
    
    // Check if problem is in More Problems
    const moreProblemsItem = moreProblemsItemRefs.current.get(currentProblemId);
    if (moreProblemsItem) {
      moreProblemsItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentProblemId]);

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`fixed md:static inset-y-0 left-0 w-80 bg-black border-r border-gray-800 h-screen overflow-y-auto z-40 md:z-auto transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">
                Problems
              </h2>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                title="Replace problem set"
                aria-label="Replace problem set"
              >
                <CloudUpload className="w-4 h-4" />
              </button>
            </div>
            <span className="ml-2 text-xs text-gray-400">
              {problems.length} total
            </span>
          </div>
          <div className="mt-1">
            <input
              type="text"
              placeholder="Search by number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-800 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
            />
          </div>
        </div>

        {/* Daily Queue Section */}
        <div className="border-b border-gray-800">
          <div className="px-5 py-3 bg-gray-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-blue-400">
                Daily Queue
              </h3>
              <span className="text-xs text-gray-500">
                {filteredDailyQueue.length} {searchQuery ? 'found' : 'problems'}
              </span>
            </div>
          </div>
          <nav className="p-2">
            {filteredDailyQueue.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500 italic">
                {searchQuery ? 'No matches' : 'Queue empty — all done!'}
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredDailyQueue.map(problem => renderProblemItem(problem, true))}
              </ul>
            )}
          </nav>
        </div>

        {/* More Problems Section - actionable problems not in daily queue */}
        <div className="border-b border-gray-800">
          <div className="px-5 py-3 bg-gray-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400">
                More Problems
              </h3>
              <span className="text-xs text-gray-500">
                {filteredMoreProblems.length} {searchQuery ? 'found' : 'available'}
              </span>
            </div>
          </div>
          <nav className="p-2">
            {filteredMoreProblems.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500 italic">
                {searchQuery ? 'No matches' : 'All caught up!'}
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredMoreProblems.map(problem => renderProblemItem(problem, false))}
              </ul>
            )}
          </nav>
        </div>

        {/* Reviewed Problems Section - completed problems not due yet - REMOVED per request */}
      </div>
    <FileUploadModal
      isOpen={isUploadModalOpen}
      onClose={() => setIsUploadModalOpen(false)}
    />
    </>
  );
}
