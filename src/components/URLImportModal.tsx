import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { stateManager } from '../utils/stateManager';

interface URLImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  encodedData: string;
}

export function URLImportModal({ isOpen, onClose, onImport, encodedData }: URLImportModalProps) {
  const { userProgress, reloadState } = useApp();
  const [error, setError] = useState<string | null>(null);

  // Reset error when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const reviewedProblemsCount = Object.keys(userProgress).length;

  const handleConfirm = () => {
    try {
      // Decode base64 data
      let decodedData: string;
      try {
        decodedData = decodeURIComponent(atob(encodedData));
      } catch (e) {
        throw new Error('Invalid URL data format. The import link may be corrupted.');
      }

      // Import state
      stateManager.importState(decodedData);
      reloadState();
      
      // Close modal and call onImport callback
      onImport();
      onClose();
      
      console.log('State imported successfully from URL');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import state from URL';
      setError(errorMessage);
      console.error('Error importing state from URL:', err);
    }
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
              Import State from URL
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
              <p className="text-yellow-300 font-medium mb-2">
                Overwrite Existing Progress?
              </p>
              <p className="text-sm text-gray-400 mb-4">
                This will replace all your current progress, problems, and queue data with the imported state.
                {reviewedProblemsCount > 0 && (
                  <span className="block mt-2 text-yellow-400">
                    You currently have {reviewedProblemsCount} {reviewedProblemsCount === 1 ? 'problem' : 'problems'} with progress.
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                This action cannot be undone.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Import & Overwrite
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
