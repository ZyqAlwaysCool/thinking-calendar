//go:build wireinject
// +build wireinject

/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 18:07:50
 */

package wire

import (
	"backend/internal/handler"
	"backend/internal/job"
	"backend/internal/llm"
	"backend/internal/repository"
	"backend/internal/router"
	"backend/internal/server"
	"backend/internal/service"
	"backend/pkg/app"
	"backend/pkg/jwt"
	"backend/pkg/log"
	"backend/pkg/server/http"
	"backend/pkg/sid"

	"github.com/google/wire"
	"github.com/spf13/viper"
)

var repositorySet = wire.NewSet(
	repository.NewDB,
	//repository.NewRedis,
	//repository.NewMongo,
	repository.NewRepository,
	repository.NewTransaction,
	repository.NewUserRepository,
	repository.NewUserSettingsRepository,
	repository.NewRecordRepository,
	repository.NewReportRepository,
)

var serviceSet = wire.NewSet(
	service.NewService,
	service.NewUserService,
	service.NewRecordService,
	service.NewReportService,
	service.NewDashboardService,
	llm.NewOpenAIClient,
)

var handlerSet = wire.NewSet(
	handler.NewHandler,
	handler.NewUserHandler,
	handler.NewRecordHandler,
	handler.NewReportHandler,
	handler.NewDashboardHandler,
)

var jobSet = wire.NewSet(
	job.NewJob,
	job.NewUserJob,
)

var serverSet = wire.NewSet(
	server.NewHTTPServer,
	server.NewJobServer,
)

// build App
func newApp(
	httpServer *http.Server,
	jobServer *server.JobServer,
) *app.App {
	return app.NewApp(
		app.WithServer(httpServer, jobServer),
		app.WithName("server"),
	)
}

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		repositorySet,
		serviceSet,
		handlerSet,
		jobSet,
		serverSet,
		wire.Struct(new(router.RouterDeps), "*"),
		sid.NewSid,
		jwt.NewJwt,
		newApp,
	))
}
