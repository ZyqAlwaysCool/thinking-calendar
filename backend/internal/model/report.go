/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-15 15:37:11
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 15:45:57
 */
package model

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Report struct {
	ReportID     string            `gorm:"primaryKey;size:32" json:"report_id"` // 唯一标识报告
	UserID       string            `gorm:"uniqueIndex:uid_report_period,priority:1;size:32;not null" json:"-"`
	PeriodType   string            `gorm:"size:20;uniqueIndex:uid_report_period,priority:2;not null" json:"period_type"` // week/month/year
	StartDate    string            `gorm:"size:10;uniqueIndex:uid_report_period,priority:3;not null" json:"start_date"`
	EndDate      string            `gorm:"size:10;uniqueIndex:uid_report_period,priority:4;not null" json:"end_date"`
	Title        string            `gorm:"size:256;not null" json:"title"`
	Content      string            `gorm:"type:longtext;not null" json:"content"` //报告内容
	Template     string            `gorm:"size:20;default:'formal'" json:"template"`
	Abstract     string            `gorm:"type:text" json:"abstract,omitempty"`      //报告结构化摘要
	FailedReason string            `gorm:"type:text" json:"failed_reason,omitempty"` //记录处理失败的原因
	Confirmed    bool              `gorm:"default:false" json:"confirmed"`
	Status       string            `gorm:"size:20;default:'queued'" json:"status"` // queued/ready/processing/failed
	Meta         datatypes.JSONMap `gorm:"type:json" json:"meta,omitempty"`        // 扩展预留
	Version      int               `gorm:"default:0" json:"version"`               //手工生成版本号记录
	GenVersion   int               `gorm:"default:0" json:"gen_version"`           //llm自动生成版本号记录
	CreatedAt    time.Time         `gorm:"autoCreateTime;index:idx_created_desc" json:"created_at"`
	UpdatedAt    time.Time         `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt    `gorm:"index" json:"-"`
}

func (Report) TableName() string {
	return "report"
}
