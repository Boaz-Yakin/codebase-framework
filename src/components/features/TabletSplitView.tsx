'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuditStore } from '../../store/useAuditStore';
import { removeItemFromStoreAction } from '../../app/actions/audit';
import { RETURN_REASON_LABELS } from '../../types/store-inv';
import { QuickStepper } from './QuickStepper';
import { VirtualNumpad } from './VirtualNumpad';
import { DeficitBadge } from './DeficitBadge';
import { BarcodeScanner } from './BarcodeScannerModal';

export const TabletSplitView: React.FC = () => {
  const {
    items,
    store,
    audit,
    activeItemId,
    setActiveItem,
    updatePhysicalCount,
    stepPhysicalCount,
    updateTargetPar,
    focusByBarcode,
    setAddCatalogOpen,
    setReturnModalItemId,
    removeItemFromSession,
    getProgress,
    getTotalOrderBoxes,
    getTotalReturnSummary,
  } = useAuditStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showInlineScanner, setShowInlineScanner] = useState(false);

  const categories = [
    'ALL',
    ...Array.from(new Set(items.map((i) => i.item?.category).filter(Boolean))),
  ];

  const filteredItems = items.filter((it) => {
    const matchesCat = selectedCategory === 'ALL' || it.item?.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      it.item?.name_en?.toLowerCase().includes(query) ||
      it.item?.sku?.toLowerCase().includes(query) ||
      it.item?.upc?.toLowerCase().includes(query) ||
      it.item?.box_barcode?.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  const activeItem = items.find((i) => i.item_id === activeItemId) || items[0] || null;
  const activeUnitsPerBox = activeItem?.item?.units_per_box || 1;
  const activeBoxCount = Math.ceil((activeItem?.final_order_qty || 0) / activeUnitsPerBox);
  const activeUnitPrice = Number(activeItem?.item?.unit_price ?? activeItem?.unit_price) || 0;
  const progress = getProgress();
  const totalBoxes = getTotalOrderBoxes();
  const returnSummary = getTotalReturnSummary();

  const handleRemoveFromStore = async (itemId: string) => {
    if (!store) return;
    await removeItemFromStoreAction({
      storeId: store.id,
      itemId,
      auditId: audit?.id,
    });
    removeItemFromSession(itemId);
  };

  return (
    <div className="flex w-full h-[calc(100vh-48px)] overflow-hidden bg-gray-100">
      {/* ================= Left Panel (42%): Store Carried PAR Item List ================= */}
      <div className="w-[42%] min-w-[360px] flex flex-col border-r border-gray-200 bg-white">
        {/* Store Header + Add Item Button */}
        <div className="p-3 border-b border-gray-200 bg-gray-50/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/"
                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                ← Home
              </Link>
              <div className="truncate">
                <span className="text-[10px] font-bold uppercase text-blue-600 block">
                  Store Shelf PAR List ({items.length} items)
                </span>
                <h3 className="text-sm font-extrabold text-gray-900 truncate">
                  {store?.name || 'Store Audit'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAddCatalogOpen(true, null)}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs shrink-0"
            >
              + Add Catalog Item
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search this store's carried items..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat as string)}
                className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredItems.map((item) => {
            const isSelected = item.item_id === activeItemId;
            const unitsPerBox = item.item?.units_per_box || 1;
            const boxCount = Math.ceil((item.final_order_qty || 0) / unitsPerBox);
            const unitPrice = Number(item.item?.unit_price ?? item.unit_price) || 0;
            const hasReturn = (item.return_qty || 0) > 0;

            return (
              <div
                key={item.item_id}
                onClick={() => setActiveItem(item.item_id)}
                className={`p-3 cursor-pointer select-none transition-colors ${
                  isSelected ? 'bg-amber-50/80 border-l-4 border-amber-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono text-gray-500">{item.item?.sku}</span>
                      {item.item?.category && (
                        <span className="text-[10px] text-gray-400">· {item.item.category}</span>
                      )}
                      <span className="text-[11px] font-bold text-emerald-700">
                        · ${unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {item.item?.name_en}
                    </h4>
                  </div>
                  <DeficitBadge deficitQty={item.deficit_qty} boxCount={boxCount} />
                </div>

                {hasReturn && (
                  <div className="mt-1.5 px-2 py-1 rounded bg-rose-50 border border-rose-200 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-800">
                      ↩ Return: {item.return_qty} pcs (
                      {RETURN_REASON_LABELS[item.return_reason || 'DAMAGED']})
                    </span>
                    <span className="font-extrabold text-rose-700">
                      Credit: +${Number(item.credit_amount || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>PAR: {item.target_par} ea</span>
                  <span className="font-bold font-mono text-gray-900">
                    Count: {item.physical_count} ea
                  </span>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-gray-500">
                No items match or this store&apos;s PAR list is empty.
              </p>
              <button
                type="button"
                onClick={() => setAddCatalogOpen(true, null)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
              >
                + Add Item from Master Catalog
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= Right Panel (58%): Detail Workspace, Return/Credit & Numpad ================= */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Top Action Bar: Progress, Order, Store Credit & Review CTA */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs flex-wrap gap-2">
          <div className="flex items-center space-x-3 text-xs">
            <span className="font-bold text-gray-500 uppercase tracking-wider">
              Progress:{' '}
              <strong className="text-gray-900">
                {progress.completed}/{progress.total}
              </strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-500 uppercase tracking-wider">
              Order: <strong className="text-amber-700">{totalBoxes} Cases</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-500 uppercase tracking-wider">
              Store Credit:{' '}
              <strong className="text-rose-600">
                +${returnSummary.totalCreditAmount.toFixed(2)} ({returnSummary.returnItemsCount}{' '}
                items)
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInlineScanner(!showInlineScanner)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border shadow-xs transition-colors ${
                showInlineScanner
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {showInlineScanner ? '✕ Close Camera' : '📷 Live Scanner'}
            </button>

            <Link
              href={`/audit/${audit?.id}/review`}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-lg shadow-xs active:scale-95 transition-transform"
            >
              Review Order &amp; Credit →
            </Link>
          </div>
        </div>

        {activeItem ? (
          <>
            {/* Inline Barcode Scanner Viewfinder */}
            {showInlineScanner && (
              <div className="h-48 rounded-xl overflow-hidden border border-gray-300 shadow-inner">
                <BarcodeScanner
                  isOpen={showInlineScanner}
                  onClose={() => setShowInlineScanner(false)}
                  onScan={(code) => {
                    focusByBarcode(code);
                  }}
                  mode="inline"
                />
              </div>
            )}

            {/* Selected Item Detail Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {activeItem.item?.sku}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Unit Price: ${activeUnitPrice.toFixed(2)}
                    </span>
                    {activeItem.item?.upc && (
                      <span className="text-xs font-mono text-gray-500">
                        UPC: {activeItem.item.upc}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 leading-snug">
                    {activeItem.item?.name_en}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setReturnModalItemId(activeItem.item_id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      (activeItem.return_qty || 0) > 0
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {(activeItem.return_qty || 0) > 0
                      ? `↩ Return: ${activeItem.return_qty} pcs ($${Number(
                          activeItem.credit_amount || 0
                        ).toFixed(2)})`
                      : '+ Register Return / Credit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromStore(activeItem.item_id)}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-rose-600 hover:bg-gray-100 border border-gray-200"
                    title="Remove item from this store's PAR list"
                  >
                    Remove from Store
                  </button>
                </div>
              </div>

              {/* Return Banner if active */}
              {(activeItem.return_qty || 0) > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-rose-900">
                      Return Registered ({RETURN_REASON_LABELS[activeItem.return_reason || 'DAMAGED']}
                      ):
                    </span>{' '}
                    <span className="text-rose-800">
                      {activeItem.return_qty} units &times; ($
                      {activeUnitPrice.toFixed(2)} - 5%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-rose-700">
                      Auto Credit: +${Number(activeItem.credit_amount || 0).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReturnModalItemId(activeItem.item_id)}
                      className="text-xs font-bold text-rose-700 underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}

              {/* PAR vs Count Visualization Bar (with inline PAR adjustment) */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Store Target PAR</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateTargetPar(
                          activeItem.item_id,
                          Math.max(0, activeItem.target_par - activeUnitsPerBox)
                        )
                      }
                      className="w-6 h-6 rounded bg-white border border-gray-300 text-xs font-bold text-gray-700"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold text-gray-900">
                      {activeItem.target_par} ea
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateTargetPar(activeItem.item_id, activeItem.target_par + activeUnitsPerBox)
                      }
                      className="w-6 h-6 rounded bg-white border border-gray-300 text-xs font-bold text-gray-700"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="border-x border-gray-200">
                  <div className="text-xs text-gray-500 mb-0.5">Case Pack Size</div>
                  <div className="text-xl font-bold text-gray-800">{activeUnitsPerBox} ea/case</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Suggested Order</div>
                  <div className="text-xl font-extrabold text-amber-800">
                    {activeBoxCount} {activeBoxCount === 1 ? 'Case' : 'Cases'} (
                    {activeItem.final_order_qty} ea)
                  </div>
                </div>
              </div>

              {/* Large Physical Count Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-2xl border-2 border-amber-300">
                <span className="text-xs font-bold text-amber-900 mb-1 uppercase tracking-wider">
                  On-Shelf Good Physical Count
                </span>
                <span className="text-5xl font-mono font-black text-gray-950 tracking-tight">
                  {activeItem.physical_count}
                </span>
                <span className="text-xs text-gray-500 mt-1">Units (EA)</span>
              </div>

              {/* One-Touch Quick Stepper */}
              <QuickStepper
                onStep={(delta) => stepPhysicalCount(activeItem.item_id, delta)}
              />
            </div>

            {/* Virtual Numpad */}
            <div className="flex justify-center">
              <VirtualNumpad
                value={activeItem.physical_count}
                onChange={(val) => updatePhysicalCount(activeItem.item_id, val)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-3">
            <span>Select an item from the store list or add a new item from Master Catalog</span>
            <button
              type="button"
              onClick={() => setAddCatalogOpen(true, null)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
            >
              + Add Item from Master Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
