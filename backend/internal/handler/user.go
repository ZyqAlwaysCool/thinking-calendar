package handler

import (
	v1 "backend/api/v1"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type UserHandler struct {
	*Handler
	userService service.UserService
}

func NewUserHandler(handler *Handler, userService service.UserService) *UserHandler {
	return &UserHandler{
		Handler:     handler,
		userService: userService,
	}
}

// Register godoc
// @Summary 用户注册
// @Schemes
// @Description 目前只支持用户名登录
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param request body v1.RegisterReq true "params"
// @Success 200 {object} v1.Response
// @Router /register [post]
func (h *UserHandler) Register(ctx *gin.Context) {
	req := new(v1.RegisterReq)
	if err := ctx.ShouldBindJSON(req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.userService.Register(ctx, req); err != nil {
		h.logger.WithContext(ctx).Error("userService.Register error", zap.Error(err))
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrUsernameAlreadyUse) || errors.Is(err, v1.ErrPasswordInvalid) || errors.Is(err, v1.ErrUsernameInvalid) || errors.Is(err, v1.ErrPasswordSimple) {
			status = http.StatusBadRequest
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}

	v1.HandleSuccess(ctx, nil)
}

// Login godoc
// @Summary 账号登录
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param request body v1.LoginReq true "params"
// @Success 200 {object} v1.Response
// @Router /login [post]
func (h *UserHandler) Login(ctx *gin.Context) {
	var req v1.LoginReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	loginResp, err := h.userService.Login(ctx, &req)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, loginResp)
}

// GetProfile godoc
// @Summary 获取当前用户信息
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.Response
// @Router /user [get]
func (h *UserHandler) GetProfile(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	user, err := h.userService.GetUserInfo(ctx, userId)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrNotFound) {
			status = http.StatusNotFound
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}

	v1.HandleSuccess(ctx, user)
}

// GetUserSettings godoc
// @Summary 获取用户配置
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.Response
// @Router /user/settings [get]
func (h *UserHandler) GetUserSettings(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	settings, err := h.userService.GetUserSettings(ctx, userId)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, v1.ErrNotFound) {
			status = http.StatusNotFound
		}
		v1.HandleError(ctx, status, err, nil)
		return
	}

	v1.HandleSuccess(ctx, settings)
}

// UpdateUserSettings godoc
// @Summary 更新用户配置
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.UpdateUserSettingsReq true "params"
// @Success 200 {object} v1.Response
// @Router /user/settings [put]
func (h *UserHandler) UpdateUserSettings(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == "" {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	var req v1.UpdateUserSettingsReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.userService.UpdateUserSettings(ctx, userId, &req); err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}

	v1.HandleSuccess(ctx, nil)
}
