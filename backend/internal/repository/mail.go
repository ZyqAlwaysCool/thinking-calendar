package repository

import (
	"backend/internal/model"
	"context"
	"time"
)

type MailRepository interface {
	CreateMailJob(ctx context.Context, job *model.MailJob) error
	ListMailJobsByStatus(ctx context.Context, status string, now time.Time, limit int) ([]*model.MailJob, error)
	UpdateMailJobStatus(ctx context.Context, id string, status string, sentAt *time.Time, errorMsg string) error
	UpdateMailJobStatusIf(ctx context.Context, id string, fromStatus string, toStatus string) (bool, error)
}

func NewMailRepository(r *Repository) MailRepository {
	return &mailRepository{
		Repository: r,
	}
}

type mailRepository struct {
	*Repository
}

// 创建邮件任务
func (r *mailRepository) CreateMailJob(ctx context.Context, job *model.MailJob) error {
	if err := r.DB(ctx).Create(job).Error; err != nil {
		return err
	}
	return nil
}

// 查询待发送邮件
func (r *mailRepository) ListMailJobsByStatus(ctx context.Context, status string, now time.Time, limit int) ([]*model.MailJob, error) {
	var jobs []*model.MailJob
	query := r.DB(ctx).Where("status = ? AND send_at <= ?", status, now).Order("send_at asc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

// 更新邮件状态
func (r *mailRepository) UpdateMailJobStatus(ctx context.Context, id string, status string, sentAt *time.Time, errorMsg string) error {
	updates := map[string]any{
		"status":    status,
		"error_msg": errorMsg,
	}
	if sentAt != nil {
		updates["sent_at"] = *sentAt
	}
	if err := r.DB(ctx).Model(&model.MailJob{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return err
	}
	return nil
}

// 条件更新邮件状态
func (r *mailRepository) UpdateMailJobStatusIf(ctx context.Context, id string, fromStatus string, toStatus string) (bool, error) {
	result := r.DB(ctx).
		Model(&model.MailJob{}).
		Where("id = ? AND status = ?", id, fromStatus).
		Update("status", toStatus)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}
