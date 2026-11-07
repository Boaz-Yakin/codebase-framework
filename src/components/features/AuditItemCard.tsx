'use client';

import React from 'react';
import { AuditItemDetail, RETURN_REASON_LABELS } from '../../types/store-inv';
import { DeficitBadge } from './DeficitBadge';

interface AuditItemCardProps {
  item: AuditItemDetail;
  isActive: boolean;
  onSelect: () => void;
  onStep: (delta: number) => void;
  onOpenNumpad: () => void;
  onOpenReturnModal: () => void;
  onRemoveFromStore?: () => void;
}

export const AuditItemCard: React.FC<AuditItemCardProps> = ({
  item,
  isActive,
  onSelect,
  onStep,
  onOpenNumpad,
  onOpenReturnModal,
  onRemoveFromStore,
}) => {
  const unitsPerBox = item.item?.units_per_box || 1;
  const boxCount = Math.ceil((item.final_order_qty || 0) / unitsPerBox);
  const unitPrice = Number(item.item?.unit_price ?? item.unit_price) || 0;
  const hasReturn = (item.return_qty || 0) > 0;

  return (
    <div
      onClick={onSelect}
      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
        isActive
          ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-300'
          : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
      }`}
    >
      {/* Top: Item Info & Shortage Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            {item.item?.category && (
              <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {item.item.category}
              </span>
            )}
            <span className="text-xs text-gray-500 font-mono">
              SKU: {item.item?.sku || 'N/A'}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              ${unitPrice.toFixed(2)}/ea
            </span>
          </div>
          <h4 className="text-sm font-bold text-gray-900 truncate">
            {item.item?.name_en || 'Untitled Item'}
          </h4>
        </div>
        <DeficitBadge deficitQty={item.deficit_qty} boxCount={boxCount} unitsPerBox={unitsPerBox} />
      </div>

      {/* Return & Credit Badge if Return Qty > 0 */}
      {hasReturn && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenReturnModal();
          }}
          className="mt-2 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs"
        >
          <span className="font-bold text-rose-800">
            ↩ Return: {item.return_qty} pcs (
            {RETURN_REASON_LABELS[item.return_reason || 'DAMAGED']})
          </span>
          <span className="font-extrabold text-rose-700">
            Credit: +${Number(item.credit_amount || 0).toFixed(2)}
          </span>
        </div>
      )}

      {/* Bottom: PAR Level, Return Button & Physical Count Controls */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2 text-xs text-gray-600">
          <div>
            PAR: <span className="font-bold text-gray-900">{item.target_par}</span> ea
          </div>
          <div className="text-gray-300">|</div>
          <div>
            Pack: <span className="font-semibold text-gray-800">{unitsPerBox}</span>/case
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReturnModal();
            }}
            className={`px-2 py-0.5 rounded-md font-bold text-[11px] border transition-colors ${
              hasReturn
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {hasReturn ? 'Edit Return' : '+ Return / Credit'}
          </button>
          {isActive && onRemoveFromStore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromStore();
              }}
              className="px-2 py-0.5 rounded-md font-bold text-[11px] text-gray-400 hover:text-rose-600 hover:bg-gray-100"
              title="Remove from this store's PAR list"
            >
              Remove
            </button>
          )}
        </div>

        {/* Quantity Display & Numpad Trigger */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white font-bold text-gray-700 active:bg-gray-100 shadow-2xs"
          >
            -
          </button>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenNumpad();
            }}
            className="min-w-12 h-8 px-2 flex items-center justify-center rounded-lg bg-gray-900 text-white font-mono font-bold text-base cursor-pointer hover:bg-gray-800"
          >
            {item.physical_count}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 font-bold text-emerald-800 active:bg-emerald-100 shadow-2xs"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
