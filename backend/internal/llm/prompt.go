package llm

import (
	"backend/pkg/log"
	"os"
	"path/filepath"

	"go.uber.org/zap"
)

type PromptSet struct {
	Formal string
	Simple string
}

// LoadPrompts 从 internal/llm 目录加载默认模板
func LoadPrompts(logger *log.Logger) PromptSet {
	baseDir, err := os.Getwd()
	if err != nil {
		logger.Error("get wd failed", zap.String("err", err.Error()))
		return PromptSet{}
	}

	dir := filepath.Join(baseDir, "internal", "llm")
	read := func(name string) string {
		b, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			logger.Error("read prompt failed", zap.String("file", name), zap.String("err", err.Error()))
			return ""
		}
		return string(b)
	}

	return PromptSet{
		Formal: read("formal_prompt.md"),
		Simple: read("simple_prompt.md"),
	}
}
