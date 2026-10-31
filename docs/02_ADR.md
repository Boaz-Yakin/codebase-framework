# Architecture Decision Records
<!-- ADR: "어떤 시스템/기술 구조를 가져가는가?" -->
<!-- 각 결정은 번복하기 어려운 선택들이다. 충분한 근거와 트레이드오프를 반드시 기록한다 -->

## 철학

> {예: MVP 속도 최우선. 외부 의존성은 최소화한다. 작동하는 최소 구현을 선택하고, 필요할 때 교체한다.}

---

## ADR-001: {핵심 프레임워크 선택}
<!-- 예: Next.js 15 (App Router) 선택 -->

**상태**: Accepted  
**결정일**: {YYYY-MM-DD}  
**결정자**: {이름}

### Context (배경)
{왜 이 결정이 필요했는지 설명. 어떤 대안들을 검토했는지}

> 예: SSR이 필요한 데이터 중심 애플리케이션이며, SEO가 중요하다. React 생태계를 유지하면서 서버 렌더링을 지원하는 프레임워크가 필요했다.

### Decision (결정)
{무엇을 선택했는지}

> 예: Next.js 15 App Router를 선택한다. Server Components를 기본으로 사용하고, 인터랙션이 필요한 부분만 Client Component로 분리한다.

### Consequences (결과 & 트레이드오프)
| 장점 | 단점 |
|------|------|
| {예: Vercel 배포 연동 최적화} | {예: App Router 학습 곡선} |
| {예: Server Component로 API 키 노출 방지} | {예: Pages Router 대비 커뮤니티 자료 적음} |

### Rejected Alternatives (거절한 대안)
- **{예: Remix}**: {예: 팀 경험 부족. 전환 비용이 더 크다고 판단}
- **{예: Vite SPA}**: {예: SSR 미지원으로 SEO 불가}

---

## ADR-002: {데이터베이스 선택}
<!-- 예: Supabase (PostgreSQL) 선택 -->

**상태**: Accepted  
**결정일**: {YYYY-MM-DD}  
**결정자**: {이름}

### Context (배경)
{왜 이 결정이 필요했는지}

### Decision (결정)
{무엇을 선택했는지}

### Consequences (결과 & 트레이드오프)
| 장점 | 단점 |
|------|------|
| {장점 1} | {단점 1} |
| {장점 2} | {단점 2} |

### Rejected Alternatives (거절한 대안)
- **{대안 1}**: {거절 이유}

---

## ADR-003: {상태 관리 전략}

**상태**: Accepted  
**결정일**: {YYYY-MM-DD}

### Context
{서버 상태와 클라이언트 상태를 어떻게 관리할지 결정이 필요했다}

### Decision
- **서버 상태**: {예: React Query (TanStack Query) — API 데이터 캐싱 및 동기화}
- **클라이언트 상태**: {예: Zustand — 전역 UI 상태 (모달, 사이드바 등)}
- **로컬 상태**: {예: useState/useReducer — 컴포넌트 내부 상태}

### Consequences
| 장점 | 단점 |
|------|------|
| {장점 1} | {단점 1} |

---

## ADR-004: {인증/인가 전략}

**상태**: Accepted  
**결정일**: {YYYY-MM-DD}

### Decision
{예: Supabase Auth + Next.js Middleware를 사용한다. JWT 토큰 기반 세션 관리. 역할은 Admin/User 2가지로 제한(PRD-001 참조).}

### Security Rules
- {예: 모든 API Route는 서버 사이드에서 세션 검증 필수}
- {예: RLS(Row Level Security)를 데이터베이스 레벨에서 적용}
- {예: 민감한 작업은 서버 사이드 Admin 클라이언트만 허용}

---

## ADR-005: {배포 및 인프라 전략}

**상태**: Accepted  
**결정일**: {YYYY-MM-DD}

### Decision
{예: Vercel (프론트엔드) + Supabase (백엔드). CI/CD는 GitHub Actions.}

### Environment Strategy
| 환경 | 용도 | 브랜치 |
|------|------|--------|
| Production | 실제 서비스 | `main` |
| Staging | QA 검증 | `develop` |
| Preview | PR 리뷰 | feature branches |

---

## ADR-006: 기본 디자인 시스템 (Amazon-inspired)

**상태**: Accepted  
**결정일**: 2026-10-31

### Context (배경)
AI 에이전트가 UI를 생성할 때 기준 디자인 시스템이 없으면 Glassmorphism, 보라색 그라데이션 등 "AI 슬롭" 스타일로 수렴하고, 화면마다 일관성이 깨진다. 검증된 대규모 커머스/업무형 UI를 기본값으로 지정할 필요가 있었다.

### Decision (결정)
Amazon.com 웹사이트의 **디자인 언어**(라이트 모드, 네이비 헤더 `#131921`, 노랑/주황 pill CTA, 청록 링크 `#007185`, Arial 계열 폰트, 고밀도 정보 레이아웃)를 프레임워크의 기본 디자인 시스템으로 채택한다. 상세 토큰과 컴포넌트 규칙은 [docs/04_UI_GUIDE.md](04_UI_GUIDE.md)에 정의한다.

### Consequences (결과 & 트레이드오프)
| 장점 | 단점 |
|------|------|
| 전환 중심·고밀도 UI로 커머스/대시보드에 즉시 적용 가능 | 브랜드 개성이 약해 보일 수 있음 (`brand-*` 토큰 교체로 보완) |
| AI 에이전트가 따를 명확한 토큰 기준 확보 | 라이트 모드 전제 — 다크 모드는 별도 ADR 필요 |
| 사용자에게 익숙한 인터랙션 패턴으로 학습 비용 감소 | 상표/독점 자산 사용 금지 규칙을 지속적으로 준수해야 함 |

### Rejected Alternatives (거절한 대안)
- **다크 모드 기반 대시보드 스타일 (기존 템플릿)**: 범용 웹 서비스에서는 가독성·전환율 측면에서 라이트 모드가 유리하다고 판단
- **Material Design / shadcn 기본 테마**: 적용은 쉽지만 "템플릿 느낌"이 강하고 커머스 패턴(가격, 구매 박스 등)이 부족

### Constraints (준수 사항)
- Amazon 로고·상표·독점 폰트(`Amazon Ember`)·이미지 리소스는 사용하지 않는다. 디자인 언어(색상 체계, 레이아웃, 컴포넌트 형태)만 참고한다.

---

## ADR 추가 방법

새로운 아키텍처 결정이 필요할 때:

```markdown
## ADR-{번호}: {결정 사항 제목}

**상태**: Proposed / Accepted / Deprecated / Superseded by ADR-{번호}
**결정일**: YYYY-MM-DD

### Context
### Decision
### Consequences
### Rejected Alternatives
```

---

## 폐기(Superseded / Deprecated) ADR 처리 방법

> [!IMPORTANT]
> ADR은 삭제하지 않는다. 과거의 결정 기록은 히스토리로서 가치가 있다.

1. **기술 결정이 교체될 때**: 기존 ADR 상단 상태를 `Superseded by ADR-{새번호}`로 변경하고, 새 ADR을 추가한다.

   ```markdown
   ## ADR-002: Supabase 선택
   **상태**: ~~Accepted~~ → **Superseded by ADR-007**
   **결정일**: 2024-01-15
   ```

2. **더 이상 유효하지 않은 결정**: 상태를 `Deprecated`로 변경하고 사유를 기재한다.

   ```markdown
   **상태**: Deprecated — {예: 서비스 종료로 인해 무효화됨. ADR-008 참고}
   ```

3. **누적이 많아질 경우**: `docs/adr-archive/` 폴더를 만들어 상태가 `Deprecated`인 ADR을 이동한다. 단, `02_ADR.md` 내에 이동 사실과 링크를 남겨야 한다.

---

## Change Log

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| {YYYY-MM-DD} | 최초 작성 | {이름} |
| 2026-10-31 | ADR-006 추가: 기본 디자인 시스템을 Amazon-inspired로 지정 | AI Agent |
