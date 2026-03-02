package repository

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AttendanceRepository interface {
	// 补卡设置
	GetAttendanceSettings(ctx context.Context, userID string) (*model.AttendanceSettings, error)
	GetAttendanceSettingsForUpdate(ctx context.Context, userID string) (*model.AttendanceSettings, error)
	UpsertAttendanceSettings(ctx context.Context, settings *model.AttendanceSettings) error
	UpdateAttendanceLastPushedMonth(ctx context.Context, userID string, month string) error
	ListAttendanceSettings(ctx context.Context) ([]*model.AttendanceSettings, error)
	// 补卡记录
	GetAttendanceRecordByID(ctx context.Context, userID string, recordID string) (*model.AttendanceRecord, error)
	GetAttendanceRecordByKey(ctx context.Context, userID string, date string, recordType string) (*model.AttendanceRecord, error)
	ListAttendanceRecords(ctx context.Context, userID string) ([]*model.AttendanceRecord, error)
	ListAttendanceRecordsByRange(ctx context.Context, userID string, startDate string, endDate string) ([]*model.AttendanceRecord, error)
	CountAttendanceRecordsByRange(ctx context.Context, userID string, startDate string, endDate string) (int64, error)
	CreateAttendanceRecord(ctx context.Context, record *model.AttendanceRecord) error
	UpdateAttendanceRecord(ctx context.Context, record *model.AttendanceRecord) error
	DeleteAttendanceRecord(ctx context.Context, userID string, recordID string) error
}

func NewAttendanceRepository(r *Repository) AttendanceRepository {
	return &attendanceRepository{
		Repository: r,
	}
}

type attendanceRepository struct {
	*Repository
}

// 获取补卡设置
func (r *attendanceRepository) GetAttendanceSettings(ctx context.Context, userID string) (*model.AttendanceSettings, error) {
	var settings model.AttendanceSettings
	if err := r.DB(ctx).Where("user_id = ?", userID).First(&settings).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &settings, nil
}

// 获取补卡设置并加锁
func (r *attendanceRepository) GetAttendanceSettingsForUpdate(ctx context.Context, userID string) (*model.AttendanceSettings, error) {
	var settings model.AttendanceSettings
	if err := r.DB(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ?", userID).
		First(&settings).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &settings, nil
}

// 保存补卡设置
func (r *attendanceRepository) UpsertAttendanceSettings(ctx context.Context, settings *model.AttendanceSettings) error {
	if err := r.DB(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"monthly_limit", "push_day", "push_time", "email", "updated_at"}),
	}).Create(settings).Error; err != nil {
		return err
	}
	return nil
}

// 更新最近推送月份
func (r *attendanceRepository) UpdateAttendanceLastPushedMonth(ctx context.Context, userID string, month string) error {
	if err := r.DB(ctx).
		Model(&model.AttendanceSettings{}).
		Where("user_id = ?", userID).
		Update("last_pushed_month", month).Error; err != nil {
		return err
	}
	return nil
}

// 列出全部补卡设置
func (r *attendanceRepository) ListAttendanceSettings(ctx context.Context) ([]*model.AttendanceSettings, error) {
	var settings []*model.AttendanceSettings
	if err := r.DB(ctx).Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

// 按 ID 获取补卡记录
func (r *attendanceRepository) GetAttendanceRecordByID(ctx context.Context, userID string, recordID string) (*model.AttendanceRecord, error) {
	var record model.AttendanceRecord
	if err := r.DB(ctx).Where("user_id = ? AND id = ?", userID, recordID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &record, nil
}

// 按日期与类型获取补卡记录
func (r *attendanceRepository) GetAttendanceRecordByKey(ctx context.Context, userID string, date string, recordType string) (*model.AttendanceRecord, error) {
	var record model.AttendanceRecord
	if err := r.DB(ctx).
		Where("user_id = ? AND date = ? AND type = ?", userID, date, recordType).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &record, nil
}

// 查询用户全部补卡记录
func (r *attendanceRepository) ListAttendanceRecords(ctx context.Context, userID string) ([]*model.AttendanceRecord, error) {
	var records []*model.AttendanceRecord
	if err := r.DB(ctx).
		Where("user_id = ?", userID).
		Order("date desc, type asc").
		Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

// 按时间范围查询补卡记录
func (r *attendanceRepository) ListAttendanceRecordsByRange(ctx context.Context, userID string, startDate string, endDate string) ([]*model.AttendanceRecord, error) {
	var records []*model.AttendanceRecord
	if err := r.DB(ctx).
		Where("user_id = ? AND date >= ? AND date <= ?", userID, startDate, endDate).
		Order("date asc").
		Find(&records).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return records, nil
}

// 按时间范围统计补卡记录数
func (r *attendanceRepository) CountAttendanceRecordsByRange(ctx context.Context, userID string, startDate string, endDate string) (int64, error) {
	var count int64
	if err := r.DB(ctx).
		Model(&model.AttendanceRecord{}).
		Where("user_id = ? AND date >= ? AND date <= ?", userID, startDate, endDate).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// 创建补卡记录
func (r *attendanceRepository) CreateAttendanceRecord(ctx context.Context, record *model.AttendanceRecord) error {
	if err := r.DB(ctx).Create(record).Error; err != nil {
		return err
	}
	return nil
}

// 更新补卡记录
func (r *attendanceRepository) UpdateAttendanceRecord(ctx context.Context, record *model.AttendanceRecord) error {
	if err := r.DB(ctx).Save(record).Error; err != nil {
		return err
	}
	return nil
}

// 删除补卡记录
func (r *attendanceRepository) DeleteAttendanceRecord(ctx context.Context, userID string, recordID string) error {
	if err := r.DB(ctx).
		Where("user_id = ? AND id = ?", userID, recordID).
		Delete(&model.AttendanceRecord{}).Error; err != nil {
		return err
	}
	return nil
}
