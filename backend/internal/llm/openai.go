/*
 * @Author: zyq
 * @Date: 2025-12-17 21:00:44
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-18 11:54:17
 * @FilePath: /thinking-calendar/backend/internal/llm/openai.go
 * @Description:
 *
 * Copyright (c) 2025 by zyq, All Rights Reserved.
 */
package llm

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/spf13/viper"
)

const DefaultReqTimeout = 30 * time.Second

type OpenAIClient struct {
	client openai.Client
	model  string
}

func NewOpenAIClient(conf *viper.Viper) (*OpenAIClient, error) {
	apiKey := conf.GetString("llm.openai.api_key")
	if apiKey == "" {
		return nil, errors.New("MODEL_API_KEY 未配置")
	}
	baseURL := conf.GetString("llm.openai.base_url")
	if baseURL == "" {
		return nil, errors.New("llm.openai.base_url 未配置")
	}
	model := conf.GetString("llm.openai.model")
	if model == "" {
		model = "qwen3-max"
	}

	client := openai.NewClient(
		option.WithAPIKey(apiKey),
		option.WithBaseURL(baseURL),
		option.WithHTTPClient(&http.Client{
			Timeout: 60 * time.Second,
		}),
	)

	return &OpenAIClient{
		client: client,
		model:  model,
	}, nil
}

func (c *OpenAIClient) GenerateReport(ctx context.Context, systemPrompt string, userPrompt string) (string, string, error) {
	if c == nil {
		return "", "", errors.New("llm client not initialized")
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultReqTimeout)
	defer cancel()
	resp, err := c.client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModel(c.model),
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(userPrompt),
		},
	})
	if err != nil {
		return "", "", errors.New("call llm model failed: " + err.Error())
	}
	if len(resp.Choices) == 0 {
		return "", "", errors.New("llm model returned empty response")
	}

	raw := resp.Choices[0].Message.Content
	content := raw
	abstract := buildAbstract(raw)
	return content, abstract, nil
}

func buildAbstract(content string) string {
	// 简单截取前 2 行作为摘要，避免额外 LLM 调用
	lines := strings.Split(content, "\n")
	result := []string{}
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if trimmed != "" {
			result = append(result, trimmed)
		}
		if len(result) >= 2 {
			break
		}
	}
	return strings.Join(result, " ")
}
