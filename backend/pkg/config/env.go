package config

import (
	"context"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/subosito/gotenv"
)

type MailSMTPConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
	TLSMode   string
	Timeout   time.Duration
}

type mailSMTPContextKey struct{}

const (
	defaultMailPort    = 465
	defaultMailTimeout = 10 * time.Second
	defaultMailTLSMode = "ssl"
)

func LoadDotEnv(path string) error {
	if strings.TrimSpace(path) == "" {
		path = ".env"
	}
	if _, err := os.Stat(path); err != nil {
		return err
	}
	return gotenv.OverLoad(path)
}

func WithMailSMTPConfig(ctx context.Context, cfg MailSMTPConfig) context.Context {
	return context.WithValue(ctx, mailSMTPContextKey{}, cfg)
}

func MailSMTPConfigFromContext(ctx context.Context) (MailSMTPConfig, bool) {
	if ctx == nil {
		return MailSMTPConfig{}, false
	}
	value := ctx.Value(mailSMTPContextKey{})
	if value == nil {
		return MailSMTPConfig{}, false
	}
	config, ok := value.(MailSMTPConfig)
	return config, ok
}

func LoadMailSMTPConfigFromEnv() (MailSMTPConfig, error) {
	cfg := MailSMTPConfig{
		Port:    defaultMailPort,
		Timeout: defaultMailTimeout,
		TLSMode: defaultMailTLSMode,
	}
	if value := strings.TrimSpace(os.Getenv("MAIL_SMTP_HOST")); value != "" {
		cfg.Host = value
	}
	if value, ok := parseEnvInt("MAIL_SMTP_PORT"); ok {
		cfg.Port = value
	}
	if value := strings.TrimSpace(os.Getenv("MAIL_SMTP_USERNAME")); value != "" {
		cfg.Username = value
	}
	if value := strings.TrimSpace(os.Getenv("MAIL_SMTP_PASSWORD")); value != "" {
		cfg.Password = value
	}
	if value := strings.TrimSpace(os.Getenv("MAIL_SMTP_FROM_EMAIL")); value != "" {
		cfg.FromEmail = value
	}
	if value := strings.TrimSpace(os.Getenv("MAIL_SMTP_FROM_NAME")); value != "" {
		cfg.FromName = value
	}
	if value := strings.TrimSpace(os.Getenv("MAIL_SMTP_TLS_MODE")); value != "" {
		cfg.TLSMode = strings.ToLower(value)
	}
	if value, ok := parseEnvDuration("MAIL_SMTP_TIMEOUT"); ok {
		cfg.Timeout = value
	}
	if cfg.Host == "" || cfg.Username == "" || cfg.Password == "" || cfg.FromEmail == "" {
		return cfg, errors.New("SMTP 配置不完整")
	}
	return cfg, nil
}

func parseEnvInt(key string) (int, bool) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func parseEnvDuration(key string) (time.Duration, bool) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return 0, false
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return 0, false
	}
	return parsed, true
}
