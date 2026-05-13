package task

import (
	v1 "backend/api/v1"
	"backend/internal/repository"
	"backend/internal/service"
	"context"
	"sync"

	"go.uber.org/zap"
)

type ReportTask interface {
	Start(ctx context.Context) error
	ProcessReportQueue(ctx context.Context) error
	Stop(ctx context.Context) error
}

func NewReportTask(
	task *Task,
	reportRepo repository.ReportRepository,
	reportService service.ReportService,
) ReportTask {
	return &reportTask{
		reportRepo:    reportRepo,
		reportService: reportService,
		queue:         make(chan reportJob, reportQueueSize),
		stopChan:      make(chan struct{}),
		Task:          task,
	}
}

type reportTask struct {
	reportRepo    repository.ReportRepository
	reportService service.ReportService
	queue         chan reportJob
	stopChan      chan struct{}
	workerOnce    sync.Once //确保worker池只初始化一次,防止定时器每次触发都重复起worker
	stopOnce      sync.Once //保证stopChain只会被close一次
	*Task
}

type reportJob struct {
	reportID   string
	genVersion int
	jobType    string // "generate" 或 "refine"
}

const (
	reportQueueSize  = 100
	reportWorkerSize = 5
	reportScanLimit  = 20
)

func (t *reportTask) Start(ctx context.Context) error {
	t.startWorkers(ctx)
	return nil
}

func (t *reportTask) Stop(ctx context.Context) error {
	_ = ctx
	t.stopOnce.Do(func() {
		close(t.stopChan)
	})
	return nil
}

func (t *reportTask) ProcessReportQueue(ctx context.Context) error {
	select {
	case <-t.stopChan:
		return nil
	default:
	}

	t.startWorkers(ctx)

	// 扫描待生成报告
	reports, err := t.reportRepo.ListByStatus(ctx, string(v1.ReportStatusQueued), reportScanLimit)
	if err != nil {
		t.logger.Error("scan queued reports failed", zap.Error(err))
		return err
	}
	for _, report := range reports {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.stopChan:
			return nil
		case t.queue <- reportJob{reportID: report.ReportID, genVersion: report.GenVersion, jobType: "generate"}:
		default:
			t.logger.Info("report queue full, skip this round")
			return nil
		}
	}

	// 扫描待优化报告
	refineReports, err := t.reportRepo.ListByStatus(ctx, string(v1.ReportStatusRefineQueued), reportScanLimit)
	if err != nil {
		t.logger.Error("scan refine reports failed", zap.Error(err))
		return err
	}
	for _, report := range refineReports {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.stopChan:
			return nil
		case t.queue <- reportJob{reportID: report.ReportID, genVersion: report.GenVersion, jobType: "refine"}:
		default:
			t.logger.Info("refine queue full, skip this round")
			return nil
		}
	}
	return nil
}

func (t *reportTask) startWorkers(ctx context.Context) {
	t.workerOnce.Do(func() {
		for i := 0; i < reportWorkerSize; i++ {
			go t.runWorker(ctx, i)
		}
	})
}

func (t *reportTask) runWorker(ctx context.Context, index int) {
	t.logger.Info("runWorker", zap.Int("worker_id", index))
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.stopChan:
			return
		case job := <-t.queue:
			t.logger.Info("report job start", zap.Int("worker", index), zap.String("report_id", job.reportID), zap.String("type", job.jobType))
			var err error
			if job.jobType == "refine" {
				err = t.reportService.ProcessRefineReport(ctx, job.reportID, job.genVersion)
			} else {
				err = t.reportService.ProcessReport(ctx, job.reportID, job.genVersion)
			}
			if err != nil {
				t.logger.Error("report job failed", zap.Int("worker", index), zap.String("report_id", job.reportID), zap.String("type", job.jobType), zap.Error(err))
				continue
			}
			t.logger.Info("report job done", zap.Int("worker", index), zap.String("report_id", job.reportID), zap.String("type", job.jobType))
		}
	}
}
