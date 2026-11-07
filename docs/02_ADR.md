# ADR: Store-Inv 아키텍처 결정 기록 (Architecture Decision Records)

> 이 문서는 `store-inv`의 기술적 의사결정과 그 배경을 기록합니다.  
> 모든 결정은 기존 WMS/G-manager 생태계와의 완벽한 정합성을 기준으로 수립되었습니다.

---

## ADR-001: WMS/G-Manager 생태계 공통 Supabase DB 공유 (Single Source of Truth)

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 당사는 이미 창고 및 물류 관리를 위한 `WMS web-app`, 현장 피킹을 위한 `mobile-app`, 통합 관리를 위한 `G-manager`를 운영 중이며, 모두 단일 Supabase PostgreSQL 인스턴스를 공유하고 있습니다.
* `store-inv`는 대형 매장(Food Depot 등)의 진열대 재고를 실사하여 부족분을 본사 WMS로 발주하는 현장 모바일 앱입니다.
* 별도의 독립 데이터베이스를 구축할 경우, 품목 마스터(`items`), 매장 정보(`stores`), 주문 데이터(`orders`)의 동기화 지연 및 이중 관리 문제가 발생합니다.

### 결정 (Decision)
* **`store-inv`는 기존 WMS/G-manager와 완전히 동일한 Supabase 프로젝트(DB, Auth, Storage)를 직접 참조합니다.**
* 기존의 `items`, `stores`, `orders`, `order_items`, `users` 테이블을 그대로 읽고 쓰며, `store-inv` 전용 요구사항(PAR Level, 실사 세션)에 대해서만 테이블을 확장(`store_item_targets`, `inventory_audits`, `inventory_audit_items`)합니다.

### 결과 및 영향 (Consequences)
* **장점**:
  * 마스터 데이터(SKU, 바코드, 단가, 매장 정보) 중복 제로.
  * `store-inv`에서 발주 완료 즉시 WMS `orders` 테이블에 `PENDING` 상태로 등록되어, 창고 피킹 큐(`mobile-app`)에 실시간 노출.
  * G-manager 및 WMS 대시보드에서 매장별 발주 현황을 별도 연동 API 없이 즉시 조회 가능.
* **제약/주의사항**:
  * 기존 테이블의 컬럼이나 스키마를 임의로 변경하지 않고, 신규 컬럼/테이블 추가 시 기존 서비스에 부작용이 없도록 하위 호환성을 유지해야 합니다.

---

## ADR-002: Next.js 15 App Router + Server Actions + PWA

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 현장 직원은 이동 중 스마트폰(iOS Safari, Android Chrome)으로 빠르게 조작해야 합니다.
* 앱스토어 심사 및 배포 지연 없이 즉각적인 업데이트가 가능해야 하며, 대형 마트 내부의 전파 음영 지역에서도 동작해야 합니다.

### 결정 (Decision)
* **프레임워크**: Next.js 15 (App Router) + TypeScript (strict mode)
* **데이터 페칭/변이**: Server Component 및 Server Actions 위주 설계 (Client Component는 UI 인터랙션 및 로컬 상태에만 국한)
* **PWA (Progressive Web App)**: 모바일 홈 화면 추가(Add to Home Screen), 서비스 워커 캐싱 지원
* **바코드 스캔**: 웹 표준 기반 `html5-qrcode` 카메라 스캐너 라이브러리 채택

### 결과 및 영향 (Consequences)
* 모바일 네이티브 앱 수준의 빠른 터치 반응성과 전체화면 몰입감 제공.
* 앱 배포 시 URL 업데이트만으로 모든 사용자에게 즉시 최신 버전 반영.

---

## ADR-003: WMS 표준 주문 파이프라인 연계 및 트랜잭션 보장

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 실사 결과 산출된 발주 수량은 WMS 물류팀이 인지할 수 있는 정식 주문(`orders`)으로 자동 변환되어야 합니다.
* 실사 세션 마감(`inventory_audits`)과 주문 등록(`orders`, `order_items`)은 원자적(Atomic)으로 처리되어야 하며, 네트워크 오류 시 중복 주문이 발생하지 않아야 합니다.

### 결정 (Decision)
* 발주 제출 시 Supabase RPC(PostgreSQL Database Function) 또는 Server Action 트랜잭션을 통해:
  1. `orders` 테이블에 신규 행 생성 (`status = 'PENDING'`, `order_no = 'SO-YYYYMMDD-XXXX'`, `note = '[Store-Inv] Food Depot 실사 자동 발주'`)
  2. `order_items`에 계산된 부족분 품목 일괄 삽입 (`item_id`, `qty`, `price`, `uom`)
  3. `inventory_audits`의 상태를 `submitted`로 갱신하고 생성된 `order_id`를 외래키로 연결
* 이 모든 과정을 단일 트랜잭션으로 처리하여 데이터 무결성을 보장합니다.

---

## ADR-004: 매장별 동적 PAR Level 관리 및 실사 스냅샷 불변성 보장

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06 (개정)

### 맥락 (Context)
* 대형 매장(Food Depot 등)은 매장 규모, 상권 특성, 매대 크기, 행사 여부에 따라 매장마다 목표 재고(PAR)가 완전히 상이합니다.
* 프로모션, 시즌 행사, 매대 리모델링에 따라 PAR 기준이 정기적이지 않고 비정기적으로 수시 업데이트됩니다.
* 만약 현재 PAR 기준이 수정되었다고 해서 과거 실사 당시의 기준치까지 함께 바뀌어 버리면, 과거 재고 결품 분석 및 감사 데이터가 왜곡됩니다.
* 또한 본사 출고는 낱개 단위가 아닌 박스/케이스 단위(`units_per_box`)로 출고되는 경우가 일반적입니다.

### 결정 (Decision)
1. **매장별/품목별 독립 PAR 관리**: `store_item_targets` 테이블에 `store_id`와 `item_id`의 복합 고유키로 매장별 독립 관리.
2. **비정기 변경 지원 UI & API**: 인라인 그리드 고속 편집, 타 매장 PAR 세팅 복사(Clone), CSV 일괄 업로드 지원.
3. **변경 이력 추적**: `store_target_logs` 테이블을 통해 변경 일시, 변경자, 이전값/신규값, 변경 사유를 보관.
4. **실사 스냅샷 불변성(Immutable Snapshot)**: 실사 세션 생성 시점의 최신 PAR 수치를 `inventory_audit_items.target_par`에 고정 기록하여, 향후 마스터 PAR이 바뀌더라도 과거 실사 데이터의 불변성을 영구 보장.
5. **박스 단위 자동 올림**: 부족분 계산 시 박스 단위 올림($\lceil \text{Deficit} / \text{units\_per\_box} \rceil \times \text{units\_per\_box}$)을 기본 적용하되, 현장 검토 시 수동 조정을 허용.

### 결과 및 영향 (Consequences)
* 지점별 특성에 맞춘 초정밀 발주량 산출 가능.
* 신규 매장 오픈 시 기존 우수 매장의 PAR을 1초 만에 복사하여 초기 세팅 공수 대폭 절감.
* 데이터 감사 및 통계 분석의 신뢰성 100% 확보.

---

## ADR-005: 오프라인 대비 IndexedDB 로컬 임시 저장 정책

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 대형 마트(Food Depot 등)의 건물 구조상 특정 코너나 지하 진열대에서 LTE/Wi-Fi 신호가 끊어질 수 있습니다.

### 결정 (Decision)
* 실사 세션 시작 시 해당 매장의 품목 마스터 및 PAR Level 데이터를 클라이언트 `IndexedDB`에 로컬 캐싱합니다.
* 실사 입력값 변경 시마다 즉시 로컬에 자동 저장(Auto-save)합니다.
* 네트워크 연결이 복구되면 백그라운드에서 서버로 배치 동기화(Batch Sync)를 수행합니다.

---

## ADR-006: Phone & Tablet 적응형 반응형 UI 아키텍처 (Adaptive Master-Detail & Bottom-Sheet)

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 현장 직원은 스마트폰(Phone)을 손에 들고 기동성 있게 매대를 이동하며 실사하거나, 매장 카트에 태블릿(Tablet)을 거치하여 넓은 화면에서 대량 품목을 고속으로 검토·입력하는 두 가지 주요 사용 시나리오가 공존합니다.
* 스마트폰 화면에서는 단일 열(Single Column)과 엄지손가락 영역(Bottom Thumb-Zone) 중심의 컴팩트한 레이아웃이 필수적이며, 태블릿 화면에서는 넓은 뷰포트(768px 이상)를 활용하여 품목 탐색과 상세 입력, 스캐너가 한눈에 보이는 2단 분할(Split-View)이 작업 생산성을 극대화합니다.

### 결정 (Decision)
1. **반응형 브레이크포인트 기준**: Tailwind CSS 표준 브레이크포인트(`md: 768px`)를 기준으로 레이아웃 구조를 적응형(Adaptive)으로 분기.
   * **Phone (< 768px)**:
     - 1열 리스트 뷰 + 하단 플로팅 퀵 액션바 (`+1`, `+5`, `+10`, `-1`, 텐키 패드).
     - 바코드 카메라는 Bottom Sheet 또는 풀 모달로 열려 빠른 스캔 후 즉시 입력창 포커스.
     - 하단 Sticky 요약 바: 진행률, 발주 총 박스 수, 발주 검토 바로가기.
   * **Tablet (≥ 768px)**:
     - 2단 분할(Master-Detail Split View) 레이아웃 적용.
     - 좌측(40%): 카테고리 탭 + 품목 목록 (진열 순서 및 실시간 부족 박스 수 표시).
     - 우측(60%): 선택된 품목의 고밀도 작업창 (상세 정보, 실사 텐키 패드, PAR/재고 비교, 상시/토글 카메라 스캔 뷰파인더, 발주 요약).
2. **반응형 상태 공유**:
   - Phone과 Tablet 모두 동일한 Zustand 세션 스토어(`useAuditStore`)를 공유하여, 디바이스 회전(Portrait ↔ Landscape)이나 화면 크기 변화 시에도 실사 입력 데이터 및 포커스 상태가 100% 무손실 유지되도록 보장.
3. **최소 터치 타겟**:
   - 현장 작업자의 장갑 착용 및 이동 중 조작을 고려하여 모든 인터랙티브 터치 버튼은 최소 `48px × 48px` 이상으로 강제.

### 결과 및 영향 (Consequences)
* 단일 코드베이스로 Phone과 Tablet 현장 사용자 모두에게 맞춤형 UX 제공.
* 태블릿 환경에서 화면 이동 없는 원스톱 실사로 현장 작업 시간 40% 이상 추가 단축.

---

## ADR-007: 매장별 진열 품목(Store Assortment) 분리 및 실사 중 동적 품목 편입

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 본사 마스터 카탈로그(`public.items`)에는 298개의 전체 상품이 존재하지만, 각 매장마다 실제로 진열하는 품목(Assortment)은 일부에 불과합니다.
* 모든 매장의 실사 화면에 298개 전체 품목을 노출하면 불필요한 스크롤과 탐색 비용이 발생합니다.
* 동시에 현장 방문 시 기존 리스트에 없던 새 품목을 매대에 추가 진열할 수 있어야 하며, 한 번 추가된 품목은 다음번 재고 조사 시에도 해당 매장의 진열 리스트로 유지되어야 합니다.

### 결정 (Decision)
1. **2-Tier 품목 관리**:
   * **Master Catalog (`public.items`)**: 전체 품목 풀로 유지하며 검색 및 바코드 매칭 소스로 활용.
   * **Store Assortment (`store_item_targets`)**: 매장별 실제 진열 품목(`is_active = true`) 및 목표 재고(PAR Level)만 보관.
2. **실사 시 매장별 진열 리스트만 로드**:
   * 실사 세션 생성 시 해당 매장의 `store_item_targets`에 등록된 품목만 로드.
3. **실사 중 동적 품목 추가 및 영구 반영 (Auto-Persistence)**:
   * 실사 도중 `+ Add Item` 모달 또는 미등록 바코드 스캔을 통해 Master Catalog 품목을 추가하면, 현재 실사 세션(`inventory_audit_items`)에 추가함과 동시에 해당 매장의 `store_item_targets`에 즉시 Upsert하여 차기 실사 시 자동 노출되도록 보장.

---

## ADR-008: 반품(Return: Damaged / Out of Date) 및 매장 Credit 자동 산출 정책

### 상태 (Status)
**승인됨 (Approved)** — 2026-11-06

### 맥락 (Context)
* 현장 재고 조사 시 매대에 파손(`DAMAGED`), 유통기한 경과(`OUT_OF_DATE`), 오배송/불량(`DEFECTIVE`) 등의 사유로 반품(Return) 처리해야 할 상품이 발생합니다.
* 반품된 수량은 즉시 해당 매장의 크레딧(Store Credit)으로 정산·등록되어야 수기 정산 누락을 방지할 수 있습니다.

### 결정 (Decision)
1. **반품 사유 분류**: `DAMAGED` (파손), `OUT_OF_DATE` (유통기한 경과), `DEFECTIVE` (불량/품질이상), `OTHER` (기타).
2. **매장 Credit 산출 공식**:
   $$\text{Credit Amount} = \text{round}\left((\text{Unit Price} - \text{Unit Price} \times 0.05) \times \text{Return Qty},\ 2\right)$$
   즉, 품목 단가(`items.unit_price`)에서 5%를 차감한 금액(`unit_price * 0.95`)에 반품 수량을 곱하여 자동 산출합니다.
3. **자동 Credit 등록**:
   * 실사 중 또는 실사 제출 시 반품 수량이 1개 이상인 항목은 자동으로 해당 매장의 Credit 내역(`store_credits` / `store_return_items`)으로 등록되며, 발주 검토 화면과 History/Credits 화면에서 실시간 확인 가능합니다.
