package service

import (
	v1 "backend/api/v1"
	"backend/internal/model"
	"backend/internal/repository"
	"context"
	"time"
	"unicode"
	"unicode/utf8"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type registerNameLimit uint
type registerPswLimit uint

const (
	UserIDPrefix string = "userid_"

	registerNameLimitMin registerNameLimit = 6  //用户名最小长度
	registerNameLimitMax registerNameLimit = 20 //用户名最大长度
	registerPswLimitMin  registerPswLimit  = 6  //密码最小长度
	registerPswLimitMax  registerPswLimit  = 32 //密码最大长度
)

type UserService interface {
	Register(ctx context.Context, req *v1.RegisterReq) error
	Login(ctx context.Context, req *v1.LoginReq) (v1.LoginRespData, error)
	GetUserSettings(ctx context.Context, userId string) (*v1.UserSettings, error)
	UpdateUserSettings(ctx context.Context, userId string, req *v1.UpdateUserSettingsReq) error
	GetUserInfo(ctx context.Context, userId string) (*v1.UserInfo, error)
}

func NewUserService(
	service *Service,
	userRepo repository.UserRepository,
	userSettingsRepo repository.UserSettingsRepository,
) UserService {
	return &userService{
		userRepo:         userRepo,
		Service:          service,
		userSettingsRepo: userSettingsRepo,
	}
}

type userService struct {
	userRepo         repository.UserRepository
	userSettingsRepo repository.UserSettingsRepository
	*Service
}

func (s *userService) Register(ctx context.Context, req *v1.RegisterReq) error {
	nameLen := utf8.RuneCountInString(req.Username)
	if nameLen < int(registerNameLimitMin) || nameLen > int(registerNameLimitMax) {
		return v1.ErrUsernameInvalid
	}
	passLen := utf8.RuneCountInString(req.Password)
	if passLen < int(registerPswLimitMin) || passLen > int(registerPswLimitMax) {
		return v1.ErrPasswordInvalid
	}
	if !hasSpecialChar(req.Password) {
		return v1.ErrPasswordSimple
	}
	// 校验用户名重复
	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		return v1.ErrInternalServerError
	}
	if err == nil && user != nil {
		return v1.ErrUsernameAlreadyUse
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	// Generate user ID
	userId, err := s.sid.GenString()
	if err != nil {
		return err
	}
	realUserId := UserIDPrefix + userId
	user = &model.User{
		UserID:   realUserId,
		Username: req.Username,
		Password: string(hashedPassword),
	}
	userSettings := &model.UserSettings{
		UserID: realUserId,
	}
	// Transaction
	err = s.tm.Transaction(ctx, func(ctx context.Context) error {
		// Create a user
		if err = s.userRepo.Create(ctx, user); err != nil {
			return err
		}
		// Create a user settings
		if err = s.userSettingsRepo.Create(ctx, userSettings); err != nil {
			return err
		}
		return nil
	})
	return err
}

func (s *userService) Login(ctx context.Context, req *v1.LoginReq) (v1.LoginRespData, error) {
	resp := v1.LoginRespData{}
	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		s.logger.Error("get user by username failed.", zap.String("username", req.Username))
		return resp, v1.ErrInternalServerError
	}
	if user == nil {
		return resp, v1.ErrUserNotExist
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		s.logger.Error("compare password failed.", zap.String("username", req.Username))
		return resp, v1.ErrInvalidPassword
	}
	tokenExpiredAt := time.Now().Add(time.Hour * 24 * 1) //token有效期为1天
	token, err := s.jwt.GenToken(user.UserID, tokenExpiredAt)
	if err != nil {
		s.logger.Error("gen token failed.", zap.String("user_id", user.UserID), zap.Error(err))
		return resp, v1.ErrJWTGenFailed
	}

	//update last_login_time
	now := time.Now()
	if err = s.userRepo.UpdateLastLoginAt(ctx, user.UserID, &now); err != nil {
		s.logger.Error("update last login time failed.", zap.String("user_id", user.UserID))
	}

	resp.AccessToken = token
	resp.ExpireAt = tokenExpiredAt.Format(time.RFC3339)
	return resp, nil
}

func (s *userService) GetUserSettings(ctx context.Context, userId string) (*v1.UserSettings, error) {
	userSettings, err := s.userSettingsRepo.GetByID(ctx, userId)
	if err != nil {
		s.logger.Info("get user settings failed.", zap.String("user_id", userId))
		return nil, v1.ErrGetUserSettingsFailed
	}
	return &v1.UserSettings{
		UserID:              userSettings.UserID,
		ReportTemplateWeek:  userSettings.ReportTemplateWeek,
		ReportTemplateMonth: userSettings.ReportTemplateMonth,
		AutoGenerateWeekly:  userSettings.AutoGenerateWeekly,
		WeeklyReportTime:    userSettings.WeeklyReportTime,
	}, nil
}

func (s *userService) UpdateUserSettings(ctx context.Context, userId string, req *v1.UpdateUserSettingsReq) error {
	userSettings, err := s.userSettingsRepo.GetByID(ctx, userId)
	if err != nil {
		s.logger.Error("get user settings failed.", zap.String("user_id", userId))
		return v1.ErrGetUserSettingsFailed
	}
	if userId != req.UserID {
		s.logger.Error("user_id not match", zap.String("user_id", userId), zap.String("req_user_id", req.UserID))
		return v1.ErrUserIDNotMatch
	}

	userSettings.ReportTemplateWeek = req.ReportTemplateWeek
	userSettings.ReportTemplateMonth = req.ReportTemplateMonth
	userSettings.AutoGenerateWeekly = req.AutoGenerateWeekly
	userSettings.WeeklyReportTime = req.WeeklyReportTime

	if err = s.userSettingsRepo.Update(ctx, userSettings); err != nil {
		s.logger.Error("update user settings failed.", zap.String("user_id", userId))
		return v1.ErrUpdateUserSettingsFailed
	}

	return nil
}

func (s *userService) GetUserInfo(ctx context.Context, userId string) (*v1.UserInfo, error) {
	user, err := s.userRepo.GetByID(ctx, userId)
	if err != nil {
		s.logger.Info("get user info failed.", zap.String("user_id", userId))
		return nil, v1.ErrGetUserInfoFailed
	}
	return &v1.UserInfo{
		Username:    user.Username,
		Avatar:      user.Avatar,
		IsValid:     user.IsValid,
		LastLoginAt: formatTime(user.LastLoginAt),
		UserID:      user.UserID,
	}, nil
}

func formatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}

func hasSpecialChar(pwd string) bool {
	for _, r := range pwd {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) {
			return true
		}
	}
	return false
}
