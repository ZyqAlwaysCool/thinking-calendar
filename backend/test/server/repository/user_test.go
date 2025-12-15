package repository

import (
	"backend/pkg/log"
	"context"
	"testing"
	"time"

	"backend/internal/model"
	"backend/internal/repository"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var logger *log.Logger

func setupRepository(t *testing.T) (repository.UserRepository, sqlmock.Sqlmock) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}

	db, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      mockDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm connection: %v", err)
	}

	//rdb, _ := redismock.NewClientMock()

	repo := repository.NewRepository(logger, db)
	userRepo := repository.NewUserRepository(repo)

	return userRepo, mock
}

func TestUserRepository_Create(t *testing.T) {
	userRepo, mock := setupRepository(t)

	ctx := context.Background()
	user := &model.User{
		UserID:    "123",
		Username:  "test",
		Password:  "password",
		Avatar:    "",
		IsValid:   true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `users`").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := userRepo.Create(ctx, user)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_Update(t *testing.T) {
	userRepo, mock := setupRepository(t)

	ctx := context.Background()
	user := &model.User{
		UserID:    "123",
		Username:  "test",
		Password:  "password",
		Avatar:    "",
		IsValid:   true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `users`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := userRepo.Update(ctx, user)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_GetById(t *testing.T) {
	userRepo, mock := setupRepository(t)

	ctx := context.Background()
	userId := "123"

	rows := sqlmock.NewRows([]string{"user_id", "username", "password", "avatar", "is_valid", "last_login_at", "created_at", "updated_at", "deleted_at"}).
		AddRow("123", "test", "password", "", true, nil, time.Now(), time.Now(), nil)
	mock.ExpectQuery("SELECT \\* FROM `users`").WillReturnRows(rows)

	user, err := userRepo.GetByID(ctx, userId)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "123", user.UserID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_GetByUsername(t *testing.T) {
	userRepo, mock := setupRepository(t)

	ctx := context.Background()
	username := "test"

	rows := sqlmock.NewRows([]string{"user_id", "username", "password", "avatar", "is_valid", "last_login_at", "created_at", "updated_at", "deleted_at"}).
		AddRow("123", "test", "password", "", true, time.Now(), time.Now(), time.Now(), nil)
	mock.ExpectQuery("SELECT \\* FROM `users`").WillReturnRows(rows)

	user, err := userRepo.GetByUsername(ctx, username)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "test", user.Username)

	assert.NoError(t, mock.ExpectationsWereMet())
}
