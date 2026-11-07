import { ReplenishmentInput, ReplenishmentResult, ReturnCreditResult } from '../types/store-inv';

/**
 * 대형 매장 실사 기반 자동 보충 발주 수량 산출 엔진 (Replenishment Calculation Engine)
 *
 * 공식:
 * 1. 부족분 = max(0, PAR Level - 실사수량 - 미입고 배송중 수량)
 * 2. 박스 단위 올림 = ceil(부족분 / 박스당 입수량) * 박스당 입수량
 * 3. 최소 주문 수량(MOQ) 충족 검증
 */
export function calculateReplenishment(input: ReplenishmentInput): ReplenishmentResult {
  const {
    physicalCount,
    parLevel,
    unitsPerBox = 1,
    inTransitQty = 0,
    minOrderQty = 1,
    roundToBox = true,
  } = input;

  const validPhysicalCount = Math.max(0, physicalCount || 0);
  const validParLevel = Math.max(0, parLevel || 0);
  const validInTransit = Math.max(0, inTransitQty || 0);
  const boxSize = unitsPerBox && unitsPerBox > 0 ? Math.floor(unitsPerBox) : 1;
  const validMinOrderQty = Math.max(1, minOrderQty || 1);

  // 1. 단순 부족분 산출 (음수 방지)
  const deficitQty = Math.max(0, validParLevel - validPhysicalCount - validInTransit);

  if (deficitQty === 0) {
    return {
      deficitQty: 0,
      suggestedQty: 0,
      boxCount: 0,
    };
  }

  // 2. 박스(Case Pack) 단위 올림 계산
  let suggestedQty = deficitQty;
  let boxCount = 1;

  if (roundToBox && boxSize > 1) {
    boxCount = Math.ceil(deficitQty / boxSize);
    suggestedQty = boxCount * boxSize;
  } else {
    boxCount = Math.ceil(suggestedQty / boxSize);
  }

  // 3. 최소 주문 단위(MOQ) 충족 검증
  if (suggestedQty < validMinOrderQty) {
    suggestedQty = validMinOrderQty;
    boxCount = Math.ceil(suggestedQty / boxSize);
  }

  return {
    deficitQty,
    suggestedQty,
    boxCount,
  };
}

/**
 * 매장 반품(Return: Damaged / Out of Date 등)에 대한 Store Credit 자동 계산 함수
 *
 * 공식:
 * Credit Amount = (단가 - 단가의 5%) * 갯수
 */
export function calculateReturnCredit(
  unitPrice: number | null | undefined,
  returnQty: number | null | undefined
): ReturnCreditResult {
  const validUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const validQty = Math.max(0, Math.floor(Number(returnQty) || 0));

  const deductionPerUnit = Number((validUnitPrice * 0.05).toFixed(4));
  const discountedUnitPrice = Number((validUnitPrice - validUnitPrice * 0.05).toFixed(4));
  const creditAmount = Number(((validUnitPrice - validUnitPrice * 0.05) * validQty).toFixed(2));

  return {
    unitPrice: validUnitPrice,
    discountedUnitPrice,
    deductionPerUnit,
    returnQty: validQty,
    creditAmount,
  };
}
