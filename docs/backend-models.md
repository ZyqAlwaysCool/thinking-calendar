// model/user.go
// 用户表 - 核心认证与偏好设置
type User struct {
    ID        uint           `gorm:"primaryKey" json:"id"`
    Username  string         `gorm:"size:64;uniqueIndex:idx_username;not null" json:"username"` // 登录用户名
    Email     string         `gorm:"size:128;uniqueIndex:idx_email" json:"email,omitempty"`     // 可选邮箱登录
    Password  string         `gorm:"size:255;not null" json:"-"`                                 // bcrypt 哈希值
    Avatar    string         `gorm:"size:512" json:"avatar,omitempty"`                          // 头像 URL（可选）
    Theme     string         `gorm:"size:20;default:'system'" json:"theme"`                      // light | dark | system
    CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// model/user_setting.go
// 用户个性化设置（一对一关系，可选）
type UserSetting struct {
    UserID               uint   `gorm:"primaryKey" json:"user_id"`
    AutoGenerateWeekly   bool   `gorm:"default:true" json:"auto_generate_weekly"`   // 是否每周自动生成周报
    WeeklyReportTime     string `gorm:"size:8;default:'22:00'" json:"weekly_report_time"` // 自动生成时间点（如 22:00）
    EnableEncouragement  bool   `gorm:"default:true" json:"enable_encouragement"`   // 是否开启每日激励语
    Timezone             string `gorm:"size:64;default:'Asia/Shanghai'" json:"timezone"` // 时区（用于定时任务）
    CreatedAt            time.Time `gorm:"autoCreateTime" json:"-"`
    UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"-"`
}

// model/log.go
// 每日日志表 - 项目最核心的数据表
type Log struct {
    ID        uint              `gorm:"primaryKey" json:"id"`
    UserID    uint              `gorm:"index:idx_user_date,priority:1;not null" json:"user_id"`
    Date      string            `gorm:"size:10;index:idx_user_date,priority:2;not null" json:"date"` // YYYY-MM-DD，唯一约束防止同一天重复
    Content   string            `gorm:"type:longtext;not null" json:"content"`                       // Markdown 正文
    Tags      []string          `gorm:"type:json;serializer:json" json:"tags"`                       // ["工作","健身","阅读"]
    WordCount int               `gorm:"default:0" json:"word_count"`                                 // 自动统计字数，用于热力图
    Meta      map[string]any    `gorm:"type:json" json:"meta,omitempty"`                             // 万能扩展字段：心情、天气、地点、附件列表、任务状态等
    IsEncrypted bool            `gorm:"default:false" json:"is_encrypted"`                           // 是否加密（前端解密）

    CreatedAt time.Time         `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt time.Time         `gorm:"autoUpdateTime" json:"updated_at"`
    DeletedAt gorm.DeletedAt    `gorm:"index" json:"-"`
}

// model/report.go
// AI 生成的报告表 - 缓存生成的周报/月报/年报，避免重复计算
type Report struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    UserID     uint      `gorm:"index:idx_user_period;not null" json:"user_id"`
    PeriodType string    `gorm:"size:20;index:idx_user_period" json:"period_type"` // week | month | year | custom
    StartDate  string    `gorm:"size:10;not null" json:"start_date"`                // YYYY-MM-DD
    EndDate    string    `gorm:"size:10;not null" json:"end_date"`                  // YYYY-MM-DD
    Title      string    `gorm:"size:256;not null" json:"title"`                    // 如“2025年第50周周报”
    Content    string    `gorm:"type:longtext;not null" json:"content"`             // AI 生成的完整 Markdown
    Summary    string    `gorm:"type:text" json:"summary,omitempty"`               // 可选：100字以内摘要
    ShareToken string    `gorm:"size:64;uniqueIndex" json:"share_token,omitempty"`   // 公开分享链接 token（为空则私密）
    IsPublic   bool      `gorm:"default:false" json:"is_public"`

    CreatedAt  time.Time `gorm:"autoCreateTime;index:idx_created_desc" json:"created_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}