import fs from 'fs';
import path from 'path';
import {
  AuditSessionDetail,
  Store,
  Item,
  StoreTargetWithItem,
  ReturnReasonType,
  StoreCreditWithDetail,
} from '../types/store-inv';
import { calculateReplenishment, calculateReturnCredit } from './replenishment';

export const MOCK_STORES: Store[] = [
  {
    id: 'store-duluth-101',
    name: 'Food Depot — Duluth (#101)',
    store_no: 'FD-101',
    address: '3855 Buford Hwy, Duluth, GA 30096',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_ITEMS: Item[] = [];

export interface TargetConfig {
  parLevel: number;
  displayOrder: number;
  minOrderQty: number;
  isActive: boolean;
}

interface PersistedData {
  // storeId -> itemId -> TargetConfig
  storeTargets: Record<string, Record<string, TargetConfig>>;
  // auditId -> AuditSessionDetail
  sessions: Record<string, AuditSessionDetail>;
  // store credits issued from returns
  storeCredits: StoreCreditWithDetail[];
}

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'store-inv-persistence.json');

// Global singleton in-memory cache synced with disk
const globalForStoreInv = globalThis as unknown as {
  __storeInvData?: PersistedData;
};

function loadPersistedData(): PersistedData {
  if (globalForStoreInv.__storeInvData) {
    return globalForStoreInv.__storeInvData;
  }

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedData;
      globalForStoreInv.__storeInvData = {
        storeTargets: parsed.storeTargets || {},
        sessions: parsed.sessions || {},
        storeCredits: parsed.storeCredits || [],
      };
      return globalForStoreInv.__storeInvData;
    }
  } catch (err) {
    console.warn('[Store-Inv] Could not load persistence file, starting fresh:', err);
  }

  globalForStoreInv.__storeInvData = {
    storeTargets: {},
    sessions: {},
    storeCredits: [],
  };
  return globalForStoreInv.__storeInvData;
}

function savePersistedData() {
  const data = loadPersistedData();
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store-Inv] Could not write persistence file:', err);
  }
}

/**
 * Initialize a store's default carried item list (PAR list) as a subset of the Master Catalog
 * (e.g., 16 items carried by default if the store has never been configured yet, rather than all 298 items).
 */
export function ensureStoreAssortment(storeId: string, dbItems: Item[]): Record<string, TargetConfig> {
  const state = loadPersistedData();

  // Check if already exists and is a small subset (if previously auto-seeded with > 100 items, trim to a realistic store subset)
  const existing = state.storeTargets[storeId];
  if (existing && Object.keys(existing).length > 0 && Object.keys(existing).length <= 120) {
    return existing;
  }

  const subsetMap: Record<string, TargetConfig> = {};
  if (dbItems.length > 0) {
    // Deterministically pick ~16 items for this store based on storeId hash so each store has its own initial shelf assortment
    const hash = storeId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const step = Math.max(1, Math.floor(dbItems.length / 16));
    const selected: Item[] = [];

    for (let i = 0; i < Math.min(16, dbItems.length); i++) {
      const idx = (hash + i * step) % dbItems.length;
      const candidate = dbItems[idx];
      if (candidate && !selected.some((s) => s.id === candidate.id)) {
        selected.push(candidate);
      }
    }

    selected.forEach((item, idx) => {
      const boxSize = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;
      subsetMap[item.id] = {
        parLevel: boxSize * 2,
        displayOrder: (idx + 1) * 10,
        minOrderQty: boxSize,
        isActive: true,
      };
    });
  }

  state.storeTargets[storeId] = subsetMap;
  savePersistedData();
  return subsetMap;
}

/**
 * Returns ONLY the active carried items (PAR list) for the given store
 */
export function getInMemoryStoreTargetsWithItems(
  storeId: string,
  dbItems: Item[]
): StoreTargetWithItem[] {
  const assortment = ensureStoreAssortment(storeId, dbItems);
  const itemById = new Map<string, Item>();
  dbItems.forEach((item) => itemById.set(item.id, item));

  const now = new Date().toISOString();
  const result: StoreTargetWithItem[] = [];

  for (const [itemId, cfg] of Object.entries(assortment)) {
    if (!cfg.isActive) continue;
    const item = itemById.get(itemId);
    if (!item) continue;

    result.push({
      id: `target-${storeId}-${itemId}`,
      store_id: storeId,
      item_id: itemId,
      par_level: cfg.parLevel,
      min_order_qty: cfg.minOrderQty,
      display_order: cfg.displayOrder,
      is_active: true,
      created_at: now,
      updated_at: now,
      item,
    });
  }

  return result.sort((a, b) => a.display_order - b.display_order);
}

/**
 * Batch update PAR levels & display order for a store's carried items
 */
export function setInMemoryStoreTargets(
  storeId: string,
  updates: Array<{
    itemId: string;
    parLevel: number;
    displayOrder: number;
    minOrderQty?: number;
    isActive?: boolean;
  }>,
  dbItems: Item[]
) {
  const state = loadPersistedData();
  const assortment = ensureStoreAssortment(storeId, dbItems);

  updates.forEach((u) => {
    const existing = assortment[u.itemId];
    assortment[u.itemId] = {
      parLevel: Math.max(0, u.parLevel),
      displayOrder: u.displayOrder,
      minOrderQty: u.minOrderQty ?? existing?.minOrderQty ?? 1,
      isActive: u.isActive !== undefined ? u.isActive : true,
    };
  });

  state.storeTargets[storeId] = assortment;

  // Also refresh any active in_progress session for this store
  Object.values(state.sessions).forEach((session) => {
    if (session.store_id === storeId && session.status === 'in_progress') {
      session.items.forEach((auditItem) => {
        const cfg = assortment[auditItem.item_id];
        if (cfg && cfg.isActive) {
          const boxSize = auditItem.item?.units_per_box || 1;
          auditItem.target_par = cfg.parLevel;
          const calc = calculateReplenishment({
            physicalCount: auditItem.physical_count,
            parLevel: cfg.parLevel,
            unitsPerBox: boxSize,
            minOrderQty: cfg.minOrderQty,
          });
          auditItem.deficit_qty = calc.deficitQty;
          auditItem.suggested_order_qty = calc.suggestedQty;
          auditItem.final_order_qty = calc.suggestedQty;
        }
      });
    }
  });

  savePersistedData();
}

/**
 * Remove an item from a store's carried PAR assortment (and from active in_progress session if requested)
 */
export function removeInMemoryStoreTargetItem(storeId: string, itemId: string, auditId?: string) {
  const state = loadPersistedData();
  const assortment = state.storeTargets[storeId];
  if (assortment && assortment[itemId]) {
    assortment[itemId].isActive = false;
    delete assortment[itemId];
  }

  if (auditId && state.sessions[auditId]) {
    state.sessions[auditId].items = state.sessions[auditId].items.filter(
      (i) => i.item_id !== itemId
    );
  }

  savePersistedData();
}

/**
 * Dynamically add a new item from the Master Catalog to a store's PAR assortment AND to an active audit session
 */
export function addCatalogItemToStoreAndSession(params: {
  storeId: string;
  auditId?: string;
  item: Item;
  parLevel: number;
  physicalCount?: number;
  returnQty?: number;
  returnReason?: ReturnReasonType;
  returnNote?: string;
  dbItems: Item[];
}) {
  const {
    storeId,
    auditId,
    item,
    parLevel,
    physicalCount = 0,
    returnQty = 0,
    returnReason = 'DAMAGED',
    returnNote,
    dbItems,
  } = params;

  const state = loadPersistedData();
  const assortment = ensureStoreAssortment(storeId, dbItems);

  const maxOrder = Object.values(assortment).reduce(
    (max, cfg) => Math.max(max, cfg.displayOrder || 0),
    0
  );
  const boxSize = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;
  const validPar = Math.max(0, parLevel);

  assortment[item.id] = {
    parLevel: validPar,
    displayOrder: assortment[item.id]?.displayOrder || maxOrder + 10,
    minOrderQty: boxSize,
    isActive: true,
  };
  state.storeTargets[storeId] = assortment;

  // If auditId is provided, add or update the item in that audit session immediately
  if (auditId && state.sessions[auditId]) {
    const session = state.sessions[auditId];
    const calc = calculateReplenishment({
      physicalCount,
      parLevel: validPar,
      unitsPerBox: boxSize,
      minOrderQty: boxSize,
    });
    const unitPrice = Number(item.unit_price) || 0;
    const creditCalc = calculateReturnCredit(unitPrice, returnQty);
    const now = new Date().toISOString();

    const existingAuditItem = session.items.find((i) => i.item_id === item.id);
    if (existingAuditItem) {
      existingAuditItem.target_par = validPar;
      existingAuditItem.physical_count = physicalCount;
      existingAuditItem.deficit_qty = calc.deficitQty;
      existingAuditItem.suggested_order_qty = calc.suggestedQty;
      existingAuditItem.final_order_qty = calc.suggestedQty;
      existingAuditItem.return_qty = creditCalc.returnQty;
      existingAuditItem.return_reason = creditCalc.returnQty > 0 ? returnReason : undefined;
      existingAuditItem.return_note = returnNote;
      existingAuditItem.unit_price = unitPrice;
      existingAuditItem.credit_amount = creditCalc.creditAmount;
      existingAuditItem.updated_at = now;
    } else {
      session.items.push({
        id: `audit-item-${Date.now()}-${item.id.slice(0, 6)}`,
        audit_id: auditId,
        item_id: item.id,
        physical_count: physicalCount,
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
      });
    }
    session.updated_at = now;
  }

  savePersistedData();
}

export function cloneInMemoryStoreTargets(
  sourceStoreId: string,
  targetStoreId: string,
  dbItems: Item[],
  overwrite: boolean = true
): number {
  const state = loadPersistedData();
  const sourceAssortment = ensureStoreAssortment(sourceStoreId, dbItems);
  const targetAssortment = overwrite
    ? {}
    : { ...(state.storeTargets[targetStoreId] || {}) };

  Object.entries(sourceAssortment).forEach(([itemId, cfg]) => {
    if (cfg.isActive) {
      targetAssortment[itemId] = { ...cfg };
    }
  });

  state.storeTargets[targetStoreId] = targetAssortment;
  savePersistedData();
  return Object.keys(targetAssortment).length;
}

export function getInMemorySession(auditId: string): AuditSessionDetail | undefined {
  const state = loadPersistedData();
  return state.sessions[auditId];
}

export function getAllInMemorySessions(): AuditSessionDetail[] {
  const state = loadPersistedData();
  return Object.values(state.sessions).sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );
}

export function getStoreCredits(storeId?: string): StoreCreditWithDetail[] {
  const state = loadPersistedData();
  const list = state.storeCredits || [];
  const filtered = storeId ? list.filter((c) => c.store_id === storeId) : list;
  return filtered.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function createSessionFromDbItems(
  auditId: string,
  store: Store,
  dbItems: Item[]
): AuditSessionDetail {
  const state = loadPersistedData();
  const existing = state.sessions[auditId];

  // If an in_progress session already exists for this auditId, return it
  if (existing && existing.status === 'in_progress') {
    return existing;
  }

  // If the previous session with `session__${store.id}` was already submitted, archive it under a timestamped ID and start a fresh one!
  if (existing && existing.status === 'submitted') {
    const archiveId = `${auditId}__${new Date(existing.submitted_at || existing.updated_at).getTime()}`;
    state.sessions[archiveId] = { ...existing, id: archiveId };
  }

  const targetList = getInMemoryStoreTargetsWithItems(store.id, dbItems);
  const now = new Date().toISOString();

  const session: AuditSessionDetail = {
    id: auditId,
    store_id: store.id,
    auditor_id: 'local-auditor',
    status: 'in_progress',
    started_at: now,
    created_at: now,
    updated_at: now,
    store,
    items: targetList.map((t, idx) => {
      const item = t.item;
      const boxSize = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;
      const targetPar = t.par_level;
      const initialPhysical = 0;
      const calc = calculateReplenishment({
        physicalCount: initialPhysical,
        parLevel: targetPar,
        unitsPerBox: boxSize,
        minOrderQty: t.min_order_qty || boxSize,
      });
      const unitPrice = Number(item.unit_price) || 0;

      return {
        id: `audit-item-${idx}-${item.id.slice(0, 6)}`,
        audit_id: auditId,
        item_id: item.id,
        physical_count: initialPhysical,
        target_par: targetPar,
        deficit_qty: calc.deficitQty,
        suggested_order_qty: calc.suggestedQty,
        final_order_qty: calc.suggestedQty,
        return_qty: 0,
        return_reason: undefined,
        return_note: undefined,
        unit_price: unitPrice,
        credit_amount: 0,
        created_at: now,
        updated_at: now,
        item,
      };
    }),
  };

  state.sessions[auditId] = session;
  savePersistedData();
  return session;
}

export function updateMockSessionItems(
  auditId: string,
  items: Array<{
    itemId: string;
    physicalCount: number;
    finalOrderQty?: number;
    adjustmentReason?: string;
    targetPar?: number;
    returnQty?: number;
    returnReason?: ReturnReasonType;
    returnNote?: string;
  }>
) {
  const state = loadPersistedData();
  const session = state.sessions[auditId];
  if (!session) return;

  const storeAssortment = state.storeTargets[session.store_id] || {};
  const now = new Date().toISOString();

  items.forEach((inp) => {
    const target = session.items.find((i) => i.item_id === inp.itemId);
    if (target) {
      if (typeof inp.targetPar === 'number' && inp.targetPar >= 0) {
        target.target_par = inp.targetPar;
        if (storeAssortment[inp.itemId]) {
          storeAssortment[inp.itemId].parLevel = inp.targetPar;
        }
      }

      target.physical_count = Math.max(0, inp.physicalCount);
      const boxSize = target.item?.units_per_box || 1;
      const calc = calculateReplenishment({
        physicalCount: target.physical_count,
        parLevel: target.target_par,
        unitsPerBox: boxSize,
      });

      target.deficit_qty = calc.deficitQty;
      target.suggested_order_qty = calc.suggestedQty;
      target.final_order_qty =
        typeof inp.finalOrderQty === 'number' ? Math.max(0, inp.finalOrderQty) : calc.suggestedQty;
      target.adjustment_reason = inp.adjustmentReason ?? target.adjustment_reason;

      if (typeof inp.returnQty === 'number') {
        const unitPrice = Number(target.item?.unit_price ?? target.unit_price) || 0;
        const creditCalc = calculateReturnCredit(unitPrice, inp.returnQty);
        target.return_qty = creditCalc.returnQty;
        target.unit_price = unitPrice;
        target.credit_amount = creditCalc.creditAmount;
        target.return_reason =
          creditCalc.returnQty > 0
            ? inp.returnReason || target.return_reason || 'DAMAGED'
            : undefined;
        target.return_note = inp.returnNote ?? target.return_note;
      }

      target.updated_at = now;
    }
  });

  session.updated_at = now;
  savePersistedData();
}

export function submitMockSession(auditId: string, notes?: string) {
  const state = loadPersistedData();
  const session = state.sessions[auditId];
  const now = new Date().toISOString();
  const orderId = `order-${Date.now()}`;
  const orderNo = `SO-${now.slice(0, 10).replace(/-/g, '')}-${String(
    Object.keys(state.sessions).length
  ).padStart(4, '0')}`;

  let totalCreditIssued = 0;
  let returnItemsCount = 0;

  if (session) {
    session.status = 'submitted';
    session.submitted_at = now;
    session.order_id = orderId;
    session.notes = notes;
    session.updated_at = now;

    // Remove previous credits for this same auditId to avoid duplicates
    state.storeCredits = (state.storeCredits || []).filter((c) => c.audit_id !== auditId);

    // Automatically register Store Credits for any returned items (DAMAGED / OUT_OF_DATE / etc.)
    session.items.forEach((ai) => {
      if (ai.return_qty > 0) {
        const unitPrice = Number(ai.item?.unit_price ?? ai.unit_price) || 0;
        const creditCalc = calculateReturnCredit(unitPrice, ai.return_qty);
        returnItemsCount += 1;
        totalCreditIssued = Number((totalCreditIssued + creditCalc.creditAmount).toFixed(2));

        state.storeCredits.push({
          id: `crd-${Date.now()}-${ai.item_id.slice(0, 6)}`,
          store_id: session.store_id,
          audit_id: auditId,
          item_id: ai.item_id,
          return_qty: creditCalc.returnQty,
          return_reason: ai.return_reason || 'DAMAGED',
          unit_price: creditCalc.unitPrice,
          credit_unit_price: creditCalc.discountedUnitPrice,
          credit_amount: creditCalc.creditAmount,
          note: ai.return_note || notes,
          status: 'ISSUED',
          created_at: now,
          store: session.store,
          item: ai.item,
        });
      }
    });
  }

  savePersistedData();

  return {
    orderId,
    orderNo,
    totalCreditIssued,
    returnItemsCount,
  };
}
