package log

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const ctxLoggerKey = "zapLogger"

type Logger struct {
	*zap.Logger
}

func NewLog(conf *viper.Viper) *Logger {
	lv := conf.GetString("log.log_level")
	var level zapcore.Level
	//debug<info<warn<error<fatal<panic
	switch lv {
	case "debug":
		level = zap.DebugLevel
	case "info":
		level = zap.InfoLevel
	case "warn":
		level = zap.WarnLevel
	case "error":
		level = zap.ErrorLevel
	default:
		level = zap.InfoLevel
	}
	hook := newDailyHook(conf)

	var encoder zapcore.Encoder
	if conf.GetString("log.encoding") == "console" {
		encoder = zapcore.NewConsoleEncoder(zapcore.EncoderConfig{
			TimeKey:        "ts",
			LevelKey:       "level",
			NameKey:        "Logger",
			CallerKey:      "caller",
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseColorLevelEncoder,
			EncodeTime:     timeEncoder,
			EncodeDuration: zapcore.SecondsDurationEncoder,
			EncodeCaller:   zapcore.FullCallerEncoder,
		})
	} else {
		encoder = zapcore.NewJSONEncoder(zapcore.EncoderConfig{
			TimeKey:        "ts",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "caller",
			FunctionKey:    zapcore.OmitKey,
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     timeEncoder,
			EncodeDuration: zapcore.SecondsDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		})
	}
	// default(both) log to console and file
	core := zapcore.NewCore(
		encoder,
		zapcore.NewMultiWriteSyncer(zapcore.AddSync(os.Stdout), zapcore.AddSync(hook)), // 同时写控制台和文件
		level,
	)
	mode := conf.GetString("log.mode")
	switch mode {
	case "console":
		core = zapcore.NewCore(
			encoder,
			zapcore.AddSync(os.Stdout),
			level,
		)
	case "file":
		core = zapcore.NewCore(
			encoder,
			zapcore.AddSync(hook),
			level,
		)
	}
	if conf.GetString("env") != "prod" {
		return &Logger{zap.New(core, zap.Development(), zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))}
	}
	return &Logger{zap.New(core, zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))}
}

func timeEncoder(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
	//enc.AppendString(t.Format("2006-01-02 15:04:05"))
	enc.AppendString(t.Format("2006-01-02 15:04:05.000000000"))
}

type dailyHook struct {
	mu          sync.Mutex
	writer      *lumberjack.Logger
	currentDate string
	conf        *viper.Viper
	baseDir     string
	ext         string
}

func newDailyHook(conf *viper.Viper) *dailyHook {
	basePath := conf.GetString("log.log_file_name")
	if basePath == "" {
		basePath = "./storage/logs/server.log"
	}
	baseDir := filepath.Dir(basePath)
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		panic(err)
	}
	ext := filepath.Ext(basePath)
	if ext == "" {
		ext = ".log"
	}
	return &dailyHook{
		conf:    conf,
		baseDir: baseDir,
		ext:     ext,
	}
}

func (h *dailyHook) filePath(date string) string {
	return filepath.Join(h.baseDir, date+h.ext)
}

func (h *dailyHook) ensureWriter() {
	now := time.Now().Format("2006-01-02")
	if h.writer != nil && h.currentDate == now {
		return
	}
	h.currentDate = now
	h.writer = &lumberjack.Logger{
		Filename:   h.filePath(now),
		MaxSize:    h.conf.GetInt("log.max_size"),
		MaxBackups: h.conf.GetInt("log.max_backups"),
		MaxAge:     h.conf.GetInt("log.max_age"),
		Compress:   h.conf.GetBool("log.compress"),
	}
}

func (h *dailyHook) Write(p []byte) (int, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.ensureWriter()
	return h.writer.Write(p)
}

func (h *dailyHook) Sync() error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.writer == nil {
		return nil
	}
	return h.writer.Close()
}

// WithValue Adds a field to the specified context
func (l *Logger) WithValue(ctx context.Context, fields ...zapcore.Field) context.Context {
	if c, ok := ctx.(*gin.Context); ok {
		ctx = c.Request.Context()
		c.Request = c.Request.WithContext(context.WithValue(ctx, ctxLoggerKey, l.WithContext(ctx).With(fields...)))
		return c
	}
	return context.WithValue(ctx, ctxLoggerKey, l.WithContext(ctx).With(fields...))
}

// WithContext Returns a zap instance from the specified context
func (l *Logger) WithContext(ctx context.Context) *Logger {
	if c, ok := ctx.(*gin.Context); ok {
		ctx = c.Request.Context()
	}
	zl := ctx.Value(ctxLoggerKey)
	ctxLogger, ok := zl.(*zap.Logger)
	if ok {
		return &Logger{ctxLogger}
	}
	return l
}
