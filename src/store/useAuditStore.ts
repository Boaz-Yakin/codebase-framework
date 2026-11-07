import { create } from 'zustand';
import {
  AuditItemDetail,
  InventoryAudit,
  Item,
  ReturnReasonType,
  Store,
} from '../types/store-inv';
import { calculateReplenishment, calculateReturnCredit } from '../lib/replenishment';

export interface AuditItemState extends AuditItemDetail {
  isDirty?: boolean;
}

interface AuditState {
  audit: InventoryAudit | null;
  store: Store | null;
  items: AuditItemState[];
  masterCatalog: Item[];
  activeItemId: string | null;
  isScannerOpen: boolean;
  isNumpadOpen: boolean;
  isAddCatalogOpen: boolean;
  preselectedCatalogItem: Item | null;
  returnModalItemId: string | null;
  isOffline: boolean;
  hasUnsavedChanges: boolean;

  // Actions
  initSession: (
    audit: InventoryAudit,
    store: Store,
    items: AuditItemDetail[],
    masterCatalog?: Item[]
  ) => void;
  setActiveItem: (itemId: string) => void;
  updatePhysicalCount: (itemId: string, count: number) => void;
  stepPhysicalCount: (itemId: string, delta: number) => void;
  updateTargetPar: (itemId: string, newPar: number) => void;
  updateFinalOrderQty: (itemId: string, qty: number, reason?: string) => void;
  updateReturnInfo: (
    itemId: string,
    returnQty: number,
    returnReason: ReturnReasonType,
    returnNote?: string
  ) => void;
  addCatalogItemToSession: (params: {
    item: Item;
    parLevel: number;
    physicalCount: number;
    returnQty?: number;
    returnReason?: ReturnReasonType;
    returnNote?: string;
  }) => void;
  removeItemFromSession: (itemId: string) => void;
  focusByBarcode: (barcode: string) => boolean;
  setScannerOpen: (isOpen: boolean) => void;
  setNumpadOpen: (isOpen: boolean) => void;
  setAddCatalogOpen: (isOpen: boolean, preselectedItem?: Item | null) => void;
  setReturnModalItemId: (itemId: string | null) => void;
  setOffline: (isOffline: boolean) => void;
  markSaved: () => void;

  // Selectors / Getters
  getActiveItem: () => AuditItemState | null;
  getProgress: () => { completed: number; total: number; percentage: number };
  getTotalOrderBoxes: () => number;
  getTotalReturnSummary: () => { returnItemsCount: number; totalReturnUnits: number; totalCreditAmount: number };
}

export const useAuditStore = create<AuditState>((set, get) => ({
  audit: null,
  store: null,
  items: [],
  masterCatalog: [],
  activeItemId: null,
  isScannerOpen: false,
  isNumpadOpen: false,
  isAddCatalogOpen: false,
  preselectedCatalogItem: null,
  returnModalItemId: null,
  isOffline: false,
  hasUnsavedChanges: false,

  initSession: (audit, store, items, masterCatalog = []) => {
    set({
      audit,
      store,
      masterCatalog,
      items: items.map((it) => ({
        ...it,
        return_qty: it.return_qty || 0,
        unit_price: Number(it.item?.unit_price ?? it.unit_price) || 0,
        credit_amount: Number(it.credit_amount) || 0,
        isDirty: false,
      })),
      activeItemId: items.length > 0 ? items[0].item_id : null,
      hasUnsavedChanges: false,
    });
  },

  setActiveItem: (itemId) => {
    set({ activeItemId: itemId });
  },

  updatePhysicalCount: (itemId, count) => {
    const validCount = Math.max(0, count);
    set((state) => {
      const newItems = state.items.map((item) => {
        if (item.item_id !== itemId) return item;

        const unitsPerBox = item.item?.units_per_box || 1;
        const calc = calculateReplenishment({
          physicalCount: validCount,
          parLevel: item.target_par,
          unitsPerBox,
        });

        return {
          ...item,
          physical_count: validCount,
          deficit_qty: calc.deficitQty,
          suggested_order_qty: calc.suggestedQty,
          final_order_qty: calc.suggestedQty,
          isDirty: true,
        };
      });

      return {
        items: newItems,
        hasUnsavedChanges: true,
      };
    });

    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },

  stepPhysicalCount: (itemId, delta) => {
    const item = get().items.find((i) => i.item_id === itemId);
    if (!item) return;
    const nextCount = Math.max(0, (item.physical_count || 0) + delta);
    get().updatePhysicalCount(itemId, nextCount);
  },

  updateTargetPar: (itemId, newPar) => {
    const validPar = Math.max(0, newPar);
    set((state) => ({
      items: state.items.map((item) => {
        if (item.item_id !== itemId) return item;
        const unitsPerBox = item.item?.units_per_box || 1;
        const calc = calculateReplenishment({
          physicalCount: item.physical_count,
          parLevel: validPar,
          unitsPerBox,
        });
        return {
          ...item,
          target_par: validPar,
          deficit_qty: calc.deficitQty,
          suggested_order_qty: calc.suggestedQty,
          final_order_qty: calc.suggestedQty,
          isDirty: true,
        };
      }),
      hasUnsavedChanges: true,
    }));
  },

  updateFinalOrderQty: (itemId, qty, reason) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.item_id === itemId
          ? {
              ...item,
              final_order_qty: Math.max(0, qty),
              adjustment_reason: reason || item.adjustment_reason,
              isDirty: true,
            }
          : item
      ),
      hasUnsavedChanges: true,
    }));
  },

  updateReturnInfo: (itemId, returnQty, returnReason, returnNote) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.item_id !== itemId) return item;
        const unitPrice = Number(item.item?.unit_price ?? item.unit_price) || 0;
        const creditCalc = calculateReturnCredit(unitPrice, returnQty);

        return {
          ...item,
          return_qty: creditCalc.returnQty,
          return_reason: creditCalc.returnQty > 0 ? returnReason : undefined,
          return_note: returnNote,
          unit_price: unitPrice,
          credit_amount: creditCalc.creditAmount,
          isDirty: true,
        };
      }),
      hasUnsavedChanges: true,
    }));
  },

  addCatalogItemToSession: ({
    item,
    parLevel,
    physicalCount,
    returnQty = 0,
    returnReason = 'DAMAGED',
    returnNote,
  }) => {
    set((state) => {
      const unitsPerBox = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;
      const validPar = Math.max(0, parLevel);
      const validCount = Math.max(0, physicalCount);
      const calc = calculateReplenishment({
        physicalCount: validCount,
        parLevel: validPar,
        unitsPerBox,
      });
      const unitPrice = Number(item.unit_price) || 0;
      const creditCalc = calculateReturnCredit(unitPrice, returnQty);
      const now = new Date().toISOString();

      const exists = state.items.find((i) => i.item_id === item.id);
      let nextItems: AuditItemState[];

      if (exists) {
        nextItems = state.items.map((i) =>
          i.item_id === item.id
            ? {
                ...i,
                target_par: validPar,
                physical_count: validCount,
                deficit_qty: calc.deficitQty,
                suggested_order_qty: calc.suggestedQty,
                final_order_qty: calc.suggestedQty,
                return_qty: creditCalc.returnQty,
                return_reason: creditCalc.returnQty > 0 ? returnReason : undefined,
                return_note: returnNote,
                unit_price: unitPrice,
                credit_amount: creditCalc.creditAmount,
                isDirty: true,
              }
            : i
        );
      } else {
        const newEntry: AuditItemState = {
          id: `audit-item-${Date.now()}`,
          audit_id: state.audit?.id || '',
          item_id: item.id,
          physical_count: validCount,
          target_par: validPar,
          deficit_qty: calc.deficitQty,
          suggested_order_qty: calc.suggestedQty,
          final_order_qty: calc.suggestedQty,
          return_qty: creditCalc.returnQty,
          return_reason: creditCalc.returnQty > 0 ? returnReason : undefined,
          return_note: returnNote,
          unit_price: unitPrice,
          credit_amount: creditCalc.creditAmount,
          created_at: now,
          updated_at: now,
          item,
          isDirty: true,
        };
        nextItems = [...state.items, newEntry];
      }

      return {
        items: nextItems,
        activeItemId: item.id,
        isAddCatalogOpen: false,
        preselectedCatalogItem: null,
        hasUnsavedChanges: true,
      };
    });
  },

  removeItemFromSession: (itemId) => {
    set((state) => {
      const nextItems = state.items.filter((i) => i.item_id !== itemId);
      const nextActive =
        state.activeItemId === itemId
          ? nextItems.length > 0
            ? nextItems[0].item_id
            : null
          : state.activeItemId;
      return {
        items: nextItems,
        activeItemId: nextActive,
      };
    });
  },

  focusByBarcode: (barcode) => {
    const cleanBarcode = barcode.trim().toUpperCase();
    // 1. Check store's current PAR items first
    const foundInStore = get().items.find(
      (it) =>
        (it.item?.upc && it.item.upc.toUpperCase() === cleanBarcode) ||
        (it.item?.box_barcode && it.item.box_barcode.toUpperCase() === cleanBarcode) ||
        (it.item?.sku && it.item.sku.toUpperCase() === cleanBarcode)
    );

    if (foundInStore) {
      set({ activeItemId: foundInStore.item_id, isScannerOpen: false });
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      return true;
    }

    // 2. Smart Fallback: Check the 298-item Master Catalog if not yet in this store's PAR list!
    const foundInMaster = get().masterCatalog.find(
      (it) =>
        (it.upc && it.upc.toUpperCase() === cleanBarcode) ||
        (it.box_barcode && it.box_barcode.toUpperCase() === cleanBarcode) ||
        (it.sku && it.sku.toUpperCase() === cleanBarcode)
    );

    if (foundInMaster) {
      set({
        isScannerOpen: false,
        isAddCatalogOpen: true,
        preselectedCatalogItem: foundInMaster,
      });
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
      return true;
    }

    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(200);
    }
    return false;
  },

  setScannerOpen: (isOpen) => set({ isScannerOpen: isOpen }),
  setNumpadOpen: (isOpen) => set({ isNumpadOpen: isOpen }),
  setAddCatalogOpen: (isOpen, preselectedItem = null) =>
    set({ isAddCatalogOpen: isOpen, preselectedCatalogItem: preselectedItem }),
  setReturnModalItemId: (itemId) => set({ returnModalItemId: itemId }),
  setOffline: (isOffline) => set({ isOffline }),
  markSaved: () =>
    set((state) => ({
      items: state.items.map((i) => ({ ...i, isDirty: false })),
      hasUnsavedChanges: false,
    })),

  getActiveItem: () => {
    const { items, activeItemId } = get();
    return items.find((i) => i.item_id === activeItemId) || null;
  },

  getProgress: () => {
    const { items } = get();
    if (items.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = items.filter(
      (i) => i.physical_count > 0 || i.return_qty > 0 || i.isDirty
    ).length;
    const total = items.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  },

  getTotalOrderBoxes: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const unitsPerBox = item.item?.units_per_box || 1;
      const boxes = Math.ceil((item.final_order_qty || 0) / unitsPerBox);
      return sum + boxes;
    }, 0);
  },

  getTotalReturnSummary: () => {
    const { items } = get();
    return items.reduce(
      (acc, item) => {
        if (item.return_qty > 0) {
          acc.returnItemsCount += 1;
          acc.totalReturnUnits += item.return_qty;
          acc.totalCreditAmount = Number(
            (acc.totalCreditAmount + (item.credit_amount || 0)).toFixed(2)
          );
        }
        return acc;
      },
      { returnItemsCount: 0, totalReturnUnits: 0, totalCreditAmount: 0 }
    );
  },
}));
