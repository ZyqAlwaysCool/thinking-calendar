package handler

import (
	v1 "backend/api/v1"
	"backend/internal/service"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AttendanceHandler struct {
	*Handler
	attendanceService service.AttendanceService
}

func NewAttendanceHandler(handler *Handler, attendanceService service.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{
		Handler:           handler,
		attendanceService: attendanceService,
	}
}

// GetAttendanceSettings godoc
// @Summary 获取补卡设置
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.Response
// @Router /attendance/settings/get [post]
func (h *AttendanceHandler) GetAttendanceSettings(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendanceSettingsGetReq
	if err := ctx.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	settings, err := h.attendanceService.GetAttendanceSettings(ctx, userId)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, settings)
}

// SaveAttendanceSettings godoc
// @Summary 保存补卡设置
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.AttendanceSettingsSaveReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /attendance/settings/save [post]
func (h *AttendanceHandler) SaveAttendanceSettings(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendanceSettingsSaveReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.attendanceService.SaveAttendanceSettings(ctx, userId, &req); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrAttendanceSettingsInvalid) ||
			errors.Is(err, v1.ErrAttendanceEmailInvalid) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, v1.AttendanceSettingsSaveResp{Saved: true})
}

// QueryAttendanceRecords godoc
// @Summary 查询补卡记录
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.AttendanceRecordsQueryReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /attendance/records/query [post]
func (h *AttendanceHandler) QueryAttendanceRecords(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendanceRecordsQueryReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	resp, err := h.attendanceService.QueryAttendanceRecords(ctx, userId, req.Month)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrAttendanceDateInvalid) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, resp)
}

// SaveAttendanceRecord godoc
// @Summary 保存补卡记录
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.AttendanceRecordSaveReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /attendance/records/save [post]
func (h *AttendanceHandler) SaveAttendanceRecord(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendanceRecordSaveReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	resp, err := h.attendanceService.SaveAttendanceRecord(ctx, userId, &req)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrAttendanceTypeInvalid) ||
			errors.Is(err, v1.ErrAttendanceDateInvalid) ||
			errors.Is(err, v1.ErrAttendanceLimitReached) ||
			errors.Is(err, v1.ErrAttendanceLocked) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, resp)
}

// DeleteAttendanceRecord godoc
// @Summary 删除补卡记录
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.AttendanceRecordDeleteReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /attendance/records/delete [post]
func (h *AttendanceHandler) DeleteAttendanceRecord(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendanceRecordDeleteReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.attendanceService.DeleteAttendanceRecord(ctx, userId, req.Id); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrAttendanceLocked) ||
			errors.Is(err, v1.ErrAttendanceRecordNotExist) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, v1.AttendanceRecordDeleteResp{Deleted: true})
}

// QueryAttendancePushHistory godoc
// @Summary 查询补卡推送历史
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.Response
// @Router /attendance/push/history [post]
func (h *AttendanceHandler) QueryAttendancePushHistory(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendancePushHistoryQueryReq
	if err := ctx.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	resp, err := h.attendanceService.QueryAttendancePushHistory(ctx, userId)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, resp)
}

// TriggerAttendancePushManual godoc
// @Summary 手动触发补卡推送
// @Schemes
// @Tags 补卡
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.AttendancePushManualReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /attendance/push/manual [post]
func (h *AttendanceHandler) TriggerAttendancePushManual(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.AttendancePushManualReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	resp, err := h.attendanceService.TriggerAttendancePushManual(ctx, userId, &req)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrAttendanceDateInvalid) ||
			errors.Is(err, v1.ErrAttendanceEmailInvalid) ||
			errors.Is(err, v1.ErrAttendanceNoRecords) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, resp)
}
