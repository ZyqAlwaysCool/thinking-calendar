/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-15 15:43:54
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 17:16:32
 */
package repository

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"context"
	"errors"

	"gorm.io/gorm"
)

type RecordRespository interface {
	Create(ctx context.Context, record *model.Record) error
	Update(ctx context.Context, record *model.Record) error
	GetByID(ctx context.Context, userID string, recordID string) (*model.Record, error)
	GetByUserID(ctx context.Context, userID string, date string) ([]*model.Record, error)
	GetByDateRange(ctx context.Context, userID string, startDate string, endDate string) ([]*model.Record, error)
}

func NewRecordRepository(r *Repository) RecordRespository {
	return &recordRepository{
		Repository: r,
	}
}

type recordRepository struct {
	*Repository
}

func (r *recordRepository) Create(ctx context.Context, record *model.Record) error {
	if err := r.DB(ctx).Create(record).Error; err != nil {
		return err
	}
	return nil
}

func (r *recordRepository) Update(ctx context.Context, record *model.Record) error {
	if err := r.DB(ctx).Save(record).Error; err != nil {
		return err
	}
	return nil
}

func (r *recordRepository) GetByID(ctx context.Context, userID string, recordID string) (*model.Record, error) {
	var record model.Record
	if err := r.DB(ctx).Where("user_id = ? AND record_id = ?", userID, recordID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &record, nil
}

func (r *recordRepository) GetByUserID(ctx context.Context, userId string, date string) ([]*model.Record, error) {
	var records []*model.Record
	var query *gorm.DB
	if date == "" {
		query = r.DB(ctx).Where("user_id = ?", userId)
	} else {
		query = r.DB(ctx).Where("user_id = ? AND date = ?", userId, date)
	}

	if err := query.Find(&records).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return records, nil
}

func (r *recordRepository) GetByDateRange(ctx context.Context, userId string, startDate string, endDate string) ([]*model.Record, error) {
	var records []*model.Record
	if err := r.DB(ctx).
		Where("user_id = ? AND date >= ? AND date <= ?", userId, startDate, endDate).
		Find(&records).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return records, nil
}
