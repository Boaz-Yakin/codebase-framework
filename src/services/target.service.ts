import { createClient } from '../lib/supabase/server';
import { Item, ReturnReasonType, StoreTargetWithItem } from '../types/store-inv';
import {
  getInMemoryStoreTargetsWithItems,
  setInMemoryStoreTargets,
  cloneInMemoryStoreTargets,
  addCatalogItemToStoreAndSession,
  removeInMemoryStoreTargetItem,
} from '../lib/mockData';

export async function loadActiveItemsFromSupabase(): Promise<Item[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('items')
    .select('id, sku, name_en, upc, box_barcode, units_per_box, unit_price, box_price, category, image_url, uom, is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sku', { ascending: true });
  return (data || []) as Item[];
}

export const targetService = {
  /**
   * Fetch the full 298-item Master Catalog from Supabase `public.items`
   */
  async getMasterCatalogItems(): Promise<Item[]> {
    return loadActiveItemsFromSupabase();
  },

  /**
   * Fetch store item PAR targets and display order (ONLY items carried by this store)
   */
  async getStoreTargets(storeId: string): Promise<StoreTargetWithItem[]> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('store_item_targets')
        .select(`
          id,
          tenant_id,
          store_id,
          item_id,
          par_level,
          min_order_qty,
          display_order,
          is_active,
          created_at,
          updated_at,
          item:items (
            id,
            sku,
            name_en,
            upc,
            box_barcode,
            units_per_box,
            unit_price,
            box_price,
            category,
            image_url,
            uom,
            is_active
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as unknown as StoreTargetWithItem[];
      }
    } catch {
      // Fallback to persisted store assortment
    }

    const dbItems = await loadActiveItemsFromSupabase();
    return getInMemoryStoreTargetsWithItems(storeId, dbItems);
  },

  /**
   * Add a new item from Master Catalog to this store's carried PAR list (and optionally active audit)
   */
  async addItemToStoreAssortment(params: {
    storeId: string;
    auditId?: string;
    itemId: string;
    parLevel: number;
    physicalCount?: number;
    returnQty?: number;
    returnReason?: ReturnReasonType;
    returnNote?: string;
  }): Promise<Item | null> {
    const dbItems = await loadActiveItemsFromSupabase();
    const item = dbItems.find((i) => i.id === params.itemId);
    if (!item) return null;

    try {
      const supabase = await createClient();
      const boxSize = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;

      await supabase.from('store_item_targets').upsert(
        {
          store_id: params.storeId,
          item_id: params.itemId,
          par_level: Math.max(0, params.parLevel),
          min_order_qty: boxSize,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,item_id' }
      );
    } catch {
      // Fallback to local persisted store assortment
    }

    addCatalogItemToStoreAndSession({
      storeId: params.storeId,
      auditId: params.auditId,
      item,
      parLevel: params.parLevel,
      physicalCount: params.physicalCount,
      returnQty: params.returnQty,
      returnReason: params.returnReason,
      returnNote: params.returnNote,
      dbItems,
    });

    return item;
  },

  /**
   * Remove an item from a store's carried PAR list
   */
  async removeItemFromStoreAssortment(
    storeId: string,
    itemId: string,
    auditId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase
        .from('store_item_targets')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('store_id', storeId)
        .eq('item_id', itemId);
    } catch {
      // ignore if table not migrated yet
    }

    removeInMemoryStoreTargetItem(storeId, itemId, auditId);
  },

  /**
   * Batch update store PAR levels & display order
   */
  async batchUpdateStoreTargets(
    storeId: string,
    updates: Array<{
      itemId: string;
      parLevel: number;
      displayOrder: number;
      minOrderQty?: number;
    }>,
    reason?: string,
    userId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();

      const records = updates.map((u) => ({
        store_id: storeId,
        item_id: u.itemId,
        par_level: Math.max(0, u.parLevel),
        display_order: u.displayOrder,
        min_order_qty: Math.max(1, u.minOrderQty || 1),
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('store_item_targets')
        .upsert(records, { onConflict: 'store_id,item_id' });

      if (!error) {
        if (updates.length > 0) {
          const logs = updates.map((u) => ({
            store_id: storeId,
            item_id: u.itemId,
            old_par: 0,
            new_par: Math.max(0, u.parLevel),
            reason: reason || 'Batch PAR Update',
            changed_by: userId || null,
          }));
          await supabase.from('store_target_logs').insert(logs);
        }
      }
    } catch {
      // Fallback to persisted store assortment
    }

    const dbItems = await loadActiveItemsFromSupabase();
    setInMemoryStoreTargets(storeId, updates, dbItems);
  },

  /**
   * Clone PAR settings from one store to another
   */
  async cloneStoreTargets(
    sourceStoreId: string,
    targetStoreId: string,
    overwrite: boolean = false
  ): Promise<number> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase.rpc('clone_store_targets', {
        p_source_store_id: sourceStoreId,
        p_target_store_id: targetStoreId,
        p_overwrite: overwrite,
      });

      if (!error && typeof data === 'number') {
        return data;
      }
    } catch {
      // Fallback to in-memory clone
    }

    const dbItems = await loadActiveItemsFromSupabase();
    return cloneInMemoryStoreTargets(sourceStoreId, targetStoreId, dbItems, overwrite);
  },
};
