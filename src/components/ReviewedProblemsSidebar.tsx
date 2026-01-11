import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

type ProblemWithProgress = {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  progress: {
    nextReview: number;
  };
};

export function ReviewedProblemsSidebar() {
  const { problems, userProgress } = useApp();
  const location = useLocation();
  
  // Extract problem ID from URL path
  const match = location.pathname.match(/\/problem\/(\d+)/);
  const currentProblemId = match ? parseInt(match[1], 10) : null;

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

  // Sort problems within each group by next review date
  Object.keys(groupedProblems).forEach((key) => {
    groupedProblems[key].sort((a, b) => a.progress.nextReview - b.progress.nextReview);
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

  return (
    <div className="w-80 bg-black border-l border-gray-800 h-screen overflow-y-auto">
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
                    <li key={problem.id}>
                      <Link
                        to={`/problem/${problem.id}`}
                        onClick={() => {
                          // Dispatch event to trigger transition before navigation
                          window.dispatchEvent(new Event('problem-navigation-start'));
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
