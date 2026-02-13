package model

import "time"

// 补卡记录
type AttendanceRecord struct {
	ID        string    `gorm:"primaryKey;size:32" json:"id"`                                                    // 记录 ID
	UserID    string    `gorm:"size:32;not null;uniqueIndex:uid_attendance_date_type,priority:1" json:"user_id"` // 用户 ID
	Date      string    `gorm:"size:10;not null;uniqueIndex:uid_attendance_date_type,priority:2" json:"date"`    // 补卡日期
	Type      string    `gorm:"size:8;not null;uniqueIndex:uid_attendance_date_type,priority:3" json:"type"`     // 类型
	Note      string    `gorm:"type:text" json:"note"`                                                           // 备注
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (a *AttendanceRecord) TableName() string {
	return "attendance_records"
}
