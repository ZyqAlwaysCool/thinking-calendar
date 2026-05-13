package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	v1 "backend/api/v1"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/stretchr/testify/assert"
)

// 手动 stub RecordRepository，仅实现测试需要的方法
type stubRecordRepo struct {
	records []*model.Record
	getErr  error
}

func (s *stubRecordRepo) Create(ctx context.Context, record *model.Record) error { return nil }
func (s *stubRecordRepo) Update(ctx context.Context, record *model.Record) error { return nil }
func (s *stubRecordRepo) GetByID(ctx context.Context, userID string, recordID string) (*model.Record, error) {
	return nil, v1.ErrNotFound
}
func (s *stubRecordRepo) GetByUserID(ctx context.Context, userID string, date string) ([]*model.Record, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	return s.records, nil
}
func (s *stubRecordRepo) GetByUserIDPaginated(ctx context.Context, userID string, page int, pageSize int) ([]*model.Record, int64, error) {
	return nil, 0, nil
}
func (s *stubRecordRepo) GetByDateRange(ctx context.Context, userID string, startDate string, endDate string) ([]*model.Record, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	return s.records, nil
}

// 确保实现了接口
var _ repository.RecordRespository = (*stubRecordRepo)(nil)

type stubTx struct{}

func (s *stubTx) Transaction(ctx context.Context, fn func(context.Context) error) error {
	return fn(ctx)
}

func newStubService() *service.Service {
	return &service.Service{}
}

// 通过反射方式设置 Service 内部字段的辅助结构
type testServiceWrapper struct {
	svc       *service.Service
	recordSvc service.RecordService
}

func newRecordServiceForTest(stub *stubRecordRepo) service.RecordService {
	tm := &stubTx{}
	svc := service.NewService(tm, logger, sf, j)
	return service.NewRecordService(svc, stub)
}

func TestRecordService_FutureDate(t *testing.T) {
	stub := &stubRecordRepo{}
	svc := newRecordServiceForTest(stub)
	ctx := context.Background()
	futureDate := time.Now().AddDate(0, 0, 1).Format("2006-01-02")

	err := svc.UpsertUserRecord(ctx, "user1", &v1.UpsertRecordReq{
		Date:    futureDate,
		Content: "test",
	})

	assert.Error(t, err)
	assert.True(t, errors.Is(err, v1.ErrInvalidDate))
}

func TestRecordService_InvalidDateFormat(t *testing.T) {
	stub := &stubRecordRepo{}
	svc := newRecordServiceForTest(stub)
	ctx := context.Background()

	err := svc.UpsertUserRecord(ctx, "user1", &v1.UpsertRecordReq{
		Date:    "12/25/2025",
		Content: "test",
	})

	assert.Error(t, err)
	assert.True(t, errors.Is(err, v1.ErrInvalidDate))
}

func TestRecordService_StartAfterEnd(t *testing.T) {
	stub := &stubRecordRepo{}
	svc := newRecordServiceForTest(stub)
	ctx := context.Background()

	_, err := svc.QueryUserRecordsByDateRange(ctx, "user1", "2025-12-15", "2025-12-01")

	assert.Error(t, err)
	assert.True(t, errors.Is(err, v1.ErrBadRequest))
}

func TestRecordService_InvalidStartDate(t *testing.T) {
	stub := &stubRecordRepo{}
	svc := newRecordServiceForTest(stub)
	ctx := context.Background()

	_, err := svc.QueryUserRecordsByDateRange(ctx, "user1", "bad-date", "2025-12-01")

	assert.Error(t, err)
	assert.True(t, errors.Is(err, v1.ErrInvalidDate))
}

func TestRecordService_UpdateExisting(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	stub := &stubRecordRepo{
		records: []*model.Record{{
			RecordID: "rec_1",
			UserID:   "user1",
			Date:     today,
			Content:  "old content",
			Version:  1,
		}},
	}
	svc := newRecordServiceForTest(stub)
	ctx := context.Background()

	err := svc.UpsertUserRecord(ctx, "user1", &v1.UpsertRecordReq{
		Date:    today,
		Content: "new content",
	})

	assert.NoError(t, err)
}

func TestRecordService_QueryByDate_NotFound(t *testing.T) {
	stub := &stubRecordRepo{}
	svc := newRecordServiceForTest(stub)
	ctx := context.Background()

	_, err := svc.QueryUserRecordsByDate(ctx, "user1", "2025-01-15")

	assert.Error(t, err)
	assert.True(t, errors.Is(err, v1.ErrRecordNotExist))
}

