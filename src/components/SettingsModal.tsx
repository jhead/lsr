import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { clearAllProgress, userProgress } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset confirm state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
    }
  }, [isOpen]);

  const reviewedProblemsCount = Object.keys(userProgress).length;

  const handleClearAllClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmClear = () => {
    clearAllProgress();
    setShowConfirm(false);
    onClose();
  };

  const handleCancelClear = () => {
    setShowConfirm(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">
              Settings
            </h2>
          </div>

          {!showConfirm ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Data Management
                </h3>
                <button
                  onClick={handleClearAllClick}
                  disabled={reviewedProblemsCount === 0}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    reviewedProblemsCount === 0
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                      : 'bg-red-900/30 text-red-300 border border-red-800/50 hover:bg-red-900/50'
                  }`}
                >
                  Clear All Progress
                </button>
                {reviewedProblemsCount > 0 && (
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    {reviewedProblemsCount} {reviewedProblemsCount === 1 ? 'problem' : 'problems'} with progress
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-red-300 font-medium mb-2">
                  Clear All Progress?
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  This will permanently delete all review progress. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmClear}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleCancelClear}
                    className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showConfirm && (
            <button
              onClick={onClose}
              className="mt-6 w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
