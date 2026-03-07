# BigStone - Task Manager

[English](./README.md) | **한국어**

> "큰 돌(중요한 일)을 먼저 넣어라" — 중요한 일부터 처리하는 할 일 관리 앱
> <img width="1080" height="301" alt="cover_1080" src="https://github.com/user-attachments/assets/b25c225e-002c-46c5-a2bc-ac7c200efba6" />

## 주요 기능

- **우선순위 관리** — HIGH / MEDIUM / LOW 3단계 우선순위, 좌측 컬러 테두리로 시각적 구분
- **반복 일정** — 일간 / 주간 / 월간 / 연간 반복 + 종료 조건 (날짜, 횟수) 지원
- **다중 뷰 모드** — 1일 / 3일 / 주간(평일) / 주간(전체) 캘린더 뷰 (선택 유지)
- **파일 첨부** — 할 일에 파일 첨부 및 다운로드 (10MB 제한)
- **Slack 알림** — 오늘의 미완성 일정을 Slack Incoming Webhook으로 자동 알림
- **PWA 지원** — 앱 설치 및 오프라인 캐싱 (Service Worker + Workbox)
- **다국어** — 한국어 / 영어 자동 감지 지원
- **테마 커스터마이징** — 다크 모드, 주요 색상, 웹 폰트 선택
- **관리자 인증** — bcrypt + JWT 기반 보호 + 계정 잠금 (5회 실패 시 15분 잠금)
- **검색** — 키워드 및 상태별 할 일 검색

## 기술 스택

| 영역         | 기술                                         |
| ------------ | -------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite 7, Tailwind CSS 3 |
| State        | Zustand 5, TanStack Query 5                  |
| Backend      | Express 5, TypeScript, better-sqlite3        |
| Auth         | bcrypt, JWT, express-rate-limit              |
| 알림         | node-cron, Slack Incoming Webhook            |
| PWA          | vite-plugin-pwa, Workbox                     |
| 보안         | helmet, CORS, 계정 잠금                       |
| Architecture | FSD (Feature-Sliced Design), npm workspaces  |

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 9+

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/zebra0303/BigStone.git
cd BigStone

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 개발 서버 실행 (클라이언트 + 서버 동시 실행)
npm run dev
```

개발 서버 실행 후:

- 클라이언트: `http://localhost:5050` (또는 `.env`의 `VITE_PORT`)
- 서버 API: `http://localhost:3300` (또는 `.env`의 `PORT`)

### 환경 변수

```env
PORT=3300              # 서버 포트
VITE_PORT=5050         # 클라이언트 개발 서버 포트
VITE_API_URL=/api      # API 기본 경로
JWT_SECRET=...         # JWT 서명 시크릿 (프로덕션 필수)
CORS_ORIGIN=...        # 허용할 CORS 출처
```

## 주요 명령어

```bash
npm run dev            # 개발 서버 실행 (client + server)
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 실행
npm test               # 테스트 실행 (Vitest)
npm run lint -w client # ESLint 검사
npx prettier --write . # 전체 포맷팅
```

## 프로젝트 구조

```
BigStone/
├── client/                    # React 프론트엔드
│   └── src/
│       ├── app/               # 전역 설정, 라우팅, 테마 초기화
│       ├── pages/             # HomePage, SearchPage, AdminPage
│       ├── features/          # Todo CRUD 훅 및 UI 컴포넌트
│       ├── entities/          # Todo 타입 정의 및 Zustand 스토어
│       └── shared/            # API 클라이언트, UI 컴포넌트, 유틸리티, i18n
├── server/                    # Express 백엔드
│   └── src/
│       ├── db/                # SQLite 초기화 및 스키마
│       ├── routes/            # REST API (todos, settings, attachments)
│       ├── middleware/        # JWT 인증 미들웨어
│       ├── services/          # Slack 알림 스케줄러 (node-cron)
│       └── utils/             # 반복 일정 계산 로직, Slack 웹훅
├── .env.example               # 환경 변수 템플릿
├── CLAUDE.md                  # AI 개발 지침
└── package.json               # 워크스페이스 루트
```

## 보안

- **비밀번호**: bcrypt (10 라운드) 해싱
- **토큰**: JWT 24시간 만료
- **Rate Limit**: IP당 15분 내 로그인 10회 제한
- **계정 잠금**: 연속 5회 실패 시 15분 잠금 (DB 저장, IP 변경 우회 불가)
- **보안 헤더**: helmet (XSS, 클릭재킹 방지)
- **CORS**: 출처 화이트리스트 검증
- **파일 업로드**: 10MB 제한, UUID 파일명, 강제 다운로드 헤더

## 라이선스

ISC
