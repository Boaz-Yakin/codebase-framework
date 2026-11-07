import React from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { StoreAuditSelector } from './StoreAuditSelector';
import { MOCK_STORES } from '../../lib/mockData';

export const dynamic = 'force-dynamic';

export default async function AuditStoreSelectionPage() {
  let stores: any[] = [];
  let activeAudits: any[] = [];

  try {
    const supabase = await createClient();

    const { data: storeData } = await supabase
      .from('stores')
      .select('id, name, store_no, address, is_active')
      .eq('is_active', true)
      .order('name');

    if (storeData && storeData.length > 0) {
      stores = storeData;
    }

    const { data: auditData } = await supabase
      .from('inventory_audits')
      .select(`
        id,
        started_at,
        store:stores (id, name, store_no)
      `)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });

    if (auditData) {
      activeAudits = auditData;
    }
  } catch (e) {
    console.warn('[AuditStoreSelectionPage] Supabase error, using mock stores.');
  }

  if (stores.length === 0) {
    stores = MOCK_STORES;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Title Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Store-Inv Field Audit
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Store Inventory &amp; Replenishment
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/targets"
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-2xs"
            >
              ⚙ PAR Settings
            </Link>
            <Link
              href="/history"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-2xs"
            >
              Audit History ➔
            </Link>
          </div>
        </div>

        {/* Active Audit Session Banner */}
        {activeAudits.length > 0 && (
          <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              Active Audit Session in Progress
            </div>
            <div className="divide-y divide-amber-200/60">
              {activeAudits.map((a: any) => (
                <div key={a.id} className="pt-2 pb-1 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      {a.store?.name}
                    </h4>
                    <span className="text-xs text-gray-500">
                      Started: {new Date(a.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Link
                    href={`/audit/${a.id}`}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 font-bold text-xs text-gray-950 rounded-lg shadow-xs"
                  >
                    Resume →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Store Selection Component */}
        <StoreAuditSelector stores={stores} />
      </div>
    </div>
  );
}
