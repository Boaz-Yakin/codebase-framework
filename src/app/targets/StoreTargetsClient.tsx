'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { Item, Store, StoreTargetWithItem } from '../../types/store-inv';
import {
  getStoreTargetsAction,
  batchUpdateStoreTargetsAction,
  cloneStoreTargetsAction,
  addStoreTargetItemAction,
  removeStoreTargetItemAction,
} from '../actions/targets';

interface StoreTargetsClientProps {
  stores: Store[];
  initialStoreId: string;
  initialTargets: StoreTargetWithItem[];
  masterCatalog: Item[];
}

export const StoreTargetsClient: React.FC<StoreTargetsClientProps> = ({
  stores,
  initialStoreId,
  initialTargets,
  masterCatalog,
}) => {
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId);
  const [targets, setTargets] = useState<StoreTargetWithItem[]>(initialTargets);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [reason, setReason] = useState('');
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [cloneSourceStoreId, setCloneSourceStoreId] = useState(
    stores.find((s) => s.id !== initialStoreId)?.id || ''
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const carriedIds = useMemo(() => new Set(targets.map((t) => t.item_id)), [targets]);

  const categories = [
    'ALL',
    ...Array.from(new Set(targets.map((t) => t.item?.category).filter(Boolean))),
  ];

  const filteredTargets = targets.filter((t) => {
    const matchesCat = selectedCategory === 'ALL' || t.item?.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      t.item?.name_en?.toLowerCase().includes(q) ||
      t.item?.sku?.toLowerCase().includes(q) ||
      t.item?.upc?.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const filteredMasterCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return masterCatalog
      .filter((it) => {
        if (carriedIds.has(it.id)) return false;
        if (!q) return true;
        return (
          it.name_en.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          (it.upc && it.upc.includes(q)) ||
          (it.category && it.category.toLowerCase().includes(q))
        );
      })
      .slice(0, 60);
  }, [masterCatalog, catalogSearch, carriedIds]);

  const handleStoreChange = (newStoreId: string) => {
    setSelectedStoreId(newStoreId);
    setDirtyIds(new Set());
    setStatusMessage(null);
    startTransition(async () => {
      const res = await getStoreTargetsAction(newStoreId);
      if (res.success) {
        setTargets(res.targets);
      }
    });
  };

  const handleParChange = (itemId: string, newPar: number) => {
    const validPar = Math.max(0, newPar);
    setTargets((prev) =>
      prev.map((t) => (t.item_id === itemId ? { ...t, par_level: validPar } : t))
    );
    setDirtyIds((prev) => new Set(prev).add(itemId));
    setStatusMessage(null);
  };

  const handleOrderChange = (itemId: string, newOrder: number) => {
    const validOrder = Math.max(0, newOrder);
    setTargets((prev) =>
      prev.map((t) => (t.item_id === itemId ? { ...t, display_order: validOrder } : t))
    );
    setDirtyIds((prev) => new Set(prev).add(itemId));
    setStatusMessage(null);
  };

  const handleAddItemToStore = (item: Item) => {
    const boxSize = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;
    const defaultPar = boxSize * 2;
    startTransition(async () => {
      const res = await addStoreTargetItemAction({
        storeId: selectedStoreId,
        itemId: item.id,
        parLevel: defaultPar,
      });
      if (res.success) {
        const refreshed = await getStoreTargetsAction(selectedStoreId);
        if (refreshed.success) {
          setTargets(refreshed.targets);
        }
        setStatusMessage(`✓ Added "${item.name_en}" to this store's PAR shelf list.`);
      }
    });
  };

  const handleRemoveItemFromStore = (itemId: string, itemName?: string) => {
    startTransition(async () => {
      const res = await removeStoreTargetItemAction(selectedStoreId, itemId);
      if (res.success) {
        setTargets((prev) => prev.filter((t) => t.item_id !== itemId));
        setStatusMessage(`✓ Removed "${itemName || 'item'}" from this store's PAR list.`);
      }
    });
  };

  const handleSaveAll = () => {
    if (dirtyIds.size === 0) return;

    startTransition(async () => {
      const modified = targets
        .filter((t) => dirtyIds.has(t.item_id))
        .map((t) => ({
          itemId: t.item_id,
          parLevel: t.par_level,
          displayOrder: t.display_order,
          minOrderQty: t.min_order_qty,
        }));

      const res = await batchUpdateStoreTargetsAction(
        selectedStoreId,
        modified,
        reason || 'Manual PAR adjustment'
      );

      if (res.success) {
        setDirtyIds(new Set());
        setReason('');
        setStatusMessage(`✓ Saved ${modified.length} item target(s) successfully.`);
      } else {
        alert(`Failed to save targets: ${res.error}`);
      }
    });
  };

  const handleClone = () => {
    if (!cloneSourceStoreId || cloneSourceStoreId === selectedStoreId) return;

    startTransition(async () => {
      const res = await cloneStoreTargetsAction(cloneSourceStoreId, selectedStoreId, true);
      if (res.success) {
        const refreshed = await getStoreTargetsAction(selectedStoreId);
        if (refreshed.success) {
          setTargets(refreshed.targets);
        }
        setShowCloneModal(false);
        setDirtyIds(new Set());
        setStatusMessage(`✓ Cloned ${res.copiedCount} PAR targets from selected store.`);
      } else {
        alert(`Failed to clone targets: ${res.error}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 md:p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Store Assortment &amp; PAR Configuration
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
              Store-Specific PAR Shelf List ({targets.length} Carried Items)
            </h1>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold shadow-xs"
            >
              + Add Item from Catalog ({masterCatalog.length})
            </button>
            <button
              type="button"
              onClick={() => setShowCloneModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 hover:bg-gray-50 shadow-2xs"
            >
              📋 Clone From Store
            </button>
            <Link
              href="/"
              className="px-3.5 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 shadow-2xs"
            >
              🏠 Home
            </Link>
          </div>
        </div>

        {/* Store Selector & Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Target Store Branch
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Search Carried Items ({filteredTargets.length}/{targets.length})
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by SKU, item name, or UPC..."
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Change Reason (Audit Log)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Weekend promo / Shelf expansion"
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  disabled={dirtyIds.size === 0 || isPending}
                  onClick={handleSaveAll}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-gray-950 font-extrabold text-xs rounded-xl shadow-xs whitespace-nowrap"
                >
                  {isPending ? 'Saving...' : `Save (${dirtyIds.size})`}
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat as string)}
                className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {statusMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
              {statusMessage}
            </div>
          )}
        </div>

        {/* ================= Phone View (< 768px): Mobile Card Editor ================= */}
        <div className="block md:hidden space-y-2.5">
          {filteredTargets.map((t) => {
            const isModified = dirtyIds.has(t.item_id);
            const boxSize = t.item?.units_per_box || 1;
            const parCases = (t.par_level / boxSize).toFixed(1);

            return (
              <div
                key={t.item_id}
                className={`p-3.5 rounded-xl border bg-white space-y-2.5 ${
                  isModified ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {t.item?.sku} · {t.item?.category} · $
                      {Number(t.item?.unit_price || 0).toFixed(2)}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">{t.item?.name_en}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItemFromStore(t.item_id, t.item?.name_en)}
                    className="text-[11px] font-bold text-rose-600 hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-600">Order:</span>
                    <input
                      type="number"
                      value={t.display_order}
                      onChange={(e) =>
                        handleOrderChange(t.item_id, parseInt(e.target.value || '0', 10))
                      }
                      className="w-14 px-2 py-1 text-xs font-mono border border-gray-300 rounded-lg text-center"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-gray-700 mr-1">
                      PAR ({parCases}c):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleParChange(t.item_id, t.par_level - boxSize)}
                      className="w-8 h-8 rounded-lg border border-gray-300 bg-gray-50 font-bold text-xs"
                    >
                      -{boxSize}
                    </button>
                    <input
                      type="number"
                      value={t.par_level}
                      onChange={(e) =>
                        handleParChange(t.item_id, parseInt(e.target.value || '0', 10))
                      }
                      className="w-16 h-8 text-center font-mono font-bold text-sm border border-gray-300 rounded-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleParChange(t.item_id, t.par_level + boxSize)}
                      className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-xs"
                    >
                      +{boxSize}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= Tablet / Desktop View (≥ 768px): High-Density Grid ================= */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700">
                <th className="py-3 px-4 w-24">Shelf Order</th>
                <th className="py-3 px-4 w-28">Category</th>
                <th className="py-3 px-4 w-28">SKU</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 w-24 text-right">Unit Price</th>
                <th className="py-3 px-4 w-24 text-center">Pack Size</th>
                <th className="py-3 px-4 w-52 text-center">Target PAR Level (EA)</th>
                <th className="py-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredTargets.map((t) => {
                const isModified = dirtyIds.has(t.item_id);
                const boxSize = t.item?.units_per_box || 1;

                return (
                  <tr
                    key={t.item_id}
                    className={isModified ? 'bg-amber-50/60' : 'hover:bg-gray-50'}
                  >
                    <td className="py-2.5 px-4">
                      <input
                        type="number"
                        value={t.display_order}
                        onChange={(e) =>
                          handleOrderChange(t.item_id, parseInt(e.target.value || '0', 10))
                        }
                        className="w-16 px-2 py-1 text-xs font-mono border border-gray-300 rounded-lg text-center bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500 font-semibold">
                      {t.item?.category || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-600">
                      {t.item?.sku}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-gray-900">
                      {t.item?.name_en}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-emerald-700">
                      ${Number(t.item?.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs text-gray-600">
                      {boxSize} ea/case
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleParChange(t.item_id, t.par_level - boxSize)}
                          className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold"
                        >
                          -{boxSize}
                        </button>
                        <input
                          type="number"
                          value={t.par_level}
                          onChange={(e) =>
                            handleParChange(t.item_id, parseInt(e.target.value || '0', 10))
                          }
                          className="w-20 px-2 py-1 text-center font-mono font-bold text-sm border border-gray-300 rounded-lg bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleParChange(t.item_id, t.par_level + boxSize)}
                          className="px-2 py-1 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold"
                        >
                          +{boxSize}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemFromStore(t.item_id, t.item?.name_en)}
                        className="text-xs font-bold text-gray-400 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Catalog Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-400 block">
                  Master Catalog ({masterCatalog.length} Total Items)
                </span>
                <h3 className="font-extrabold text-base">
                  Add Items to Store Shelf Assortment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
              >
                Done
              </button>
            </div>

            <div className="p-3 border-b border-gray-200">
              <input
                type="search"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search uncarried catalog items by SKU, Name, or Category..."
                autoFocus
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredMasterCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-blue-700">{item.sku}</span>
                      {item.category && (
                        <span className="text-gray-400 font-semibold">· {item.category}</span>
                      )}
                      <span className="font-bold text-emerald-700">
                        · ${Number(item.unit_price || 0).toFixed(2)}/ea
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{item.name_en}</p>
                    <p className="text-xs text-gray-400">
                      Default PAR: {(item.units_per_box || 1) * 2} ea ({item.units_per_box || 1}{' '}
                      units/case)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAddItemToStore(item)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shrink-0"
                  >
                    + Add to Store
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-gray-900">
              Clone PAR Settings From Another Store
            </h3>
            <p className="text-xs text-gray-500">
              Copy all carried items, PAR levels, and shelf display orders from a source store to
              the currently selected store.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Source Store
              </label>
              <select
                value={cloneSourceStoreId}
                onChange={(e) => setCloneSourceStoreId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl"
              >
                {stores
                  .filter((s) => s.id !== selectedStoreId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleClone}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-xl"
              >
                {isPending ? 'Cloning...' : 'Clone Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
