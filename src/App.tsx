import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { DailyQueue } from './components/DailyQueue';
import { ProblemList } from './components/ProblemList';
import { URLImportHandler } from './components/URLImportHandler';

function AppContent() {
  // On desktop (md and up), sidebar is open by default. On mobile, closed by default.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile and close sidebar by default
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <HashRouter>
          <div className="flex h-screen bg-black overflow-hidden">
            {/* Mobile backdrop for sidebar */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            {/* Unified ProblemList sidebar - On desktop, conditionally render. On mobile, always render with overlay styling. */}
            {(isSidebarOpen || isMobile) && (
              <ProblemList isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}
            <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
              {/* Sidebar toggle button - hidden on mobile when sidebar is open */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`fixed top-4 left-4 z-40 p-2 rounded-lg bg-gray-900 border border-gray-800 shadow-md text-gray-400 hover:bg-gray-800 transition-all md:z-20 ${
                  isSidebarOpen ? 'md:left-[21rem] hidden md:block' : 'md:left-4'
                }`}
                aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <Menu className="w-5 h-5" />
              </button>
              <Routes>
                <Route path="/" element={<DailyQueue />} />
                <Route path="/problem/:problemId" element={<DailyQueue />} />
                <Route path="/import/:data" element={<URLImportHandler />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </HashRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
