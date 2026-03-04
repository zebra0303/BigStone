# Big Stone Task Manager 프로젝트 분석 요약

## 1. 프로젝트 개요

Big Stone Task Manager는 "중요한 일(큰 돌)을 먼저 처리해야 한다"는 철학을 바탕으로 만들어진 할 일 관리 웹 애플리케이션입니다. 중요한 업무를 우선적으로 관리하고, 기한이 있는 일정과 오늘 처리해야 할 일들을 분리하여 사용자에게 직관적으로 보여줍니다.

## 2. 기술 스택 및 아키텍처

### 프론트엔드 (Client)

- **핵심 기술:** React 19, TypeScript, Vite, Tailwind CSS
- **상태 관리 및 데이터 패칭:** Zustand, TanStack React Query (@tanstack/react-query)
- **아키텍처:** FSD (Feature-Sliced Design) 패턴을 엄격히 적용
  - `app/`: 전역 스타일(`global.css`), 라우팅 등
  - `pages/`: 라우팅 대상 페이지 (예: `HomePage.tsx`)
  - `features/`: 핵심 비즈니스 로직 및 사용자 인터랙션 (예: `todo` 관련 생성/리스트 UI 및 Hooks)
  - `entities/`: 비즈니스 엔티티 모델 (예: `Todo` 인터페이스, 타입 등)
  - `shared/`: 재사용 가능한 UI 컴포넌트(Button, Input 등) 및 API 클라이언트(`todoApi.ts`), 유틸리티 등
- **API 통신:** 외부 라이브러리 없이 기본 `fetch` API 활용.

### 백엔드 (Server)

- **핵심 기술:** Node.js, Express, TypeScript
- **데이터베이스:** SQLite3 (`WAL` 모드 적용으로 동시성 개선)
- **구조:**
  - `src/index.ts`: Express 앱 초기화 및 서버 실행, CORS 설정
  - `src/db/database.ts`: SQLite DB 연결 및 `todos` 테이블 스키마 정의
  - `src/routes/todos.ts`: 할 일 목록에 대한 CRUD REST API 구현 (GET, POST, PUT, DELETE)

## 3. 핵심 기능 구현 상태 및 세부사항

- **데이터 모델링 (Todo):**
  - 필수 항목: `id`, `title`, `dueDate`, `status` (TODO, IN_PROGRESS, DONE)
  - 선택 항목: `description`, `isImportant` (중요도 표시), `notification` (알림 시간)
  - 반복 일정(`recurring`): `NONE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` 지원. 세부 조건(요일, 주차, 일 등)을 데이터베이스 컬럼 혹은 JSON 형태로 저장.
- **UI/UX 구조 (`HomePage.tsx` 기준):**
  - **오늘의 목표 (Today):** 마감일이 오늘 이전이거나 오늘인 할 일 목록. 중요한 항목(`isImportant`)이 상단에 배치됨. 완료(`DONE`)된 항목 중 당일 완료된 것만 표시됨.
  - **예정된 할 일 (Scheduled):** 마감일이 내일 이후인 할 일 목록.
- **백엔드 스키마:** SQLite `todos` 테이블은 단일 테이블에서 반복 일정의 복잡한 조건들(`recurringWeeklyDays`, `recurringMonthlyDay` 등)을 컬럼으로 분리하여 관리.

## 4. 추가 요구사항 및 향후 구현 과제 (요구사항.md 기준)

- **관리자 옵션:** 주요 색상 커스터마이징, 알림 기본 시간 설정, 슬랙 웹훅 연동 등 (추가 구현 필요 예상).
- **보관함 기능:** 오늘 이전에 완료된 항목들을 검색하고 조회할 수 있는 별도의 보관/검색 뷰가 필요함.
- **알림 스케줄링 로직:** 알림 설정(`notificationMinutesBefore`)에 따른 실제 푸시 또는 슬랙 알림 트리거 백엔드 로직.

## 5. 개발 컨벤션 및 규칙

- `.claude/research` 내 프로젝트 숙지 후 작업 진행.
- 구조 변경 및 패키지 설치 시 사전 확인 필수.
- 코드 수정 전 계획 수립 및 동의 구하기, 수정 내용에 대해 영문 주석 달기.
- 빌드/테스트/린트 과정(`npm run lint`, `npx prettier --write .`, `npm test`, `npm run build`) 확인 및 성공 시 커밋 진행.
- 커밋 메시지 및 주석은 영문(Conventional Commits)으로 작성.
