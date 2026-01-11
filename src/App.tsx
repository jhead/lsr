import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { DailyQueue } from './components/DailyQueue';
import { ProblemSidebar } from './components/ProblemSidebar';
import { ReviewedProblemsSidebar } from './components/ReviewedProblemsSidebar';

function App() {
  // On desktop (md and up), sidebars are open by default. On mobile, closed by default.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReviewedSidebarOpen, setIsReviewedSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile and close sidebars by default
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsReviewedSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
        setIsReviewedSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter basename="/lsr/">
          <div className="flex h-screen bg-black overflow-hidden">
            {/* Mobile backdrop for left sidebar */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            {/* Mobile backdrop for right sidebar */}
            {isReviewedSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setIsReviewedSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            {/* On desktop, conditionally render. On mobile, always render with overlay styling. */}
            {(isSidebarOpen || isMobile) && (
              <ProblemSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
              {/* Left sidebar toggle button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="fixed top-4 left-4 md:left-4 z-40 p-2 rounded-lg bg-gray-900 border border-gray-800 shadow-md text-gray-400 hover:bg-gray-800 transition-all md:z-20"
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
                className="fixed top-4 right-4 md:right-4 z-40 p-2 rounded-lg bg-gray-900 border border-gray-800 shadow-md text-gray-400 hover:bg-gray-800 transition-all md:z-20"
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
            {/* On desktop, conditionally render. On mobile, always render with overlay styling. */}
            {(isReviewedSidebarOpen || isMobile) && (
              <ReviewedProblemsSidebar isOpen={isReviewedSidebarOpen} onClose={() => setIsReviewedSidebarOpen(false)} />
            )}
          </div>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
