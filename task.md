# 프로젝트 작업 목록 (Task Tracker) — Store-Inv

> **프로젝트**: Store-Inv (대형 매장 재고 실사 & 자동 보충 발주 앱)  
> **상세 플랜**: [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | [01_PRD.md](docs/01_PRD.md)

---

## 📌 Phase 1: 기획, 아키텍처 및 데이터 스키마 확정 (Design-First)
- [x] 1.1 통합 개발 계획서 및 요구사항 정의 (`docs/DEVELOPMENT_PLAN.md`, `docs/01_PRD.md`)
- [x] 1.2 아키텍처 및 기술 결정서 작성 (`docs/02_ADR.md` — WMS/G-Manager 공통 Supabase DB 공유, ADR-006 Phone/Tablet 반응형 확정)
- [x] 1.3 데이터베이스 스키마 및 API 기술 설계 (`docs/03_TRD.md` — 기존 테이블 매핑, DDL, RPC 설계, 반응형 아키텍처)
- [x] 1.4 Phone/Tablet 반응형 UI 가이드 수립 (`docs/04_UI_GUIDE.md` — 1열 썸존 / 2단 Split-View)
- [ ] 1.5 Supabase 신규 테이블 마이그레이션 SQL 실행 (향후 배포 단계에서 실행 — SQL 스크립트 작성 완료)

---

## 🏗️ Phase 2: 코어 비즈니스 로직 및 매장별 PAR 관리 시스템
- [x] 2.1 매장/품목 마스터 및 동적 PAR Level 관리 서비스 & 화면 구현 (`services/target.service.ts`, `app/targets/page.tsx` — 인라인 수정, 타 매장 복사)
- [x] 2.2 PAR 변경 이력 로깅 및 실사 스냅샷 불변성 보장 로직 (`store_target_logs`)
- [x] 2.3 자동 보충 발주 계산 엔진 구현 (`lib/replenishment.ts` — 부족분 산출, Case 단위 올림)
- [x] 2.4 보충 발주 및 반품 Credit 계산 로직 유닛 테스트 (`tests/replenishment.test.ts`)
- [x] 2.5 실사 세션 생명주기 관리 서비스 구현 (`services/audit.service.ts`)
- [x] 2.6 매장별 진열 품목(PAR) 독립 관리 및 현장 실사 중 Master Catalog 동적 품목 추가/제외 (`AddCatalogItemModal.tsx`)
- [x] 2.7 반품(Return: Damaged/Out of Date) 등록 및 `(단가 - 단가의 5%) × 수량` 매장 Credit 자동 산출·등록 (`ReturnCreditModal.tsx`)

---

## ⚡ Phase 3: Phone & Tablet 적응형 현장 실사 웹 인터페이스
- [x] 3.1 매장 선택 및 실사 진입 화면 (`app/audit/page.tsx`, `app/audit/StoreAuditSelector.tsx`)
- [x] 3.2 Phone(단일 열/상단 검색·카테고리 필터/하단 썸존) & Tablet(2단 Split-View) 고속 실사 입력 UI 컴포넌트 (`AuditMainView.tsx`, `PhoneView.tsx`, `TabletSplitView.tsx`, `QuickStepper.tsx`, `VirtualNumpad.tsx`)
- [x] 3.3 반응형 카메라 바코드(UPC) 스캐너 구현 (`BarcodeScannerModal.tsx` — Phone 바텀시트 / Tablet 인라인 뷰파인더)
- [x] 3.4 오프라인/음영지역 로컬 임시 저장 및 자동 동기화 구현 (`hooks/useOfflineSync.ts`, `store/useAuditStore.ts`)

---

## 🚀 Phase 4: 발주 검토, WMS 연동 및 현장 검증
- [x] 4.1 Phone & Tablet 적응형 발주 검토 및 미세 조정 화면 (`app/audit/[id]/review/page.tsx`, `AuditReviewClient.tsx`)
- [x] 4.2 WMS 주문 테이블 연동 및 트랜잭션 전송 (`services/order.service.ts` & `submit_store_audit_order` RPC)
- [x] 4.3 실사 이력 및 통계 조회 기능 (`app/history/page.tsx`)
- [ ] 4.4 Food Depot 매장 현장 파일럿 검증 및 UX 튜닝 (Phone 한 손 조작 / Tablet 카트 거치 검증)
- [ ] 4.5 아키텍처 규칙 및 문서 동기화 검증 (`scripts/validate-arch.ps1`)
