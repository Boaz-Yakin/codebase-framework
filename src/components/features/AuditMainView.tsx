'use client';

import React, { useEffect } from 'react';
import { useAuditStore } from '../../store/useAuditStore';
import { AuditSessionDetail, Item } from '../../types/store-inv';
import { PhoneView } from './PhoneView';
import { TabletSplitView } from './TabletSplitView';
import { AddCatalogItemModal } from './AddCatalogItemModal';
import { ReturnCreditModal } from './ReturnCreditModal';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface AuditMainViewProps {
  initialSession: AuditSessionDetail;
  masterCatalog?: Item[];
}

/**
 * Phone / Tablet Adaptive Responsive Main Audit View
 * - Phone (< 768px): PhoneView (1-Column + Sticky Search/Filter + Thumb-Zone Stepper)
 * - Tablet (≥ 768px): TabletSplitView (Master-Detail 2-Column Split View)
 * - Integrated with useOfflineSync for automatic local caching and background server sync
 * - Includes AddCatalogItemModal (dynamic PAR assortment addition) & ReturnCreditModal (Damaged/Out-of-date Credit)
 */
export const AuditMainView: React.FC<AuditMainViewProps> = ({
  initialSession,
  masterCatalog = [],
}) => {
  const { initSession } = useAuditStore();
  const { isOffline, isSyncing, hasUnsavedChanges, lastSavedAt } = useOfflineSync(
    initialSession.id
  );

  useEffect(() => {
    if (initialSession) {
      initSession(
        initialSession,
        initialSession.store,
        initialSession.items,
        masterCatalog
      );
    }
  }, [initialSession, masterCatalog, initSession]);

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Offline / Sync Status Banner */}
      {isOffline ? (
        <div className="bg-amber-500 text-gray-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between">
          <span>⚠️ Offline Mode — Counts &amp; returns are saved locally on this device</span>
          <span>Auto-syncs when reconnected</span>
        </div>
      ) : isSyncing || hasUnsavedChanges || lastSavedAt ? (
        <div className="bg-gray-800 text-gray-300 px-4 py-1 text-[11px] flex items-center justify-end space-x-2">
          {isSyncing ? (
            <span className="text-amber-300 font-semibold animate-pulse">● Syncing draft...</span>
          ) : hasUnsavedChanges ? (
            <span className="text-amber-300">● Unsaved changes (cached locally)</span>
          ) : (
            <span className="text-emerald-400">✓ All changes saved ({lastSavedAt})</span>
          )}
        </div>
      ) : null}

      {/* Smartphone View (< 768px) */}
      <div className="block md:hidden flex-1">
        <PhoneView />
      </div>

      {/* Tablet / Desktop 2-Column Split View (≥ 768px) */}
      <div className="hidden md:block flex-1">
        <TabletSplitView />
      </div>

      {/* Modals for Dynamic Catalog Item Addition & Return/Credit Registration */}
      <AddCatalogItemModal />
      <ReturnCreditModal />
    </div>
  );
};
