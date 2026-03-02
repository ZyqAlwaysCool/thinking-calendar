package model

import "time"

// 邮件任务
type MailJob struct {
	ID          string     `gorm:"primaryKey;size:32" json:"id"`                                            // 任务 ID
	UserID      string     `gorm:"size:32;index:idx_mail_user_biz_month,priority:1" json:"user_id"`         // 业务用户 ID
	BizType     string     `gorm:"size:32;index:idx_mail_user_biz_month,priority:2" json:"biz_type"`        // 业务类型
	BizMonth    string     `gorm:"size:7;index:idx_mail_user_biz_month,priority:3" json:"biz_month"`        // 业务月份
	To          string     `gorm:"size:128;not null" json:"to"`                                             // 收件邮箱
	Subject     string     `gorm:"size:255;not null" json:"subject"`                                        // 邮件标题
	Content     string     `gorm:"type:longtext" json:"content"`                                            // 邮件正文
	ContentType string     `gorm:"size:16;not null" json:"content_type"`                                    // 正文类型
	SendAt      time.Time  `gorm:"index:idx_mail_status_send_at,priority:2" json:"send_at"`                 // 计划发送时间
	SentAt      *time.Time `json:"sent_at"`                                                                 // 实际发送时间
	Status      string     `gorm:"size:16;not null;index:idx_mail_status_send_at,priority:1" json:"status"` // 状态
	ErrorMsg    string     `gorm:"size:255" json:"error_msg"`                                               // 失败原因
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (m *MailJob) TableName() string {
	return "mail_jobs"
}
