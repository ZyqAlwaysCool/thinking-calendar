package router

import (
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func InitAttendanceRouter(
	deps RouterDeps,
	r *gin.RouterGroup,
) {
	strictAuthRouter := r.Group("/").Use(middleware.StrictAuth(deps.JWT, deps.Logger))
	{
		strictAuthRouter.POST("/attendance/settings/get", deps.AttendanceHandler.GetAttendanceSettings)
		strictAuthRouter.POST("/attendance/settings/save", deps.AttendanceHandler.SaveAttendanceSettings)
		strictAuthRouter.POST("/attendance/records/query", deps.AttendanceHandler.QueryAttendanceRecords)
		strictAuthRouter.POST("/attendance/records/save", deps.AttendanceHandler.SaveAttendanceRecord)
		strictAuthRouter.POST("/attendance/records/delete", deps.AttendanceHandler.DeleteAttendanceRecord)
		strictAuthRouter.POST("/attendance/push/history", deps.AttendanceHandler.QueryAttendancePushHistory)
		strictAuthRouter.POST("/attendance/push/manual", deps.AttendanceHandler.TriggerAttendancePushManual)
	}
}
