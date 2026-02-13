-- 允许 sent_at 为空，避免零值时间写入失败
ALTER TABLE mail_jobs
  MODIFY COLUMN sent_at DATETIME NULL DEFAULT NULL;
