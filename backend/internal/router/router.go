/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-16 15:55:55
 */
package router

import (
	"backend/internal/handler"
	"backend/pkg/jwt"
	"backend/pkg/log"

	"github.com/spf13/viper"
)

type RouterDeps struct {
	Logger        *log.Logger
	Config        *viper.Viper
	JWT           *jwt.JWT
	UserHandler   *handler.UserHandler
	RecordHandler *handler.RecordHandler
	ReportHandler *handler.ReportHandler
	DashboardHandler *handler.DashboardHandler
}
