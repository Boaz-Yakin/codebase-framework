import { describe, it, expect } from 'vitest';
import { calculateReplenishment, calculateReturnCredit } from '../lib/replenishment';

describe('calculateReplenishment — 보충 발주 자동 계산 엔진', () => {
  it('실사 수량이 PAR Level과 일치하거나 초과하면 발주량이 0이어야 한다', () => {
    // 1) 정확히 일치
    const res1 = calculateReplenishment({
      physicalCount: 20,
      parLevel: 20,
      unitsPerBox: 6,
    });
    expect(res1).toEqual({ deficitQty: 0, suggestedQty: 0, boxCount: 0 });

    // 2) 초과 재고
    const res2 = calculateReplenishment({
      physicalCount: 25,
      parLevel: 20,
      unitsPerBox: 6,
    });
    expect(res2).toEqual({ deficitQty: 0, suggestedQty: 0, boxCount: 0 });
  });

  it('재고가 0일 때 PAR 수량만큼 박스 단위로 정확히 올림 계산해야 한다', () => {
    // PAR 24, Box 6 -> 4박스 (24개)
    const res = calculateReplenishment({
      physicalCount: 0,
      parLevel: 24,
      unitsPerBox: 6,
    });
    expect(res).toEqual({
      deficitQty: 24,
      suggestedQty: 24,
      boxCount: 4,
    });
  });

  it('부족분이 발생했을 때 박스 입수량(unitsPerBox) 단위로 올림(Ceil)되어야 한다', () => {
    // PAR 20, 현재 5개 -> 부족 15개
    // Box당 6개 -> ceil(15 / 6) = 3박스 -> 발주량 18개
    const res = calculateReplenishment({
      physicalCount: 5,
      parLevel: 20,
      unitsPerBox: 6,
    });
    expect(res).toEqual({
      deficitQty: 15,
      suggestedQty: 18,
      boxCount: 3,
    });
  });

  it('미입고 배송중(inTransitQty) 수량이 있으면 부족분에서 차감되어야 한다', () => {
    // PAR 20, 현재 5개, 배송중 5개 -> 순부족 10개
    // Box당 6개 -> ceil(10 / 6) = 2박스 -> 발주량 12개
    const res = calculateReplenishment({
      physicalCount: 5,
      parLevel: 20,
      inTransitQty: 5,
      unitsPerBox: 6,
    });
    expect(res).toEqual({
      deficitQty: 10,
      suggestedQty: 12,
      boxCount: 2,
    });
  });

  it('최소 발주 수량(minOrderQty) 기준이 있을 경우 충족하도록 보정되어야 한다', () => {
    // PAR 10, 현재 8개 -> 부족 2개
    // MOQ 12, Box 6 -> 2박스 (12개)로 보정
    const res = calculateReplenishment({
      physicalCount: 8,
      parLevel: 10,
      unitsPerBox: 6,
      minOrderQty: 12,
    });
    expect(res).toEqual({
      deficitQty: 2,
      suggestedQty: 12,
      boxCount: 2,
    });
  });

  it('박스 올림(roundToBox)이 false이거나 박스 입수량이 1일 때는 낱개 수량 그대로 산출되어야 한다', () => {
    // PAR 15, 현재 8개 -> 부족 7개 (roundToBox: false)
    const res = calculateReplenishment({
      physicalCount: 8,
      parLevel: 15,
      unitsPerBox: 6,
      roundToBox: false,
    });
    expect(res).toEqual({
      deficitQty: 7,
      suggestedQty: 7,
      boxCount: 2, // ceil(7 / 6) = 2박스 공간
    });
  });

  it('음수 입력 등 유효하지 않은 값도 0으로 안전하게 보정되어야 한다', () => {
    const res = calculateReplenishment({
      physicalCount: -5,
      parLevel: 10,
      unitsPerBox: -2,
    });
    // physicalCount -5 -> 0, unitsPerBox -2 -> 1
    // deficit = 10, suggested = 10, boxCount = 10
    expect(res).toEqual({
      deficitQty: 10,
      suggestedQty: 10,
      boxCount: 10,
    });
  });
});

describe('calculateReturnCredit — 반품(Damaged/Out of Date) Credit 산출 엔진', () => {
  it('(단가 - 단가의 5%) * 갯수 공식으로 정확히 Credit 금액을 계산해야 한다', () => {
    // 단가 $10.00, 수량 4개 -> ($10.00 - $0.50) * 4 = $9.50 * 4 = $38.00
    const res1 = calculateReturnCredit(10.0, 4);
    expect(res1.unitPrice).toBe(10);
    expect(res1.discountedUnitPrice).toBe(9.5);
    expect(res1.returnQty).toBe(4);
    expect(res1.creditAmount).toBe(38.0);

    // 단가 $4.20, 수량 3개 -> ($4.20 - $0.21) * 3 = $3.99 * 3 = $11.97
    const res2 = calculateReturnCredit(4.2, 3);
    expect(res2.discountedUnitPrice).toBe(3.99);
    expect(res2.creditAmount).toBe(11.97);
  });

  it('수량이 0이거나 음수일 때 Credit은 0이어야 한다', () => {
    expect(calculateReturnCredit(15.0, 0).creditAmount).toBe(0);
    expect(calculateReturnCredit(15.0, -3).creditAmount).toBe(0);
  });
});
