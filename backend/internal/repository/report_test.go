package repository

import (
	"backend/internal/model"
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestRegenerationKeepsConfirmedContentUntilSuccess(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	if err := db.AutoMigrate(&model.Report{}); err != nil {
		t.Fatal(err)
	}

	report := &model.Report{
		ReportID:   "report-test",
		UserID:     "user-test",
		PeriodType: "week",
		StartDate:  "2026-09-14",
		EndDate:    "2026-09-20",
		Title:      "周报",
		Content:    "已确认正文",
		Template:   "formal",
		Status:     "queued",
		Confirmed:  true,
		GenVersion: 2,
	}
	if err := db.Create(report).Error; err != nil {
		t.Fatal(err)
	}

	repo := NewReportRepository(NewRepository(nil, db))
	ctx := context.Background()
	if err := repo.UpdateFailed(ctx, report.ReportID, report.GenVersion, "生成失败"); err != nil {
		t.Fatal(err)
	}
	afterFailure, err := repo.GetByID(ctx, report.UserID, report.ReportID)
	if err != nil {
		t.Fatal(err)
	}
	if afterFailure.Content != "已确认正文" || !afterFailure.Confirmed {
		t.Fatalf("失败后旧报告未保留：正文=%q，确认=%t", afterFailure.Content, afterFailure.Confirmed)
	}

	if err := repo.UpdateGenerated(ctx, report.ReportID, report.GenVersion, "新正文", "新摘要"); err != nil {
		t.Fatal(err)
	}
	afterSuccess, err := repo.GetByID(ctx, report.UserID, report.ReportID)
	if err != nil {
		t.Fatal(err)
	}
	if afterSuccess.Content != "新正文" || afterSuccess.Confirmed || afterSuccess.Status != "ready" {
		t.Fatalf("成功后状态不正确：正文=%q，确认=%t，状态=%q", afterSuccess.Content, afterSuccess.Confirmed, afterSuccess.Status)
	}
}
