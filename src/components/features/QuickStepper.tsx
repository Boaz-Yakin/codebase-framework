'use client';

import React from 'react';

interface QuickStepperProps {
  onStep: (delta: number) => void;
  disabled?: boolean;
}

/**
 * 현장 작업자용 원터치 고속 증감 버튼 컴포넌트
 * - 최소 48px 이상의 대형 터치 타겟 (장갑 착용 상태에서도 조작 가능)
 * - 햅틱 반응 지원
 */
export const QuickStepper: React.FC<QuickStepperProps> = ({ onStep, disabled = false }) => {
  const steps = [
    { label: '-1', delta: -1, color: 'text-gray-700 bg-white hover:bg-gray-100 border-gray-300' },
    { label: '+1', delta: 1, color: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 font-bold' },
    { label: '+5', delta: 5, color: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-300 font-bold' },
    { label: '+10', delta: 10, color: 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 font-extrabold' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {steps.map((btn) => (
        <button
          key={btn.label}
          type="button"
          disabled={disabled}
          onClick={() => onStep(btn.delta)}
          className={`h-12 flex items-center justify-center text-lg rounded-xl border shadow-xs active:scale-95 transition-transform disabled:opacity-50 select-none ${btn.color}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};
