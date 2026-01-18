import { useState, useEffect, useMemo } from 'react';
import { X, Check, Copy, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { stateManager } from '../utils/stateManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { clearAllProgress, userProgress, problems, reloadState } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [urlCopySuccess, setUrlCopySuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Generate shareable URL (recomputes when problems or userProgress changes)
  const shareUrl = useMemo(() => {
    try {
      const stateJson = stateManager.serialize();
      // Base64 encode the JSON string
      const encoded = btoa(encodeURIComponent(stateJson));
      // Build the URL with hash route
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}#/import/${encoded}`;
    } catch (error) {
      console.error('Error generating share URL:', error);
      return null;
    }
  }, [userProgress, problems]);

  // Check if Web Share API is available
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  // Reset confirm state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
      setPasteText('');
      setImportError(null);
      setImportSuccess(false);
      setCopySuccess(false);
      setUrlCopySuccess(false);
      setShareError(null);
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

  const handleExportState = async () => {
    try {
      const stateJson = stateManager.serialize();
      await navigator.clipboard.writeText(stateJson);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      console.log('State exported to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setImportError('Failed to copy to clipboard. Please try again.');
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const handleImportState = () => {
    if (!pasteText.trim()) {
      setImportError('Please paste state data first');
      return;
    }

    try {
      stateManager.importState(pasteText);
      reloadState();
      setImportSuccess(true);
      setPasteText('');
      setTimeout(() => {
        setImportSuccess(false);
        onClose();
      }, 2000);
      console.log('State imported successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import state';
      setImportError(errorMessage);
      console.error('Error importing state:', error);
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const handleShareUrl = async () => {
    if (!shareUrl) {
      setShareError('Failed to generate share URL');
      return;
    }

    try {
      // Use Web Share API if available (especially on mobile)
      if (canShare) {
        try {
          await navigator.share({
            title: 'LSR Progress Share',
            text: 'Import my LSR (LeetCode Strategy Retention) progress',
            url: shareUrl,
          });
          console.log('Shared via Web Share API');
          return;
        } catch (shareError) {
          // User cancelled or share failed, fall back to clipboard
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Web Share API error:', shareError);
          }
        }
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopySuccess(true);
      setTimeout(() => setUrlCopySuccess(false), 3000);
      console.log('Share URL copied to clipboard');
    } catch (error) {
      console.error('Error sharing URL:', error);
      setShareError('Failed to share URL. Please try again.');
      setTimeout(() => setShareError(null), 5000);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) {
      setShareError('Failed to generate share URL');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopySuccess(true);
      setTimeout(() => setUrlCopySuccess(false), 3000);
      console.log('Share URL copied to clipboard');
    } catch (error) {
      console.error('Error copying URL:', error);
      setShareError('Failed to copy URL. Please try again.');
      setTimeout(() => setShareError(null), 5000);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm md:bg-black/80"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full h-full md:h-auto md:mx-4 md:max-h-[90vh] flex flex-col bg-gray-900 md:rounded-lg md:shadow-md md:border md:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800 md:border-b-0 md:mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors md:hidden"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">

          {!showConfirm ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Import/Export State
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportState}
                    className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-blue-900/30 text-blue-300 border border-blue-800/50 hover:bg-blue-900/50"
                  >
                    {copySuccess ? '✓ Copied to Clipboard!' : 'Copy State to Clipboard'}
                  </button>
                  <p className="text-xs text-gray-500">
                    Export all your data (problems, progress, queue) as JSON
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Share via URL
                  </label>
                  {shareUrl && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 flex items-center justify-center"
                        title="Copy URL"
                      >
                        {urlCopySuccess ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                      {canShare && (
                        <button
                          onClick={handleShareUrl}
                          className="px-4 py-2 rounded-lg font-medium transition-colors bg-purple-900/30 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50 flex items-center justify-center"
                          title="Share"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Generate a shareable URL to import your progress on another device
                  </p>
                  {shareError && (
                    <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                      <p className="text-red-400 text-sm">{shareError}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Paste State Data
                  </label>
                  <textarea
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      setImportError(null);
                      setImportSuccess(false);
                    }}
                    placeholder="Paste exported state JSON here..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                  />
                  <button
                    onClick={handleImportState}
                    disabled={!pasteText.trim()}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      !pasteText.trim()
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                        : 'bg-green-900/30 text-green-300 border border-green-800/50 hover:bg-green-900/50'
                    }`}
                  >
                    {importSuccess ? '✓ Imported Successfully!' : 'Import State'}
                  </button>
                  {importError && (
                    <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                      <p className="text-red-400 text-sm">{importError}</p>
                    </div>
                  )}
                  {importSuccess && (
                    <div className="p-3 bg-green-900/30 border border-green-800/50 rounded-lg">
                      <p className="text-green-400 text-sm">State imported successfully! Closing in 2 seconds...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
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
              className="mt-6 w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors hidden md:block"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
