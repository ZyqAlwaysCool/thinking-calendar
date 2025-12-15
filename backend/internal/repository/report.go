/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-15 15:46:07
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 15:48:08
 */
package repository

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

type ReportRepository interface {
	Create(ctx context.Context, report *model.Report) error
	Update(ctx context.Context, report *model.Report) error
	GetByID(ctx context.Context, userID string, reportID string) (*model.Report, error)
	GetByReportID(ctx context.Context, reportID string) (*model.Report, error)
	GetByUnique(ctx context.Context, userID string, periodType string, startDate string, endDate string) (*model.Report, error)
	GetByDateRange(ctx context.Context, userID string, periodType string, startDate string, endDate string) ([]*model.Report, error)
	GetByPeriodType(ctx context.Context, userID string, periodType string) ([]*model.Report, error)
	GetAll(ctx context.Context, userID string) ([]*model.Report, error)

	ListByStatus(ctx context.Context, status string, limit int) ([]*model.Report, error)
	ListConfirmedByPeriod(ctx context.Context, userID string, periodType string, start string, end string) ([]*model.Report, error)
	TryMarkProcessing(ctx context.Context, reportID string, genVersion int) (bool, error)
	UpdateGenerated(ctx context.Context, reportID string, genVersion int, content string, abstract string) error
	UpdateFailed(ctx context.Context, reportID string, genVersion int, reason string) error
}

func NewReportRepository(r *Repository) ReportRepository {
	return &reportRepository{
		Repository: r,
	}
}

type reportRepository struct {
	*Repository
}

func (r *reportRepository) Create(ctx context.Context, report *model.Report) error {
	if err := r.DB(ctx).Create(report).Error; err != nil {
		return err
	}
	return nil
}

func (r *reportRepository) Update(ctx context.Context, report *model.Report) error {
	if err := r.DB(ctx).Save(report).Error; err != nil {
		return err
	}
	return nil
}

func (r *reportRepository) GetByID(ctx context.Context, userID string, reportID string) (*model.Report, error) {
	var report model.Report
	if err := r.DB(ctx).Where("report_id = ? AND user_id = ?", reportID, userID).First(&report).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &report, nil
}

func (r *reportRepository) GetByReportID(ctx context.Context, reportID string) (*model.Report, error) {
	var report model.Report
	if err := r.DB(ctx).Where("report_id = ?", reportID).First(&report).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &report, nil
}

func (r *reportRepository) GetByUnique(ctx context.Context, userID string, periodType string, startDate string, endDate string) (*model.Report, error) {
	var report model.Report
	if err := r.DB(ctx).Where(
		"user_id = ? AND period_type = ? AND start_date = ? AND end_date = ?",
		userID,
		periodType,
		startDate,
		endDate,
	).First(&report).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &report, nil
}

func (r *reportRepository) GetByDateRange(ctx context.Context, userID string, periodType string, startDate string, endDate string) ([]*model.Report, error) {
	var reports []*model.Report
	if err := r.DB(ctx).Where("user_id = ? AND period_type = ? AND start_date >= ? AND end_date <= ?", userID, periodType, startDate, endDate).Find(&reports).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return reports, nil
}

func (r *reportRepository) GetByPeriodType(ctx context.Context, userID string, periodType string) ([]*model.Report, error) {
	var reports []*model.Report
	if err := r.DB(ctx).Where("user_id = ? AND period_type = ?", userID, periodType).Find(&reports).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return reports, nil
}

func (r *reportRepository) GetAll(ctx context.Context, userID string) ([]*model.Report, error) {
	var reports []*model.Report
	if err := r.DB(ctx).Where("user_id = ?", userID).Find(&reports).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return reports, nil
}

func (r *reportRepository) ListByStatus(ctx context.Context, status string, limit int) ([]*model.Report, error) {
	var reports []*model.Report
	if err := r.DB(ctx).Where("status = ?", status).Order("updated_at asc").Limit(limit).Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (r *reportRepository) ListConfirmedByPeriod(ctx context.Context, userID string, periodType string, start string, end string) ([]*model.Report, error) {
	var reports []*model.Report
	if err := r.DB(ctx).
		Where("user_id = ? AND period_type = ? AND confirmed = ? AND start_date >= ? AND end_date <= ?", userID, periodType, true, start, end).
		Order("start_date asc").
		Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (r *reportRepository) TryMarkProcessing(ctx context.Context, reportID string, genVersion int) (bool, error) {
	result := r.DB(ctx).Model(&model.Report{}).
		Where("report_id = ? AND status = ? AND gen_version = ?", reportID, v1.ReportStatusQueued, genVersion).
		Updates(map[string]interface{}{
			"status":     v1.ReportStatusProcessing,
			"updated_at": time.Now(),
		})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected == 1, nil
}

func (r *reportRepository) UpdateGenerated(ctx context.Context, reportID string, genVersion int, content string, abstract string) error {
	result := r.DB(ctx).Model(&model.Report{}).
		Where("report_id = ? AND gen_version = ?", reportID, genVersion).
		Updates(map[string]interface{}{
			"status":        v1.ReportStatusReady,
			"content":       content,
			"abstract":      abstract,
			"failed_reason": "",
			"updated_at":    time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (r *reportRepository) UpdateFailed(ctx context.Context, reportID string, genVersion int, reason string) error {
	result := r.DB(ctx).Model(&model.Report{}).
		Where("report_id = ? AND gen_version = ?", reportID, genVersion).
		Updates(map[string]interface{}{
			"status":        v1.ReportStatusFailed,
			"failed_reason": reason,
			"updated_at":    time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	return nil
}
