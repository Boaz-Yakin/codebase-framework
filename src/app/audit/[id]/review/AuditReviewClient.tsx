'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AuditSessionDetail,
  ReturnReasonType,
  RETURN_REASON_LABELS,
} from '../../../../types/store-inv';
import { calculateReturnCredit } from '../../../../lib/replenishment';
import { submitAuditOrderAction, saveAuditDraftAction } from '../../../actions/audit';

interface AuditReviewClientProps {
  initialSession: AuditSessionDetail;
}

export const AuditReviewClient: React.FC<AuditReviewClientProps> = ({ initialSession }) => {
  const [session, setSession] = useState(initialSession);
  const [notes, setNotes] = useState(session.notes || '');
  const [isPending, startTransition] = useTransition();
  const [submittedResult, setSubmittedResult] = useState<{
    orderId: string;
    orderNo: string;
    totalCreditIssued: number;
    returnItemsCount: number;
  } | null>(null);

  const orderItems = session.items.filter((i) => i.final_order_qty > 0 || i.deficit_qty > 0);
  const returnItems = session.items.filter((i) => (i.return_qty || 0) > 0);

  const totalBoxes = orderItems.reduce((acc, it) => {
    const boxSize = it.item?.units_per_box || 1;
    return acc + Math.ceil(it.final_order_qty / boxSize);
  }, 0);

  const estimatedOrderAmount = orderItems.reduce((acc, it) => {
    const price = Number(it.item?.unit_price ?? it.unit_price) || 0;
    return acc + it.final_order_qty * price;
  }, 0);

  const totalCreditAmount = returnItems.reduce((acc, it) => {
    const price = Number(it.item?.unit_price ?? it.unit_price) || 0;
    const creditCalc = calculateReturnCredit(price, it.return_qty);
    return Number((acc + creditCalc.creditAmount).toFixed(2));
  }, 0);

  const netEstimatedBalance = Math.max(0, estimatedOrderAmount - totalCreditAmount);

  const handleQtyChange = (itemId: string, newQty: number, reason?: string) => {
    const validQty = Math.max(0, newQty);
    setSession((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.item_id === itemId
          ? {
              ...i,
              final_order_qty: validQty,
              adjustment_reason: reason !== undefined ? reason : i.adjustment_reason,
            }
          : i
      ),
    }));
  };

  const handleReturnChange = (
    itemId: string,
    newReturnQty: number,
    newReason?: ReturnReasonType
  ) => {
    const validQty = Math.max(0, newReturnQty);
    setSession((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.item_id !== itemId) return i;
        const unitPrice = Number(i.item?.unit_price ?? i.unit_price) || 0;
        const calc = calculateReturnCredit(unitPrice, validQty);
        return {
          ...i,
          return_qty: calc.returnQty,
          return_reason: newReason || i.return_reason || 'DAMAGED',
          unit_price: unitPrice,
          credit_amount: calc.creditAmount,
        };
      }),
    }));
  };

  const handleSubmitOrder = () => {
    if (session.status === 'submitted') {
      alert('This audit session has already been submitted.');
      return;
    }

    const summaryMsg =
      returnItems.length > 0
        ? `Submit WMS Order (${totalBoxes} Cases) and issue Store Credit of $${totalCreditAmount.toFixed(
            2
          )} for ${returnItems.length} returned item(s)?`
        : `Submit replenishment order for ${orderItems.length} item(s) (${totalBoxes} Cases) to WMS?`;

    if (!confirm(summaryMsg)) {
      return;
    }

    startTransition(async () => {
      await saveAuditDraftAction(
        session.id,
        session.items.map((i) => ({
          itemId: i.item_id,
          physicalCount: i.physical_count,
          finalOrderQty: i.final_order_qty,
          adjustmentReason: i.adjustment_reason,
          targetPar: i.target_par,
          returnQty: i.return_qty,
          returnReason: i.return_reason,
          returnNote: i.return_note,
        }))
      );

      const fallbackUserId = session.auditor_id || '00000000-0000-0000-0000-000000000000';
      const res = await submitAuditOrderAction(session.id, fallbackUserId, notes);

      if (res.success) {
        setSubmittedResult({
          orderId: res.orderId,
          orderNo: res.orderNo || 'SO-REGISTERED',
          totalCreditIssued: res.totalCreditIssued,
          returnItemsCount: res.returnItemsCount,
        });
        setSession((prev) => ({ ...prev, status: 'submitted' }));
      } else {
        alert(`Failed to submit order: ${res.error}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 md:p-6 pb-28 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 uppercase">
                Order &amp; Store Credit Review
              </span>
              {session.status === 'submitted' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  ✓ Submitted
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
              {session.store?.name} — Review &amp; Submit
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 hover:bg-gray-50"
            >
              🏠 Home
            </Link>
            <Link
              href={`/audit/${session.id}`}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              ← Back to Audit
            </Link>
          </div>
        </div>

        {/* Submission Success Banner */}
        {submittedResult && (
          <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-400 text-emerald-950 space-y-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-2 font-extrabold text-lg">
              <span>🎉</span> WMS Replenishment Order &amp; Store Credit Registered!
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white rounded-xl border border-emerald-200">
                <span className="text-xs text-gray-500 block">WMS Order Number</span>
                <strong className="font-mono text-base text-emerald-900">
                  {submittedResult.orderNo}
                </strong>
                <span className="text-xs text-gray-500 block mt-0.5">
                  {totalBoxes} Cases sent to WMS picking queue
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-rose-200">
                <span className="text-xs text-rose-600 font-bold block">
                  Store Credit Automatically Issued
                </span>
                <strong className="font-mono text-base text-rose-700">
                  +${submittedResult.totalCreditIssued.toFixed(2)}
                </strong>
                <span className="text-xs text-gray-500 block mt-0.5">
                  {submittedResult.returnItemsCount} returned item(s) at (Unit Price - 5%) &times; Qty
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Link
                href="/audit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Audit Another Store
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl shadow-xs"
              >
                View History &amp; Store Credits
              </Link>
            </div>
          </div>
        )}

        {/* Responsive 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left (2 Columns): Order Items + Return/Credit Items */}
          <div className="md:col-span-2 space-y-5">
            {/* 1. Store Returns & Auto-Credit Table */}
            <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-rose-900">
                    ↩ Store Returns &amp; Auto-Credit ({returnItems.length})
                  </h3>
                  <p className="text-[11px] text-rose-700">
                    Formula: <strong>Credit = (Unit Price - 5%) &times; Return Qty</strong>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-extrabold">
                  Total Credit: +${totalCreditAmount.toFixed(2)}
                </span>
              </div>

              <div className="divide-y divide-rose-100">
                {returnItems.map((item) => {
                  const unitPrice = Number(item.item?.unit_price ?? item.unit_price) || 0;
                  const creditCalc = calculateReturnCredit(unitPrice, item.return_qty);

                  return (
                    <div key={item.item_id} className="p-4 space-y-2 hover:bg-rose-50/20">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                              {item.item?.sku}
                            </span>
                            <select
                              disabled={session.status === 'submitted'}
                              value={item.return_reason || 'DAMAGED'}
                              onChange={(e) =>
                                handleReturnChange(
                                  item.item_id,
                                  item.return_qty,
                                  e.target.value as ReturnReasonType
                                )
                              }
                              className="text-[11px] font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200"
                            >
                              {(Object.keys(RETURN_REASON_LABELS) as ReturnReasonType[]).map(
                                (r) => (
                                  <option key={r} value={r}>
                                    {RETURN_REASON_LABELS[r]}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 truncate">
                            {item.item?.name_en}
                          </h4>
                          <div className="text-xs text-gray-600 mt-0.5 font-mono">
                            (${unitPrice.toFixed(2)} - ${(unitPrice * 0.05).toFixed(2)} [5%]) ={' '}
                            <strong>${creditCalc.discountedUnitPrice.toFixed(2)}/ea</strong> &times;{' '}
                            {item.return_qty} pcs ={' '}
                            <strong className="text-rose-700">
                              ${creditCalc.creditAmount.toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        {/* Return Qty Stepper */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            disabled={session.status === 'submitted'}
                            onClick={() => handleReturnChange(item.item_id, item.return_qty - 1)}
                            className="w-8 h-8 rounded-lg border border-gray-300 bg-white font-bold text-xs text-gray-700"
                          >
                            -1
                          </button>
                          <div className="min-w-16 h-8 px-2 flex items-center justify-center rounded-lg bg-rose-700 text-white font-mono font-bold text-xs">
                            {item.return_qty} pcs
                          </div>
                          <button
                            type="button"
                            disabled={session.status === 'submitted'}
                            onClick={() => handleReturnChange(item.item_id, item.return_qty + 1)}
                            className="w-8 h-8 rounded-lg border border-rose-300 bg-rose-50 font-bold text-xs text-rose-800"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {returnItems.length === 0 && (
                  <div className="p-5 text-center text-xs text-gray-400">
                    No Damaged or Out-of-Date returns registered in this audit.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Replenishment Order Items Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900">
                  Replenishment Order Items ({orderItems.length})
                </h3>
                <span className="text-xs text-gray-500">
                  * Fine-tune case quantities before submission
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {orderItems.map((item) => {
                  const boxSize = item.item?.units_per_box || 1;
                  const currentBoxes = Math.ceil(item.final_order_qty / boxSize);

                  return (
                    <div key={item.item_id} className="p-4 space-y-2 hover:bg-gray-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-gray-400">
                            {item.item?.sku}
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 truncate">
                            {item.item?.name_en}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>Count: {item.physical_count} ea</span>
                            <span>PAR: {item.target_par} ea</span>
                            <span>Pack: {boxSize}/case</span>
                          </div>
                        </div>

                        {/* Inline Case Quantity Stepper */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            disabled={session.status === 'submitted'}
                            onClick={() =>
                              handleQtyChange(item.item_id, item.final_order_qty - boxSize)
                            }
                            className="px-2.5 h-8 rounded-lg border border-gray-300 bg-white font-bold text-xs text-gray-700 active:bg-gray-100 disabled:opacity-40"
                          >
                            -1 Case
                          </button>
                          <div className="min-w-20 h-8 px-2 flex flex-col items-center justify-center rounded-lg bg-gray-900 text-white font-mono font-bold text-xs">
                            <span>
                              {currentBoxes} {currentBoxes === 1 ? 'Case' : 'Cases'}
                            </span>
                            <span className="text-[9px] text-gray-400 font-normal">
                              ({item.final_order_qty} ea)
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={session.status === 'submitted'}
                            onClick={() =>
                              handleQtyChange(item.item_id, item.final_order_qty + boxSize)
                            }
                            className="px-2.5 h-8 rounded-lg border border-emerald-300 bg-emerald-50 font-bold text-xs text-emerald-800 active:bg-emerald-100 disabled:opacity-40"
                          >
                            +1 Case
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {orderItems.length === 0 && (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No replenishment needed. (All items meet or exceed PAR levels)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right (1 Column): Order & Credit Summary Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100">
                Order &amp; Store Credit Summary
              </h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Replenishment SKUs</span>
                  <span className="font-bold text-gray-900">{orderItems.length} SKU(s)</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Order Cases</span>
                  <span className="font-extrabold text-amber-800 text-base">
                    {totalBoxes} Cases
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Order Subtotal</span>
                  <span className="font-bold text-gray-900 font-mono">
                    ${estimatedOrderAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Store Credit Deduction */}
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-rose-800">
                    <span>Return Items ({returnItems.length} SKUs)</span>
                    <span>
                      {returnItems.reduce((sum, i) => sum + (i.return_qty || 0), 0)} pcs
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-extrabold text-rose-900">
                      Auto Store Credit (95%)
                    </span>
                    <span className="font-black text-base text-rose-700 font-mono">
                      -${totalCreditAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-gray-600">Net Estimated Balance</span>
                  <span className="font-black text-lg text-gray-950 font-mono">
                    ${netEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Field Notes Input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Field Notes / Return &amp; Order Remarks
                </label>
                <textarea
                  value={notes}
                  disabled={session.status === 'submitted'}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Added 2 extra cases for weekend promotion; 3 damaged items credited..."
                  rows={3}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </div>

              {/* Submit CTA Button */}
              <button
                type="button"
                disabled={
                  isPending ||
                  session.status === 'submitted' ||
                  (orderItems.length === 0 && returnItems.length === 0)
                }
                onClick={handleSubmitOrder}
                className="w-full h-12 bg-amber-400 hover:bg-amber-500 text-gray-950 font-black text-sm rounded-xl shadow-md active:scale-98 transition-transform disabled:opacity-50"
              >
                {isPending
                  ? 'Submitting Order & Credit...'
                  : session.status === 'submitted'
                  ? '✓ Order & Credit Submitted'
                  : returnItems.length > 0
                  ? 'Submit Order & Issue Credit ➔'
                  : 'Submit Order to WMS ➔'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
