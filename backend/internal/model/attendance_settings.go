package model

import "time"

// 补卡设置
type AttendanceSettings struct {
	UserID          string    `gorm:"primaryKey;size:32" json:"user_id"` // 用户 ID
	MonthlyLimit    int       `gorm:"default:8" json:"monthly_limit"`    // 每月上限
	PushDay         string    `gorm:"size:8;not null" json:"push_day"`   // 推送日期
	PushTime        string    `gorm:"size:8;not null" json:"push_time"`  // 推送时间
	Email           string    `gorm:"size:128;not null" json:"email"`    // 收件邮箱
	LastPushedMonth string    `gorm:"size:7" json:"last_pushed_month"`   // 最近一次推送月份
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (a *AttendanceSettings) TableName() string {
	return "attendance_settings"
}
