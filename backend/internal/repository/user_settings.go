/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-15 15:25:58
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-15 16:37:58
 */
package repository

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"context"
	"errors"

	"gorm.io/gorm"
)

type UserSettingsRepository interface {
	Create(ctx context.Context, userSettings *model.UserSettings) error
	Update(ctx context.Context, userSettings *model.UserSettings) error
	GetByID(ctx context.Context, userId string) (*model.UserSettings, error)
}

func NewUserSettingsRepository(
	r *Repository,
) UserSettingsRepository {
	return &userSettings{
		Repository: r,
	}
}

type userSettings struct {
	*Repository
}

func (r *userSettings) Create(ctx context.Context, userSettings *model.UserSettings) error {
	if err := r.DB(ctx).Create(userSettings).Error; err != nil {
		return err
	}
	return nil
}

func (r *userSettings) Update(ctx context.Context, userSettings *model.UserSettings) error {
	if err := r.DB(ctx).Save(userSettings).Error; err != nil {
		return err
	}
	return nil
}

func (r *userSettings) GetByID(ctx context.Context, userId string) (*model.UserSettings, error) {
	var userSettings model.UserSettings
	if err := r.DB(ctx).Where("user_id = ?", userId).First(&userSettings).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &userSettings, nil
}
