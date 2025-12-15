package model

import "time"

// 用户配置
type UserSettings struct {
	UserID              string    `gorm:"primaryKey;size:32" json:"user_id"` // 与 users.user_id 对齐
	Timezone            string    `gorm:"size:64;default:'Asia/Shanghai'" json:"timezone"`
	ReportTemplateWeek  string    `gorm:"type:text" json:"report_template_week,omitempty"`  // 用户自定义周报提示词模板
	ReportTemplateMonth string    `gorm:"type:text" json:"report_template_month,omitempty"` // 用户自定义月报提示词模板
	AutoGenerateWeekly  bool      `gorm:"default:false" json:"auto_generate_weekly"`
	WeeklyReportTime    string    `gorm:"size:8;default:'22:00'" json:"weekly_report_time"`
	CreatedAt           time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt           time.Time `gorm:"autoUpdateTime" json:"-"`
}

func (u *UserSettings) TableName() string {
	return "user_settings"
}
