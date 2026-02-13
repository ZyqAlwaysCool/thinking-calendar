package service

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"backend/internal/repository"
	"context"
	"errors"
	"fmt"
	"net/mail"
	"sort"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
)

const (
	attendanceDefaultMonthlyLimit = 8
	attendanceDefaultPushDay      = "last"
	attendanceDefaultPushTime     = "09:00"
	attendanceMonthLayout         = "2006-01"
	attendanceTimeLayout          = "15:04"
	attendanceRecordPrefix        = "attrec_"
)

type AttendanceService interface {
	GetAttendanceSettings(ctx context.Context, userId string) (*v1.AttendanceSettingsGetResp, error)
	SaveAttendanceSettings(ctx context.Context, userId string, req *v1.AttendanceSettingsSaveReq) error
	QueryAttendanceRecords(ctx context.Context, userId string, month string) (*v1.AttendanceRecordsQueryResp, error)
	SaveAttendanceRecord(ctx context.Context, userId string, req *v1.AttendanceRecordSaveReq) (*v1.AttendanceRecordSaveResp, error)
	DeleteAttendanceRecord(ctx context.Context, userId string, recordId string) error
	ProcessAttendancePush(ctx context.Context, now time.Time) error
}

func NewAttendanceService(
	service *Service,
	attendanceRepo repository.AttendanceRepository,
	mailService MailService,
) AttendanceService {
	return &attendanceService{
		Service:        service,
		attendanceRepo: attendanceRepo,
		mailService:    mailService,
	}
}

type attendanceService struct {
	*Service
	attendanceRepo repository.AttendanceRepository
	mailService    MailService
}

// 获取补卡设置
func (s *attendanceService) GetAttendanceSettings(ctx context.Context, userId string) (*v1.AttendanceSettingsGetResp, error) {
	settings, err := s.getAttendanceSettingsOrDefault(ctx, userId)
	if err != nil {
		s.logger.Error("获取补卡设置失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceGetFailed
	}

	return &v1.AttendanceSettingsGetResp{
		MonthlyLimit:    settings.MonthlyLimit,
		PushDay:         settings.PushDay,
		PushTime:        settings.PushTime,
		Email:           settings.Email,
		LastPushedMonth: settings.LastPushedMonth,
	}, nil
}

// 保存补卡设置
func (s *attendanceService) SaveAttendanceSettings(ctx context.Context, userId string, req *v1.AttendanceSettingsSaveReq) error {
	trimmedEmail := strings.TrimSpace(req.Email)
	if err := validateAttendanceSettings(req, trimmedEmail); err != nil {
		return err
	}

	settings := &model.AttendanceSettings{
		UserID:       userId,
		MonthlyLimit: req.MonthlyLimit,
		PushDay:      req.PushDay,
		PushTime:     req.PushTime,
		Email:        trimmedEmail,
	}
	if err := s.attendanceRepo.UpsertAttendanceSettings(ctx, settings); err != nil {
		s.logger.Error("保存补卡设置失败", zap.String("user_id", userId), zap.Error(err))
		return v1.ErrAttendanceSaveFailed
	}
	updatedSettings, err := s.attendanceRepo.GetAttendanceSettings(ctx, userId)
	if err != nil {
		s.logger.Error("读取补卡设置失败", zap.String("user_id", userId), zap.Error(err))
		return nil
	}
	if err := s.processAttendancePushWithSettings(ctx, time.Now(), updatedSettings); err != nil {
		s.logger.Error("补卡设置保存后推送失败", zap.String("user_id", userId), zap.Error(err))
	}
	return nil
}

// 查询补卡记录
func (s *attendanceService) QueryAttendanceRecords(ctx context.Context, userId string, month string) (*v1.AttendanceRecordsQueryResp, error) {
	monthTime, err := parseAttendanceMonth(month)
	if err != nil {
		return nil, v1.ErrAttendanceDateInvalid
	}
	now := time.Now()
	if monthTime.After(startOfMonth(now)) {
		return nil, v1.ErrAttendanceDateInvalid
	}
	start, end := monthRange(monthTime)
	if end.After(now) {
		end = now
	}
	startStr := start.Format(dateLayout)
	endStr := end.Format(dateLayout)

	settings, err := s.getAttendanceSettingsOrDefault(ctx, userId)
	if err != nil {
		s.logger.Error("获取补卡设置失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceGetFailed
	}

	records, err := s.attendanceRepo.ListAttendanceRecordsByRange(ctx, userId, startStr, endStr)
	if err != nil && !errors.Is(err, v1.ErrNotFound) {
		s.logger.Error("查询补卡记录失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceGetFailed
	}

	items := make([]v1.AttendanceRecordItem, 0, len(records))
	for _, record := range records {
		items = append(items, v1.AttendanceRecordItem{
			Id:   record.ID,
			Date: record.Date,
			Type: record.Type,
			Note: record.Note,
		})
	}

	normalizedMonth := monthTime.Format(attendanceMonthLayout)
	return &v1.AttendanceRecordsQueryResp{
		Records: items,
		Summary: v1.AttendanceSummary{
			Used:   len(items),
			Limit:  settings.MonthlyLimit,
			Locked: settings.LastPushedMonth == normalizedMonth,
		},
	}, nil
}

// 保存补卡记录
func (s *attendanceService) SaveAttendanceRecord(ctx context.Context, userId string, req *v1.AttendanceRecordSaveReq) (*v1.AttendanceRecordSaveResp, error) {
	if req.Type != v1.AttendanceTypeIn && req.Type != v1.AttendanceTypeOut {
		return nil, v1.ErrAttendanceTypeInvalid
	}
	dateTime, err := parseAttendanceDate(req.Date)
	if err != nil {
		return nil, v1.ErrAttendanceDateInvalid
	}
	now := time.Now()
	if dateTime.After(now) {
		return nil, v1.ErrAttendanceDateInvalid
	}
	if !isSameMonth(dateTime, now) {
		return nil, v1.ErrAttendanceDateInvalid
	}
	month := dateTime.Format(attendanceMonthLayout)

	settings, err := s.getAttendanceSettingsOrDefault(ctx, userId)
	if err != nil {
		s.logger.Error("获取补卡设置失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceGetFailed
	}
	if settings.LastPushedMonth == month {
		return nil, v1.ErrAttendanceLocked
	}

	exist, err := s.attendanceRepo.GetAttendanceRecordByKey(ctx, userId, req.Date, req.Type)
	if err != nil && !errors.Is(err, v1.ErrNotFound) {
		s.logger.Error("查询补卡记录失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceGetFailed
	}

	if exist != nil {
		exist.Note = strings.TrimSpace(req.Note)
		if err := s.attendanceRepo.UpdateAttendanceRecord(ctx, exist); err != nil {
			s.logger.Error("更新补卡记录失败", zap.String("user_id", userId), zap.Error(err))
			return nil, v1.ErrAttendanceSaveFailed
		}
		return &v1.AttendanceRecordSaveResp{
			Id:      exist.ID,
			Updated: true,
		}, nil
	}

	start, end := monthRange(dateTime)
	count, err := s.attendanceRepo.CountAttendanceRecordsByRange(ctx, userId, start.Format(dateLayout), end.Format(dateLayout))
	if err != nil {
		s.logger.Error("统计补卡记录失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceGetFailed
	}
	if count >= int64(settings.MonthlyLimit) {
		return nil, v1.ErrAttendanceLimitReached
	}

	recordID, err := s.sid.GenString()
	if err != nil {
		s.logger.Error("生成补卡记录 ID 失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceSaveFailed
	}
	record := &model.AttendanceRecord{
		ID:     attendanceRecordPrefix + recordID,
		UserID: userId,
		Date:   req.Date,
		Type:   req.Type,
		Note:   strings.TrimSpace(req.Note),
	}
	if err := s.attendanceRepo.CreateAttendanceRecord(ctx, record); err != nil {
		s.logger.Error("创建补卡记录失败", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrAttendanceSaveFailed
	}

	return &v1.AttendanceRecordSaveResp{
		Id:      record.ID,
		Updated: false,
	}, nil
}

// 删除补卡记录
func (s *attendanceService) DeleteAttendanceRecord(ctx context.Context, userId string, recordId string) error {
	record, err := s.attendanceRepo.GetAttendanceRecordByID(ctx, userId, recordId)
	if err != nil {
		if errors.Is(err, v1.ErrNotFound) {
			return v1.ErrAttendanceRecordNotExist
		}
		s.logger.Error("查询补卡记录失败", zap.String("user_id", userId), zap.Error(err))
		return v1.ErrAttendanceGetFailed
	}
	dateTime, err := parseAttendanceDate(record.Date)
	if err != nil {
		return v1.ErrAttendanceDateInvalid
	}
	month := dateTime.Format(attendanceMonthLayout)
	settings, err := s.getAttendanceSettingsOrDefault(ctx, userId)
	if err != nil {
		s.logger.Error("获取补卡设置失败", zap.String("user_id", userId), zap.Error(err))
		return v1.ErrAttendanceGetFailed
	}
	if settings.LastPushedMonth == month {
		return v1.ErrAttendanceLocked
	}
	if err := s.attendanceRepo.DeleteAttendanceRecord(ctx, userId, recordId); err != nil {
		s.logger.Error("删除补卡记录失败", zap.String("user_id", userId), zap.Error(err))
		return v1.ErrAttendanceDeleteFailed
	}
	return nil
}

// 处理补卡推送
func (s *attendanceService) ProcessAttendancePush(ctx context.Context, now time.Time) error {
	settingsList, err := s.attendanceRepo.ListAttendanceSettings(ctx)
	if err != nil {
		return err
	}
	for _, settings := range settingsList {
		if err := s.processAttendancePushWithSettings(ctx, now, settings); err != nil {
			s.logger.Error("补卡推送任务失败", zap.String("user_id", settings.UserID), zap.Error(err))
		}
	}
	return nil
}

func (s *attendanceService) processAttendancePushWithSettings(ctx context.Context, now time.Time, settings *model.AttendanceSettings) error {
	if settings == nil || strings.TrimSpace(settings.Email) == "" {
		return nil
	}
	month := now.Format(attendanceMonthLayout)
	scheduledAt, err := calcScheduleTime(now, settings.PushDay, settings.PushTime)
	if err != nil {
		return err
	}
	if !isAfterOrSameDay(now, scheduledAt) {
		return nil
	}
	if settings.LastPushedMonth == month {
		return nil
	}
	userID := settings.UserID
	return s.tm.Transaction(ctx, func(txCtx context.Context) error {
		lockedSettings, err := s.attendanceRepo.GetAttendanceSettingsForUpdate(txCtx, userID)
		if err != nil {
			if errors.Is(err, v1.ErrNotFound) {
				return nil
			}
			return err
		}
		if strings.TrimSpace(lockedSettings.Email) == "" {
			return nil
		}
		latestSchedule, err := calcScheduleTime(now, lockedSettings.PushDay, lockedSettings.PushTime)
		if err != nil {
			return err
		}
		if !isAfterOrSameDay(now, latestSchedule) {
			return nil
		}
		if lockedSettings.LastPushedMonth == month {
			return nil
		}
		start, end := monthRange(now)
		startStr := start.Format(dateLayout)
		endStr := end.Format(dateLayout)
		count, err := s.attendanceRepo.CountAttendanceRecordsByRange(txCtx, userID, startStr, endStr)
		if err != nil {
			return err
		}
		if count == 0 {
			return nil
		}
		records, err := s.attendanceRepo.ListAttendanceRecordsByRange(txCtx, userID, startStr, endStr)
		if err != nil {
			return err
		}
		subject, content := buildAttendanceMailContent(month, lockedSettings.MonthlyLimit, records)
		sendAt := latestSchedule
		if now.After(latestSchedule) {
			sendAt = now
		}
		_, err = s.mailService.Send(txCtx, MailSendInput{
			To:          strings.TrimSpace(lockedSettings.Email),
			Subject:     subject,
			Content:     content,
			ContentType: MailContentTypeText,
			SendAt:      sendAt,
		})
		if err != nil {
			return err
		}
		if err := s.attendanceRepo.UpdateAttendanceLastPushedMonth(txCtx, userID, month); err != nil {
			return err
		}
		s.logger.Info("补卡邮件发送完成", zap.String("user_id", userID), zap.String("month", month))
		return nil
	})
}

func (s *attendanceService) getAttendanceSettingsOrDefault(ctx context.Context, userId string) (*model.AttendanceSettings, error) {
	settings, err := s.attendanceRepo.GetAttendanceSettings(ctx, userId)
	if err != nil {
		if errors.Is(err, v1.ErrNotFound) {
			return &model.AttendanceSettings{
				UserID:       userId,
				MonthlyLimit: attendanceDefaultMonthlyLimit,
				PushDay:      attendanceDefaultPushDay,
				PushTime:     attendanceDefaultPushTime,
				Email:        "",
			}, nil
		}
		return nil, err
	}
	if settings.PushDay == "" {
		settings.PushDay = attendanceDefaultPushDay
	}
	if settings.PushTime == "" {
		settings.PushTime = attendanceDefaultPushTime
	}
	return settings, nil
}

func validateAttendanceSettings(req *v1.AttendanceSettingsSaveReq, email string) error {
	if req.MonthlyLimit < 0 {
		return v1.ErrAttendanceSettingsInvalid
	}
	if email == "" {
		return v1.ErrAttendanceEmailInvalid
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return v1.ErrAttendanceEmailInvalid
	}
	if !isValidPushDay(req.PushDay) {
		return v1.ErrAttendanceSettingsInvalid
	}
	if _, err := time.Parse(attendanceTimeLayout, req.PushTime); err != nil {
		return v1.ErrAttendanceSettingsInvalid
	}
	return nil
}

func parseAttendanceMonth(month string) (time.Time, error) {
	return time.ParseInLocation(attendanceMonthLayout, month, time.Local)
}

func parseAttendanceDate(date string) (time.Time, error) {
	return time.ParseInLocation(dateLayout, date, time.Local)
}

func monthRange(monthTime time.Time) (time.Time, time.Time) {
	loc := monthTime.Location()
	start := time.Date(monthTime.Year(), monthTime.Month(), 1, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, -1)
	return start, end
}

func startOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func isSameMonth(a time.Time, b time.Time) bool {
	return a.Year() == b.Year() && a.Month() == b.Month()
}

func isAfterOrSameDay(now time.Time, target time.Time) bool {
	if !isSameMonth(now, target) {
		return false
	}
	return now.Day() >= target.Day()
}

func isValidPushDay(day string) bool {
	if day == "last" {
		return true
	}
	value, err := strconv.Atoi(day)
	if err != nil {
		return false
	}
	return value >= 1 && value <= 31
}

func calcScheduleTime(now time.Time, pushDay string, pushTime string) (time.Time, error) {
	parsedTime, err := time.ParseInLocation(attendanceTimeLayout, pushTime, now.Location())
	if err != nil {
		return time.Time{}, err
	}
	year := now.Year()
	month := now.Month()
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, now.Location()).Day()
	day := lastDay
	if pushDay != "last" {
		value, err := strconv.Atoi(pushDay)
		if err != nil {
			return time.Time{}, err
		}
		if value < 1 {
			value = 1
		}
		if value > lastDay {
			day = lastDay
		} else {
			day = value
		}
	}
	return time.Date(year, month, day, parsedTime.Hour(), parsedTime.Minute(), 0, 0, now.Location()), nil
}

func buildAttendanceMailContent(month string, limit int, records []*model.AttendanceRecord) (string, string) {
	subject := fmt.Sprintf("%s补卡清单提醒", month)
	sort.Slice(records, func(i, j int) bool {
		if records[i].Date == records[j].Date {
			return records[i].Type < records[j].Type
		}
		return records[i].Date < records[j].Date
	})
	var builder strings.Builder
	builder.WriteString("本月补卡次数：")
	builder.WriteString(fmt.Sprintf("%d/%d\n", len(records), limit))
	builder.WriteString("补卡日期：\n")
	for _, record := range records {
		builder.WriteString("- ")
		builder.WriteString(record.Date)
		builder.WriteString(" ")
		builder.WriteString(formatAttendanceType(record.Type))
		builder.WriteString("\n")
	}
	builder.WriteString("请在审批系统提交补卡申请")
	return subject, builder.String()
}

func formatAttendanceType(recordType string) string {
	if recordType == v1.AttendanceTypeOut {
		return "下班"
	}
	return "上班"
}
