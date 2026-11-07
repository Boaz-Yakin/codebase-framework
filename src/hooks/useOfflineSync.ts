'use client';

import { useEffect, useState } from 'react';
import { useAuditStore } from '../store/useAuditStore';
import { saveAuditDraftAction } from '../app/actions/audit';

const STORAGE_PREFIX = 'store_inv_audit_draft_v2_';

export function useOfflineSync(auditId: string | undefined) {
  const {
    items,
    isOffline,
    hasUnsavedChanges,
    setOffline,
    markSaved,
    updatePhysicalCount,
    updateReturnInfo,
  } = useAuditStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // 1. Monitor browser online / offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setOffline(!navigator.onLine);

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  // 2. Restore any locally cached counts & returns on initial mount
  useEffect(() => {
    if (!auditId || typeof window === 'undefined' || items.length === 0) return;

    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${auditId}`);
      if (!raw) return;

      const cached: Record<
        string,
        {
          physicalCount: number;
          returnQty?: number;
          returnReason?: any;
          returnNote?: string;
        }
      > = JSON.parse(raw);

      Object.entries(cached).forEach(([itemId, val]) => {
        const existing = items.find((i) => i.item_id === itemId);
        if (!existing) return;
        if (existing.physical_count !== val.physicalCount) {
          updatePhysicalCount(itemId, val.physicalCount);
        }
        if (val.returnQty && val.returnQty > 0 && existing.return_qty !== val.returnQty) {
          updateReturnInfo(
            itemId,
            val.returnQty,
            val.returnReason || 'DAMAGED',
            val.returnNote
          );
        }
      });
    } catch {
      // ignore corrupted local cache
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, items.length > 0]);

  // 3. Persist changes to localStorage immediately & debounce server sync when online
  useEffect(() => {
    if (!auditId || !hasUnsavedChanges || typeof window === 'undefined') return;

    try {
      const dirtyMap: Record<
        string,
        {
          physicalCount: number;
          returnQty: number;
          returnReason?: string;
          returnNote?: string;
        }
      > = {};
      items.forEach((it) => {
        if (it.isDirty || it.physical_count > 0 || it.return_qty > 0) {
          dirtyMap[it.item_id] = {
            physicalCount: it.physical_count,
            returnQty: it.return_qty || 0,
            returnReason: it.return_reason,
            returnNote: it.return_note,
          };
        }
      });
      localStorage.setItem(`${STORAGE_PREFIX}${auditId}`, JSON.stringify(dirtyMap));
    } catch {
      // ignore quota errors
    }

    if (isOffline) return;

    const timer = setTimeout(async () => {
      const dirtyItems = items.filter((i) => i.isDirty);
      if (dirtyItems.length === 0) return;

      setIsSyncing(true);
      try {
        const res = await saveAuditDraftAction(
          auditId,
          dirtyItems.map((i) => ({
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
        if (res.success) {
          markSaved();
          setLastSavedAt(
            new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      } finally {
        setIsSyncing(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [auditId, items, hasUnsavedChanges, isOffline, markSaved]);

  return {
    isOffline,
    isSyncing,
    hasUnsavedChanges,
    lastSavedAt,
  };
}
