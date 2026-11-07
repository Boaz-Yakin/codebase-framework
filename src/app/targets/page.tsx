import React from 'react';
import { createClient } from '../../lib/supabase/server';
import { targetService } from '../../services/target.service';
import { StoreTargetsClient } from './StoreTargetsClient';
import { MOCK_STORES } from '../../lib/mockData';

export const dynamic = 'force-dynamic';

export default async function StoreTargetsPage() {
  let stores: any[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('stores')
      .select('id, name, store_no, address, is_active')
      .eq('is_active', true)
      .order('name');
    if (data && data.length > 0) {
      stores = data;
    }
  } catch {
    // fallback
  }

  if (stores.length === 0) {
    stores = MOCK_STORES;
  }

  const initialStoreId = stores[0].id;
  const [initialTargets, masterCatalog] = await Promise.all([
    targetService.getStoreTargets(initialStoreId),
    targetService.getMasterCatalogItems(),
  ]);

  return (
    <StoreTargetsClient
      stores={stores}
      initialStoreId={initialStoreId}
      initialTargets={initialTargets}
      masterCatalog={masterCatalog}
    />
  );
}
