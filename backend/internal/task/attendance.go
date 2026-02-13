package task

import (
	"backend/internal/service"
	"context"
	"time"
)

type AttendanceTask interface {
	Start(ctx context.Context) error
	ProcessAttendancePush(ctx context.Context) error
	Stop(ctx context.Context) error
}

func NewAttendanceTask(
	task *Task,
	attendanceService service.AttendanceService,
) AttendanceTask {
	return &attendanceTask{
		Task:              task,
		attendanceService: attendanceService,
	}
}

type attendanceTask struct {
	*Task
	attendanceService service.AttendanceService
}

func (t *attendanceTask) Start(ctx context.Context) error {
	_ = ctx
	return nil
}

func (t *attendanceTask) Stop(ctx context.Context) error {
	_ = ctx
	return nil
}

func (t *attendanceTask) ProcessAttendancePush(ctx context.Context) error {
	return t.attendanceService.ProcessAttendancePush(ctx, time.Now())
}
