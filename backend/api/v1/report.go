/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-17 09:39:13
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 15:56:01
 */
package v1

type ReportTemplateType string
type ReportPeriodType string
type ReportStatus string

const (
	ReportTemplateFormal ReportTemplateType = "formal"
	ReportTemplateSimple ReportTemplateType = "simple"

	ReportPeriodWeek  ReportPeriodType = "week"
	ReportPeriodMonth ReportPeriodType = "month"
	ReportPeriodYear  ReportPeriodType = "year"

	ReportStatusQueued     ReportStatus = "queued"
	ReportStatusReady      ReportStatus = "ready"
	ReportStatusProcessing ReportStatus = "processing"
	ReportStatusFailed     ReportStatus = "failed"
)

type ReportItem struct {
	ReportID     string `json:"report_id" binding:"required"`
	PeriodType   string `json:"period_type" binding:"required"`
	StartDate    string `json:"start_date" binding:"required"`
	EndDate      string `json:"end_date" binding:"required"`
	Title        string `json:"title" binding:"required"`
	Content      string `json:"content" binding:"required"`
	Abstract     string `json:"abstract"`
	Confirmed    bool   `json:"confirmed"`
	Template     string `json:"template"`
	Status       string `json:"status"`
	FailedReason string `json:"failed_reason,omitempty"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

type GetReportsReq struct {
	StartDate  string `form:"start_date" json:"start_date" example:"2025-12-01"`
	EndDate    string `form:"end_date" json:"end_date" example:"2025-12-31"`
	PeriodType string `form:"period_type" json:"period_type" binding:"required" example:"week"`
}

type GetReportsResp struct {
	ReportList []ReportItem `json:"report_list"`
}

type GetReportByIDReq struct {
	ReportID string `uri:"report_id" json:"report_id" binding:"required"`
}

type GetReportByIDResp struct {
	Report ReportItem `json:"report"`
}

type GenReportReq struct {
	PeriodType string `json:"period_type" binding:"required" example:"week"`
	StartDate  string `json:"start_date" binding:"required" example:"2025-12-01"`
	EndDate    string `json:"end_date" binding:"required" example:"2025-12-31"`
	Template   string `json:"template" binding:"required" example:"formal"`
}

type GenReportResp struct {
	Report ReportItem `json:"report"`
}

type EditReportReq struct {
	ReportID string `json:"report_id" binding:"required"`
	Content  string `json:"content" binding:"required"`
}

type ConfirmReportReq struct {
	ReportID string `json:"report_id" binding:"required"`
}
