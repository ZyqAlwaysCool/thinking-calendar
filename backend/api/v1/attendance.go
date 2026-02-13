/*
 * @Description:
 * @Author: zyq
 * @Date: 2026-02-12 10:16:32
 * @LastEditors: zyq
 * @LastEditTime: 2026-02-12 14:57:03
 */
package v1

const (
	AttendanceTypeIn  = "in"  //上班
	AttendanceTypeOut = "out" //下班
)

// 获取补卡设置请求
type AttendanceSettingsGetReq struct {
}

// 获取补卡设置响应
type AttendanceSettingsGetResp struct {
	MonthlyLimit    int    `json:"monthly_limit" example:"8"`    // 每月上限
	PushDay         string `json:"push_day" example:"last"`      // 推送日期
	PushTime        string `json:"push_time" example:"09:00"`    // 推送时间
	Email           string `json:"email" example:"a@b.com"`      // 收件邮箱
	LastPushedMonth string `json:"last_pushed_month" example:""` // 最近一次推送月份
}

// 保存补卡设置请求
type AttendanceSettingsSaveReq struct {
	MonthlyLimit int    `json:"monthly_limit" binding:"required" example:"8"` // 每月上限
	PushDay      string `json:"push_day" binding:"required" example:"last"`   // 推送日期
	PushTime     string `json:"push_time" binding:"required" example:"09:00"` // 推送时间
	Email        string `json:"email" binding:"required" example:"a@b.com"`   // 收件邮箱
}

// 保存补卡设置响应
type AttendanceSettingsSaveResp struct {
	Saved bool `json:"saved"` // 是否保存成功
}

// 查询补卡记录请求
type AttendanceRecordsQueryReq struct {
	Month string `json:"month" binding:"required" example:"2026-02"` // 月份
}

// 查询补卡记录响应
type AttendanceRecordsQueryResp struct {
	Records []AttendanceRecordItem `json:"records"` // 补卡记录列表
	Summary AttendanceSummary      `json:"summary"` // 补卡汇总
}

// 补卡记录明细
type AttendanceRecordItem struct {
	Id   string `json:"id" example:"attrec_123"`   // 记录 ID
	Date string `json:"date" example:"2026-02-11"` // 补卡日期
	Type string `json:"type" example:"in"`         // 类型
	Note string `json:"note" example:"地铁延误迟到"`     // 备注
}

// 补卡汇总
type AttendanceSummary struct {
	Used   int  `json:"used" example:"2"`   // 已用次数
	Limit  int  `json:"limit" example:"8"`  // 上限次数
	Locked bool `json:"locked" example:"0"` // 是否锁定
}

// 保存补卡记录请求
type AttendanceRecordSaveReq struct {
	Date string `json:"date" binding:"required" example:"2026-02-11"` // 补卡日期
	Type string `json:"type" binding:"required" example:"in"`         // 类型
	Note string `json:"note" example:"地铁延误迟到"`                        // 备注
}

// 保存补卡记录响应
type AttendanceRecordSaveResp struct {
	Id      string `json:"id" example:"attrec_123"` // 记录 ID
	Updated bool   `json:"updated"`                 // 是否为更新
}

// 删除补卡记录请求
type AttendanceRecordDeleteReq struct {
	Id string `json:"id" binding:"required" example:"attrec_123"` // 记录 ID
}

// 删除补卡记录响应
type AttendanceRecordDeleteResp struct {
	Deleted bool `json:"deleted"` // 是否删除成功
}
