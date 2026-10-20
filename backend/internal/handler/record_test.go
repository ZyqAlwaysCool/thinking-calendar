package handler

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"
	"backend/pkg/jwt"
	"backend/pkg/log"
	"backend/pkg/sid"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"go.uber.org/zap"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func newRecordTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: gormlogger.Default.LogMode(gormlogger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Error(err)
		}
	})
	if err := db.AutoMigrate(&model.Record{}); err != nil {
		t.Fatal(err)
	}

	logger := &log.Logger{Logger: zap.NewNop()}
	repo := repository.NewRepository(logger, db)
	recordService := service.NewRecordService(
		service.NewService(repository.NewTransaction(repo), logger, sid.NewSid(), nil),
		repository.NewRecordRepository(repo),
	)
	recordHandler := NewRecordHandler(NewHandler(logger), recordService)
	router := gin.New()
	router.Use(func(ctx *gin.Context) {
		ctx.Set("claims", &jwt.MyCustomClaims{UserId: "history-record-user"})
		ctx.Next()
	})
	router.GET("/api/records", recordHandler.QueryRecords)
	router.POST("/api/records", recordHandler.UpsertRecord)
	router.DELETE("/api/records/:record_id", recordHandler.DeleteRecord)
	return router
}

func requestRecord(t *testing.T, router *gin.Engine, method, path, body string) json.RawMessage {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, req)
	if response.Code != http.StatusOK {
		t.Fatalf("记录请求失败：%s %s，状态=%d，响应=%s", method, path, response.Code, response.Body.String())
	}
	var result struct {
		Code int             `json:"code"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Code != 0 {
		t.Fatalf("记录请求返回错误：%s", response.Body.String())
	}
	return result.Data
}

func decodeRecord(t *testing.T, data json.RawMessage) v1.RecordItem {
	t.Helper()
	var record v1.RecordItem
	if err := json.Unmarshal(data, &record); err != nil {
		t.Fatal(err)
	}
	return record
}

func TestHistoryRecordLifecycle(t *testing.T) {
	router := newRecordTestRouter(t)
	date := "2020-04-08"
	path := "/api/records?date=" + date
	if data := requestRecord(t, router, http.MethodGet, path, ""); string(data) != "null" {
		t.Fatalf("无记录的历史日期应返回 null，实际返回 %s", data)
	}

	requestRecord(t, router, http.MethodPost, "/api/records", `{"date":"2020-04-07","content":"相邻日期记录"}`)
	created := decodeRecord(t, requestRecord(t, router, http.MethodPost, "/api/records",
		`{"date":"2020-04-08","content":"首次补写历史记录"}`))
	loaded := decodeRecord(t, requestRecord(t, router, http.MethodGet, path, ""))
	if loaded.Date != date || loaded.Content != "首次补写历史记录" || loaded.RecordID != created.RecordID {
		t.Fatalf("新增后查询未返回所选日期的记录：%+v", loaded)
	}

	updated := decodeRecord(t, requestRecord(t, router, http.MethodPost, "/api/records",
		`{"date":"2020-04-08","content":"修改后的历史记录"}`))
	if updated.RecordID != created.RecordID || updated.Version != created.Version+1 {
		t.Fatalf("修改同一天应更新原记录：新增=%+v，修改=%+v", created, updated)
	}
	loaded = decodeRecord(t, requestRecord(t, router, http.MethodGet, path, ""))
	if loaded.Date != date || loaded.Content != "修改后的历史记录" {
		t.Fatalf("修改后内容未持久化到所选日期：%+v", loaded)
	}

	requestRecord(t, router, http.MethodDelete, "/api/records/"+created.RecordID, "")
	if data := requestRecord(t, router, http.MethodGet, path, ""); string(data) != "null" {
		t.Fatalf("删除后所选日期应恢复为空记录，实际返回 %s", data)
	}
	neighbor := decodeRecord(t, requestRecord(t, router, http.MethodGet, "/api/records?date=2020-04-07", ""))
	if neighbor.Date != "2020-04-07" || neighbor.Content != "相邻日期记录" {
		t.Fatalf("修改和删除不应影响其他日期：%+v", neighbor)
	}
	var records []v1.RecordItem
	if err := json.Unmarshal(requestRecord(t, router, http.MethodGet, "/api/records", ""), &records); err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 || records[0].Date != neighbor.Date || records[0].Content != neighbor.Content {
		t.Fatalf("历史列表应排除已删除记录并保留其他日期：%+v", records)
	}

	recreated := decodeRecord(t, requestRecord(t, router, http.MethodPost, "/api/records",
		`{"date":"2020-04-08","content":"删除后重新补写"}`))
	loaded = decodeRecord(t, requestRecord(t, router, http.MethodGet, path, ""))
	if recreated.RecordID != created.RecordID || loaded.Date != date || loaded.Content != "删除后重新补写" {
		t.Fatalf("删除后应能重新编辑同一天：新增=%+v，重建=%+v，查询=%+v", created, recreated, loaded)
	}
}
