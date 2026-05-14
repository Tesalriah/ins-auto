# 공통 도메인 규칙 (DOMAIN-COMMON-STATUTE.md)

1. **중복 체크**: 댓글 처리 전 `instagram_comment_id`를 기반으로 기처리 여부를 확인한다.
2. **로그 기록**: 모든 중요 이벤트(성공, 실패, 예외)는 `automation_logs` 테이블에 기록한다.
