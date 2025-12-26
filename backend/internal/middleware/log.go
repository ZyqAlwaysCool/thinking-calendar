package middleware

import (
	"backend/pkg/log"
	"bytes"
	"github.com/duke-git/lancet/v2/cryptor"
	"github.com/duke-git/lancet/v2/random"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"io"
	"time"
)

func RequestLogMiddleware(logger *log.Logger) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// The configuration is initialized once per request
		uuid, err := random.UUIdV4()
		if err != nil {
			return
		}
		trace := cryptor.Md5String(uuid)
		logger.WithValue(ctx, zap.String("trace", trace))
		logger.WithValue(ctx, zap.String("request_method", ctx.Request.Method))
		logger.WithValue(ctx, zap.String("request_url", ctx.Request.URL.String()))

		// 读取并保留请求体，保证后续绑定不受影响
		var body string
		if ctx.Request.Body != nil {
			data, err := io.ReadAll(ctx.Request.Body)
			if err == nil {
				if len(data) > 4096 {
					body = string(data[:4096]) + "...(truncated)"
				} else {
					body = string(data)
				}
				ctx.Request.Body = io.NopCloser(bytes.NewBuffer(data))
			}
		}

		logger.WithContext(ctx).Info("Request",
			zap.String("query", ctx.Request.URL.RawQuery),
			zap.String("body", body),
		)
		ctx.Next()
	}
}
func ResponseLogMiddleware(logger *log.Logger) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		startTime := time.Now()
		ctx.Next()
		duration := time.Since(startTime).String()
		logger.WithContext(ctx).Info("Response",
			zap.Int("status", ctx.Writer.Status()),
			zap.String("time", duration),
		)
	}
}
