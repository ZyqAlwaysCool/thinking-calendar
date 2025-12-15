package service_test

import (
	v1 "backend/api/v1"
	"backend/pkg/jwt"
	"backend/test/mocks/repository"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"testing"

	"backend/internal/model"
	"backend/internal/service"
	"backend/pkg/config"
	"backend/pkg/log"
	"backend/pkg/sid"
	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

var (
	logger *log.Logger
	j      *jwt.JWT
	sf     *sid.Sid
)

func TestMain(m *testing.M) {
	fmt.Println("begin")

	err := os.Setenv("APP_CONF", "../../../config/local.yml")
	if err != nil {
		panic(err)
	}

	var envConf = flag.String("conf", "config/local.yml", "config path, eg: -conf ./config/local.yml")
	flag.Parse()
	conf := config.NewConfig(*envConf)

	logger = log.NewLog(conf)
	j = jwt.NewJwt(conf)
	sf = sid.NewSid()

	code := m.Run()
	fmt.Println("test end")

	os.Exit(code)
}

func TestUserService_Register(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)

	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.RegisterReq{
		Password: "Passw@rd1",
		Username: "testuser",
	}

	mockUserRepo.EXPECT().GetByUsername(ctx, req.Username).Return(nil, nil)
	mockUserRepo.EXPECT().Create(ctx, gomock.Any()).Return(nil)
	mockUserSettingsRepo.EXPECT().Create(ctx, gomock.Any()).Return(nil)
	mockTm.EXPECT().Transaction(ctx, gomock.Any()).DoAndReturn(func(c context.Context, fn func(context.Context) error) error {
		return fn(c)
	})

	err := userService.Register(ctx, req)

	assert.NoError(t, err)
}

func TestUserService_Register_UsernameExists(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.RegisterReq{
		Password: "Passw@rd1",
		Username: "testuser",
	}

	mockUserRepo.EXPECT().GetByUsername(ctx, req.Username).Return(&model.User{}, nil)

	err := userService.Register(ctx, req)

	assert.Error(t, err)
}

func TestUserService_Register_PasswordTooShort(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.RegisterReq{
		Password: "123",
		Username: "testuser",
	}

	err := userService.Register(ctx, req)

	assert.Error(t, err)
	assert.Equal(t, v1.ErrPasswordInvalid, err)
}

func TestUserService_Register_UsernameInvalid(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.RegisterReq{
		Password: "Passw@rd1",
		Username: "ab",
	}

	err := userService.Register(ctx, req)

	assert.Error(t, err)
	assert.Equal(t, v1.ErrUsernameInvalid, err)
}

func TestUserService_Register_PasswordNoSpecial(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.RegisterReq{
		Password: "Password1",
		Username: "testuser",
	}

	err := userService.Register(ctx, req)

	assert.Error(t, err)
	assert.Equal(t, v1.ErrPasswordSimple, err)
}

func TestUserService_Login(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.LoginReq{
		Username: "testuser",
		Password: "Passw@rd1",
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		t.Error("failed to hash password")
	}

	mockUserRepo.EXPECT().GetByUsername(ctx, req.Username).Return(&model.User{
		Password:    string(hashedPassword),
		UserID:      "user123",
		LastLoginAt: nil,
	}, nil)
	mockUserRepo.EXPECT().UpdateLastLoginAt(ctx, "user123", gomock.Any()).Return(nil)

	token, err := userService.Login(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestUserService_Login_UserNotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	req := &v1.LoginReq{
		Username: "testuser",
		Password: "Passw@rd1",
	}

	mockUserRepo.EXPECT().GetByUsername(ctx, req.Username).Return(nil, errors.New("user not found"))

	_, err := userService.Login(ctx, req)

	assert.Error(t, err)
}

func TestUserService_GetProfile(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	userId := "123"

	mockUserRepo.EXPECT().GetByID(ctx, userId).Return(&model.User{
		UserID: userId,
	}, nil)

	user, err := userService.GetUserInfo(ctx, userId)

	assert.NoError(t, err)
	assert.Equal(t, userId, user.UserID)
}

func TestUserService_UpdateProfile(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	userId := "123"
	req := &v1.UpdateUserSettingsReq{
		UserSettings: v1.UserSettings{
			ReportTemplateWeek:  "week",
			ReportTemplateMonth: "month",
			AutoGenerateWeekly:  true,
			WeeklyReportTime:    "22:00",
		},
	}

	mockUserSettingsRepo.EXPECT().GetByID(ctx, userId).Return(&model.UserSettings{
		UserID:              userId,
		ReportTemplateWeek:  "",
		ReportTemplateMonth: "",
		AutoGenerateWeekly:  false,
		WeeklyReportTime:    "20:00",
	}, nil)
	mockUserSettingsRepo.EXPECT().Update(ctx, gomock.Any()).Return(nil)

	err := userService.UpdateUserSettings(ctx, userId, req)

	assert.NoError(t, err)
}

func TestUserService_UpdateProfile_UserNotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockUserRepo := mock_repository.NewMockUserRepository(ctrl)
	mockUserSettingsRepo := mock_repository.NewMockUserSettingsRepository(ctrl)
	mockTm := mock_repository.NewMockTransaction(ctrl)
	srv := service.NewService(mockTm, logger, sf, j)
	userService := service.NewUserService(srv, mockUserRepo, mockUserSettingsRepo)

	ctx := context.Background()
	userId := "123"
	req := &v1.UpdateUserSettingsReq{
		UserSettings: v1.UserSettings{
			ReportTemplateWeek:  "week",
			ReportTemplateMonth: "month",
			AutoGenerateWeekly:  true,
			WeeklyReportTime:    "22:00",
		},
	}

	mockUserSettingsRepo.EXPECT().GetByID(ctx, userId).Return(nil, errors.New("user settings not found"))

	err := userService.UpdateUserSettings(ctx, userId, req)

	assert.Error(t, err)
}
