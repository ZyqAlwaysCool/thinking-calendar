/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 15:17:39
 */
package server

import (
	"backend/internal/task"
	"backend/pkg/log"
	"context"
	"time"

	"github.com/go-co-op/gocron"
	"go.uber.org/zap"
)

type TaskServer struct {
	log        *log.Logger
	scheduler  *gocron.Scheduler
	userTask   task.UserTask
	reportTask task.ReportTask
}

func NewTaskServer(
	log *log.Logger,
	userTask task.UserTask,
	reportTask task.ReportTask,
) *TaskServer {
	return &TaskServer{
		log:        log,
		userTask:   userTask,
		reportTask: reportTask,
	}
}
func (t *TaskServer) Start(ctx context.Context) error {
	gocron.SetPanicHandler(func(jobName string, recoverData interface{}) {
		t.log.Error("TaskServer Panic", zap.String("job", jobName), zap.Any("recover", recoverData))
	})

	if err := t.reportTask.Start(ctx); err != nil {
		t.log.Error("start report task failed", zap.Error(err))
	}

	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return err
	}
	t.scheduler = gocron.NewScheduler(loc)

	// _, err := t.scheduler.CronWithSeconds("0/30 * * * * *").Do(func() {
	// 	err := t.userTask.CheckUser(ctx)
	// 	if err != nil {
	// 		t.log.Error("检查用户任务失败", zap.Error(err))
	// 	}
	// })
	// if err != nil {
	// 	t.log.Error("检查用户任务失败", zap.Error(err))
	// }

	_, err = t.scheduler.CronWithSeconds("0/5 * * * * *").Do(func() {
		err := t.reportTask.ProcessReportQueue(ctx)
		if err != nil {
			t.log.Error("report task failed", zap.Error(err))
		}
	})
	if err != nil {
		t.log.Error("report task failed", zap.Error(err))
	}

	t.scheduler.StartBlocking()
	return nil
}
func (t *TaskServer) Stop(ctx context.Context) error {
	t.scheduler.Stop()
	if err := t.reportTask.Stop(ctx); err != nil {
		t.log.Error("stop report task failed", zap.Error(err))
	}
	t.log.Info("TaskServer stop...")
	return nil
}
