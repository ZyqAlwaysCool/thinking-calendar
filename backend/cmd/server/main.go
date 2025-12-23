/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 21:16:48
 */
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"backend/cmd/server/wire"
	"backend/pkg/config"
	"backend/pkg/log"

	"go.uber.org/zap"
)

// @title           thinking calendar API
// @version         1.0.0
// @termsOfService  http://swagger.io/terms/
// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io
// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html
// @securityDefinitions.apiKey Bearer
// @in header
// @name Authorization
// @externalDocs.description  OpenAPI
// @externalDocs.url          https://swagger.io/resources/open-api/
func main() {
	var envConf = flag.String("conf", "config/local.yml", "config path, eg: -conf ./config/local.yml")
	flag.Parse()
	conf := config.NewConfig(*envConf)

	apiKey := os.Getenv("MODEL_API_KEY")
	if apiKey == "" {
		panic("MODEL_API_KEY 未配置，禁止启动服务")
	}
	conf.Set("llm.openai.api_key", apiKey)
	logger := log.NewLog(conf)
	logger.Info("MODEL_API_KEY 已加载", zap.String("masked", maskKey(apiKey)))

	app, cleanup, err := wire.NewWire(conf, logger)
	defer cleanup()
	if err != nil {
		panic(err)
	}
	logger.Info("server start", zap.String("host", fmt.Sprintf("http://%s:%d", conf.GetString("http.host"), conf.GetInt("http.port"))))
	logger.Info("swagger addr", zap.String("addr", fmt.Sprintf("http://%s:%d/swagger/index.html", conf.GetString("http.host"), conf.GetInt("http.port"))))
	if err = app.Run(context.Background()); err != nil {
		panic(err)
	}
}

func maskKey(key string) string {
	if len(key) <= 5 {
		return "***"
	}
	prefix := key
	suffix := ""
	if len(key) > 5 {
		prefix = key[:2]
	}
	if len(key) > 5 {
		suffix = key[len(key)-3:]
	}
	return prefix + "***" + suffix
}
