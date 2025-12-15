/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-16 15:58:20
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 15:58:38
 */
package router

import (
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func InitRecordRouter(
	deps RouterDeps,
	r *gin.RouterGroup,
) {
	// Strict permission routing group
	strictAuthRouter := r.Group("/").Use(middleware.StrictAuth(deps.JWT, deps.Logger))
	{
		// 工作记录
		strictAuthRouter.GET("/records", deps.RecordHandler.QueryRecords)
		strictAuthRouter.GET("/records/range", deps.RecordHandler.QueryRecordsByRange)
		strictAuthRouter.POST("/records", deps.RecordHandler.UpsertRecord)
		strictAuthRouter.DELETE("/records/:record_id", deps.RecordHandler.DeleteRecord)
	}
}
