'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startAuditAction } from '../actions/audit';

interface StoreAuditSelectorProps {
  stores: Array<{
    id: string;
    name: string;
    store_no?: string;
    address?: string;
  }>;
}

export const StoreAuditSelector: React.FC<StoreAuditSelectorProps> = ({ stores }) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredStores = stores.filter((s) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.store_no && s.store_no.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  const handleStart = (storeId: string) => {
    setSelectedStoreId(storeId);
    startTransition(async () => {
      const fallbackAuditorId = '00000000-0000-0000-0000-000000000000';
      const res = await startAuditAction(storeId, fallbackAuditorId);
      if (res.success) {
        router.push(`/audit/${res.session.id}`);
      } else {
        alert(`Failed to start audit: ${res.error}`);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-5 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">Select Store Location</h3>
        <p className="text-xs text-gray-500">
          Choose the Food Depot or retail branch you are visiting to start an audit.
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by store name, branch number, or address..."
          className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <span className="absolute right-3.5 top-2.5 text-gray-400">🔍</span>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {filteredStores.map((store) => (
          <div
            key={store.id}
            className="py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 transition-colors"
          >
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{store.name}</h4>
              <p className="text-xs text-gray-500">{store.address || 'No address provided'}</p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStart(store.id)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isPending && selectedStoreId === store.id ? 'Starting...' : 'Start Audit →'}
            </button>
          </div>
        ))}

        {filteredStores.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">
            No matching stores found.
          </div>
        )}
      </div>
    </div>
  );
};
