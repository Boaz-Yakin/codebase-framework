# UI/UX 디자인 가이드
<!-- 컴포넌트 작성 전 반드시 읽어라. 디자인 일관성은 이 문서에서 시작된다 -->
<!-- 상세 UX 설계(플로우, 인터랙션)는 docs/03_TRD.md의 각 기능별 섹션을 참고한다 -->

> [!IMPORTANT]
> **기본 디자인 시스템: Amazon 웹사이트 디자인 언어 (Amazon-inspired)**
> 이 프레임워크로 시작하는 프로젝트는 별도 결정이 없는 한 **Amazon.com 웹사이트의 디자인 언어**를 기본 디자인 시스템으로 적용한다. (결정 근거: [ADR-006](02_ADR.md#adr-006-기본-디자인-시스템-amazon-inspired))
> - AI 에이전트는 UI 작성 시 아래 토큰·컴포넌트 규칙을 **임의 변경하지 않는다**.
> - 프로젝트가 다른 디자인 시스템을 채택하면 ADR-006을 `Superseded`로 변경하고 이 문서를 교체한다.

> [!CAUTION]
> **상표/저작권 주의**: 적용 대상은 *디자인 언어*(색상 체계, 레이아웃, 컴포넌트 형태, 인터랙션 패턴)에 한정한다.
> Amazon 로고, 스마일 화살표, "Prime" 등 상표·브랜드 자산, 독점 폰트(`Amazon Ember`) 파일, 이미지·아이콘 리소스를 복제하거나 번들에 포함하지 않는다.

---

## 디자인 원칙 (Amazon Design Language)

1. **구매/전환 중심 (Conversion-first)**: 화면의 모든 요소는 사용자의 핵심 행동(검색 → 비교 → 결정 → 실행)을 돕기 위해 존재한다. 주요 CTA는 한눈에 식별되어야 한다.
2. **정보 밀도 & 스캔 가능성**: 흰 배경 위에 촘촘하지만 정돈된 정보(가격, 평점, 배송 정보, 재고)를 배치한다. 사용자는 읽지 않고 *훑어본다*.
3. **기능적 일관성 > 장식**: 장식 효과 없이 색상·굵기·위치만으로 위계를 만든다. 동일한 기능은 사이트 전체에서 동일한 모양을 가진다.
4. **신뢰 & 명확성**: 가격, 할인, 배송일, 오류 메시지는 모호함 없이 명시한다. 상태 피드백은 즉시 제공한다.
5. **접근성 기본값**: 모든 인터랙션은 키보드로 조작 가능하며, 포커스 링을 절대 제거하지 않는다 (WCAG 2.1 AA).

---

## AI 슬롭 안티패턴 — 절대 사용 금지

> [!CAUTION]
> 아래 패턴은 "AI가 만든 티가 나는" 요소들이며, Amazon 디자인 언어와도 충돌한다. 절대 사용하지 않는다.

| 금지 패턴 | 금지 이유 | 대안 |
|----------|---------|------|
| `backdrop-filter: blur()` / Glassmorphism | AI 템플릿의 1번 징후 | 불투명 흰색/회색 배경 사용 |
| 텍스트에 그라데이션 적용 | AI SaaS 랜딩의 클리셰 | 단색 텍스트 사용 |
| Box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 | 테두리 또는 배경 변화로 강조 |
| 보라/인디고 브랜드 색상 | "AI = 보라" 클리셰 | 아래 Amazon 컬러 토큰 사용 |
| 모든 요소에 동일한 `rounded-2xl` | 템플릿 느낌 | 아래 Radius 규칙 준수 (버튼=pill, 카드=8px) |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩에 있는 장식 | 제거. 배경은 단색으로 |
| "Powered by AI" 배지 | 기능이 아닌 장식 | 제거 |
| 다크 모드 기본값 | Amazon 디자인 언어는 라이트 모드 기반 | 라이트 모드 기본, 다크 모드는 별도 결정 시에만 |
| 무의미한 애니메이션 | UX 방해, 느려 보임 | 상태 변화를 알리는 데 필요한 경우만 |

---

## 색상 시스템

> [!NOTE]
> 아래 값은 Amazon.com 공개 웹사이트에서 관찰되는 색상을 기준으로 한 **참고값**이다. 프로젝트 고유 브랜딩이 필요하면 `brand-*` 토큰만 교체하고, 나머지 시맨틱 구조는 유지한다.

### 내비게이션 (Navigation)
| 토큰 | 값 | 사용처 |
|------|-----|--------|
| `nav-primary` | `#131921` | 최상단 글로벌 헤더 (로고, 검색바, 계정/장바구니) |
| `nav-secondary` | `#232F3E` | 서브 내비게이션 바, 푸터 상단 |
| `nav-footer` | `#131A22` | 푸터 하단 |
| `nav-text` | `#FFFFFF` | 헤더 위 텍스트/아이콘 |
| `nav-hover-outline` | `#FFFFFF` | 헤더 항목 hover 시 1px 테두리 |

### 배경 (Background)
| 토큰 | 값 | 사용처 |
|------|-----|--------|
| `bg-page` | `#EAEDED` | 홈/목록형 페이지 배경 (카드가 떠 보이도록) |
| `bg-surface` | `#FFFFFF` | 카드, 상세 페이지, 패널 배경 |
| `bg-subtle` | `#F7FAFA` | 보조 영역, 테이블 헤더, 입력 비활성 |
| `bg-hover` | `#F7FAFA` | 리스트/행 hover |

### 텍스트 (Text)
| 토큰 | 값 | 사용처 |
|------|-----|--------|
| `text-primary` | `#0F1111` | 제목, 본문, 핵심 정보 |
| `text-secondary` | `#565959` | 보조 설명, 메타 정보, 레이블 |
| `text-disabled` | `#8D9096` | 비활성 상태 |
| `text-link` | `#007185` | 일반 링크 |
| `text-link-hover` | `#C7511F` | 링크 hover (밑줄 + 주황 계열) |

### 브랜드 & 액션 (Brand & Action)
| 토큰 | 값 | 사용처 |
|------|-----|--------|
| `brand-orange` | `#FF9900` | 브랜드 강조, 포커스/선택 인디케이터, 검색 버튼 |
| `action-primary` | `#FFD814` | **주요 CTA** (예: 장바구니 담기, 저장, 확인) |
| `action-primary-hover` | `#F7CA00` | 주요 CTA hover |
| `action-primary-border` | `#FCD200` | 주요 CTA 테두리 |
| `action-urgent` | `#FFA41C` | **즉시 실행 CTA** (예: 바로 구매, 결제 진행) |
| `action-urgent-hover` | `#FA8900` | 즉시 실행 CTA hover |
| `action-urgent-border` | `#FF8F00` | 즉시 실행 CTA 테두리 |

### 시맨틱 (Semantic)
| 토큰 | 값 | 사용처 |
|------|-----|--------|
| `status-price` | `#B12704` | 가격 강조, 할인 금액 |
| `status-deal` | `#CC0C39` | 딜/할인 배지 배경, 한정 수량 |
| `status-success` | `#067D62` | 재고 있음, 성공 메시지 |
| `status-error` | `#CC0C39` | 오류 메시지, 필수 입력 누락 |
| `status-warning` | `#C45500` | 경고, 재고 부족 |
| `status-info` | `#007185` | 정보, 안내 |
| `rating-star` | `#FFA41C` | 별점 아이콘 |

### 테두리 (Border)
| 토큰 | 값 | 사용처 |
|------|-----|--------|
| `border-subtle` | `#D5D9D9` | 카드, 구분선, 보조 버튼 테두리 |
| `border-default` | `#888C8C` | 입력 필드 테두리 |
| `border-focus` | `#007185` | 입력 포커스 테두리 |
| `focus-ring` | `#C8F3FA` | 포커스 외곽 링 (`box-shadow: 0 0 0 3px`) |

### CSS 변수 정의 예시
```css
:root {
  --nav-primary: #131921;
  --nav-secondary: #232F3E;
  --bg-page: #EAEDED;
  --bg-surface: #FFFFFF;
  --text-primary: #0F1111;
  --text-secondary: #565959;
  --text-link: #007185;
  --text-link-hover: #C7511F;
  --brand-orange: #FF9900;
  --action-primary: #FFD814;
  --action-primary-hover: #F7CA00;
  --action-urgent: #FFA41C;
  --action-urgent-hover: #FA8900;
  --status-price: #B12704;
  --status-error: #CC0C39;
  --status-success: #067D62;
  --border-subtle: #D5D9D9;
  --border-default: #888C8C;
  --border-focus: #007185;
  --focus-ring: #C8F3FA;
}
```

> [!TIP]
> **Tailwind CSS v4** 사용 시 `@theme` 블록에 동일한 이름으로 등록하면 `bg-action-primary`, `text-link` 같은 유틸리티 클래스로 사용할 수 있다.

---

## 타이포그래피

### 폰트 패밀리
```css
/* Amazon Ember는 독점 폰트이므로 번들에 포함하지 않는다. Amazon과 동일하게 Arial 계열 폴백을 사용한다. */
--font-sans: Arial, 'Helvetica Neue', Helvetica, 'Noto Sans KR', sans-serif;
--font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
```

### 타입 스케일
<!-- Tailwind 미사용 프로젝트: 아래 CSS 값 열을 직접 사용하세요 -->
| 역할 | 클래스 (Tailwind) | CSS 값 | 사용처 |
|------|------------------|--------|--------|
| Page Title | `text-[28px] font-normal leading-9` | `font-size: 28px; font-weight: 400; line-height: 36px` | 페이지 h1, 상품명 (Amazon은 제목에 굵은 체를 남용하지 않음) |
| Section Title | `text-[21px] font-bold leading-7` | `font-size: 21px; font-weight: 700; line-height: 28px` | 섹션/카드 그룹 제목 |
| Card Title | `text-base font-bold` | `font-size: 16px; font-weight: 700` | 카드 헤더 |
| Body | `text-sm leading-5` | `font-size: 14px; line-height: 20px` | 일반 본문 (기본 크기) |
| Caption | `text-xs text-secondary` | `font-size: 12px; line-height: 16px; color: var(--text-secondary)` | 배송 정보, 부연 설명 |
| Price (Large) | `text-[28px] font-normal` | `font-size: 28px; font-weight: 400` + 통화기호/소수점은 `font-size: 13px; vertical-align: super` | 상세 가격 표시 |
| Link | `text-sm text-link hover:text-link-hover hover:underline` | `color: var(--text-link)` | 텍스트 링크 |

> [!NOTE]
> **Tailwind 미사용 프로젝트**: CSS 값 열을 `:root` 또는 전역 CSS에 커스텀 프로퍼티로 정의하여 사용하세요.

---

## Radius & Elevation

| 대상 | Radius | 그림자 |
|------|--------|--------|
| 버튼 (Primary/Secondary/Urgent) | `rounded-full` (pill, `border-radius: 100px`) | `0 2px 5px 0 rgba(213,217,217,.5)` |
| 카드 / 패널 | `rounded-lg` (`8px`) | 없음 (테두리 `border-subtle`로 구분) |
| 입력 필드 / 셀렉트 | `rounded-lg` (`8px`) | `0 1px 2px rgba(15,17,17,.15) inset` |
| 검색바 | `rounded-md` (`4px`~`6px`) | 없음 |
| 드롭다운 / 팝오버 | `rounded-lg` (`8px`) | `0 2px 4px rgba(15,17,17,.15)` |
| 배지 (딜/할인) | `rounded-sm` (`2px`) | 없음 |

---

## 컴포넌트 패턴

### 글로벌 헤더 (Header)
```
1행 (nav-primary #131921): 로고 | 배송지 | [카테고리 셀렉트 | 검색 입력 | 주황 검색 버튼] | 언어 | 계정 | 주문 | 장바구니
2행 (nav-secondary #232F3E): 전체 메뉴(햄버거) | 주요 카테고리 링크 (text-sm, 흰색)
hover: 1px solid white outline (배경색 변화 없음)
검색 버튼: bg-brand-orange, 검색바 포커스 시 3px brand-orange 외곽선
```

### 버튼 (Button)
```
Primary (주요 CTA):  bg-action-primary border border-action-primary-border text-primary rounded-full px-4 py-2 text-sm hover:bg-action-primary-hover
Urgent (즉시 실행):  bg-action-urgent border border-action-urgent-border text-primary rounded-full px-4 py-2 text-sm hover:bg-action-urgent-hover
Secondary:           bg-white border border-subtle text-primary rounded-full px-4 py-2 text-sm hover:bg-bg-subtle
Link-style:          text-link hover:text-link-hover hover:underline (배경/테두리 없음)
Focus (공통):        focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_#C8F3FA] outline-none
```
> [!IMPORTANT]
> 한 화면에 **Primary(노랑)와 Urgent(주황)는 각각 최대 1개**만 둔다. 버튼 텍스트는 항상 검정(`text-primary`)이며 흰 글씨를 쓰지 않는다.

### 카드 (Card)
```
배경: bg-surface (#FFFFFF)
테두리: border border-subtle rounded-lg (홈/목록에서는 테두리 없이 bg-page 위에 흰 카드로 구분 가능)
패딩: p-4 ~ p-5
제목: Card Title (16px bold) → 본문/이미지 → 하단 "더 보기" 텍스트 링크 (text-link)
hover: 카드 자체 효과 없음. 내부 링크/이미지만 hover 반응
```

### 상품/아이템 타일 (Product Tile)
```
이미지 (흰 배경, object-contain, 정사각 비율)
제목: text-sm text-primary line-clamp-2~4, hover 시 text-link-hover
평점: rating-star 별 아이콘 + 리뷰 수 (text-link, text-xs)
가격: status-price 또는 text-primary, 큰 정수부 + 작은 위첨자 소수부
부가 정보: 배송일/재고 (text-xs text-secondary, 재고 있음은 status-success)
```

### 입력 필드 (Input)
```
배경: bg-white
테두리: border border-default rounded-lg
패딩: px-3 py-[3px] ~ py-2 (높이 31px~38px)
포커스: focus:border-focus focus:shadow-[0_0_0_3px_#C8F3FA] outline-none
오류: border-status-error + 아래 12px 오류 메시지 (아이콘 ⓘ + status-error 텍스트)
```

### 알림 박스 (Alert)
```
구조: 좌측 아이콘 + 굵은 제목 + 본문, border rounded-lg p-4
Success: border-status-success, 아이콘 status-success
Error:   border-status-error, 아이콘 status-error
Warning: border-status-warning, 아이콘 status-warning
Info:    border-status-info, 아이콘 status-info
배경: 흰색 유지 (컬러 배경으로 화면을 채우지 않는다)
```

### 배지/태그 (Badge)
```
Deal:     bg-status-deal text-white rounded-sm px-1.5 py-0.5 text-xs font-bold  (예: "한정 특가")
Best:     bg-[#C45500] text-white rounded-sm px-1.5 py-0.5 text-xs              (예: "베스트셀러")
Neutral:  bg-bg-subtle text-secondary border border-subtle rounded-sm px-1.5 py-0.5 text-xs
```

### 테이블 (Table)
```
헤더: bg-bg-subtle text-xs font-bold text-primary border-b border-subtle
행:   border-b border-subtle hover:bg-bg-hover
셀:   py-2 px-3 text-sm
```

---

## 레이아웃

| 항목 | 값 | 설명 |
|------|-----|------|
| 최대 너비 | `max-w-[1500px]` | 콘텐츠 최대 너비 (헤더는 전체 폭) |
| 기본 정렬 | 좌측 정렬 | 중앙 정렬은 모달/빈 상태(Empty State)에서만 |
| 그리드 갭 | `gap-5` (`20px`) | 홈/목록 카드 그리드 |
| 섹션 간격 | `space-y-5` ~ `space-y-8` | 페이지 내 섹션 구분 |
| 상세 페이지 | 3단 구성: 이미지(좌) / 정보(중) / 구매 박스(우, sticky) | 결정·실행 영역은 항상 우측 고정 |
| 사이드바 | `w-60` 필터 패널 (목록 페이지 좌측) | 체크박스·링크 기반 필터 |

---

## 애니메이션 & 트랜지션

**허용 애니메이션** (Amazon은 모션을 최소화한다):
- **색상/테두리 변환**: `transition-colors duration-100` — hover/포커스 상태 변화
- **투명도 전환**: `transition-opacity duration-150` — 드롭다운/모달 등장
- **캐러셀 슬라이드**: `transition-transform duration-300` — 사용자 조작 시에만 (자동 재생 시 일시정지 버튼 필수)
- **토스트/알림**: 0.2s 페이드 — "장바구니에 추가됨" 등 결과 피드백

**금지 애니메이션**:
- 무한 반복 글로우/펄스 (로딩 스피너 제외)
- 배경 그라데이션 애니메이션
- 3D transform / 패럴랙스 효과
- 0.5초 이상 걸리는 모든 트랜지션

---

## 아이콘

- **라이브러리**: Lucide Icons (SVG 기반, tree-shakeable). Amazon 고유 아이콘 리소스는 사용하지 않는다.
- **크기**: 기본 `16px` (w-4 h-4), 헤더 `24px` (w-6 h-6)
- **두께**: `strokeWidth={1.75}` 통일
- **색상**: 본문 영역은 `text-primary`, 헤더는 `nav-text`
- **규칙**: 아이콘을 둥근 배경 박스로 감싸지 않는다. 텍스트 레이블과 나란히 배치한다 (아이콘 단독 버튼은 `aria-label` 필수).

---

## 반응형 브레이크포인트

| 브레이크포인트 | 값 | 대상 |
|--------------|-----|------|
| `sm` | 640px | 모바일 가로 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 데스크톱 기본 |
| `xl` | 1280px | 와이드 |
| `2xl` | 1500px | 최대 콘텐츠 폭 |

**우선순위**: 데스크톱 우선 (desktop-first). 모바일에서는 헤더를 2행(로고·계정·장바구니 / 전체 폭 검색바)으로 재배치하고, 상세 페이지 3단 구성은 1단(이미지 → 정보 → 구매 박스)으로 스택한다.

---

## 접근성 체크리스트

- [ ] 텍스트 대비 4.5:1 이상 (`text-secondary #565959` on `#FFFFFF` 충족)
- [ ] 노랑 CTA(`#FFD814`) 위 텍스트는 반드시 `text-primary`(검정) — 흰 글씨 금지
- [ ] 모든 인터랙티브 요소에 `focus-visible` 링(`focus-ring`) 표시
- [ ] 가격·할인 정보는 색상만으로 전달하지 않는다 (취소선, "할인" 텍스트 병기)
- [ ] 이미지에 의미 있는 `alt` 텍스트 제공

---

## 피그마/디자인 레퍼런스

| 항목 | 링크 |
|------|------|
| 기준 디자인 언어 | https://www.amazon.com (헤더, 상품 상세, 장바구니, 결제 플로우) |
| 피그마 파일 | {링크 추가 예정} |
| 디자인 시스템 | 본 문서 (Amazon-inspired, ADR-006) |
| 참고 서비스 | Amazon.com, Amazon Seller Central (관리 화면 패턴) |

---

## Change Log

| 날짜 | 변경 내용 |
|------|----------|
| 2026-10-31 | 기본 디자인 시스템을 Amazon 웹사이트 디자인 언어로 지정 (ADR-006). 라이트 모드 기본, 컬러/타이포/버튼/카드/헤더 패턴 정의 |
