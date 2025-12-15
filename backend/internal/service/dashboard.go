package service

import (
	v1 "backend/api/v1"
	"backend/internal/repository"
	"context"
	"time"

	"go.uber.org/zap"
)

type DashboardService interface {
	GetMonth(ctx context.Context, userId string, month string) (*v1.MonthDashboardResp, error)
	GetSummary(ctx context.Context, userId string) (*v1.DashboardSummaryResp, error)
}

func NewDashboardService(
	service *Service,
	recordRepo repository.RecordRespository,
	reportRepo repository.ReportRepository,
) DashboardService {
	return &dashboardService{
		Service:    service,
		recordRepo: recordRepo,
		reportRepo: reportRepo,
	}
}

type dashboardService struct {
	*Service
	recordRepo repository.RecordRespository
	reportRepo repository.ReportRepository
}

func (s *dashboardService) GetMonth(ctx context.Context, userId string, month string) (*v1.MonthDashboardResp, error) {
	monthTime, err := time.Parse("2006-01", month)
	if err != nil {
		s.logger.Error("parse month failed", zap.String("user_id", userId), zap.String("month", month))
		return nil, v1.ErrInvalidDate
	}
	now := time.Now()
	if monthTime.After(now) {
		return nil, v1.ErrInvalidDate
	}

	start := time.Date(monthTime.Year(), monthTime.Month(), 1, 0, 0, 0, 0, monthTime.Location())
	end := start.AddDate(0, 1, -1)
	if end.After(now) {
		end = now
	}

	records, err := s.recordRepo.GetByDateRange(ctx, userId, start.Format(reportDateLayout), end.Format(reportDateLayout))
	if err != nil && err != v1.ErrNotFound {
		s.logger.Error("get records for dashboard failed", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrGetDashboardFailed
	}

	recordedSet := make(map[string]bool)
	for _, r := range records {
		if r.IsDeleted {
			continue
		}
		recordedSet[r.Date] = true
	}

	totalDays := int(end.Sub(start).Hours()/24) + 1
	days := make([]v1.MonthDayItem, 0, totalDays)
	recordedCount := 0
	for i := 0; i < totalDays; i++ {
		day := start.AddDate(0, 0, i)
		dayStr := day.Format(reportDateLayout)
		hasLog := recordedSet[dayStr]
		if hasLog {
			recordedCount++
		}
		days = append(days, v1.MonthDayItem{
			Date:   dayStr,
			HasLog: hasLog,
		})
	}
	missing := totalDays - recordedCount
	rate := 0
	if totalDays > 0 {
		rate = int(float64(recordedCount) / float64(totalDays) * 100)
	}

	return &v1.MonthDashboardResp{
		RecordedDays: recordedCount,
		MissingDays:  missing,
		Rate:         rate,
		Days:         days,
	}, nil
}

func (s *dashboardService) GetSummary(ctx context.Context, userId string) (*v1.DashboardSummaryResp, error) {
	records, err := s.recordRepo.GetByUserID(ctx, userId, "")
	if err != nil && err != v1.ErrNotFound {
		s.logger.Error("get records for summary failed", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrGetDashboardFailed
	}
	reports, err := s.reportRepo.GetAll(ctx, userId)
	if err != nil && err != v1.ErrNotFound {
		s.logger.Error("get reports for summary failed", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrGetDashboardFailed
	}

	logCount := 0
	latest := time.Time{}
	for _, r := range records {
		if r.IsDeleted {
			continue
		}
		logCount++
		if r.UpdatedAt.After(latest) {
			latest = r.UpdatedAt
		}
	}

	confirmedReports := 0
	for _, rep := range reports {
		if rep.Confirmed {
			confirmedReports++
		}
		if rep.UpdatedAt.After(latest) {
			latest = rep.UpdatedAt
		}
	}

	last := ""
	if !latest.IsZero() {
		last = formatTime(&latest)
	}

	return &v1.DashboardSummaryResp{
		LogCount:        logCount,
		ConfirmedReport: confirmedReports,
		LastUpdated:     last,
	}, nil
}
