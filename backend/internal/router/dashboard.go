/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-17 17:35:00
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 17:35:00
 */
package router

import (
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func InitDashboardRouter(
	deps RouterDeps,
	r *gin.RouterGroup,
) {
	strictAuthRouter := r.Group("/").Use(middleware.StrictAuth(deps.JWT, deps.Logger))
	{
		strictAuthRouter.GET("/dashboard/month", deps.DashboardHandler.GetMonth)
		strictAuthRouter.GET("/dashboard/summary", deps.DashboardHandler.GetSummary)
	}
}
