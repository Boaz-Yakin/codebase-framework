'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  mode?: 'modal' | 'inline';
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  mode = 'modal',
}) => {
  const [manualInput, setManualInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-view';

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setErrorMsg('Camera access denied or unsupported device. Please use manual entry below.');
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  if (!isOpen && mode === 'modal') return null;

  const content = (
    <div className="flex flex-col h-full bg-white rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="font-bold text-sm">Scan Barcode / UPC</h3>
        </div>
        {mode === 'modal' && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-semibold px-2 py-1"
          >
            Close
          </button>
        )}
      </div>

      {/* Camera Viewfinder */}
      <div className="relative flex-1 bg-black min-h-[240px] flex items-center justify-center overflow-hidden">
        <div id={containerId} className="w-full h-full" />
        {errorMsg && (
          <div className="absolute inset-0 p-4 bg-gray-900/90 text-white flex flex-col items-center justify-center text-center">
            <p className="text-sm text-rose-300 font-medium mb-3">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Manual Barcode Input Form */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter UPC barcode or SKU manually..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-bold text-sm text-gray-950 rounded-lg"
          >
            Find
          </button>
        </form>
      </div>
    </div>
  );

  if (mode === 'inline') {
    return <div className="w-full h-full">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4">
      <div className="w-full max-w-lg max-h-[85vh]">{content}</div>
    </div>
  );
};
