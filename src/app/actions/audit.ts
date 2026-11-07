'use server';

import { revalidatePath } from 'next/cache';
import { auditService } from '../../services/audit.service';
import { orderService } from '../../services/order.service';
import { targetService } from '../../services/target.service';
import { InventoryAudit, Item, ReturnReasonType } from '../../types/store-inv';

type ActionResponse<T> =
  | ({ success: true } & T)
  | { success: false; error: string };

/**
 * Start or resume a store audit session
 */
export async function startAuditAction(
  storeId: string,
  auditorId: string
): Promise<ActionResponse<{ session: InventoryAudit }>> {
  try {
    const session = await auditService.startAuditSession(storeId, auditorId);
    revalidatePath(`/audit/${session.id}`);
    return { success: true, session };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start audit';
    return { success: false, error: message };
  }
}

/**
 * Auto-save audit draft counts, PAR overrides, and Return/Credit items
 */
export async function saveAuditDraftAction(
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
): Promise<ActionResponse<Record<string, never>>> {
  try {
    await auditService.saveAuditDraft(auditId, items);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save draft';
    return { success: false, error: message };
  }
}

/**
 * Dynamically add an item from Master Catalog to this store's carried PAR list & active audit
 */
export async function addCatalogItemToAuditAction(params: {
  storeId: string;
  auditId: string;
  itemId: string;
  parLevel: number;
  physicalCount?: number;
  returnQty?: number;
  returnReason?: ReturnReasonType;
  returnNote?: string;
}): Promise<ActionResponse<{ item: Item }>> {
  try {
    const item = await targetService.addItemToStoreAssortment(params);
    if (!item) {
      return { success: false, error: 'Item not found in Master Catalog' };
    }
    revalidatePath(`/audit/${params.auditId}`);
    revalidatePath(`/audit/${params.auditId}/review`);
    revalidatePath('/targets');
    return { success: true, item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add item to store';
    return { success: false, error: message };
  }
}

/**
 * Remove an item from a store's carried PAR list (and active audit if provided)
 */
export async function removeItemFromStoreAction(params: {
  storeId: string;
  itemId: string;
  auditId?: string;
}): Promise<ActionResponse<Record<string, never>>> {
  try {
    await targetService.removeItemFromStoreAssortment(
      params.storeId,
      params.itemId,
      params.auditId
    );
    if (params.auditId) {
      revalidatePath(`/audit/${params.auditId}`);
      revalidatePath(`/audit/${params.auditId}/review`);
    }
    revalidatePath('/targets');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove item from store';
    return { success: false, error: message };
  }
}

/**
 * Submit final replenishment order & automatically register Store Credits for Returns
 */
export async function submitAuditOrderAction(
  auditId: string,
  userId: string,
  notes?: string
): Promise<
  ActionResponse<{
    orderId: string;
    orderNo: string;
    totalCreditIssued: number;
    returnItemsCount: number;
  }>
> {
  try {
    const result = await orderService.submitAuditOrder(auditId, userId, notes);
    revalidatePath(`/audit/${auditId}`);
    revalidatePath('/history');
    revalidatePath('/');
    return { success: true, ...result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit order';
    return { success: false, error: message };
  }
}
