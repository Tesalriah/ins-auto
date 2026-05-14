# 아키텍처 규칙 (ARCHITECTURE-STATUTE.md)

1. **DB 통신**: 모든 데이터 영속화는 Supabase 클라이언트를 사용한다.
2. **Puppeteer 설정**: `userDataDir`을 필수적으로 사용하여 세션을 유지한다.
3. **지연 시간**: 작업 간 최소 3초 이상의 랜덤 지연 시간을 삽입한다.
