import { createClient } from '../lib/supabase/server';
import { calculateReplenishment, calculateReturnCredit } from '../lib/replenishment';
import {
  InventoryAudit,
  AuditSessionDetail,
  AuditItemDetail,
  Store,
  Item,
  ReturnReasonType,
} from '../types/store-inv';
import {
  getInMemorySession,
  createSessionFromDbItems,
  updateMockSessionItems,
  MOCK_STORES,
} from '../lib/mockData';

/**
 * Helper to load real store and active items directly from Supabase `stores` and `items` tables
 */
export async function loadStoreAndItemsFromSupabase(storeIdHint?: string): Promise<{
  store: Store;
  items: Item[];
}> {
  const supabase = await createClient();

  let store: Store | null = null;
  if (storeIdHint) {
    const { data: exactStore } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeIdHint)
      .maybeSingle();
    if (exactStore) store = exactStore as Store;
  }

  if (!store) {
    const { data: firstStore } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .limit(1)
      .maybeSingle();
    store = (firstStore as Store) || MOCK_STORES[0];
  }

  const { data: dbItems } = await supabase
    .from('items')
    .select('id, sku, name_en, upc, box_barcode, units_per_box, unit_price, box_price, category, image_url, uom, is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sku', { ascending: true });

  return {
    store,
    items: (dbItems || []) as Item[],
  };
}

export const auditService = {
  /**
   * Start or resume an audit session (loads ONLY the store's carried PAR items)
   */
  async startAuditSession(storeId: string, auditorId: string): Promise<InventoryAudit> {
    try {
      const supabase = await createClient();

      // 1. Check if an active session already exists in DB
      const { data: existing, error: existingError } = await supabase
        .from('inventory_audits')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingError && existing) {
        return existing as InventoryAudit;
      }

      // 2. Try creating a new session in DB (if migration is applied)
      const { data: audit, error: auditError } = await supabase
        .from('inventory_audits')
        .insert({
          store_id: storeId,
          auditor_id: auditorId !== '00000000-0000-0000-0000-000000000000' ? auditorId : null,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!auditError && audit) {
        const { data: targets } = await supabase
          .from('store_item_targets')
          .select(`
            item_id,
            par_level,
            min_order_qty,
            display_order,
            item:items (
              units_per_box,
              unit_price
            )
          `)
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (targets && targets.length > 0) {
          const initialAuditItems = targets.map((t: any) => {
            const unitsPerBox = t.item?.units_per_box || 1;
            const unitPrice = Number(t.item?.unit_price) || 0;
            const calc = calculateReplenishment({
              physicalCount: 0,
              parLevel: t.par_level,
              unitsPerBox,
              minOrderQty: t.min_order_qty || 1,
            });

            return {
              audit_id: audit.id,
              item_id: t.item_id,
              physical_count: 0,
              target_par: t.par_level,
              deficit_qty: calc.deficitQty,
              suggested_order_qty: calc.suggestedQty,
              final_order_qty: calc.suggestedQty,
              return_qty: 0,
              unit_price: unitPrice,
              credit_amount: 0,
            };
          });

          await supabase.from('inventory_audit_items').insert(initialAuditItems);
        }

        return audit as InventoryAudit;
      }
    } catch {
      // Migration not applied yet — use real Supabase `stores` and `items` with persisted store PAR list
    }

    const sessionId = `session__${storeId}`;
    const { store, items } = await loadStoreAndItemsFromSupabase(storeId);
    return createSessionFromDbItems(sessionId, store, items);
  },

  /**
   * Fetch audit session detail with real Supabase `stores` and `items`
   */
  async getAuditSessionDetail(auditId: string): Promise<AuditSessionDetail> {
    // 1. Check persisted session first
    const memSession = getInMemorySession(auditId);
    if (memSession) {
      return memSession;
    }

    // 2. Check DB if auditId is a UUID
    if (!auditId.startsWith('session')) {
      try {
        const supabase = await createClient();

        const { data: audit, error: auditError } = await supabase
          .from('inventory_audits')
          .select(`
            *,
            store:stores (*)
          `)
          .eq('id', auditId)
          .single();

        if (!auditError && audit) {
          const { data: items, error: itemsError } = await supabase
            .from('inventory_audit_items')
            .select(`
              *,
              item:items (*)
            `)
            .eq('audit_id', auditId);

          if (!itemsError && items && items.length > 0) {
            return {
              ...(audit as any),
              items: items as unknown as AuditItemDetail[],
            };
          }
        }
      } catch {
        // Fallback below
      }
    }

    // 3. Build session directly from real Supabase `stores` and store's PAR assortment
    const storeIdHint = auditId.startsWith('session__')
      ? auditId.replace('session__', '').split('__')[0]
      : undefined;
    const { store, items } = await loadStoreAndItemsFromSupabase(storeIdHint);
    return createSessionFromDbItems(auditId, store, items);
  },

  /**
   * Save audit draft counts, PAR overrides, and Return/Credit items
   */
  async saveAuditDraft(
    auditId: string,
    inputs: Array<{
      itemId: string;
      physicalCount: number;
      finalOrderQty?: number;
      adjustmentReason?: string;
      targetPar?: number;
      returnQty?: number;
      returnReason?: ReturnReasonType;
      returnNote?: string;
    }>
  ): Promise<void> {
    if (!auditId.startsWith('session')) {
      try {
        const supabase = await createClient();

        const { data: currentItems, error } = await supabase
          .from('inventory_audit_items')
          .select(`
            item_id,
            target_par,
            item:items (
              units_per_box,
              unit_price
            )
          `)
          .eq('audit_id', auditId);

        if (!error && currentItems && currentItems.length > 0) {
          const itemMap = new Map<
            string,
            { targetPar: number; unitsPerBox: number; unitPrice: number }
          >();
          currentItems.forEach((ci: any) => {
            itemMap.set(ci.item_id, {
              targetPar: ci.target_par,
              unitsPerBox: ci.item?.units_per_box || 1,
              unitPrice: Number(ci.item?.unit_price) || 0,
            });
          });

          const updates = inputs.map((input) => {
            const meta = itemMap.get(input.itemId) || {
              targetPar: 0,
              unitsPerBox: 1,
              unitPrice: 0,
            };
            const parLevel =
              typeof input.targetPar === 'number' ? input.targetPar : meta.targetPar;
            const calc = calculateReplenishment({
              physicalCount: input.physicalCount,
              parLevel,
              unitsPerBox: meta.unitsPerBox,
            });
            const creditCalc = calculateReturnCredit(meta.unitPrice, input.returnQty || 0);

            return {
              audit_id: auditId,
              item_id: input.itemId,
              physical_count: Math.max(0, input.physicalCount),
              target_par: parLevel,
              deficit_qty: calc.deficitQty,
              suggested_order_qty: calc.suggestedQty,
              final_order_qty:
                typeof input.finalOrderQty === 'number'
                  ? Math.max(0, input.finalOrderQty)
                  : calc.suggestedQty,
              adjustment_reason: input.adjustmentReason || null,
              return_qty: creditCalc.returnQty,
              return_reason: creditCalc.returnQty > 0 ? input.returnReason || 'DAMAGED' : null,
              return_note: input.returnNote || null,
              unit_price: meta.unitPrice,
              credit_amount: creditCalc.creditAmount,
              updated_at: new Date().toISOString(),
            };
          });

          await supabase
            .from('inventory_audit_items')
            .upsert(updates, { onConflict: 'audit_id,item_id' });
          return;
        }
      } catch {
        // Fallback to persisted session update
      }
    }

    updateMockSessionItems(auditId, inputs);
  },

  /**
   * Cancel audit session
   */
  async cancelAuditSession(auditId: string): Promise<void> {
    if (!auditId.startsWith('session')) {
      try {
        const supabase = await createClient();
        await supabase
          .from('inventory_audits')
          .update({ status: 'cancelled' })
          .eq('id', auditId);
      } catch {
        // ignore
      }
    }
  },
};
