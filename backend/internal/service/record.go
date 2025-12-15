/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-16 10:19:16
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 16:34:45
 */
package service

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"backend/internal/repository"
	"context"
	"errors"
	"time"
	"unicode/utf8"

	"go.uber.org/zap"
)

const (
	RecordPrefix string = "recordid_"
	dateLayout   string = "2006-01-02"
)

type RecordService interface {
	UpsertUserRecord(ctx context.Context, userId string, req *v1.UpsertRecordReq) error
	DeleteUserRecord(ctx context.Context, userId string, recordId string) error
	QueryUserRecordsByDate(ctx context.Context, userId string, date string) (v1.RecordItem, error)
	QueryUserRecordsByDateRange(ctx context.Context, userId string, startDate string, endDate string) ([]v1.RecordItem, error)
	GetAllUserRecords(ctx context.Context, userId string) ([]v1.RecordItem, error)
}

func NewRecordService(
	service *Service,
	recordRepo repository.RecordRespository,
) RecordService {
	return &recordService{
		Service:    service,
		recordRepo: recordRepo,
	}
}

type recordService struct {
	*Service
	recordRepo repository.RecordRespository
}

func (s *recordService) UpsertUserRecord(ctx context.Context, userId string, req *v1.UpsertRecordReq) error {
	parsedDate, err := time.Parse(dateLayout, req.Date)
	if err != nil {
		s.logger.Error("fmt date error", zap.String("user_id", userId), zap.String("date", req.Date))
		return v1.ErrInvalidDate
	}
	if parsedDate.After(time.Now()) {
		s.logger.Error("future date not allowed", zap.String("user_id", userId), zap.String("date", req.Date))
		return v1.ErrInvalidDate
	}
	recordListPtr, err := s.recordRepo.GetByUserID(ctx, userId, req.Date)
	if err != nil {
		s.logger.Error("get records failed.", zap.String("user_id", userId))
		return v1.ErrGetRecordsFailed
	}

	if len(recordListPtr) == 0 {
		//create
		recordId, err := s.sid.GenString()
		if err != nil {
			return v1.ErrJWTGenFailed
		}
		realRecordId := RecordPrefix + recordId
		record := &model.Record{
			RecordID:  realRecordId,
			UserID:    userId,
			Date:      req.Date,
			Content:   req.Content,
			WordCount: utf8.RuneCountInString(req.Content),
			Meta:      req.Meta,
		}
		if err := s.recordRepo.Create(ctx, record); err != nil {
			s.logger.Error("create record failed.", zap.String("user_id", userId), zap.Error(err))
			return v1.ErrCreateRecordFailed
		}
	} else {
		//update
		if len(recordListPtr) > 1 {
			s.logger.Error("too many records.", zap.String("user_id", userId), zap.String("date", req.Date))
			return v1.ErrTooManyRecords
		}
		existedRecord := recordListPtr[0]
		existedRecord.Date = req.Date
		existedRecord.Content = req.Content
		existedRecord.WordCount = utf8.RuneCountInString(req.Content)
		existedRecord.Meta = req.Meta
		existedRecord.Version = existedRecord.Version + 1
		existedRecord.IsDeleted = false
		if err := s.recordRepo.Update(ctx, existedRecord); err != nil {
			s.logger.Error("update record failed.", zap.String("user_id", userId), zap.String("record_id", existedRecord.RecordID), zap.String("date", req.Date), zap.Error(err))
			return v1.ErrUpdateRecordFailed
		}
	}
	return nil
}

func (s *recordService) DeleteUserRecord(ctx context.Context, userId string, recordId string) error {
	record, err := s.recordRepo.GetByID(ctx, userId, recordId)
	if err != nil {
		s.logger.Error("get record failed.", zap.String("record_id", recordId))
		return v1.ErrGetRecordsFailed
	}
	record.IsDeleted = true

	if err := s.recordRepo.Update(ctx, record); err != nil {
		s.logger.Error("update record failed.", zap.String("record_id", recordId))
		return v1.ErrUpdateRecordFailed
	}
	return nil
}

func (s *recordService) QueryUserRecordsByDate(ctx context.Context, userId string, date string) (v1.RecordItem, error) {
	records, err := s.recordRepo.GetByUserID(ctx, userId, date)
	if err != nil {
		s.logger.Error("get record by date failed.", zap.String("user_id", userId), zap.String("date", date), zap.Error(err))
		if errors.Is(err, v1.ErrNotFound) {
			return v1.RecordItem{}, v1.ErrRecordNotExist
		}
		return v1.RecordItem{}, v1.ErrGetRecordsFailed
	}

	if len(records) == 0 {
		return v1.RecordItem{}, v1.ErrRecordNotExist
	}

	if len(records) > 1 {
		s.logger.Error("too many records.", zap.String("user_id", userId), zap.String("date", date))
		return v1.RecordItem{}, v1.ErrTooManyRecords
	}

	if records[0].IsDeleted {
		return v1.RecordItem{}, v1.ErrRecordNotExist
	}

	return s.toRecordItem(records[0]), nil
}

func (s *recordService) QueryUserRecordsByDateRange(ctx context.Context, userId string, startDate string, endDate string) ([]v1.RecordItem, error) {
	startTime, err := time.Parse(dateLayout, startDate)
	if err != nil {
		s.logger.Error("startDate fmt error.", zap.String("user_id", userId), zap.String("start", startDate))
		return nil, v1.ErrInvalidDate
	}
	endTime, err := time.Parse(dateLayout, endDate)
	if err != nil {
		s.logger.Error("endDate fmt error.", zap.String("user_id", userId), zap.String("end", endDate))
		return nil, v1.ErrInvalidDate
	}
	if !startTime.Before(endTime) {
		//startDate必须小于endDate
		s.logger.Error("startDate >= endDate.", zap.String("user_id", userId), zap.String("start", startDate), zap.String("end", endDate))
		return nil, v1.ErrBadRequest
	}

	records, err := s.recordRepo.GetByDateRange(ctx, userId, startDate, endDate)
	if err != nil {
		s.logger.Error("get date by range failed.", zap.String("user_id", userId), zap.String("start", startDate), zap.String("end", endDate), zap.Error(err))
		return nil, v1.ErrGetRecordsFailed
	}

	return s.toRecordItems(records), nil
}

func (s *recordService) GetAllUserRecords(ctx context.Context, userId string) ([]v1.RecordItem, error) {
	records, err := s.recordRepo.GetByUserID(ctx, userId, "")
	if err != nil {
		s.logger.Error("get all records failed.", zap.String("user_id", userId), zap.Error(err))
		return nil, v1.ErrGetRecordsFailed
	}

	return s.toRecordItems(records), nil
}

func (s *recordService) toRecordItem(record *model.Record) v1.RecordItem {
	return v1.RecordItem{
		RecordID:  record.RecordID,
		Date:      record.Date,
		Content:   record.Content,
		UpdatedAt: formatTime(&record.UpdatedAt),
		Version:   record.Version,
	}
}

func (s *recordService) toRecordItems(records []*model.Record) []v1.RecordItem {
	result := make([]v1.RecordItem, 0, len(records))
	for _, record := range records {
		if record.IsDeleted {
			continue
		}
		result = append(result, s.toRecordItem(record))
	}
	return result
}
