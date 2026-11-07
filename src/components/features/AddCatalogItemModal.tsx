'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuditStore } from '../../store/useAuditStore';
import { addCatalogItemToAuditAction } from '../../app/actions/audit';
import { Item, ReturnReasonType, RETURN_REASON_LABELS } from '../../types/store-inv';
import { calculateReturnCredit } from '../../lib/replenishment';

export const AddCatalogItemModal: React.FC = () => {
  const {
    audit,
    store,
    items,
    masterCatalog,
    isAddCatalogOpen,
    preselectedCatalogItem,
    setAddCatalogOpen,
    addCatalogItemToSession,
  } = useAuditStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [parLevel, setParLevel] = useState<number>(12);
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [includeReturn, setIncludeReturn] = useState<boolean>(false);
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnReason, setReturnReason] = useState<ReturnReasonType>('DAMAGED');
  const [returnNote, setReturnNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync preselected item (e.g. from barcode scan of an unlisted item)
  useEffect(() => {
    if (preselectedCatalogItem) {
      setSelectedItem(preselectedCatalogItem);
      const box = preselectedCatalogItem.units_per_box || 1;
      setParLevel(box * 2);
      setPhysicalCount(0);
      setIncludeReturn(false);
      setReturnQty(0);
    } else {
      setSelectedItem(null);
    }
  }, [preselectedCatalogItem, isAddCatalogOpen]);

  const carriedIds = useMemo(() => new Set(items.map((i) => i.item_id)), [items]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    masterCatalog.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [masterCatalog]);

  const availableCatalogItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return masterCatalog
      .filter((it) => {
        const matchCat = selectedCategory === 'ALL' || it.category === selectedCategory;
        const matchSearch =
          !q ||
          it.name_en.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          (it.upc && it.upc.includes(q));
        return matchCat && matchSearch;
      })
      .slice(0, 60);
  }, [masterCatalog, search, selectedCategory]);

  if (!isAddCatalogOpen || !store || !audit) return null;

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    const box = item.units_per_box && item.units_per_box > 0 ? item.units_per_box : 1;
    setParLevel(box * 2);
    setPhysicalCount(0);
    setIncludeReturn(false);
    setReturnQty(0);
  };

  const creditPreview = selectedItem
    ? calculateReturnCredit(selectedItem.unit_price || 0, includeReturn ? returnQty : 0)
    : null;

  const handleConfirmAdd = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await addCatalogItemToAuditAction({
        storeId: store.id,
        auditId: audit.id,
        itemId: selectedItem.id,
        parLevel,
        physicalCount,
        returnQty: includeReturn ? returnQty : 0,
        returnReason: includeReturn ? returnReason : undefined,
        returnNote: includeReturn ? returnNote : undefined,
      });

      addCatalogItemToSession({
        item: selectedItem,
        parLevel,
        physicalCount,
        returnQty: includeReturn ? returnQty : 0,
        returnReason: includeReturn ? returnReason : undefined,
        returnNote: includeReturn ? returnNote : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 md:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Store Assortment &bull; {store.name}
            </span>
            <h2 className="text-lg font-extrabold">
              {selectedItem
                ? 'Configure & Add Item to Store Shelf'
                : 'Add Item from Master Catalog'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAddCatalogOpen(false, null)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            Close
          </button>
        </div>

        {/* Step 1: Search & Pick Item (if not selected yet) */}
        {!selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 298 master items by Name, SKU, or UPC barcode..."
                autoFocus
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Category filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {availableCatalogItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No matching items in Master Catalog.
                </div>
              ) : (
                availableCatalogItems.map((it) => {
                  const alreadyInStore = carriedIds.has(it.id);
                  return (
                    <div
                      key={it.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {it.sku}
                          </span>
                          {it.category && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {it.category}
                            </span>
                          )}
                          <span className="text-xs font-bold text-emerald-700">
                            ${Number(it.unit_price || 0).toFixed(2)}/ea
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">{it.name_en}</p>
                        <p className="text-xs text-slate-400">
                          Case Pack: {it.units_per_box || 1} units
                          {it.upc ? ` • UPC: ${it.upc}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectItem(it)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all ${
                          alreadyInStore
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                        }`}
                      >
                        {alreadyInStore ? 'Already in Store (Edit)' : '+ Select Item'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Configure PAR Level, Current Shelf Count & Optional Return */
          <div className="p-5 space-y-4 overflow-y-auto">
            {preselectedCatalogItem && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                Scanned barcode matched an item in the Master Catalog that was not yet on this
                store&apos;s PAR shelf list. Set its PAR &amp; count below to add it permanently.
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {selectedItem.sku}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    Unit Price: ${Number(selectedItem.unit_price || 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({selectedItem.units_per_box || 1} units/case)
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{selectedItem.name_en}</h3>
              </div>
              {!preselectedCatalogItem && (
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                >
                  Change Item
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target PAR Level */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Store Target PAR Level (Units)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParLevel(Math.max(0, parLevel - (selectedItem.units_per_box || 1)))}
                    className="w-10 h-10 rounded-lg bg-slate-100 font-bold text-slate-700"
                  >
                    -{selectedItem.units_per_box || 1}
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={parLevel}
                    onChange={(e) => setParLevel(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-10 text-center font-extrabold text-lg border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setParLevel(parLevel + (selectedItem.units_per_box || 1))}
                    className="w-10 h-10 rounded-lg bg-blue-50 font-bold text-blue-700"
                  >
                    +{selectedItem.units_per_box || 1}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saved to this store&apos;s permanent PAR list for future audits.
                </p>
              </div>

              {/* Current Shelf Physical Count */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Current Shelf Count (Units)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhysicalCount(Math.max(0, physicalCount - 1))}
                    className="w-10 h-10 rounded-lg bg-slate-100 font-bold text-slate-700"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={physicalCount}
                    onChange={(e) =>
                      setPhysicalCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full h-10 text-center font-extrabold text-lg border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setPhysicalCount(physicalCount + 1)}
                    className="w-10 h-10 rounded-lg bg-blue-50 font-bold text-blue-700"
                  >
                    +1
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Good sellable units currently on the shelf.
                </p>
              </div>
            </div>

            {/* Optional Return / Credit registration right when adding */}
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-extrabold text-rose-800 uppercase">
                  Also Register Return (Damaged / Out of Date) for Store Credit?
                </span>
                <input
                  type="checkbox"
                  checked={includeReturn}
                  onChange={(e) => setIncludeReturn(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded"
                />
              </label>

              {includeReturn && (
                <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Return Reason
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value as ReturnReasonType)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                      >
                        {(Object.keys(RETURN_REASON_LABELS) as ReturnReasonType[]).map((r) => (
                          <option key={r} value={r}>
                            {RETURN_REASON_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Return Quantity (Units)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={returnQty}
                        onChange={(e) =>
                          setReturnQty(Math.max(0, parseInt(e.target.value, 10) || 0))
                        }
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-extrabold text-rose-700"
                      />
                    </div>
                  </div>

                  {creditPreview && creditPreview.returnQty > 0 && (
                    <div className="p-2.5 rounded-lg bg-white border border-rose-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        Credit Formula: (${creditPreview.unitPrice.toFixed(2)} - 5%) &times;{' '}
                        {creditPreview.returnQty}
                      </span>
                      <span className="font-extrabold text-rose-700">
                        Store Credit: ${creditPreview.creditAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddCatalogOpen(false, null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAdd}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md disabled:opacity-50"
              >
                {isSaving ? 'Adding to Store...' : 'Add to Store PAR & Current Audit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
