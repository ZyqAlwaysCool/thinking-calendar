/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-17 09:32:03
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 17:52:06
 */
package service

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"backend/internal/repository"
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"
)

type ReportService interface {
	GenerateReport(ctx context.Context, userId string, req *v1.GenReportReq) (string, error)
	GetReportByID(ctx context.Context, userId string, reportID string) (v1.ReportItem, error)
	GetReports(ctx context.Context, userId string, req *v1.GetReportsReq) ([]v1.ReportItem, error)
	EditReport(ctx context.Context, userId string, req *v1.EditReportReq) error
	ConfirmReport(ctx context.Context, userId string, req *v1.ConfirmReportReq) error
	ProcessReport(ctx context.Context, reportID string, genVersion int) error
	ProcessQueuedReports(ctx context.Context, limit int) (int, error)
}

func NewReportService(
	service *Service,
	reportRepo repository.ReportRepository,
	recordSvr RecordService,
	userSettingsRepo repository.UserSettingsRepository,
) ReportService {
	return &reportService{
		Service:          service,
		recordSvr:        recordSvr,
		reportRepo:       reportRepo,
		userSettingsRepo: userSettingsRepo,
	}
}

type reportService struct {
	*Service
	recordSvr        RecordService
	reportRepo       repository.ReportRepository
	userSettingsRepo repository.UserSettingsRepository
}

const (
	ReportPrefix     = "reportid_"
	reportDateLayout = "2006-01-02"
)

func (s *reportService) GenerateReport(ctx context.Context, userId string, req *v1.GenReportReq) (string, error) {
	if err := validateReportPeriod(req.PeriodType); err != nil {
		return "", err
	}
	if err := validateReportTemplate(req.Template); err != nil {
		return "", err
	}
	start, err := time.Parse(reportDateLayout, req.StartDate)
	if err != nil {
		return "", v1.ErrInvalidDate
	}
	end, err := time.Parse(reportDateLayout, req.EndDate)
	if err != nil {
		return "", v1.ErrInvalidDate
	}
	today := time.Now()
	if end.After(today) || start.After(today) {
		return "", v1.ErrInvalidDate
	}
	if end.Before(start) {
		return "", v1.ErrInvalidDate
	}
	if err := validateDateRange(req.PeriodType, start, end); err != nil {
		return "", err
	}

	report, err := s.reportRepo.GetByUnique(ctx, userId, req.PeriodType, req.StartDate, req.EndDate)
	if err != nil && !errors.Is(err, v1.ErrNotFound) {
		s.logger.Error("query report failed", zap.String("user_id", userId), zap.Error(err))
		return "", v1.ErrGetReportsFailed
	}

	if errors.Is(err, v1.ErrNotFound) {
		id, err := s.sid.GenString()
		if err != nil {
			return "", v1.ErrInternalServerError
		}
		report = &model.Report{
			ReportID:     ReportPrefix + id,
			UserID:       userId,
			PeriodType:   req.PeriodType,
			StartDate:    req.StartDate,
			EndDate:      req.EndDate,
			Title:        buildReportTitle(req.PeriodType, req.StartDate, req.EndDate),
			Content:      "",
			Abstract:     "",
			FailedReason: "",
			Template:     req.Template,
			Status:       string(v1.ReportStatusQueued),
			Version:      0,
			GenVersion:   1,
			Confirmed:    false,
		}
		if err := s.reportRepo.Create(ctx, report); err != nil {
			s.logger.Error("create report placeholder failed", zap.String("user_id", userId), zap.Error(err))
			return "", v1.ErrCreateReportFailed
		}
		return report.ReportID, nil
	}

	report.Template = req.Template
	report.Title = buildReportTitle(req.PeriodType, req.StartDate, req.EndDate)
	report.Status = string(v1.ReportStatusQueued)
	report.Confirmed = false
	report.Abstract = ""
	report.FailedReason = ""
	report.Content = ""
	report.GenVersion = report.GenVersion + 1
	if err := s.reportRepo.Update(ctx, report); err != nil {
		s.logger.Error("update report placeholder failed", zap.String("user_id", userId), zap.String("report_id", report.ReportID), zap.Error(err))
		return "", v1.ErrUpdateReportFailed
	}
	return report.ReportID, nil
}

func (s *reportService) GetReportByID(ctx context.Context, userId string, reportID string) (v1.ReportItem, error) {
	report, err := s.reportRepo.GetByID(ctx, userId, reportID)
	if err != nil {
		if errors.Is(err, v1.ErrNotFound) {
			return v1.ReportItem{}, v1.ErrReportNotExist
		}
		s.logger.Error("get report failed", zap.String("user_id", userId), zap.String("report_id", reportID), zap.Error(err))
		return v1.ReportItem{}, v1.ErrGetReportsFailed
	}
	return s.toReportItem(report), nil
}

func (s *reportService) GetReports(ctx context.Context, userId string, req *v1.GetReportsReq) ([]v1.ReportItem, error) {
	var reports []*model.Report
	var err error

	if req.PeriodType == "" {
		return nil, v1.ErrInvalidReportPeriod
	} else if req.StartDate != "" && req.EndDate != "" {
		reports, err = s.reportRepo.GetByDateRange(ctx, userId, req.PeriodType, req.StartDate, req.EndDate)
	} else {
		reports, err = s.reportRepo.GetByPeriodType(ctx, userId, req.PeriodType)
	}
	if err != nil && !errors.Is(err, v1.ErrNotFound) {
		s.logger.Error("list reports failed", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrGetReportsFailed
	}

	items := make([]v1.ReportItem, 0, len(reports))
	for _, report := range reports {
		items = append(items, s.toReportItem(report))
	}
	return items, nil
}

func (s *reportService) EditReport(ctx context.Context, userId string, req *v1.EditReportReq) error {
	report, err := s.reportRepo.GetByID(ctx, userId, req.ReportID)
	if err != nil {
		if errors.Is(err, v1.ErrNotFound) {
			return v1.ErrReportNotExist
		}
		s.logger.Error("get report failed", zap.String("user_id", userId), zap.String("report_id", req.ReportID), zap.Error(err))
		return v1.ErrGetReportsFailed
	}
	if report.Status != string(v1.ReportStatusReady) {
		return v1.ErrReportNotReady
	}
	report.Content = req.Content
	report.Version = report.Version + 1
	report.Confirmed = false
	if err := s.reportRepo.Update(ctx, report); err != nil {
		s.logger.Error("update report failed", zap.String("user_id", userId), zap.String("report_id", req.ReportID), zap.Error(err))
		return v1.ErrUpdateReportFailed
	}
	return nil
}

func (s *reportService) ConfirmReport(ctx context.Context, userId string, req *v1.ConfirmReportReq) error {
	report, err := s.reportRepo.GetByID(ctx, userId, req.ReportID)
	if err != nil {
		if errors.Is(err, v1.ErrNotFound) {
			return v1.ErrReportNotExist
		}
		s.logger.Error("get report failed", zap.String("user_id", userId), zap.String("report_id", req.ReportID), zap.Error(err))
		return v1.ErrGetReportsFailed
	}
	if report.Status != string(v1.ReportStatusReady) {
		return v1.ErrReportNotReady
	}
	report.Confirmed = true
	if err := s.reportRepo.Update(ctx, report); err != nil {
		s.logger.Error("confirm report failed", zap.String("user_id", userId), zap.String("report_id", req.ReportID), zap.Error(err))
		return v1.ErrUpdateReportFailed
	}
	return nil
}

func (s *reportService) ProcessQueuedReports(ctx context.Context, limit int) (int, error) {
	if limit <= 0 {
		return 0, nil
	}
	reports, err := s.reportRepo.ListByStatus(ctx, string(v1.ReportStatusQueued), limit)
	if err != nil {
		s.logger.Error("scan queued reports failed", zap.Error(err))
		return 0, err
	}
	processed := 0
	for _, report := range reports {
		select {
		case <-ctx.Done():
			return processed, ctx.Err()
		default:
		}
		if err := s.ProcessReport(ctx, report.ReportID, report.GenVersion); err != nil {
			s.logger.Error("process report failed", zap.String("report_id", report.ReportID), zap.Int("gen_version", report.GenVersion), zap.Error(err))
			continue
		}
		processed += 1
	}
	return processed, nil
}

func (s *reportService) ProcessReport(ctx context.Context, reportID string, genVersion int) error {
	claimed, err := s.reportRepo.TryMarkProcessing(ctx, reportID, genVersion)
	if err != nil {
		return err
	}
	if !claimed {
		return nil
	}

	report, err := s.reportRepo.GetByReportID(ctx, reportID)
	if err != nil {
		if errors.Is(err, v1.ErrNotFound) {
			return nil
		}
		return err
	}
	if report.GenVersion != genVersion {
		return nil
	}

	if report.PeriodType == string(v1.ReportPeriodYear) {
		return s.processYearReport(ctx, report, genVersion)
	}

	records, err := s.recordSvr.QueryUserRecordsByDateRange(ctx, report.UserID, report.StartDate, report.EndDate)
	if err != nil {
		if updateErr := s.reportRepo.UpdateFailed(ctx, reportID, genVersion, "获取记录失败"); updateErr != nil {
			s.logger.Error("mark report failed status error", zap.String("report_id", reportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
			return updateErr
		}
		return err
	}

	userSettings, err := s.userSettingsRepo.GetByID(ctx, report.UserID)
	if err != nil && !errors.Is(err, v1.ErrNotFound) {
		if updateErr := s.reportRepo.UpdateFailed(ctx, reportID, genVersion, "获取用户设置失败"); updateErr != nil {
			s.logger.Error("mark report failed status error", zap.String("report_id", reportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
		}
		return v1.ErrGetUserSettingsFailed
	}

	prompt := buildPrompt(report.PeriodType, report.Template, userSettings, records)
	_ = prompt

	content, abstract, err := s.callModel(ctx, prompt)
	if err != nil {
		if updateErr := s.reportRepo.UpdateFailed(ctx, reportID, genVersion, "生成失败"); updateErr != nil {
			s.logger.Error("mark report failed status error", zap.String("report_id", reportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
			return updateErr
		}
		return err
	}

	if err := s.reportRepo.UpdateGenerated(ctx, reportID, genVersion, content, abstract); err != nil {
		return err
	}
	return nil
}

func (s *reportService) processYearReport(ctx context.Context, report *model.Report, genVersion int) error {
	// 年报生成：优先使用已确认月报/周报，按月构建素材包，减少碎片与上下文占用
	startTime, err := time.Parse(reportDateLayout, report.StartDate)
	if err != nil {
		return v1.ErrInvalidDate
	}
	endTime, err := time.Parse(reportDateLayout, report.EndDate)
	if err != nil {
		return v1.ErrInvalidDate
	}

	// 拉取已确认月报/周报作为高层素材来源
	monthReports, err := s.reportRepo.ListConfirmedByPeriod(ctx, report.UserID, string(v1.ReportPeriodMonth), report.StartDate, report.EndDate)
	if err != nil {
		if updateErr := s.reportRepo.UpdateFailed(ctx, report.ReportID, genVersion, "获取月报失败"); updateErr != nil {
			s.logger.Error("mark report failed status error", zap.String("report_id", report.ReportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
			return updateErr
		}
		return err
	}
	weekReports, err := s.reportRepo.ListConfirmedByPeriod(ctx, report.UserID, string(v1.ReportPeriodWeek), report.StartDate, report.EndDate)
	if err != nil {
		if updateErr := s.reportRepo.UpdateFailed(ctx, report.ReportID, genVersion, "获取周报失败"); updateErr != nil {
			s.logger.Error("mark report failed status error", zap.String("report_id", report.ReportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
			return updateErr
		}
		return err
	}

	// monthMap：每月一条月报；weekMap：每月多条周报
	monthMap := make(map[int]*model.Report)
	for _, item := range monthReports {
		t, err := time.Parse(reportDateLayout, item.StartDate)
		if err != nil {
			continue
		}
		monthMap[int(t.Month())] = item
	}

	weekMap := make(map[int][]*model.Report)
	for _, item := range weekReports {
		t, err := time.Parse(reportDateLayout, item.StartDate)
		if err != nil {
			continue
		}
		month := int(t.Month())
		weekMap[month] = append(weekMap[month], item)
	}

	// 覆盖度阈值：月报足够则以月报为主，否则周报足够则以周报为主，否则降级用日记补齐
	monthCoverageThreshold := 6
	weekCoverageThreshold := 20
	level := "day"
	if len(monthMap) >= monthCoverageThreshold {
		level = "month"
	} else if len(weekReports) >= weekCoverageThreshold {
		level = "week"
	}

	// 按月构建素材：月报 > 周报 > 日记
	materials := make([]monthMaterial, 0, 12)
	for m := 1; m <= 12; m++ {
		monthStart := time.Date(startTime.Year(), time.Month(m), 1, 0, 0, 0, 0, startTime.Location())
		if monthStart.After(endTime) {
			break
		}
		monthEnd := monthStart.AddDate(0, 1, -1)
		if monthEnd.After(endTime) {
			monthEnd = endTime
		}

		// 选择当月素材来源
		var text string
		if reportMonth, ok := monthMap[m]; ok {
			// 优先月报：使用摘要（无摘要则用正文）
			text = pickAbstract(reportMonth)
		} else if level != "day" && len(weekMap[m]) > 0 {
			// 次优周报：合并当月所有周报摘要
			var parts []string
			for _, w := range weekMap[m] {
				parts = append(parts, pickAbstract(w))
			}
			text = strings.Join(parts, "\n")
		} else {
			// 降级日记：仅使用当月日记，避免一次性塞入全年碎片
			records, err := s.recordSvr.QueryUserRecordsByDateRange(ctx, report.UserID, monthStart.Format(reportDateLayout), monthEnd.Format(reportDateLayout))
			if err != nil {
				if updateErr := s.reportRepo.UpdateFailed(ctx, report.ReportID, genVersion, "获取记录失败"); updateErr != nil {
					s.logger.Error("mark report failed status error", zap.String("report_id", report.ReportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
					return updateErr
				}
				return err
			}
			if len(records) > 0 {
				var parts []string
				for _, l := range records {
					parts = append(parts, fmt.Sprintf("%s：%s", l.Date, l.Content))
				}
				text = strings.Join(parts, "\n")
			}
		}

		// 统一加月份标签，保证模型输入结构稳定
		label := fmt.Sprintf("%02d月", m)
		if text == "" {
			text = fmt.Sprintf("%s：暂无素材", label)
		} else {
			text = fmt.Sprintf("%s：\n%s", label, text)
		}
		materials = append(materials, monthMaterial{
			monthLabel: label,
			text:       text,
		})
	}

	// 组合年报提示词并调用模型生成「正文 + 结构化摘要」
	prompt := buildYearPrompt(report.StartDate, report.EndDate, materials)
	content, abstract, err := s.callModel(ctx, prompt)
	if err != nil {
		if updateErr := s.reportRepo.UpdateFailed(ctx, report.ReportID, genVersion, "生成失败"); updateErr != nil {
			s.logger.Error("mark report failed status error", zap.String("report_id", report.ReportID), zap.Int("gen_version", genVersion), zap.Error(updateErr))
			return updateErr
		}
		return err
	}
	// 写回正文与摘要，并将状态置为 ready
	if err := s.reportRepo.UpdateGenerated(ctx, report.ReportID, genVersion, content, abstract); err != nil {
		return err
	}
	return nil
}

func (s *reportService) callModel(ctx context.Context, prompt string) (string, string, error) {
	_ = ctx
	_ = prompt

	// 此处接入模型调用
	content := "# 报告\n\n模型调用待实现 当前为测试\n"
	abstract := "模型调用待实现"
	return content, abstract, nil
}

func (s *reportService) toReportItem(report *model.Report) v1.ReportItem {
	return v1.ReportItem{
		ReportID:     report.ReportID,
		PeriodType:   report.PeriodType,
		StartDate:    report.StartDate,
		EndDate:      report.EndDate,
		Title:        report.Title,
		Content:      report.Content,
		Abstract:     report.Abstract,
		Confirmed:    report.Confirmed,
		Template:     report.Template,
		Status:       report.Status,
		FailedReason: report.FailedReason,
		CreatedAt:    formatTime(&report.CreatedAt),
		UpdatedAt:    formatTime(&report.UpdatedAt),
	}
}

func validateReportPeriod(periodType string) error {
	switch v1.ReportPeriodType(periodType) {
	case v1.ReportPeriodWeek, v1.ReportPeriodMonth, v1.ReportPeriodYear:
		return nil
	default:
		return v1.ErrInvalidReportPeriod
	}
}

func validateReportTemplate(template string) error {
	switch v1.ReportTemplateType(template) {
	case v1.ReportTemplateFormal, v1.ReportTemplateSimple:
		return nil
	default:
		return v1.ErrInvalidReportTemplate
	}
}

func validateDateRange(periodType string, start time.Time, end time.Time) error {
	switch v1.ReportPeriodType(periodType) {
	case v1.ReportPeriodWeek:
		if start.Weekday() != time.Monday || end.Weekday() != time.Sunday {
			return v1.ErrInvalidDate
		}
		if end.Sub(start).Hours() != 6*24 {
			return v1.ErrInvalidDate
		}
	case v1.ReportPeriodMonth:
		if start.Year() != end.Year() || start.Month() != end.Month() {
			return v1.ErrInvalidDate
		}
		if start.Day() != 1 {
			return v1.ErrInvalidDate
		}
		lastDay := start.AddDate(0, 1, -1).Day()
		if end.Day() != lastDay {
			return v1.ErrInvalidDate
		}
	case v1.ReportPeriodYear:
		if start.Year() != end.Year() {
			return v1.ErrInvalidDate
		}
		if start.Month() != time.January || start.Day() != 1 {
			return v1.ErrInvalidDate
		}
		if end.Month() != time.December || end.Day() != 31 {
			return v1.ErrInvalidDate
		}
	default:
		return v1.ErrInvalidReportPeriod
	}
	return nil
}

type monthMaterial struct {
	monthLabel string
	text       string
}

func pickAbstract(report *model.Report) string {
	if report.Abstract != "" {
		return report.Abstract
	}
	return report.Content
}

func buildYearPrompt(start string, end string, materials []monthMaterial) string {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("请基于以下 %s 至 %s 的月度摘要，生成一份结构化的年终报告，突出产出、问题、关键里程碑和下一年度规划。", start, end))
	builder.WriteString("\n\n")
	for _, m := range materials {
		builder.WriteString(m.text)
		builder.WriteString("\n\n")
	}
	return builder.String()
}

func buildReportTitle(periodType string, startDate string, endDate string) string {
	startLabel := toZhDate(startDate)
	endLabel := toZhDate(endDate)
	switch v1.ReportPeriodType(periodType) {
	case v1.ReportPeriodWeek:
		return fmt.Sprintf("%s-%s 周报", startLabel, endLabel)
	case v1.ReportPeriodMonth:
		t, err := time.Parse(reportDateLayout, startDate)
		if err != nil {
			return fmt.Sprintf("%s 月报", startLabel)
		}
		return fmt.Sprintf("%d年%02d月月报", t.Year(), int(t.Month()))
	case v1.ReportPeriodYear:
		t, err := time.Parse(reportDateLayout, startDate)
		if err != nil {
			return fmt.Sprintf("%s 年报", startLabel)
		}
		return fmt.Sprintf("%d年年报", t.Year())
	default:
		return "报告"
	}
}

func toZhDate(date string) string {
	t, err := time.Parse(reportDateLayout, date)
	if err != nil {
		return date
	}
	return t.Format("2006年01月02日")
}

func buildPrompt(periodType string, template string, settings *model.UserSettings, records []v1.RecordItem) string {
	_ = template
	preset := ""
	if settings != nil {
		if v1.ReportPeriodType(periodType) == v1.ReportPeriodWeek {
			preset = settings.ReportTemplateWeek
		}
		if v1.ReportPeriodType(periodType) == v1.ReportPeriodMonth {
			preset = settings.ReportTemplateMonth
		}
	}

	logText := ""
	for _, record := range records {
		logText += fmt.Sprintf("日期：%s\n内容：\n%s\n\n", record.Date, record.Content)
	}

	if preset == "" {
		preset = "请根据以下工作日志生成一份结构清晰的工作报告，重点突出产出、问题与下一步计划。"
	}
	return preset + "\n\n" + logText
}
