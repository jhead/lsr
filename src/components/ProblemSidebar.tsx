import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FileUploadModal } from './FileUploadModal';

export function ProblemSidebar() {
  const { dueProblems } = useApp();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
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

  // Filter problems based on search query
  const filteredProblems = dueProblems.filter((problem) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const idMatch = problem.id.toString().includes(query);
    const titleMatch = problem.title.toLowerCase().includes(query);
    return idMatch || titleMatch;
  });

  return (
    <>
      <div className="w-80 bg-black border-r border-gray-800 h-screen overflow-y-auto">
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </button>
            </div>
            <span className="ml-2 text-xs text-gray-400">
              {filteredProblems.length} {filteredProblems.length === 1 ? 'problem' : 'problems'} {searchQuery ? 'found' : ''}
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
      <nav className="p-2">
        <ul className="space-y-1">
          {filteredProblems.map((problem) => {
            const isActive = currentProblemId === problem.id;
            return (
              <li key={problem.id}>
                <Link
                  to={`/problem/${problem.id}`}
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
      </nav>
    </div>
    <FileUploadModal
      isOpen={isUploadModalOpen}
      onClose={() => setIsUploadModalOpen(false)}
    />
    </>
  );
}
