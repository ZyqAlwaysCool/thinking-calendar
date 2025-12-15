package handler

import (
	v1 "backend/api/v1"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RecordHandler struct {
	*Handler
	recordService service.RecordService
}

func NewRecordHandler(handler *Handler, recordService service.RecordService) *RecordHandler {
	return &RecordHandler{
		Handler:       handler,
		recordService: recordService,
	}
}

// QueryRecords godoc
// @Summary 查询工作记录（单日或全部）
// @Schemes
// @Description date 为空返回当前用户全部记录，传 date 返回单日记录（不存在返回 null）
// @Tags 工作记录
// @Accept json
// @Produce json
// @Security Bearer
// @Param date query string false "日期，格式 YYYY-MM-DD"
// @Success 200 {object} v1.Response
// @Router /records [get]
func (h *RecordHandler) QueryRecords(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.QueryRecordsReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if req.Date != "" {
		record, err := h.recordService.QueryUserRecordsByDate(ctx, userId, req.Date)
		if err != nil {
			if errors.Is(err, v1.ErrRecordNotExist) {
				v1.HandleSuccess(ctx, nil)
				return
			}
			v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
			return
		}
		v1.HandleSuccess(ctx, record)
		return
	}

	records, err := h.recordService.GetAllUserRecords(ctx, userId)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, records)
}

// QueryRecordsByRange godoc
// @Summary 按时间范围查询工作记录
// @Schemes
// @Description start 和 end 需为 YYYY-MM-DD，且 start < end
// @Tags 工作记录
// @Accept json
// @Produce json
// @Security Bearer
// @Param start query string true "开始日期"
// @Param end query string true "结束日期"
// @Success 200 {array} v1.RecordItem
// @Router /records/range [get]
func (h *RecordHandler) QueryRecordsByRange(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.RangeRecordsReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	records, err := h.recordService.QueryUserRecordsByDateRange(ctx, userId, req.Start, req.End)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrBadRequest) || errors.Is(err, v1.ErrInvalidDate) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, records)
}

// UpsertRecord godoc
// @Summary 创建或更新工作记录
// @Schemes
// @Description 同一日期多次调用视为更新
// @Tags 工作记录
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.UpsertRecordReq true "请求参数"
// @Success 200 {object} v1.RecordItem
// @Router /records [post]
func (h *RecordHandler) UpsertRecord(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.UpsertRecordReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.recordService.UpsertUserRecord(ctx, userId, &req); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrBadRequest) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}

	record, err := h.recordService.QueryUserRecordsByDate(ctx, userId, req.Date)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, record)
}

// DeleteRecord godoc
// @Summary 删除工作记录
// @Schemes
// @Tags 工作记录
// @Accept json
// @Produce json
// @Security Bearer
// @Param record_id path string true "记录 ID"
// @Success 200 {object} v1.Response
// @Router /records/{record_id} [delete]
func (h *RecordHandler) DeleteRecord(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.DeleteRecordReq
	if err := ctx.ShouldBindUri(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.recordService.DeleteUserRecord(ctx, userId, req.RecordID); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrRecordNotExist) {
			status = http.StatusNotFound
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, nil)
}
