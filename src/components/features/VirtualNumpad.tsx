'use client';

import React from 'react';

interface VirtualNumpadProps {
  value: number;
  onChange: (val: number) => void;
  onClose?: () => void;
}

/**
 * Large touch-optimized virtual numeric keypad
 * - Displayed as Bottom Sheet on Phone / Fixed on right panel on Tablet
 */
export const VirtualNumpad: React.FC<VirtualNumpadProps> = ({ value, onChange, onClose }) => {
  const handleKey = (key: string) => {
    if (key === 'C') {
      onChange(0);
    } else if (key === '⌫') {
      const str = value.toString();
      const next = str.length > 1 ? parseInt(str.slice(0, -1), 10) : 0;
      onChange(next);
    } else if (key === '✓') {
      onClose?.();
    } else {
      const num = parseInt(key, 10);
      const str = value === 0 ? key : `${value}${num}`;
      onChange(Math.min(9999, parseInt(str, 10)));
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <div className="w-full max-w-xs mx-auto p-2 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKey(k)}
            className={`h-14 flex items-center justify-center text-2xl font-bold rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xs active:bg-amber-100 active:scale-95 transition-all select-none ${
              k === 'C' ? 'text-rose-600 bg-rose-50' : k === '⌫' ? 'text-gray-600' : ''
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full h-12 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold rounded-xl shadow-xs active:scale-98 transition-transform"
        >
          Confirm Quantity
        </button>
      )}
    </div>
  );
};
