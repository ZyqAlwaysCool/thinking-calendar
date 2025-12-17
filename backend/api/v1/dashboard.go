package v1

type MonthDashboardReq struct {
	Month string `form:"month" json:"month" binding:"required" example:"2025-12"`
}

type MonthDashboardResp struct {
	RecordedDays int            `json:"recorded_days"` //完成记录的天数
	MissingDays  int            `json:"missing_days"`  //缺失记录的天数
	Rate         int            `json:"rate"`          //完成率
	Days         []MonthDayItem `json:"days"`          //每一天的记录情况
}

type MonthDayItem struct {
	Date      string `json:"date"`
	HasRecord bool   `json:"has_record"`
}

type DashboardSummaryResp struct {
	RecordCount      int    `json:"record_count"`
	ConfirmedReports int    `json:"confirmed_reports"`
	LastUpdated      string `json:"last_updated"`
}
