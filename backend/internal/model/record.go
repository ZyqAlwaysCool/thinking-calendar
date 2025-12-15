/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-15 15:29:30
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 10:23:56
 */
package model

import (
	"time"

	"gorm.io/datatypes"

	"gorm.io/gorm"
)

// 工作记录
type Record struct {
	RecordID    string            `gorm:"primaryKey;size:32" json:"record_id"`                                    // 对外资源唯一标识，亦为主键
	UserID      string            `gorm:"uniqueIndex:uid_record_date,priority:1;size:32;not null" json:"user_id"` // 与 date 组成唯一约束
	Date        string            `gorm:"size:10;uniqueIndex:uid_record_date,priority:2;not null" json:"date"`
	Content     string            `gorm:"type:longtext;not null" json:"content"`
	WordCount   int               `gorm:"default:0" json:"word_count"`
	Meta        datatypes.JSONMap `gorm:"type:json" json:"meta,omitempty"`
	IsEncrypted bool              `gorm:"default:false" json:"is_encrypted"`
	Version     int               `gorm:"default:1" json:"version"`
	IsDeleted   bool              `gorm:"default:false" json:"is_deleted"`
	CreatedAt   time.Time         `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time         `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`
}

func (r *Record) TableName() string {
	return "record"
}
