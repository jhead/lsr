import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CloudUpload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FileUploadModal } from './FileUploadModal';
import { getUnifiedProblemList, groupProblemsBySection } from '../utils/problemUtils';
import type { ProblemSection } from '../utils/problemUtils';

interface ProblemListProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Unified ProblemList component that displays all problems in a single scrollable list
 * with section headers (Today's Queue, Review Soon, Review Later, New Problems).
 */
export function ProblemList({ isOpen = true, onClose }: ProblemListProps) {
  const { problems, userProgress, dailyQueue } = useApp();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Extract problem ID from URL path
  const match = location.pathname.match(/\/problem\/(\d+)/);
  const currentProblemId = match ? parseInt(match[1], 10) : null;
  
  // Refs for scrolling to active problem
  const problemItemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const sidebarRef = useRef<HTMLDivElement>(null);

  const difficultyColors = {
    Easy: 'bg-green-900/30 text-green-400',
    Medium: 'bg-yellow-900/30 text-yellow-400',
    Hard: 'bg-red-900/30 text-red-400',
  };

  const getDifficultyLetter = (difficulty: 'Easy' | 'Medium' | 'Hard'): string => {
    return difficulty[0]; // E, M, or H
  };

  // Build daily queue ID set
  const dailyQueueIds = useMemo(() => {
    return new Set(dailyQueue.map(p => p.id));
  }, [dailyQueue]);

  // Get unified problem list with sections
  const unifiedList = useMemo(() => {
    return getUnifiedProblemList(problems, userProgress, dailyQueueIds);
  }, [problems, userProgress, dailyQueueIds]);

  // Group by section for rendering
  const sectionGroups = useMemo(() => {
    // Filter by search first
    let filtered = unifiedList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = unifiedList.filter(item => {
        const idMatch = item.problem.id.toString().includes(query);
        const titleMatch = item.problem.title.toLowerCase().includes(query);
        return idMatch || titleMatch;
      });
    }
    return groupProblemsBySection(filtered);
  }, [unifiedList, searchQuery]);

  // Count problems in today's queue for header
  const todayCount = useMemo(() => {
    return unifiedList.filter(p => p.section === 'today').length;
  }, [unifiedList]);

  const handleProblemClick = useCallback((problemId: number) => {
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
  }, [currentProblemId, onClose]);

  // Scroll to active problem when it changes
  useEffect(() => {
    if (!currentProblemId || !sidebarRef.current) return;
    
    const problemItem = problemItemRefs.current.get(currentProblemId);
    if (problemItem) {
      problemItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentProblemId]);

  // Get badge styling based on section and badge text
  const getBadgeStyle = (section: ProblemSection, badge: string): string => {
    if (badge === 'New') {
      return 'text-blue-400';
    }
    if (section === 'today') {
      // Overdue or due today
      if (badge.includes('ago') || badge === 'Due') {
        return 'text-red-400 font-medium';
      }
    }
    return 'text-gray-500';
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`fixed md:static inset-y-0 left-0 w-80 bg-black border-r border-gray-800 h-screen overflow-y-auto z-40 md:z-auto transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
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
            <span className="text-xs text-gray-400">
              {todayCount > 0 ? (
                <span className="text-amber-400">{todayCount} due today</span>
              ) : (
                <span className="text-green-400">All caught up!</span>
              )}
            </span>
          </div>
          
          {/* Search */}
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

        {/* Problem List with Sections */}
        <nav className="pb-4">
          {sectionGroups.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500 italic">
              {searchQuery ? 'No matches found' : 'No problems loaded'}
            </p>
          ) : (
            sectionGroups.map(({ section, label, problems: sectionProblems }) => (
              <div key={section} className="mt-2">
                {/* Section Header */}
                <div className="sticky top-0 bg-black/95 backdrop-blur-sm px-5 py-2 border-b border-gray-800/50">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                    <span className="ml-2 text-gray-500 font-normal">
                      ({sectionProblems.length})
                    </span>
                  </h3>
                </div>
                
                {/* Problems in Section */}
                <ul className="px-2 py-1">
                  {sectionProblems.map(({ problem, badge, section: itemSection }) => {
                    const isActive = currentProblemId === problem.id;
                    
                    return (
                      <li 
                        key={problem.id}
                        ref={(el) => {
                          if (el) {
                            problemItemRefs.current.set(problem.id, el);
                          } else {
                            problemItemRefs.current.delete(problem.id);
                          }
                        }}
                      >
                        <Link
                          to={`/problem/${problem.id}`}
                          onClick={() => handleProblemClick(problem.id)}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors no-underline focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-0 ${
                            isActive
                              ? 'bg-gray-800 text-white font-medium ring-1 ring-gray-600'
                              : 'text-gray-300 hover:bg-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-8 text-right flex-shrink-0 tabular-nums">
                              {problem.id}
                            </span>
                            
                            <span className="font-medium truncate flex-1 min-w-0">
                              {problem.title}
                            </span>
                            
                            {/* Badge: Due time or "New" */}
                            <span className={`text-xs flex-shrink-0 tabular-nums ${getBadgeStyle(itemSection, badge)}`}>
                              {badge}
                            </span>
                            
                            <span
                              className={`px-1 py-0.5 rounded text-xs font-medium w-5 text-center flex-shrink-0 ${difficultyColors[problem.difficulty]}`}
                            >
                              {getDifficultyLetter(problem.difficulty)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>
      </div>
      
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
}
