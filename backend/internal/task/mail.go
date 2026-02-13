package task

import (
	"backend/internal/service"
	"context"
	"time"
)

type MailTask interface {
	Start(ctx context.Context) error
	ProcessMailQueue(ctx context.Context) error
	Stop(ctx context.Context) error
}

func NewMailTask(
	task *Task,
	mailService service.MailService,
) MailTask {
	return &mailTask{
		Task:        task,
		mailService: mailService,
	}
}

type mailTask struct {
	*Task
	mailService service.MailService
}

func (t *mailTask) Start(ctx context.Context) error {
	_ = ctx
	return nil
}

func (t *mailTask) Stop(ctx context.Context) error {
	_ = ctx
	return nil
}

func (t *mailTask) ProcessMailQueue(ctx context.Context) error {
	return t.mailService.ProcessPending(ctx, time.Now())
}
