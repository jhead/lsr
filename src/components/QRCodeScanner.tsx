import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  onError?: (error: string) => void;
}

export function QRCodeScanner({ onScan, onClose, onError }: QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const scannerId = 'qr-scanner';

  const stopScanning = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
        isScanningRef.current = false;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    const startScanning = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        // Start scanning
        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent while looking for codes)
            // Only log if it's not a "not found" error
            if (!errorMessage.includes('No QR code found')) {
              console.debug('QR scan error:', errorMessage);
            }
          }
        );
        
        isScanningRef.current = true;
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
        setError(errorMessage);
        console.error('Error starting QR scanner:', err);
        if (onError) {
          onError(errorMessage);
        }
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, [onScan, onError]);

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="max-w-md w-full mx-4 bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white mb-2">Scan QR Code</h3>
          <p className="text-sm text-gray-400">
            Point your camera at a QR code to import state
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-800/50 rounded-lg">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <p className="text-red-300 text-xs">
              Make sure you've granted camera permissions and your device has a camera.
            </p>
          </div>
        )}

        <div className="mb-4">
          <div
            id={scannerId}
            className="w-full rounded-lg overflow-hidden bg-black"
            style={{ minHeight: '300px' }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
