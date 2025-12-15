package handler

import (
	v1 "backend/api/v1"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	*Handler
	reportService service.ReportService
}

func NewReportHandler(handler *Handler, reportService service.ReportService) *ReportHandler {
	return &ReportHandler{
		Handler:       handler,
		reportService: reportService,
	}
}

// GetReportByID godoc
// @Summary 获取报告详情
// @Schemes
// @Description 按报告ID查询
// @Tags 报告
// @Accept json
// @Produce json
// @Security Bearer
// @Param report_id path string true "报告ID"
// @Success 200 {object} v1.Response
// @Router /reports/{report_id} [get]
func (h *ReportHandler) GetReportByID(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.GetReportByIDReq
	if err := ctx.ShouldBindUri(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	report, err := h.reportService.GetReportByID(ctx, userId, req.ReportID)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrReportNotExist) {
			status = http.StatusNotFound
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, report)
}

// GetReports godoc
// @Summary 获取报告列表
// @Schemes
// @Description 支持按period_type或时间范围筛选
// @Tags 报告
// @Accept json
// @Produce json
// @Security Bearer
// @Param period_type query string true "报告类型 week/month/year"
// @Param start_date query string false "开始日期"
// @Param end_date query string false "结束日期"
// @Success 200 {object} v1.Response
// @Router /reports [get]
func (h *ReportHandler) GetReports(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.GetReportsReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	reports, err := h.reportService.GetReports(ctx, userId, &req)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, reports)
}

// GenerateReport godoc
// @Summary 生成或重新生成报告
// @Schemes
// @Description 仅创建/更新报告占位并进入队列
// @Tags 报告
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.GenReportReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /reports/generate [post]
func (h *ReportHandler) GenerateReport(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.GenReportReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	report, err := h.reportService.GenerateReport(ctx, userId, &req)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrInvalidReportPeriod) || errors.Is(err, v1.ErrInvalidReportTemplate) || errors.Is(err, v1.ErrInvalidDate) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, report)
}

// EditReport godoc
// @Summary 编辑报告内容
// @Schemes
// @Description 手动修改报告内容
// @Tags 报告
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.EditReportReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /reports/edit [post]
func (h *ReportHandler) EditReport(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.EditReportReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.reportService.EditReport(ctx, userId, &req); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrReportNotExist) {
			status = http.StatusNotFound
		}
		if errors.Is(err, v1.ErrReportNotReady) {
			status = http.StatusConflict
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, nil)
}

// ConfirmReport godoc
// @Summary 确认报告
// @Schemes
// @Description 将报告标记为已确认
// @Tags 报告
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.ConfirmReportReq true "请求参数"
// @Success 200 {object} v1.Response
// @Router /reports/confirm [post]
func (h *ReportHandler) ConfirmReport(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.ConfirmReportReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.reportService.ConfirmReport(ctx, userId, &req); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrReportNotExist) {
			status = http.StatusNotFound
		}
		if errors.Is(err, v1.ErrReportNotReady) {
			status = http.StatusConflict
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, nil)
}
