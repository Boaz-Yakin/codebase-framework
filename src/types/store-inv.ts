/**
 * Store-Inv 핵심 도메인 타입 정의
 */

export type AuditStatus = 'in_progress' | 'submitted' | 'cancelled';

export type ReturnReasonType = 'DAMAGED' | 'OUT_OF_DATE' | 'DEFECTIVE' | 'OTHER';

export const RETURN_REASON_LABELS: Record<ReturnReasonType, string> = {
  DAMAGED: 'Damaged',
  OUT_OF_DATE: 'Out of Date (Expired)',
  DEFECTIVE: 'Defective / Quality Issue',
  OTHER: 'Other Return',
};

export interface Store {
  id: string;
  tenant_id?: string;
  name: string;
  store_no?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  tenant_id?: string;
  sku: string;
  name_en: string;
  upc?: string;
  box_barcode?: string;
  units_per_box?: number;
  unit_price?: number;
  box_price?: number;
  category?: string;
  image_url?: string;
  uom?: string;
  is_active: boolean;
}

export interface StoreItemTarget {
  id: string;
  tenant_id?: string;
  store_id: string;
  item_id: string;
  par_level: number;
  min_order_qty: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreTargetWithItem extends StoreItemTarget {
  item: Item;
}

export interface StoreTargetLog {
  id: string;
  tenant_id?: string;
  store_id: string;
  item_id: string;
  old_par: number;
  new_par: number;
  reason?: string;
  changed_by?: string;
  created_at: string;
}

export interface InventoryAudit {
  id: string;
  tenant_id?: string;
  store_id: string;
  auditor_id: string;
  status: AuditStatus;
  order_id?: string;
  started_at: string;
  submitted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryAuditItem {
  id: string;
  tenant_id?: string;
  audit_id: string;
  item_id: string;
  physical_count: number;
  target_par: number;
  deficit_qty: number;
  suggested_order_qty: number;
  final_order_qty: number;
  adjustment_reason?: string;
  return_qty: number;
  return_reason?: ReturnReasonType;
  return_note?: string;
  unit_price: number;
  credit_amount: number;
  created_at: string;
  updated_at: string;
}

export interface StoreCredit {
  id: string;
  tenant_id?: string;
  store_id: string;
  audit_id?: string;
  item_id: string;
  return_qty: number;
  return_reason: ReturnReasonType;
  unit_price: number;
  credit_unit_price: number;
  credit_amount: number;
  note?: string;
  status: 'ISSUED' | 'APPLIED' | 'CANCELLED';
  created_at: string;
}

export interface StoreCreditWithDetail extends StoreCredit {
  store?: Store;
  item?: Item;
}

export interface ReturnCreditResult {
  unitPrice: number;
  discountedUnitPrice: number; // unitPrice - (unitPrice * 0.05)
  deductionPerUnit: number;    // unitPrice * 0.05
  returnQty: number;
  creditAmount: number;        // (unitPrice - unitPrice * 0.05) * returnQty
}

export interface AuditItemDetail extends InventoryAuditItem {
  item: Item;
}

export interface AuditSessionDetail extends InventoryAudit {
  store: Store;
  items: AuditItemDetail[];
}

export interface ReplenishmentInput {
  physicalCount: number;      // 현장 실사 진열 수량
  parLevel: number;           // 매장 기준 적정 재고 (PAR)
  unitsPerBox?: number | null; // 박스당 입수량 (기본값: 1)
  inTransitQty?: number;      // 미입고 배송중 수량 (기본값: 0)
  minOrderQty?: number;       // 최소 발주 단위 (기본값: 1)
  roundToBox?: boolean;       // 박스 단위 올림 적용 여부 (기본 true)
}

export interface ReplenishmentResult {
  deficitQty: number;         // 단순 부족 수량 (최소 0)
  suggestedQty: number;       // 자동 추천 발주 수량 (낱개 기준)
  boxCount: number;           // 발주 박스(Case) 수량
}
