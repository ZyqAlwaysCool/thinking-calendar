# Thinking-Calendar 后端设计文档

## 1. 项目概述
- 项目简介：面向知识工作者的单体 Golang 后端，为思考日历提供账号认证、日志存储、AI 周/月/年报生成与确认、月度看板统计等能力，支撑极简的记录与报告体验。
- 核心功能：用户注册登录与鉴权、每日 Markdown 日志的读写去重、基于时间范围的报告生成与确认、日志/报告列表与统计、用户偏好设置（预留报告提示词模板字段）。
- 性能目标：单实例部署支撑 100+ 并发请求，核心接口（日志读写、报告列表）P95 < 150ms、P99 < 300ms，全年可用性 ≥ 99.9%。生成类请求可落入任务队列避免阻塞。
- 安全目标：全链路鉴权与审计，密码仅存储 bcrypt 哈希，JWT 短有效期可续签，分享默认关闭，日志/报告默认私有。

## 2. 技术选型（结合 Nunu Golang 应用脚手架）
- 脚手架：使用 Nunu Golang 应用脚手架生成基础工程，保留其默认目录（`cmd/`、`configs/`、`internal/`、`pkg/`、`scripts/` 等）、Makefile、Dockerfile、CI 模板与内置命令（初始化、代码生成、运行、打包）。在此基础上按下列组件落地。
- Web 框架：Gin（Nunu 默认集成），配合路由注册、全局中间件。
- ORM：GORM（Nunu 默认集成）。
- 配置：Viper（脚手架内置），分环境加载 `configs/*.yaml`，支持 env 覆盖。
- 日志：zap（脚手架内置），区分 access/app，敏感字段脱敏。
- 数据库：MySQL 8.x（InnoDB）。
- 缓存与会话：Redis（可选，用于限流、分享 token 失效、生成任务幂等）。
- 鉴权：JWT HS256，单 accessToken 模式（默认 24h），前端缓存 Bearer；若未来需要静默续期，可再引入 refreshToken。
- 任务调度：使用脚手架的 task/worker 模块执行 LLM 生成队列。
- LLM 接口：HTTP 客户端封装（OpenAI 兼容协议），支持模型、温度、超时、重试、审计开关。

## 3. 系统架构与目录
- 分层：Router/Middleware → Handler（入参校验、鉴权） → Service（业务编排、事务、风控） → Repository（GORM 操作） → Model（实体定义与 DTO） → Infra（DB/Redis/LLM/日志）。
- 目录（基于 Nunu）：
  - `cmd/server/main.go`：入口，加载配置，初始化依赖，启动 HTTP 与任务。
  - `configs/`：按环境的配置文件。
  - `internal/server`：路由注册、全局中间件。
  - `internal/middleware`：鉴权、请求日志、恢复、跨域、限流、防重复提交。
  - `internal/handler`：auth/record/report/stat/setting 等。
  - `internal/service`：业务逻辑、事务、幂等。
  - `internal/repository`：数据访问。
  - `internal/model`：GORM 实体 + 请求/响应 DTO。
  - `internal/llm`：LLM Client、重试、幂等。
  - `pkg/response`：统一响应 `{code,msg,data}` 与错误码。
  - `scripts/`：启动、迁移、代码生成脚本（沿用 Nunu）。
- 流程：客户端携带 Authorization: Bearer <JWT> → 中间件校验与限流 → Handler 校验参数 → Service 调用 Repo/LLM → 统一响应。

## 4. 接口设计
说明：除登录注册外均需 Authorization 头；所有响应格式 `{code:number,msg:string,data:any}`，成功时 code=0、msg=success。日期格式 `YYYY-MM-DD`，时间戳 ISO8601。列表按用户隔离。

### 4.1 认证与用户（单 token 模式，accessToken 默认 24h，所有对外交互使用 user_id 作为唯一标识）
- `POST /v1/register`
  - 说明：注册并登录。
  - 请求体：`{username:string(3-20), password:string(6-32)}`
  - 响应 data：`{user:{user_id:string, name:string}, accessToken:string, expiresIn:number(秒)}`
- `POST /v1/login`
  - 说明：登录（前端按钮“登录/注册”，不存在用户时可由后端自动创建，默认开启）。
  - 请求体：`{username:string, password:string}`
  - 响应同注册。
- `GET /v1/user/`
  - 说明：获取当前用户信息。
  - 响应 data：`{user_id:string, name:string, avatar:string, is_valid:bool, last_login_at:string}`
- `GET /v1/user/settings`
  - 说明：获取用户设置
  - 响应 data：`{user_id:string, report_template_week:string, report_template_month:string, auto_generate_weekly:bool, weekly_report_time:string}`
- `PUT /v1/user/settings`
  - 说明：更新用户设置
  - 响应 data：空, 返回成功或失败

### 4.2 工作记录
- `GET /api/records`
  - 说明：查询工作记录，`date` 存在返回单日，不传返回当前用户全部（可后续加分页）。
  - Query：`date?:string`
  - 响应 data：
    - 单日：`Record | null`
    - 全部：`Record[]`
- `GET /api/records/range`
  - 说明：按时间范围批量查询，支持看板与报告生成。
  - Query：`start:string`, `end:string`
  - 响应 data：`Record[]`
- `POST /api/records`
  - 说明：创建或更新指定日期的工作记录（幂等 upsert，同一 user_id+date 多次调用视为更新）。
  - 请求体：`{date:string, content:string, meta?:object}`
  - 响应 data：`Record`
- `DELETE /api/records/:record_id`（预留）
  - 说明：软删除，当前前端未用。
  - 响应 data：`null`
- 工作记录字段定义：`{record_id:string, date:string, content:string, updatedAt:string, count:number}`。`user_id` 由后端依据登录态确定，无需前端传入；可同时返回兼容字段 `id=record_id` 便于前端现有类型过渡。

### 4.3 报告
- `GET /api/reports`
  - 说明：返回全部报告，可选筛选。
  - Query：`period?:week|month|year`, `startDate?:string`, `endDate?:string`
  - 响应 data：`Report[]`
- `GET /api/reports/:id`（建议补充，供轮询/占位）
  - 说明：按 id 获取报告。
  - 响应 data：`Report`
- `POST /api/reports/generate`
  - 说明：生成或重新生成报告；`replaceId` 存在则覆盖并将 confirmed=false。
  - 请求体：`{period: 'week'|'month'|'year', startDate:string, endDate:string, template:'formal'|'simple', replaceId?:string}`
  - 响应 data：`Report`（若生成耗时，可先返回占位 content 与 status=processing，后续 `/api/reports/:id` 轮询；为保持前端现状，默认直接返回内容）
- `POST /api/reports/confirm`
  - 说明：确认报告。
  - 请求体：`{id:string}`
  - 响应 data：`Report`（confirmed=true）
- 报告字段定义：`{report_id:string, period:'week'|'month'|'year', startDate:string, endDate:string, title:string, content:string, confirmed:boolean, createdAt:string, template?:'formal'|'simple', status?:'ready'|'processing'|'failed'}`。前端当前使用的字段为 id/period/startDate/endDate/title/content/confirmed/createdAt；`user_id` 由登录态确定，无需前端传入。可同时返回兼容字段 `id=report_id`。

### 4.4 看板统计
- `GET /api/dashboard/month`
  - 说明：返回某月的记录统计，用于看板高亮与计数。
  - Query：`month: string (YYYY-MM)`
  - 响应 data：`{recordedDays:number, missingDays:number, rate:number, days:{date:string, hasRecord:boolean}[]}`
- `GET /api/dashboard/summary`（可选）
  - 说明：汇总指标：累计日志数、已确认报告数、最近更新时间。
  - 响应 data：`{recordCount:number, confirmedReports:number, lastUpdated?:string}`

### 4.5 用户设置（预留报告提示词模板）
- `GET /api/settings`
  - 说明：读取用户设置。
  - 响应 data：`UserSetting`
- `PUT /api/settings`
  - 说明：更新用户设置。
  - 请求体：`{theme?:'light'|'dark'|'system', timezone?:string, reportTemplate?:string, autoGenerateWeekly?:boolean, weeklyReportTime?:string}`
  - 响应 data：`UserSetting`
- UserSetting 字段：`{theme:string, timezone:string, reportTemplate?:string, autoGenerateWeekly:boolean, weeklyReportTime:string}`。前端当前未使用，先返回默认值。

### 4.6 通用约定
- 错误码：0 成功；4001 参数错误；4003 未登录/无权限；500x 服务器错误；6001 生成中；6002 生成失败。
- Header：`Authorization: Bearer <accessToken>`。
- 跨域：允许前端域名，开启 GZIP。

## 5. 数据模型
说明：以下模型以现有前端字段为基线，时间存 UTC，前端自行按时区展示。字段避免混淆的约定：
- `userId`：用户唯一标识，直接作为主键和所有外键引用，接口对内对外一致。
- `RecordID`/`ReportID`：工作记录与报告的唯一标识，作为主键并返回给前端的 `id` 字段。
保留可扩展的报告模板配置。

### 5.1 用户 users
```go
type User struct {
    UserID     string         `gorm:"primaryKey;size:32" json:"user_id"` // 对外唯一标识，亦为主键
    Username   string         `gorm:"size:64;uniqueIndex:idx_username;not null" json:"username"`
    Password   string         `gorm:"size:255;not null" json:"password"`
    Avatar     string         `gorm:"size:512" json:"avatar,omitempty"`
    IsValid    bool           `gorm:"default:true" json:"is_valid,omitempty"`
    LastLoginAt *time.Time    `json:"last_login_at,omitempty"`
    CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
```

### 5.2 用户设置 user_settings（预留报告模板）
```go
type UserSetting struct {
    UserID            string            `gorm:"primaryKey;size:32" json:"user_id"` // 与 users.user_id 对齐
    Timezone          string            `gorm:"size:64;default:'Asia/Shanghai'" json:"timezone"`
    ReportTemplateWeek    string        `gorm:"type:text" json:"report_template_week,omitempty"` // 用户自定义提示词/模板
    ReportTemplateMonth   string        `gorm:"type:text" json:"report_template_month,omitempty"` // 用户自定义提示词/模板
    AutoGenerateWeekly bool             `gorm:"default:false" json:"auto_generate_weekly"`
    WeeklyReportTime  string            `gorm:"size:8;default:'22:00'" json:"weekly_report_time"`
    CreatedAt         time.Time         `gorm:"autoCreateTime" json:"-"`
    UpdatedAt         time.Time         `gorm:"autoUpdateTime" json:"-"`
}
```

### 5.3 工作记录 records
```go
type Record struct {
    RecordID    string            `gorm:"primaryKey;size:32" json:"record_id"` // 对外资源唯一标识，亦为主键
    UserID      string            `gorm:"uniqueIndex:uid_record_date,priority:1;size:32;not null" json:"user_id"` // 与 date 组成唯一约束
    Date        string            `gorm:"size:10;uniqueIndex:uid_record_date,priority:2;not null" json:"date"`
    Content     string            `gorm:"type:longtext;not null" json:"content"`
    WordCount   int               `gorm:"default:0" json:"word_count"`
    Meta        datatypes.JSONMap `gorm:"type:json" json:"meta,omitempty"`
    IsEncrypted bool              `gorm:"default:false" json:"is_encrypted"`
    Version     int               `gorm:"default:1" json:"version"`
    CreatedAt   time.Time         `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time         `gorm:"autoUpdateTime" json:"updated_at"`
    DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`
}
```

### 5.4 报告 reports
```go
type Report struct {
    ReportID   string         `gorm:"primaryKey;size:32" json:"report_id"` // 对内对外一致的资源唯一标识
    UserID     string         `gorm:"uniqueIndex:uid_report_period,priority:1;size:32;not null" json:"-"`
    PeriodType string         `gorm:"size:20;uniqueIndex:uid_report_period,priority:2;not null" json:"period_type"` // week/month/year
    StartDate  string         `gorm:"size:10;uniqueIndex:uid_report_period,priority:3;not null" json:"start_date"`
    EndDate    string         `gorm:"size:10;uniqueIndex:uid_report_period,priority:4;not null" json:"end_date"`
    Title      string         `gorm:"size:256;not null" json:"title"`
    Content    string         `gorm:"type:longtext;not null" json:"content"`
    Template   string         `gorm:"size:20;default:'formal'" json:"template"`
    FailedReason string         `gorm:"type:text" json:"failed_reason,omitempty"`
    Confirmed  bool           `gorm:"default:false" json:"confirmed"`
    Status     string         `gorm:"size:20;default:'queued'" json:"status"` // queued/ready/processing/failed
    Meta       datatypes.JSONMap `gorm:"type:json" json:"meta,omitempty"` // 扩展预留
    Version    int            `gorm:"default:0" json:"version"` //手工编辑版本号
    GenVersion int            `gorm:"default:0" json:"version"` //生成版本号
    CreatedAt  time.Time      `gorm:"autoCreateTime;index:idx_created_desc" json:"created_at"`
    UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
```

### 5.5 报告生成任务 report_jobs（用于异步/重试，可选）
```go
type ReportJob struct {
    ReportJobID string         `gorm:"primaryKey;size:40" json:"report_job_id"` // UUID/sonyflake 前缀化生成
    UserID     string         `gorm:"index:idx_status_created,priority:1;size:32" json:"user_id"`
    PeriodType string         `gorm:"size:20;not null" json:"period_type"`
    StartDate  string         `gorm:"size:10;not null" json:"start_date"`
    EndDate    string         `gorm:"size:10;not null" json:"end_date"`
    Template   string         `gorm:"size:20;not null" json:"template"`
    Status     string         `gorm:"size:20;index:idx_status_created,priority:2;default:'queued'" json:"status"`
    LLMModel   string         `gorm:"size:64" json:"llm_model"`
    Prompt     string         `gorm:"type:longtext" json:"prompt"`
    Result     string         `gorm:"type:longtext" json:"result,omitempty"`
    Error      string         `gorm:"type:text" json:"error,omitempty"`
    Meta       datatypes.JSONMap `gorm:"type:json" json:"meta,omitempty"` // 扩展预留
    CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}
```

## 6. 安全与合规策略
- 认证：全域 JWT，accessToken 默认 24h；可选后续开启 refreshToken 与黑名单以提升安全（当前阶段不启用）。
- 输入校验：Handler 全量校验，限制 content/prompt 最大长度，过滤未来日期。
- 权限：所有查询按 user_id 过滤；分享默认关闭。
- 审计：记录登录、生成、确认操作，脱敏日志。
- 传输与存储：HTTPS、GZIP、CORS 白名单；软删除开启；MySQL 备份（每日全量、binlog 持续）。

## 7. 性能与扩展
- 索引：users.username/email，records.idx_user_date，reports.idx_user_period、idx_created_desc，report_jobs.idx_status_created。
- 连接池：max_idle 10、max_open 50、conn_max_lifetime 1h；慢查询告警 200ms。
- 缓存：月度统计与 recent 报告缓存 60s；日志写入后失效相关缓存。
- 异步：报告生成可走 report_jobs + worker，主请求直接返回生成结果或占位；幂等键 period_type+start_date+end_date+user_id。
- 限流：IP+用户令牌桶，生成接口每日上限；防重复提交中间件。
- 可观测性：Prometheus 指标、zap 日志、OpenTelemetry Trace（Handler→Service→LLM）。

## 8. 与前端对接要点
- baseURL `/api` 不变；工作记录接口路径为 `/api/records`（前端已采用 record 语义，无 `/api/logs`），前端增加 Authorization 头，登录后仅缓存 accessToken（有效期 24h），过期后提示重新登录。
- 保持字段对齐：`Record{ id,date,content,updatedAt,count }`，`Report{ id,period,startDate,endDate,title,content,confirmed,createdAt }`。后端新增字段（template/status等）可返回但前端可忽略。
- 报告生成：如果生成耗时，先返回占位 content 并附带 status=processing，前端可轮询 `/api/reports/:id`。同步生成时直接返回最终内容即可。
- 错误提示使用中文 msg，前端 toast 直接展示；code=0 成功，非 0 视为错误。
