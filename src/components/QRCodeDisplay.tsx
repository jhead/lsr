import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  data: string; // This should be the compressed data from serializeForQR
  onClose: () => void;
}

export function QRCodeDisplay({ data, onClose }: QRCodeDisplayProps) {
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string>('');

  useEffect(() => {
    try {
      // Data is already compressed, use it directly
      setQrData(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare QR code data';
      setError(errorMessage);
      console.error('Error preparing QR code:', err);
    }
  }, [data]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div
          className="max-w-md w-full mx-4 bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-white mb-4">QR Code Error</h3>
          <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-lg mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div
          className="max-w-md w-full mx-4 bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-white mb-4">Loading QR Code...</h3>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full mx-4 bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white mb-2">Scan QR Code</h3>
          <p className="text-sm text-gray-400">
            Scan this QR code with another device to import your state
          </p>
        </div>
        
        <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
          <QRCodeSVG
            value={qrData}
            size={256}
            level="M"
            includeMargin={true}
          />
        </div>
        
        <p className="text-xs text-gray-500 text-center mb-4">
          Point your camera at this code on another device
        </p>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
