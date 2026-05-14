# AI Handover: Instagram Automation Project

> **이 문서는 다음 세션의 AI 에이전트가 프로젝트의 맥락을 즉시 파악하고 작업을 이어갈 수 있도록 작성되었습니다.**

## 1. 프로젝트 요약 (Executive Summary)
- **목표**: 인스타그램 댓글 감지 -> 답글 게시 -> DM 발송 자동화.
- **상태**: 핵심 엔진(Phase 5) 안정화 완료. 실제 사용자 행동 모방(Human-Simulation) 로직 구현됨.
- **핵심 아키텍처**: Node.js + Puppeteer (System Chrome) + Supabase.

## 2. 주요 구현 로직 및 결정 사항 (Key Implementations)

### 2.1 인증 및 세션 (Authentication)
- **로직**: `authenticator.ts`에서 수동 로그인을 처리. `session.json`에 쿠키를 저장/로드하여 세션을 유지함.
- **특이사항**: 매번 직접 로그인할 수 있도록 `userDataDir` 대신 깨끗한 브라우저 컨텍스트를 사용하되, 쿠키 파일로만 세션을 주입함.

### 2.2 답글(Reply) 자동화 (engine.ts)
- **진입 경로**: 직접 URL 접속 시 인스타그램이 '답글'이 아닌 '태그된 새 댓글'로 인식하는 문제 해결을 위해 **본인 프로필 -> 게시물 클릭** 방식으로 진입함.
- **요소 탐색 (Critical)**: 인스타그램의 버튼은 `<button><span>답글 달기</span></button>`과 같이 중첩 구조임. `span` 텍스트로 찾은 뒤 `closest('button')`으로 클릭하는 로직이 가장 안정적임.
- **유저네임 필터링**: 시간 정보(`10분`, `1시간` 등)가 담긴 링크를 작성자 아이디로 오판하지 않도록 텍스트 필터링 적용됨.

### 2.3 DM 발송 로직
- **안정성**: 게시물 페이지의 DOM 상태를 깨뜨리지 않기 위해 **새 탭(`browser.newPage()`)**을 열어 DM 전송 후 탭을 닫음 (Stale Element Handle 방지).
- **입력창**: 인스타그램 DM창은 `div[role="textbox"]`인 경우가 많으므로 이를 포함한 다중 선택자를 사용함.

## 3. 기술적 노하우 (Technical Know-how)
- **정식 크롬 사용**: Puppeteer 기본 브라우저 대신 `/Applications/Google Chrome.app`을 직접 실행하여 기능 제한(DM 등)을 회피함.
- **대기 시간**: 인스타그램의 동적 로딩을 위해 `networkidle2` 사용 및 각 단계별 3~7초의 넉넉한 `setTimeout` 적용.

## 4. 데이터베이스 구조 (Supabase)
- `tasks`: 모니터링할 게시물과 보낼 문구 저장.
- `comments_history`: 중복 방지를 위해 `instagram_comment_id`(username + msg일부)로 유니크하게 관리.

## 5. 다음 작업 추천 (Next Steps)
- [ ] **예외 처리 강화**: 네트워크 타임아웃이나 인스타그램 차단 팝업 발생 시 대응 로직.
- [ ] **대시보드 연결**: 현재 백엔드 위주로 안정화되었으므로 프론트엔드(`frontend/`)에서 작업을 추가/제어하는 기능 고도화.
- [ ] **다중 게시물 지원**: 현재 단일 태스크 위주에서 여러 게시물을 순환하며 작업하는 성능 최적화.

## 6. 에이전트를 위한 팁
- 작업 전 반드시 `npm run build`를 통해 컴파일 오류가 없는지 확인하십시오.
- 인스타그램 UI는 수시로 변경되므로, `engine.ts`의 `evaluate` 내부에 있는 선택자가 작동하지 않을 경우 유저가 제공한 HTML 구조를 다시 분석하십시오.
