'use server';

import { revalidatePath } from 'next/cache';
import { targetService } from '../../services/target.service';
import { Item, StoreTargetWithItem } from '../../types/store-inv';

type ActionResponse<T> =
  | ({ success: true } & T)
  | { success: false; error: string };

export async function getStoreTargetsAction(
  storeId: string
): Promise<ActionResponse<{ targets: StoreTargetWithItem[] }>> {
  try {
    const targets = await targetService.getStoreTargets(storeId);
    return { success: true, targets };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load targets';
    return { success: false, error: message };
  }
}

export async function addStoreTargetItemAction(params: {
  storeId: string;
  itemId: string;
  parLevel: number;
}): Promise<ActionResponse<{ item: Item }>> {
  try {
    const item = await targetService.addItemToStoreAssortment(params);
    if (!item) {
      return { success: false, error: 'Item not found in Master Catalog' };
    }
    revalidatePath('/targets');
    revalidatePath('/audit');
    return { success: true, item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add item to store';
    return { success: false, error: message };
  }
}

export async function removeStoreTargetItemAction(
  storeId: string,
  itemId: string
): Promise<ActionResponse<Record<string, never>>> {
  try {
    await targetService.removeItemFromStoreAssortment(storeId, itemId);
    revalidatePath('/targets');
    revalidatePath('/audit');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove item';
    return { success: false, error: message };
  }
}

export async function batchUpdateStoreTargetsAction(
  storeId: string,
  updates: Array<{
    itemId: string;
    parLevel: number;
    displayOrder: number;
    minOrderQty?: number;
  }>,
  reason?: string
): Promise<ActionResponse<Record<string, never>>> {
  try {
    await targetService.batchUpdateStoreTargets(storeId, updates, reason);
    revalidatePath('/targets');
    revalidatePath('/audit');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update store targets';
    return { success: false, error: message };
  }
}

export async function cloneStoreTargetsAction(
  sourceStoreId: string,
  targetStoreId: string,
  overwrite: boolean = true
): Promise<ActionResponse<{ copiedCount: number }>> {
  try {
    const copiedCount = await targetService.cloneStoreTargets(
      sourceStoreId,
      targetStoreId,
      overwrite
    );
    revalidatePath('/targets');
    return { success: true, copiedCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clone targets';
    return { success: false, error: message };
  }
}
