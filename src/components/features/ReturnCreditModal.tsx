'use client';

import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../../store/useAuditStore';
import { ReturnReasonType, RETURN_REASON_LABELS } from '../../types/store-inv';
import { calculateReturnCredit } from '../../lib/replenishment';

export const ReturnCreditModal: React.FC = () => {
  const { items, returnModalItemId, setReturnModalItemId, updateReturnInfo } = useAuditStore();

  const targetItem = items.find((i) => i.item_id === returnModalItemId) || null;

  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnReason, setReturnReason] = useState<ReturnReasonType>('DAMAGED');
  const [returnNote, setReturnNote] = useState<string>('');

  useEffect(() => {
    if (targetItem) {
      setReturnQty(targetItem.return_qty || 0);
      setReturnReason(targetItem.return_reason || 'DAMAGED');
      setReturnNote(targetItem.return_note || '');
    }
  }, [targetItem]);

  if (!targetItem) return null;

  const unitPrice = Number(targetItem.item?.unit_price ?? targetItem.unit_price) || 0;
  const creditCalc = calculateReturnCredit(unitPrice, returnQty);

  const handleSaveReturn = () => {
    updateReturnInfo(targetItem.item_id, returnQty, returnReason, returnNote);
    setReturnModalItemId(null);
  };

  const handleClearReturn = () => {
    updateReturnInfo(targetItem.item_id, 0, 'DAMAGED', '');
    setReturnModalItemId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 md:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-rose-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
              Store Return &amp; Automatic Credit
            </span>
            <h2 className="text-lg font-extrabold truncate max-w-sm">
              {targetItem.item?.name_en}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setReturnModalItemId(null)}
            className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-xs font-bold text-rose-100"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Item Unit Price Info */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-slate-500 block">
                SKU: {targetItem.item?.sku}
              </span>
              <span className="text-xs text-slate-600">
                Regular Unit Price: <strong className="text-slate-900">${unitPrice.toFixed(2)}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-rose-600 uppercase block">
                Credit Rate (Unit - 5%)
              </span>
              <span className="text-sm font-extrabold text-rose-700">
                ${creditCalc.discountedUnitPrice.toFixed(2)} / unit
              </span>
            </div>
          </div>

          {/* Return Reason Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Return Reason
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(RETURN_REASON_LABELS) as ReturnReasonType[]).map((reasonKey) => (
                <button
                  key={reasonKey}
                  type="button"
                  onClick={() => setReturnReason(reasonKey)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border text-left transition-all ${
                    returnReason === reasonKey
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {RETURN_REASON_LABELS[reasonKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Return Quantity Stepper */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Return Quantity (Units)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReturnQty(Math.max(0, returnQty - 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 text-lg"
              >
                -1
              </button>
              <input
                type="number"
                min={0}
                value={returnQty}
                onChange={(e) => setReturnQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="flex-1 h-12 text-center font-black text-2xl text-rose-700 border-2 border-rose-300 rounded-xl focus:outline-none focus:border-rose-600"
              />
              <button
                type="button"
                onClick={() => setReturnQty(returnQty + 1)}
                className="w-12 h-12 rounded-xl bg-rose-100 hover:bg-rose-200 font-extrabold text-rose-700 text-lg"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setReturnQty(returnQty + 5)}
                className="w-12 h-12 rounded-xl bg-rose-50 hover:bg-rose-100 font-extrabold text-rose-700 text-sm border border-rose-200"
              >
                +5
              </button>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Return Note (Optional)
            </label>
            <input
              type="text"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="e.g., Lot #2026-A expired, crushed box on arrival..."
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Live Credit Calculation Box */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Formula:</span>
              <span className="font-mono font-semibold">
                (Unit Price - 5%) &times; Return Qty
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Calculation:</span>
              <span className="font-mono">
                (${unitPrice.toFixed(2)} - ${(unitPrice * 0.05).toFixed(2)}) &times;{' '}
                {creditCalc.returnQty} pcs
              </span>
            </div>
            <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
              <span className="text-sm font-extrabold text-rose-900">
                Auto Store Credit Amount
              </span>
              <span className="text-xl font-black text-rose-700">
                ${creditCalc.creditAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {targetItem.return_qty > 0 ? (
              <button
                type="button"
                onClick={handleClearReturn}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Clear Return
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReturnModalItemId(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReturn}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md"
              >
                Save Return &amp; Credit (${creditCalc.creditAmount.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
