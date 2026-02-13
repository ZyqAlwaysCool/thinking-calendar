package mail_test

import (
	"backend/pkg/config"
	"crypto/tls"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSendSMTPReal(t *testing.T) {
	if os.Getenv("MAIL_SEND_TEST") != "1" {
		t.SkipNow()
	}
	envPath := os.Getenv("MAIL_ENV_FILE")
	if envPath == "" {
		wd, err := os.Getwd()
		if err != nil {
			t.Fatalf("%v", err)
		}
		envPath = filepath.Clean(filepath.Join(wd, "..", "..", ".env"))
	}
	if err := config.LoadDotEnv(envPath); err != nil {
		t.Fatalf("%v", err)
	}
	cfg, err := config.LoadMailSMTPConfigFromEnv()
	if err != nil {
		t.Fatalf("%v", err)
	}
	to := os.Getenv("MAIL_TEST_TO")
	if to == "" {
		to = "yqzhang1122@gmail.com"
	}
	subject := "补卡系统邮件发送测试"
	body := "补卡系统邮件发送测试"
	message := buildMailMessage(cfg.FromName, cfg.FromEmail, to, subject, body)
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)

	if cfg.TLSMode == "starttls" {
		if err := sendWithStartTLS(addr, cfg.Host, cfg.Timeout, auth, cfg.FromEmail, to, message); err != nil {
			t.Fatalf("%v", err)
		}
		return
	}
	if err := sendWithSSL(addr, cfg.Host, cfg.Timeout, auth, cfg.FromEmail, to, message); err != nil {
		t.Fatalf("%v", err)
	}
}

func buildMailMessage(fromName string, fromEmail string, to string, subject string, body string) []byte {
	encodedSubject := mime.QEncoding.Encode("utf-8", subject)
	from := fromEmail
	if strings.TrimSpace(fromName) != "" {
		from = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", fromName), fromEmail)
	}
	headers := []string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", encodedSubject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
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
