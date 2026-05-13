/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 17:37:21
 */
package router

import (
	"backend/internal/middleware"
	"time"

	"github.com/gin-gonic/gin"
)

func InitUserRouter(
	deps RouterDeps,
	r *gin.RouterGroup,
) {
	// No route group has permission (严格限流: 每分钟最多 10 次)
	noAuthRouter := r.Group("/").Use(middleware.RateLimitMiddleware(10, time.Minute))
	{
		noAuthRouter.POST("/register", deps.UserHandler.Register)
		noAuthRouter.POST("/login", deps.UserHandler.Login)
		noAuthRouter.POST("/refresh", deps.UserHandler.RefreshToken)
	}
	// Strict permission routing group
	strictAuthRouter := r.Group("/").Use(middleware.StrictAuth(deps.JWT, deps.Logger))
	{
		strictAuthRouter.GET("/user", deps.UserHandler.GetProfile)
		strictAuthRouter.GET("/user/settings", deps.UserHandler.GetUserSettings)
		strictAuthRouter.PUT("/user/settings", deps.UserHandler.UpdateUserSettings)
	}
}
