package v1

type MonthDashboardReq struct {
	Month string `form:"month" json:"month" binding:"required" example:"2025-12"`
}

type MonthDashboardResp struct {
	RecordedDays int            `json:"recorded_days"`
	MissingDays  int            `json:"missing_days"`
	Rate         int            `json:"rate"`
	Days         []MonthDayItem `json:"days"`
}

type MonthDayItem struct {
	Date   string `json:"date"`
	HasLog bool   `json:"has_log"`
}

type DashboardSummaryResp struct {
	LogCount        int    `json:"log_count"`
	ConfirmedReport int    `json:"confirmed_reports"`
	LastUpdated     string `json:"last_updated"`
}
