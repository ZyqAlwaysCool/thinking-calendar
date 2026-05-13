package handler

import (
	"github.com/gin-gonic/gin"
	"backend/pkg/jwt"
	"backend/pkg/log"
)

type Handler struct {
	logger *log.Logger
}

func NewHandler(
	logger *log.Logger,
) *Handler {
	return &Handler{
		logger: logger,
	}
}
func GetUserIdFromCtx(ctx *gin.Context) string {
	v, exists := ctx.Get("claims")
	if !exists {
		return ""
	}
	claims, ok := v.(*jwt.MyCustomClaims)
	if !ok {
		return ""
	}
	return claims.UserId
}
