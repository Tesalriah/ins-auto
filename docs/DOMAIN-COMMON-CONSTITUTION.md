# 공통 도메인 원칙 (DOMAIN-COMMON-CONSTITUTION.md)

1. **데이터 무결성**: 모든 처리된 댓글은 `comments_history`에 기록하여 중복 처리를 방지한다.
2. **작업 단위**: 하나의 `task`는 하나의 게시물 URL을 기준으로 한다.
