//go:build wireinject
// +build wireinject

/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 14:50:17
 */

package wire

import (
	"backend/internal/llm"
	"backend/internal/repository"
	"backend/internal/server"
	"backend/internal/service"
	"backend/internal/task"
	"backend/pkg/app"
	"backend/pkg/jwt"
	"backend/pkg/log"
	"backend/pkg/sid"

	"github.com/google/wire"
	"github.com/spf13/viper"
)

var repositorySet = wire.NewSet(
	repository.NewDB,
	//repository.NewRedis,
	repository.NewRepository,
	repository.NewTransaction,
	repository.NewUserRepository,
	repository.NewUserSettingsRepository,
	repository.NewRecordRepository,
	repository.NewReportRepository,
)

var serviceSet = wire.NewSet(
	service.NewService,
	service.NewRecordService,
	service.NewReportService,
	llm.NewOpenAIClient,
)

var taskSet = wire.NewSet(
	task.NewTask,
	task.NewUserTask,
	task.NewReportTask,
)
var serverSet = wire.NewSet(
	server.NewTaskServer,
)

// build App
func newApp(
	task *server.TaskServer,
) *app.App {
	return app.NewApp(
		app.WithServer(task),
		app.WithName("task"),
	)
}

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		repositorySet,
		serviceSet,
		taskSet,
		serverSet,
		newApp,
		sid.NewSid,
		jwt.NewJwt,
	))
}
