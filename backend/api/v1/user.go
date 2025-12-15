/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 09:40:06
 */
package v1

type RegisterReq struct {
	Username string `json:"username" binding:"required" example:"alice"`
	Password string `json:"password" binding:"required" example:"123456"`
}

type LoginReq struct {
	Username string `json:"username" binding:"required" example:"alice"`
	Password string `json:"password" binding:"required" example:"123456"`
}
type LoginRespData struct {
	AccessToken string `json:"access_token"`
	ExpireAt    string `json:"expire_at"`
}
type LoginResp struct {
	Response
	Data LoginRespData
}

type UserSettings struct {
	UserID              string `json:"user_id" binding:"required"`
	ReportTemplateWeek  string `json:"report_template_week,omitempty"`  // 用户自定义周报提示词模板
	ReportTemplateMonth string `json:"report_template_month,omitempty"` // 用户自定义月报提示词模板
	AutoGenerateWeekly  bool   `json:"auto_generate_weekly"`
	WeeklyReportTime    string `json:"weekly_report_time"`
}

type UpdateUserSettingsReq struct {
	UserSettings
}

type UserInfo struct {
	Username    string `json:"username"`
	Avatar      string `json:"avatar"`
	IsValid     bool   `json:"is_valid"`
	LastLoginAt string `json:"last_login_at"`
	UserID      string `json:"user_id"`
}
