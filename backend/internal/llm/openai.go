/*
 * @Author: zyq
 * @Date: 2025-12-17 21:00:44
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 21:49:43
 * @FilePath: /thinking-calendar/backend/internal/llm/openai.go
 * @Description:
 *
 * Copyright (c) 2025 by zyq, All Rights Reserved.
 */
package llm

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/spf13/viper"
)

const (
	DefaultTimeout    = 60 * time.Second
	DefaultReqTimeout = 30 * time.Second
)

type OpenAIClient struct {
	client openai.Client
	model  string
}

type reportModelResp struct {
	Content  string `json:"content"`
	Abstract string `json:"abstract"`
}

func NewOpenAIClient(conf *viper.Viper) (*OpenAIClient, error) {
	apiKey := conf.GetString("llm.openai.api_key")
	if apiKey == "" {
		return nil, errors.New("OPENAI_API_KEY 未配置")
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
			Timeout: DefaultTimeout,
		}),
	)

	return &OpenAIClient{
		client: client,
		model:  model,
	}, nil
}

func (c *OpenAIClient) GenerateReport(ctx context.Context, prompt string) (string, string, error) {
	if c == nil {
		return "", "", errors.New("llm client not initialized")
	}

	systemPrompt := "你是一个写作助手。你必须只输出 JSON，且不得包含代码块标记。JSON 格式必须为 {\"content\":\"...\",\"abstract\":\"...\"}。content 为 Markdown 报告正文，abstract 为 1-3 句摘要。"

	ctx, cancel := context.WithTimeout(ctx, DefaultReqTimeout)
	defer cancel()
	resp, err := c.client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModel(c.model),
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(prompt),
		},
	})
	if err != nil {
		return "", "", errors.New("call llm model failed: " + err.Error())
	}
	if len(resp.Choices) == 0 {
		return "", "", errors.New("llm model returned empty response")
	}

	raw := resp.Choices[0].Message.Content
	var parsed reportModelResp
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		// 容错：若模型未按约定返回 JSON，则直接把全文当成正文，摘要留空
		return raw, "", nil
	}
	return parsed.Content, parsed.Abstract, nil
}
