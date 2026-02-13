package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	appconfig "backend/pkg/config"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/spf13/viper"
	"go.uber.org/zap"
)

const (
	MailContentTypeText = "text"
	MailContentTypeHTML = "html"

	MailStatusPending = "pending"
	MailStatusSending = "sending"
	MailStatusSent    = "sent"
	MailStatusFailed  = "failed"

	defaultMailPort    = 465
	defaultMailTimeout = 10 * time.Second
	defaultMailTLSMode = "ssl"
	mailSendLimit      = 20
)

type MailSendInput struct {
	To          string
	Subject     string
	Content     string
	ContentType string
	SendAt      time.Time
}

type MailSendOutput struct {
	Id     string
	Status string
}

type MailService interface {
	Send(ctx context.Context, input MailSendInput) (*MailSendOutput, error)
	ProcessPending(ctx context.Context, now time.Time) error
}

type smtpConfig struct {
	host      string
	port      int
	username  string
	password  string
	fromEmail string
	fromName  string
	tlsMode   string
	timeout   time.Duration
}

func NewMailService(
	service *Service,
	mailRepo repository.MailRepository,
	config *viper.Viper,
) MailService {
	return &mailService{
		Service:    service,
		mailRepo:   mailRepo,
		smtpConfig: loadSmtpConfig(config),
	}
}

type mailService struct {
	*Service
	mailRepo   repository.MailRepository
	smtpConfig smtpConfig
}

// 创建邮件任务
func (s *mailService) Send(ctx context.Context, input MailSendInput) (*MailSendOutput, error) {
	if strings.TrimSpace(input.To) == "" || strings.TrimSpace(input.Subject) == "" {
		return nil, errors.New("邮件参数不完整")
	}
	now := input.SendAt
	if now.IsZero() {
		now = time.Now()
	}
	contentType := input.ContentType
	if contentType == "" {
		contentType = MailContentTypeText
	}

	jobID, err := s.sid.GenString()
	if err != nil {
		s.logger.Error("生成邮件任务 ID 失败", zap.Error(err))
		return nil, err
	}
	job := &model.MailJob{
		ID:          "mail_" + jobID,
		To:          strings.TrimSpace(input.To),
		Subject:     input.Subject,
		Content:     input.Content,
		ContentType: contentType,
		SendAt:      now,
		Status:      MailStatusPending,
	}
	if err := s.mailRepo.CreateMailJob(ctx, job); err != nil {
		s.logger.Error("保存邮件任务失败", zap.Error(err))
		return nil, err
	}
	return &MailSendOutput{
		Id:     job.ID,
		Status: MailStatusPending,
	}, nil
}

// 处理待发送邮件
func (s *mailService) ProcessPending(ctx context.Context, now time.Time) error {
	config := s.resolveSMTPConfig(ctx)
	jobs, err := s.mailRepo.ListMailJobsByStatus(ctx, MailStatusPending, now, mailSendLimit)
	if err != nil {
		s.logger.Error("查询待发送邮件失败", zap.Error(err))
		return err
	}
	for _, job := range jobs {
		ok, err := s.mailRepo.UpdateMailJobStatusIf(ctx, job.ID, MailStatusPending, MailStatusSending)
		if err != nil {
			s.logger.Error("锁定邮件任务失败", zap.String("mail_id", job.ID), zap.Error(err))
			continue
		}
		if !ok {
			continue
		}
		if err := s.sendSMTP(job, config); err != nil {
			s.logger.Error("发送邮件失败", zap.String("mail_id", job.ID), zap.Error(err))
			_ = s.mailRepo.UpdateMailJobStatus(ctx, job.ID, MailStatusFailed, nil, err.Error())
			continue
		}
		sentAt := time.Now()
		if err := s.mailRepo.UpdateMailJobStatus(ctx, job.ID, MailStatusSent, &sentAt, ""); err != nil {
			s.logger.Error("更新邮件状态失败", zap.String("mail_id", job.ID), zap.Error(err))
		}
	}
	return nil
}

func (s *mailService) sendSMTP(job *model.MailJob, cfg smtpConfig) error {
	if cfg.host == "" || cfg.username == "" || cfg.password == "" || cfg.fromEmail == "" {
		return errors.New("SMTP 配置不完整")
	}
	addr := fmt.Sprintf("%s:%d", cfg.host, cfg.port)
	auth := smtp.PlainAuth("", cfg.username, cfg.password, cfg.host)
	message := buildMailMessage(cfg.fromName, cfg.fromEmail, job.To, job.Subject, job.ContentType, job.Content)

	if cfg.tlsMode == "starttls" {
		return sendWithStartTLS(addr, cfg.host, cfg.timeout, auth, cfg.fromEmail, job.To, message)
	}
	return sendWithSSL(addr, cfg.host, cfg.timeout, auth, cfg.fromEmail, job.To, message)
}

func buildMailMessage(fromName string, fromEmail string, to string, subject string, contentType string, body string) []byte {
	encodedSubject := mime.QEncoding.Encode("utf-8", subject)
	from := fromEmail
	if strings.TrimSpace(fromName) != "" {
		from = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", fromName), fromEmail)
	}
	mimeType := "text/plain; charset=UTF-8"
	if contentType == MailContentTypeHTML {
		mimeType = "text/html; charset=UTF-8"
	}
	headers := []string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", encodedSubject),
		"MIME-Version: 1.0",
		fmt.Sprintf("Content-Type: %s", mimeType),
		"",
	}
	return []byte(strings.Join(headers, "\r\n") + body)
}

func sendWithSSL(addr string, host string, timeout time.Duration, auth smtp.Auth, from string, to string, message []byte) error {
	dialer := &net.Dialer{Timeout: timeout}
	conn, err := tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: host})
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Quit()

	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	return writer.Close()
}

func sendWithStartTLS(addr string, host string, timeout time.Duration, auth smtp.Auth, from string, to string, message []byte) error {
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Quit()

	if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
		return err
	}
	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	return writer.Close()
}

func loadSmtpConfig(config *viper.Viper) smtpConfig {
	if config == nil {
		return smtpConfig{
			port:    defaultMailPort,
			timeout: defaultMailTimeout,
			tlsMode: defaultMailTLSMode,
		}
	}
	port := config.GetInt("mail.smtp.port")
	if port == 0 {
		port = defaultMailPort
	}
	timeout := config.GetDuration("mail.smtp.timeout")
	if timeout == 0 {
		timeout = defaultMailTimeout
	}
	tlsMode := strings.ToLower(strings.TrimSpace(config.GetString("mail.smtp.tls_mode")))
	if tlsMode == "" {
		tlsMode = defaultMailTLSMode
	}
	return smtpConfig{
		host:      strings.TrimSpace(config.GetString("mail.smtp.host")),
		port:      port,
		username:  strings.TrimSpace(config.GetString("mail.smtp.username")),
		password:  strings.TrimSpace(config.GetString("mail.smtp.password")),
		fromEmail: strings.TrimSpace(config.GetString("mail.smtp.from_email")),
		fromName:  strings.TrimSpace(config.GetString("mail.smtp.from_name")),
		tlsMode:   tlsMode,
		timeout:   timeout,
	}
}

func (s *mailService) resolveSMTPConfig(ctx context.Context) smtpConfig {
	if value, ok := appconfig.MailSMTPConfigFromContext(ctx); ok {
		return smtpConfig{
			host:      value.Host,
			port:      value.Port,
			username:  value.Username,
			password:  value.Password,
			fromEmail: value.FromEmail,
			fromName:  value.FromName,
			tlsMode:   value.TLSMode,
			timeout:   value.Timeout,
		}
	}
	return s.smtpConfig
}
