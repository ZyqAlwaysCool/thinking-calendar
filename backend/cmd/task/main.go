/*
 * @Author: zyq
 * @Date: 2025-12-17 20:12:08
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-18 10:36:48
 * @FilePath: /thinking-calendar/backend/cmd/task/main.go
 * @Description:
 *
 * Copyright (c) 2025 by zyq, All Rights Reserved.
 */
package main

import (
	"backend/cmd/task/wire"
	"backend/pkg/config"
	"backend/pkg/log"
	"context"
	"flag"
	"os"

	"go.uber.org/zap"
)

func main() {
	var envConf = flag.String("conf", "config/local.yml", "config path, eg: -conf ./config/local.yml")
	flag.Parse()
	conf := config.NewConfig(*envConf)

	logPath := os.Getenv("LOG_FILE_NAME")
	if logPath == "" {
		logPath = "./storage/task-logs/task.log"
	}
	conf.Set("log.log_file_name", logPath)

	apiKey := os.Getenv("MODEL_API_KEY")
	if apiKey == "" {
		panic("MODEL_API_KEY 未配置，禁止启动服务")
	}
	conf.Set("llm.openai.api_key", apiKey)

	logger := log.NewLog(conf)
	logger.Info("MODEL_API_KEY 已加载", zap.String("masked", maskKey(apiKey)))
	logger.Info("task start")
	app, cleanup, err := wire.NewWire(conf, logger)
	defer cleanup()
	if err != nil {
		panic(err)
	}
	if err = app.Run(context.Background()); err != nil {
		panic(err)
	}

}

func maskKey(key string) string {
	if len(key) <= 5 {
		return "***"
	}
	prefix := key[:2]
	suffix := key[len(key)-3:]
	return prefix + "***" + suffix
}
