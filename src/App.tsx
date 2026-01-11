import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { DailyQueue } from './components/DailyQueue';
import { ProblemSidebar } from './components/ProblemSidebar';
import { ReviewedProblemsSidebar } from './components/ReviewedProblemsSidebar';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReviewedSidebarOpen, setIsReviewedSidebarOpen] = useState(true);

  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="flex h-screen bg-black overflow-hidden">
            {isSidebarOpen && <ProblemSidebar />}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
              {/* Left sidebar toggle button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`fixed top-4 z-20 p-2 rounded-lg bg-gray-900 border border-gray-800 shadow-md text-gray-400 hover:bg-gray-800 transition-all ${
                  isSidebarOpen ? 'left-[21rem]' : 'left-4'
                }`}
                aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </button>
              {/* Right sidebar toggle button */}
              <button
                onClick={() => setIsReviewedSidebarOpen(!isReviewedSidebarOpen)}
                className={`fixed top-4 z-20 p-2 rounded-lg bg-gray-900 border border-gray-800 shadow-md text-gray-400 hover:bg-gray-800 transition-all ${
                  isReviewedSidebarOpen ? 'right-[21rem]' : 'right-4'
                }`}
                aria-label={isReviewedSidebarOpen ? 'Hide reviewed sidebar' : 'Show reviewed sidebar'}
                title={isReviewedSidebarOpen ? 'Hide reviewed sidebar' : 'Show reviewed sidebar'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </button>
              <Routes>
                <Route path="/" element={<DailyQueue />} />
                <Route path="/problem/:problemId" element={<DailyQueue />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            {isReviewedSidebarOpen && <ReviewedProblemsSidebar />}
          </div>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
