import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

type ProblemWithProgress = {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  progress: {
    nextReview: number;
    easinessFactor: number;
  };
};

interface ReviewedProblemsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ReviewedProblemsSidebar({ isOpen = true, onClose }: ReviewedProblemsSidebarProps) {
  const { problems, userProgress } = useApp();
  const location = useLocation();
  
  // Extract problem ID from URL path
  const match = location.pathname.match(/\/problem\/(\d+)/);
  const currentProblemId = match ? parseInt(match[1], 10) : null;
  
  // Refs for scrolling to active problem
  const problemItemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const sidebarRef = useRef<HTMLDivElement>(null);

  const difficultyColors = {
    Easy: 'bg-green-900/30 text-green-300',
    Medium: 'bg-yellow-900/30 text-yellow-300',
    Hard: 'bg-red-900/30 text-red-300',
  };

  const getDifficultyLetter = (difficulty: 'Easy' | 'Medium' | 'Hard'): string => {
    return difficulty[0]; // E, M, or H
  };

  const formatNextReview = (nextReviewTimestamp: number): string => {
    const now = Date.now();
    const diff = nextReviewTimestamp - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return 'Overdue';
    } else if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Tomorrow';
    } else if (days < 7) {
      return `In ${days}d`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks}w`;
    } else {
      const months = Math.floor(days / 30);
      return `${months}mo`;
    }
  };

  // Filter and group problems by due date
  const reviewedProblems = problems
    .filter((problem) => userProgress[problem.id])
    .map((problem) => ({
      ...problem,
      progress: userProgress[problem.id],
    })) as ProblemWithProgress[];

  // Group problems by formatted due date
  const groupedProblems = reviewedProblems.reduce((groups, problem) => {
    const groupKey = formatNextReview(problem.progress.nextReview);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(problem);
    return groups;
  }, {} as Record<string, ProblemWithProgress[]>);

  // Sort problems within each group
  // For "Overdue" and "Today" groups, use the same sort as Daily Queue (overdue-ness + EF)
  // For future groups, sort by next review date
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  Object.keys(groupedProblems).forEach((key) => {
    if (key === 'Overdue' || key === 'Today') {
      // Match Daily Queue sort: most overdue first, then by lowest EF
      groupedProblems[key].sort((a, b) => {
        const overdueA = a.progress.nextReview - now;
        const overdueB = b.progress.nextReview - now;
        
        if (Math.abs(overdueA - overdueB) < DAY_MS) {
          // Within same day, sort by lowest EF (struggling cards first)
          return a.progress.easinessFactor - b.progress.easinessFactor;
        }
        
        return overdueA - overdueB;
      });
    } else {
      // Future groups: sort by next review date (soonest first)
      groupedProblems[key].sort((a, b) => a.progress.nextReview - b.progress.nextReview);
    }
  });

  // Define group order
  const getGroupOrder = (key: string): number => {
    if (key === 'Overdue') return 0;
    if (key === 'Today') return 1;
    if (key === 'Tomorrow') return 2;
    if (key.startsWith('In ') && key.endsWith('d')) {
      return 3 + parseInt(key.replace('In ', '').replace('d', ''), 10);
    }
    if (key.endsWith('w')) {
      return 10 + parseInt(key.replace('w', ''), 10);
    }
    if (key.endsWith('mo')) {
      return 50 + parseInt(key.replace('mo', ''), 10);
    }
    return 100;
  };

  // Sort groups by order
  const sortedGroupKeys = Object.keys(groupedProblems).sort((a, b) => {
    return getGroupOrder(a) - getGroupOrder(b);
  });

  const totalProblems = reviewedProblems.length;
  
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

  return (
    <div 
      ref={sidebarRef}
      className={`fixed md:static inset-y-0 right-0 w-80 bg-black border-l border-gray-800 h-screen overflow-y-auto z-40 md:z-auto transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      }`}
    >
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-white">
            Reviewed
          </h2>
          <span className="ml-2 text-xs text-gray-400">
            {totalProblems} {totalProblems === 1 ? 'problem' : 'problems'}
          </span>
        </div>
      </div>
      <nav className="p-2">
        {sortedGroupKeys.map((groupKey) => {
          const groupProblems = groupedProblems[groupKey];

          return (
            <div key={groupKey} className="mb-4">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {groupKey}
              </div>
              <ul className="space-y-1 mt-1">
                {groupProblems.map((problem) => {
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
                        to={`/problem/${problem.id}?source=reviewed`}
                        onClick={() => {
                          // Dispatch event to trigger transition before navigation
                          window.dispatchEvent(new Event('problem-navigation-start'));
                          // Close sidebar on mobile after navigation (not on desktop)
                          if (onClose && window.innerWidth < 768) {
                            onClose();
                          }
                        }}
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
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
