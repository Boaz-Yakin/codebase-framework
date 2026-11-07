import React from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { getAllInMemorySessions, getStoreCredits } from '../../lib/mockData';
import { RETURN_REASON_LABELS, ReturnReasonType } from '../../types/store-inv';

export const dynamic = 'force-dynamic';

export default async function AuditHistoryPage() {
  let audits: any[] = [];
  let credits = getStoreCredits();

  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from('inventory_audits')
      .select(`
        id,
        started_at,
        submitted_at,
        status,
        notes,
        store:stores (id, name, store_no),
        order:orders (id, order_no, status)
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      audits = data;
    }

    const { data: dbCredits } = await supabase
      .from('store_credits')
      .select(`
        *,
        store:stores (id, name, store_no),
        item:items (id, sku, name_en, unit_price)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (dbCredits && dbCredits.length > 0) {
      credits = dbCredits as any[];
    }
  } catch {
    // Fallback to local persisted data
  }

  if (audits.length === 0) {
    audits = getAllInMemorySessions();
  }

  const totalIssuedCredit = credits.reduce(
    (sum, c) => sum + (Number(c.credit_amount) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 mb-1"
            >
              ← Back to Home
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Audit History &amp; Store Credits Ledger
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 font-bold text-xs text-gray-800 rounded-xl shadow-2xs"
            >
              🏠 Home
            </Link>
            <Link
              href="/targets"
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 font-bold text-xs text-gray-800 rounded-xl shadow-2xs"
            >
              ⚙ PAR Settings
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-bold text-xs text-gray-950 rounded-xl shadow-xs"
            >
              + New Audit
            </Link>
          </div>
        </div>

        {/* Store Credits Summary Section */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase text-rose-600 block">
                Automatic Return Credits ((Unit Price - 5%) &times; Return Qty)
              </span>
              <h2 className="text-base font-extrabold text-gray-900">
                Store Return Credits Ledger ({credits.length} Records)
              </h2>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold">
              Total Issued Store Credit: +${totalIssuedCredit.toFixed(2)}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {credits.length > 0 ? (
              credits.map((c) => {
                const reasonLabel =
                  RETURN_REASON_LABELS[(c.return_reason as ReturnReasonType) || 'DAMAGED'] ||
                  c.return_reason;
                return (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-rose-50/20"
                  >
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-0.5">
                        <span className="text-xs font-extrabold text-gray-900">
                          {c.store?.name || 'Store'}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          {reasonLabel}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {new Date(c.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        [{c.item?.sku}] {c.item?.name_en}
                      </p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">
                        (${Number(c.unit_price).toFixed(2)} - 5% = $
                        {Number(c.credit_unit_price).toFixed(2)}/ea) &times; {c.return_qty} pcs
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded block mb-0.5">
                        ✓ {c.status}
                      </span>
                      <span className="text-lg font-black font-mono text-rose-700">
                        +${Number(c.credit_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-gray-400">
                No store return credits issued yet. Register a Return (Damaged / Out of Date) during
                an audit to automatically issue Store Credit.
              </div>
            )}
          </div>
        </div>

        {/* Audit Sessions History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-base font-extrabold text-gray-900">
              Store Audit &amp; Replenishment Sessions ({audits.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {audits && audits.length > 0 ? (
              audits.map((a: any) => {
                const isSubmitted = a.status === 'submitted';
                const sessionReturnCredits = Array.isArray(a.items)
                  ? a.items.reduce(
                      (sum: number, it: any) => sum + (Number(it.credit_amount) || 0),
                      0
                    )
                  : 0;

                return (
                  <div
                    key={a.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                  >
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isSubmitted
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isSubmitted
                            ? '✓ Submitted'
                            : a.status === 'in_progress'
                            ? 'In Progress'
                            : 'Cancelled'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          #{a.id.slice(0, 14)}
                        </span>
                        {sessionReturnCredits > 0 && (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Store Credit: +${sessionReturnCredits.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-gray-900">{a.store?.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>
                          Date:{' '}
                          {new Date(a.submitted_at || a.started_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {a.order?.order_no && (
                          <span className="font-mono text-amber-800 font-semibold">
                            WMS Order: {a.order.order_no}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {a.status === 'in_progress' && (
                        <Link
                          href={`/audit/${a.id}`}
                          className="inline-block px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-950 text-xs font-bold rounded-lg transition-colors"
                        >
                          Resume Audit →
                        </Link>
                      )}
                      <Link
                        href={`/audit/${a.id}/review`}
                        className="inline-block px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors"
                      >
                        View Report →
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center space-y-3">
                <p className="text-sm text-gray-500 font-medium">No audit history found yet.</p>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-xl shadow-xs"
                  >
                    🏠 Go to Home &amp; Start Audit
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
