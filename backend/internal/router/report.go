/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-17 11:20:00
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 11:20:00
 */
package router

import (
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func InitReportRouter(
	deps RouterDeps,
	r *gin.RouterGroup,
) {
	strictAuthRouter := r.Group("/").Use(middleware.StrictAuth(deps.JWT, deps.Logger))
	{
		strictAuthRouter.GET("/reports", deps.ReportHandler.GetReports)
		strictAuthRouter.GET("/reports/:report_id", deps.ReportHandler.GetReportByID)
		strictAuthRouter.POST("/reports/generate", deps.ReportHandler.GenerateReport)
		strictAuthRouter.POST("/reports/edit", deps.ReportHandler.EditReport)
		strictAuthRouter.POST("/reports/confirm", deps.ReportHandler.ConfirmReport)
	}
}
