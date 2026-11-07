'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuditStore } from '../../store/useAuditStore';
import { removeItemFromStoreAction } from '../../app/actions/audit';
import { AuditItemCard } from './AuditItemCard';
import { QuickStepper } from './QuickStepper';
import { VirtualNumpad } from './VirtualNumpad';
import { BarcodeScanner } from './BarcodeScannerModal';

export const PhoneView: React.FC = () => {
  const {
    items,
    store,
    audit,
    activeItemId,
    setActiveItem,
    updatePhysicalCount,
    stepPhysicalCount,
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);

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
    <div className="flex flex-col min-h-screen bg-gray-100 pb-36">
      {/* ================= Sticky Top Search, +Add Item & Category Filter Bar ================= */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-3 py-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-gray-700 hover:text-blue-600">
              ← Home
            </Link>
            <span>•</span>
            <span className="font-extrabold text-gray-900 truncate max-w-[180px]">
              {store?.name || 'Store Audit'}
            </span>
          </div>
          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
            Store PAR Items: {items.length}
          </span>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store shelf items..."
              className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700 text-xs font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAddCatalogOpen(true, null)}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold whitespace-nowrap shadow-xs active:scale-95"
          >
            + Add Item
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ================= Item List Area ================= */}
      <div className="flex-1 p-3 space-y-2.5">
        {filteredItems.map((item) => (
          <AuditItemCard
            key={item.item_id}
            item={item}
            isActive={item.item_id === activeItemId}
            onSelect={() => setActiveItem(item.item_id)}
            onStep={(delta) => stepPhysicalCount(item.item_id, delta)}
            onOpenNumpad={() => {
              setActiveItem(item.item_id);
              setIsNumpadOpen(true);
            }}
            onOpenReturnModal={() => {
              setActiveItem(item.item_id);
              setReturnModalItemId(item.item_id);
            }}
            onRemoveFromStore={() => handleRemoveFromStore(item.item_id)}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="py-12 px-4 text-center space-y-3">
            <p className="text-xs text-gray-500">
              No items found in this store&apos;s current PAR list.
            </p>
            <button
              type="button"
              onClick={() => setAddCatalogOpen(true, null)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-extrabold shadow-xs"
            >
              + Search Master Catalog &amp; Add Item to Store
            </button>
          </div>
        )}
      </div>

      {/* ================= Bottom Thumb-Zone Controller ================= */}
      {activeItem && (
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 p-2.5 shadow-lg">
          <div className="max-w-md mx-auto space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px] text-gray-600">
              <span className="font-bold text-gray-900 truncate max-w-[200px]">
                {activeItem.item?.name_en}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReturnModalItemId(activeItem.item_id)}
                  className="text-[11px] font-bold text-rose-700 underline"
                >
                  Return/Credit
                </button>
                <span className="font-mono font-bold text-amber-800">
                  Count: {activeItem.physical_count} (PAR {activeItem.target_par})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-gray-900 text-white text-xl active:scale-95 shadow-xs"
                title="Scan Barcode"
              >
                📷
              </button>
              <div className="flex-1">
                <QuickStepper
                  onStep={(delta) => stepPhysicalCount(activeItem.item_id, delta)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Sticky Bottom Summary & CTA Bar ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-gray-900 text-white px-4 flex items-center justify-between border-t border-gray-800 shadow-2xl">
        <div className="flex items-center space-x-2.5 text-xs">
          <div>
            Order <span className="font-bold text-amber-400">{totalBoxes} Cases</span>
          </div>
          {returnSummary.totalCreditAmount > 0 && (
            <>
              <div className="text-gray-600">|</div>
              <div>
                Credit{' '}
                <span className="font-bold text-rose-400">
                  +${returnSummary.totalCreditAmount.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        <Link
          href={`/audit/${audit?.id}/review`}
          className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-xs rounded-full shadow-xs active:scale-95 transition-transform"
        >
          Review &amp; Submit →
        </Link>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setSelectedCategory('ALL');
          setSearchQuery('');
          focusByBarcode(code);
          setIsScannerOpen(false);
        }}
        mode="modal"
      />

      {/* Virtual Numpad Bottom Sheet Modal */}
      {isNumpadOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0">
          <div className="w-full bg-white rounded-t-3xl p-4 shadow-2xl max-w-md animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h4 className="font-bold text-sm text-gray-900 truncate">
                Enter Qty — {activeItem.item?.name_en}
              </h4>
              <button
                type="button"
                onClick={() => setIsNumpadOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <VirtualNumpad
              value={activeItem.physical_count}
              onChange={(val) => updatePhysicalCount(activeItem.item_id, val)}
              onClose={() => setIsNumpadOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
