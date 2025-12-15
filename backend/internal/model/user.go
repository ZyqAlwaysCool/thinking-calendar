package model

import (
	"time"

	"gorm.io/gorm"
)

// 用户信息
type User struct {
	UserID      string         `gorm:"primaryKey;size:32" json:"user_id"`                         // 对外唯一标识，亦为主键
	Username    string         `gorm:"size:64;uniqueIndex:idx_username;not null" json:"username"` //用户名
	Password    string         `gorm:"size:255;not null" json:"password"`                         //密码
	Avatar      string         `gorm:"size:512" json:"avatar,omitempty"`                          // 头像
	IsValid     bool           `gorm:"default:true" json:"is_valid,omitempty"`                    // 是否为合法用户
	LastLoginAt *time.Time     `json:"last_login_at,omitempty"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) TableName() string {
	return "users"
}
