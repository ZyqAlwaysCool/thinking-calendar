/*
 * @Author: zyq
 * @Date: 2025-12-17 21:26:15
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 21:30:25
 * @FilePath: /thinking-calendar/backend/test/llm/openai_integration_test.go
 * @Description:
 *
 * Copyright (c) 2025 by zyq, All Rights Reserved.
 */
package llm_test

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"backend/internal/llm"
	"backend/pkg/config"
)

func TestOpenAIClient_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("short 模式跳过集成测试")
	}
	apiKey := os.Getenv("MODEL_API_KEY")
	if apiKey == "" {
		t.Skip("MODEL_API_KEY 未设置，跳过集成测试")
	}

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("获取当前文件路径失败")
	}
	confPath := filepath.Join(filepath.Dir(file), "..", "..", "config", "local.yml")
	conf := config.NewConfig(confPath)
	conf.Set("llm.openai.api_key", apiKey)

	client, err := llm.NewOpenAIClient(conf)
	if err != nil {
		t.Fatalf("初始化客户端失败: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	content, abstract, err := client.GenerateReport(ctx, "用一句话返回一段测试内容，并生成摘要。正文用中文。")
	if err != nil {
		t.Fatalf("调用大模型失败: %v", err)
	}
	if content == "" {
		t.Fatalf("content 为空")
	}
	if abstract == "" {
		t.Log("abstract 为空，仅提示")
	}

	t.Logf("内容: %s", content)
	t.Logf("摘要: %s", abstract)
}
