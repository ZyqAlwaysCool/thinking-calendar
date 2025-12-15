package handler

import (
	v1 "backend/api/v1"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	*Handler
	dashboardService service.DashboardService
}

func NewDashboardHandler(handler *Handler, dashboardService service.DashboardService) *DashboardHandler {
	return &DashboardHandler{
		Handler:          handler,
		dashboardService: dashboardService,
	}
}

// GetMonth godoc
// @Summary 获取指定月份看板数据
// @Schemes
// @Tags 看板
// @Accept json
// @Produce json
// @Security Bearer
// @Param month query string true "月份，格式YYYY-MM"
// @Success 200 {object} v1.Response
// @Router /dashboard/month [get]
func (h *DashboardHandler) GetMonth(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.MonthDashboardReq
	if err := ctx.ShouldBindQuery(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	resp, err := h.dashboardService.GetMonth(ctx, userId, req.Month)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrInvalidDate) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}
	v1.HandleSuccess(ctx, resp)
}

// GetSummary godoc
// @Summary 获取看板汇总数据
// @Schemes
// @Tags 看板
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.Response
// @Router /dashboard/summary [get]
func (h *DashboardHandler) GetSummary(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	resp, err := h.dashboardService.GetSummary(ctx, userId)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, resp)
}
