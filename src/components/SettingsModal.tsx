import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { stateManager } from '../utils/stateManager';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QRCodeScanner } from './QRCodeScanner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { clearAllProgress, userProgress, reloadState } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Reset confirm state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
      setPasteText('');
      setImportError(null);
      setImportSuccess(false);
      setCopySuccess(false);
      setShowQRCode(false);
      setShowQRScanner(false);
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

  const handleShowQRCode = () => {
    setShowQRCode(true);
  };

  const handleQRScan = (data: string) => {
    try {
      // Try to deserialize from QR (compressed), fallback to regular deserialize if needed
      const state = stateManager.deserializeFromQR(data);
      stateManager.saveAll(state);
      reloadState();
      setShowQRScanner(false);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        onClose();
      }, 2000);
      console.log('State imported successfully from QR code');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import state from QR code';
      setImportError(errorMessage);
      console.error('Error importing state from QR code:', error);
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const handleQRScanError = (error: string) => {
    setImportError(`QR Scanner Error: ${error}`);
    setTimeout(() => setImportError(null), 5000);
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
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Import/Export State
                </h3>
                
                {/* Export Options */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportState}
                      className="px-4 py-3 rounded-lg font-medium transition-colors bg-blue-900/30 text-blue-300 border border-blue-800/50 hover:bg-blue-900/50 text-sm"
                    >
                      {copySuccess ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleShowQRCode}
                      className="px-4 py-3 rounded-lg font-medium transition-colors bg-purple-900/30 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50 text-sm"
                    >
                      Show QR Code
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Export all your data (problems, progress, queue) as JSON
                  </p>
                </div>
                
                {/* Import Options */}
                <div className="space-y-3">
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setShowQRScanner(true)}
                      className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors bg-purple-900/30 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50 text-sm"
                    >
                      Scan QR Code
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 border-t border-gray-700"></div>
                    <span className="text-xs text-gray-500">or</span>
                    <div className="flex-1 border-t border-gray-700"></div>
                  </div>

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
                    {importSuccess ? '✓ Imported Successfully!' : 'Import from Text'}
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
              className="mt-6 w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* QR Code Display Modal */}
      {showQRCode && (
        <QRCodeDisplay
          data={stateManager.serializeForQR()}
          onClose={() => setShowQRCode(false)}
        />
      )}

      {/* QR Code Scanner Modal */}
      {showQRScanner && (
        <QRCodeScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          onError={handleQRScanError}
        />
      )}
    </div>
  );
}
