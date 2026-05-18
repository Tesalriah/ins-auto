# Instagram Automation Tool (인스타그램 댓글 및 DM 자동화 시스템)

인스타그램 게시물의 댓글을 실시간으로 감지하여, 작성자에게 자동으로 답글을 달고 개인 메시지(DM)를 발송하는 지능형 자동화 솔루션입니다.

---

# 프로젝트 개요

- **프로젝트 목적**: 인스타그램 마케팅 및 고객 응대 프로세스를 자동화하여 업무 효율성을 극대화합니다.
- **주요 기능 설명**: 게시물에 달린 새 댓글을 탐색하고, 미리 설정된 답글을 게시한 뒤 해당 유저에게 상세 정보가 담긴 DM을 자동으로 발송합니다.
- **어떤 문제를 해결하는지**: 수동으로 일일이 댓글에 답글을 달고 DM을 보내는 번거로움을 해결하며, 봇 탐지 알고리즘을 회피하는 'Human-Simulation' 기술로 계정 안전을 보장합니다.
- **프로젝트 진행 배경**: 인스타그램의 복잡한 UI 구조와 강화된 보안 정책 속에서도 안정적으로 작동하는 커스텀 자동화 도구의 필요성으로 인해 시작되었습니다.

---

# 기술 스택

## Frontend

- **React 19 (Vite)**
- **TypeScript**
- **Vanilla CSS / App.css**

## Backend

- **Node.js**
- **Puppeteer** (정식 Google Chrome 연동)
- **Supabase**

## AI Agent

- **Gemini CLI** (문서 기반 코드 생성 및 로직 설계)
- **Claude Code** (아키텍처 설계 및 리팩토링 지원)

---

# 주요 기능

- **보안 중심의 수동 인증**: 자동 세션 탈취 대신 사용자가 직접 로그인하는 방식을 지원하여 계정 보안을 강화합니다.
- **지능형 댓글 탐색 및 답글**: 인스타그램의 복잡한 HTML 구조를 분석하여 정확한 댓글 작성자를 식별하고 답글을 게시합니다.
- **안정적인 DM 발송**: 게시물 페이지 상태를 유지하기 위해 새 탭에서 DM을 발송하는 독립적 워크플로우를 사용합니다.
- **중복 처리 방지**: Supabase DB와 연동하여 이미 처리된 댓글은 자동으로 건너뜁니다.

---

# 프로젝트 구조

```text
ins-auto/
 ├── frontend/             # React 대시보드
 │    ├── src/
 │    │    ├── components/ # TaskForm, TaskList 등 공통 컴포넌트
 │    │    ├── App.tsx     # 메인 대시보드 로직
 │    │    └── main.tsx
 │    └── package.json
 ├── backend/              # Puppeteer 자동화 엔진
 │    ├── src/
 │    │    ├── engine.ts   # 핵심 자동화 로직
 │    │    ├── authenticator.ts # 인증 및 세션 관리
 │    │    └── index.ts    # 엔진 엔트리 포인트
 │    └── package.json
 └── docs/                 # 프로젝트 문서 (PROJECT_SPEC, AI-HANDOVER 등)
```

---

# 실행 방법

## 1. 프로젝트 설치

```bash
# Frontend 설치
cd frontend
npm install

# Backend 설치
cd ../backend
npm install
```

## 2. 환경변수 설정

`backend/.env` 및 `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (backend only)
```

## 3. 실행

```bash
# Frontend 실행
cd frontend
npm run dev

# Backend 실행
cd backend
npm run dev
```

---

# Supabase 설정

- **Authentication 사용 여부**: 서비스 관리 용도로 Supabase Key 사용.
- **사용한 테이블 설명**:
  - `tasks`: 대상 게시물 URL, 답글 문구, DM 내용 등 자동화 작업 설정 저장.
  - `comments_history`: 처리 완료된 댓글의 고유 식별자 및 유저네임 기록.
- **주요 정책(RLS) 설명**: 대시보드와 엔진 간의 안전한 데이터 접근을 위해 활성화되어 있습니다.
- **Storage 사용 여부**: 현재 미사용.

---

# AI 에이전트 활용 방식

- **사용한 도구**: Gemini CLI, Claude Code
- **어떤 작업에 활용했는지**: 
  - 인스타그램의 복잡한 DOM 선택자 분석 및 안정적인 `evaluate` 로직 생성.
  - Supabase 데이터 모델 설계 및 TypeScript 타입 정의.
  - 프론트엔드 대시보드 컴포넌트(`TaskList`, `TaskForm`) 구조화.
- **문서 기반 작업 방식**: `GEMINI.md`와 `docs/` 하위의 명세서를 최우선으로 참고하여 일관성 있는 개발 진행.
- **프롬프트 전략**: "문서를 기준으로 작업하고 추측하지 마라"는 원칙 준수.
- **코드 검증 방식**: 생성된 코드에 대한 실시간 빌드 테스트(`npm run build`) 및 린트 체크.

---

# 트러블 슈팅

## 문제 상황
인스타그램 게시물에서 답글 작성 후 DM 발송 시, 페이지 이동으로 인해 이전 페이지의 요소가 사라져 `Stale Element Reference Error` 발생.

## 원인
Puppeteer가 동일한 탭에서 페이지를 이동하며 작업을 수행할 때, 기존에 렌더링된 요소들이 메모리에서 해제됨.

## 해결 방법
DM 발송 시 `browser.newPage()`를 통해 별도의 탭을 열어 작업을 수행한 뒤 탭을 닫는 방식을 채택하여, 메인 게시물 페이지의 상태를 온전하게 유지함.

---

# 회고

- **어려웠던 점**: 인스타그램의 봇 탐지 기술이 매우 정교하여, 단순한 자동화가 아닌 실제 사람의 행동 패턴(랜덤 지연, 프로필 경유 진입 등)을 구현하는 데 많은 노력이 필요했습니다.
- **개선하고 싶은 점**: 네트워크 지연이나 인스타그램 차단 팝업 등 다양한 예외 상황에 대한 자동 대응 로직 고도화.
- **새롭게 배운 점**: Puppeteer를 활용한 복잡한 SPA 자동화 기법과 효율적인 세션 유지 전략.
- **AI 에이전트를 사용하며 느낀 점**: 복잡한 UI 선택자를 찾거나 반복적인 코드 작성 시 생산성이 비약적으로 향상되었으며, 특히 문서화된 규칙을 따르게 함으로써 협업 효율이 높았습니다.

---

# 참고 자료

- [Puppeteer Documentation](https://pptr.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React 19 New Features](https://react.dev/blog/2024/12/05/react-19)
