# 프로젝트 작업 목록 (Task Tracker)

> [!NOTE]
> AI 에이전트는 작업 착수 시 `[/]`(진행중)로 표시하고, 완료 시 `[x]`(완료)로 업데이트합니다.
> **이 파일은 프레임워크 템플릿입니다.** 새 프로젝트에서 사용할 때는 Phase 2~3의
> 예시 항목을 실제 기능(PRD의 F-번호 기준)으로 교체해주세요.

---

## 📌 Phase 0: 기획 & 설계 (Design-First)
- [ ] 0.1 제품 기획서 확정 (`docs/01_PRD.md`)
- [ ] 0.2 아키텍처 및 기술 스택 결정 (`docs/02_ADR.md`)
- [ ] 0.3 초기 핵심 기능 TRD 작성 (`docs/03_TRD.md`)
- [ ] 0.4 UI/UX 디자인 시스템 확인 (`docs/04_UI_GUIDE.md` — 기본값: Amazon-inspired, ADR-006)

---

## 🏗️ Phase 1: 기반 아키텍처 & 초기 셋업
- [ ] 1.1 프로젝트 디렉토리 뼈대 생성 (`src/components`, `src/services`, `src/types` 등)
- [ ] 1.2 공통 타입 및 인터페이스 정의 (`src/types/`)
- [ ] 1.3 DB 클라이언트 및 기본 서비스 레이어 셋업 (`src/services/`)
- [ ] 1.4 공통 UI 원자 컴포넌트 셋업 (`src/components/ui/`)

---

## ⚡ Phase 2: 핵심 기능 구현 (MVP)
<!-- 아래 항목은 예시입니다. PRD의 실제 F-번호 기능으로 교체하세요. -->
- [ ] 2.1 [{예: F-001}] {예: 사용자 인증/세션 관리} (`services/auth.service.ts`, `app/api/auth/`)
- [ ] 2.2 [{예: F-002}] {예: 메인 대시보드 및 데이터 조회 레이어}
- [ ] 2.3 [{예: F-003}] {예: 핵심 비즈니스 로직 및 등록/수정 플로우}

---

## 🛡️ Phase 3: QA 및 아키텍처 검증
- [ ] 3.1 아키텍처 규칙 검증 통과 (`scripts/validate-arch.ps1` 또는 `scripts/validate-arch.sh`)
- [ ] 3.2 문서 동기화 및 완성도 확인 (`scripts/sync-docs.ps1` 또는 `scripts/sync-docs.sh`)
- [ ] 3.3 린트 및 타입 체크 통과 (`npm run lint`, `npm run type-check`)
- [ ] 3.4 단위 및 E2E 테스트 통과 (`npm test`, `npm run test:e2e`)
