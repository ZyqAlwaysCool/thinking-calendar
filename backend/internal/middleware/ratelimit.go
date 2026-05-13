package middleware

import (
	"net/http"
	"sync"
	"time"

	v1 "backend/api/v1"

	"github.com/gin-gonic/gin"
)

type rateEntry struct {
	count    int
	resetAt  time.Time
}

// RateLimitMiddleware 基于 IP 的简易令牌桶限流
// limit: 窗口内最大请求数
// window: 时间窗口大小
func RateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	buckets := make(map[string]*rateEntry)

	// 定期清理过期条目
	go func() {
		for {
			time.Sleep(window)
			mu.Lock()
			now := time.Now()
			for ip, entry := range buckets {
				if now.After(entry.resetAt) {
					delete(buckets, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		mu.Lock()
		entry, exists := buckets[ip]
		if !exists || now.After(entry.resetAt) {
			buckets[ip] = &rateEntry{count: 1, resetAt: now.Add(window)}
			mu.Unlock()
			c.Next()
			return
		}

		entry.count++
		current := entry.count
		mu.Unlock()

		if current > limit {
			v1.HandleError(c, http.StatusTooManyRequests, v1.ErrTooManyRequests, nil)
			c.Abort()
			return
		}
		c.Next()
	}
}
