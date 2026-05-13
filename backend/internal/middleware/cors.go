package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	allowAll := os.Getenv("CORS_ALLOW_ALL") == "true"
	customOrigins := strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		method := c.Request.Method

		if origin != "" {
			allowed := allowAll || isAllowedOrigin(origin, customOrigins)
			if !allowed {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		if method == "OPTIONS" {
			c.Header("Access-Control-Allow-Methods", c.GetHeader("Access-Control-Request-Method"))
			c.Header("Access-Control-Allow-Headers", c.GetHeader("Access-Control-Request-Headers"))
			c.Header("Access-Control-Max-Age", "7200")
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func isAllowedOrigin(origin string, customOrigins []string) bool {
	// 精确匹配自定义白名单
	for _, o := range customOrigins {
		if strings.TrimSpace(o) == origin {
			return true
		}
	}
	// 始终允许 localhost / 127.0.0.1 任意端口
	if strings.HasPrefix(origin, "http://localhost") ||
		strings.HasPrefix(origin, "http://127.0.0.1") ||
		strings.HasPrefix(origin, "http://0.0.0.0") {
		return true
	}
	// 允许常见内网 IP 段: 10.x, 192.168.x, 172.16-31.x
	for _, prefix := range []string{"http://10.", "http://192.168.", "https://10.", "https://192.168."} {
		if strings.HasPrefix(origin, prefix) {
			return true
		}
	}
	for i := 16; i <= 31; i++ {
		prefix := "http://172." + itoa(i) + "."
		if strings.HasPrefix(origin, prefix) {
			return true
		}
	}
	return false
}

func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return string(rune('0'+n/10)) + string(rune('0'+n%10))
}
