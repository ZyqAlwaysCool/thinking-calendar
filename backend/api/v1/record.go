/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-16 10:07:56
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 15:31:11
 */

package v1

// RecordItem 对外返回的工作记录字段
type RecordItem struct {
	RecordID  string `json:"record_id" example:"rec_123"`              // 唯一标识
	Date      string `json:"date" example:"2025-12-11"`                // 日期，格式 YYYY-MM-DD
	Content   string `json:"content" example:"完成接口定义与联调"`              // 工作内容
	UpdatedAt string `json:"updatedAt" example:"2025-12-11T10:00:00Z"` // 最近更新时间
	Version   int    `json:"version" example:"1"`                      // 版本计数
}

// QueryRecordsReq 查询工作记录请求
type QueryRecordsReq struct {
	Date string `form:"date" example:"2025-12-11"` // 不传则返回当前用户全部记录
}

type RecordListResp struct {
	RecordList []RecordItem `json:"record_list"` // 不传date时返回全部记录
}

// RangeRecordsReq 时间范围批量查询请求
type RangeRecordsReq struct {
	Start string `form:"start" binding:"required" example:"2025-12-01"` // 开始日期
	End   string `form:"end" binding:"required" example:"2025-12-31"`   // 结束日期
}

// UpsertRecordReq 创建或更新工作记录请求
type UpsertRecordReq struct {
	Date    string         `json:"date" binding:"required" example:"2025-12-11"` // 记录日期
	Content string         `json:"content" binding:"required"`                   // 记录内容
	Meta    map[string]any `json:"meta,omitempty"`
}

// DeleteRecordReq 删除工作记录请求
type DeleteRecordReq struct {
	RecordID string `uri:"record_id" json:"record_id" binding:"required"` // 路径参数
}
