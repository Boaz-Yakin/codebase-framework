'use client';

import React from 'react';

interface DeficitBadgeProps {
  deficitQty: number;
  boxCount: number;
  unitsPerBox?: number;
}

export const DeficitBadge: React.FC<DeficitBadgeProps> = ({
  deficitQty,
  boxCount,
}) => {
  if (deficitQty <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        ✓ Sufficient (0 Cases)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
      Order: {boxCount} {boxCount === 1 ? 'Case' : 'Cases'} ({deficitQty} ea)
    </span>
  );
};
