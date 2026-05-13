-- tasks 테이블: 모니터링 작업 설정
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url TEXT NOT NULL,
  dm_content TEXT NOT NULL,
  reply_content TEXT NOT NULL,
  interval_minutes INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- comments_history 테이블: 처리된 댓글 이력
CREATE TABLE comments_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  instagram_comment_id TEXT NOT NULL,
  username TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, instagram_comment_id)
);

-- automation_logs 테이블: 실행 로그
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT DEFAULT 'info',
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
