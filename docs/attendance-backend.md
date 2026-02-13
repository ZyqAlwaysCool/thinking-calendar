# 补卡功能后端方案（首版）

## 一、目标与原则
- 目标：支持补卡记录、次数统计、月度邮件推送与锁定，保持规则简单、边界清晰
- 原则：业务只管理补卡数据与汇总推送，邮件发送能力独立为通用内部服务，不与业务强绑定

## 二、范围与不做
### 范围
- 补卡设置：次数上限、推送日期、推送时间、收件邮箱
- 补卡记录：当月新增、更新、删除、查询
- 月度锁定：当月邮件推送后禁止修改
- 邮件推送：按配置时间发送当月汇总清单

### 不做
- 接入打卡系统
- 审批系统代提交
- 邮件失败重试与送达保障
- 自定义邮件模板与导出

## 三、核心规则
- 记录口径：按「日期 + 类型」去重，同一天上班/下班各一条
- 次数上限：新增时校验当月已用次数，不允许超过上限
- 日期范围：仅允许当月且不晚于当天
- 锁定规则：当月邮件推送后，该月不可修改
- 推送条件：当月无记录不发送

## 四、方案对比与选择
### 方案对比 1：复用现有记录表 vs 独立补卡表
- 复用现有记录表：结构复杂、字段含义不一致、后续扩展受限
- 独立补卡表：职责清晰、索引与约束可针对补卡场景设计
- 选择：独立补卡表

### 方案对比 2：推送日期超出当月天数的处理
- 自动调整为当月最后一天：用户认知稳定、不会跨月
- 顺延到下月 1 号：规则复杂、与跨月限制冲突
- 选择：自动调整为当月最后一天

### 方案对比 3：业务直发邮件 vs 通用邮件内部服务
- 业务直发邮件：耦合重、复用差、后续多业务扩展成本高
- 通用邮件内部服务：职责单一、可复用、业务只关心内容与收件人
- 选择：通用邮件内部服务

### 方案对比 4：PUT 语义更新 vs POST 路径区分
- PUT 语义更新：符合语义但与当前接口风格不一致
- POST 路径区分：路由清晰、日志可读性高
- 选择：POST 路径区分

## 五、数据结构设计

### 1）补卡设置表 `attendance_settings`
用途：保存用户级别的补卡配置与当月锁定状态

字段（建议）：
- `user_id` 用户主键（唯一）
- `monthly_limit` 每月上限次数
- `push_day` 推送日期，值为 `last` 或 `1~31` 字符串
- `push_time` 推送时间，格式 `HH:mm`
- `email` 收件邮箱
- `last_pushed_month` 最近一次推送月份，格式 `YYYY-MM`
- `created_at` `updated_at`

索引：
- `user_id` 主键唯一

### 2）补卡记录表 `attendance_records`
用途：保存用户的补卡记录

字段（建议）：
- `id` 主键，规则 `attrec_` 前缀
- `user_id` 用户主键
- `date` 补卡日期，格式 `YYYY-MM-DD`
- `type` 类型，值为 `in` / `out`
- `note` 备注，可空
- `created_at` `updated_at`

索引：
- `user_id + date + type` 唯一索引
- `user_id + date` 普通索引

### 3）通用邮件表 `mail_jobs`
用途：通用邮件发送任务队列，补卡业务仅写入任务并等待发送结果

字段（建议）：
- `id` 主键，规则 `mail_` 前缀
- `to` 收件邮箱
- `subject` 邮件标题
- `content` 邮件正文
- `content_type` 正文类型，值为 `text` / `html`
- `send_at` 计划发送时间
- `sent_at` 实际发送时间
- `status` 状态，值为 `pending` / `sent` / `failed`
- `error_msg` 失败原因，可空
- `created_at` `updated_at`

索引：
- `status + send_at` 普通索引

## 六、接口设计（全部返回统一结构）
统一响应结构：
```go
// 统一响应结构
type Response struct {
  Code int `json:"code"`
  Msg string `json:"msg"`
  Data any `json:"data"`
}
```

### 1）获取补卡设置
路径：`POST /v1/attendance/settings/get`

请求：
```go
// 获取补卡设置请求
type AttendanceSettingsGetReq struct {
}
```

响应：
```go
// 获取补卡设置响应
type AttendanceSettingsGetResp struct {
  MonthlyLimit int `json:"monthly_limit"`
  PushDay string `json:"push_day"`
  PushTime string `json:"push_time"`
  Email string `json:"email"`
  LastPushedMonth string `json:"last_pushed_month"`
}
```

### 2）保存补卡设置
路径：`POST /v1/attendance/settings/save`

请求：
```go
// 保存补卡设置请求
type AttendanceSettingsSaveReq struct {
  MonthlyLimit int `json:"monthly_limit"`
  PushDay string `json:"push_day"`
  PushTime string `json:"push_time"`
  Email string `json:"email"`
}
```

响应：
```go
// 保存补卡设置响应
type AttendanceSettingsSaveResp struct {
  Saved bool `json:"saved"`
}
```

校验：
- `email` 必填且格式合法
- `monthly_limit` 必须大于等于 0
- `push_day` 只能为 `last` 或 `1~31`
- `push_time` 格式 `HH:mm`

### 3）查询补卡记录（按月）
路径：`POST /v1/attendance/records/query`

请求：
```go
// 查询补卡记录请求
type AttendanceRecordsQueryReq struct {
  Month string `json:"month"`
}
```

响应：
```go
// 查询补卡记录响应
type AttendanceRecordsQueryResp struct {
  Records []AttendanceRecordItem `json:"records"`
  Summary AttendanceSummary `json:"summary"`
}

// 补卡记录明细
type AttendanceRecordItem struct {
  Id string `json:"id"`
  Date string `json:"date"`
  Type string `json:"type"`
  Note string `json:"note"`
}

// 补卡汇总
type AttendanceSummary struct {
  Used int `json:"used"`
  Limit int `json:"limit"`
  Locked bool `json:"locked"`
}
```

### 4）新增或更新补卡记录
路径：`POST /v1/attendance/records/save`

请求：
```go
// 保存补卡记录请求
type AttendanceRecordSaveReq struct {
  Date string `json:"date"`
  Type string `json:"type"`
  Note string `json:"note"`
}
```

响应：
```go
// 保存补卡记录响应
type AttendanceRecordSaveResp struct {
  Id string `json:"id"`
  Updated bool `json:"updated"`
}
```

规则：
- `date` 必须是当月且不晚于当天
- `type` 仅允许 `in` 或 `out`
- 当月已推送则禁止保存
- 按 `user_id + date + type` 查重，存在则更新并标记 `updated=true`
- 新增时校验当月次数上限

### 5）删除补卡记录
路径：`POST /v1/attendance/records/delete`

请求：
```go
// 删除补卡记录请求
type AttendanceRecordDeleteReq struct {
  Id string `json:"id"`
}
```

响应：
```go
// 删除补卡记录响应
type AttendanceRecordDeleteResp struct {
  Deleted bool `json:"deleted"`
}
```

规则：
- 当月已推送则禁止删除

## 七、通用邮件内部服务能力
职责：仅负责发送邮件，不提供对外接口

能力接口（示意）：
```go
// 发送邮件入参
type MailSendInput struct {
  To string
  Subject string
  Content string
  ContentType string
  SendAt string
}

// 发送邮件出参
type MailSendOutput struct {
  Id string
  Status string
}
```

规则：
- `send_at` 为空时立即创建待发送任务
- 邮件服务只负责发送，不关心业务来源
- 实际发送由邮件任务扫描 `pending` 状态并完成发送

## 八、推送任务逻辑（首版）
- 补卡任务每日 09:00 执行一次扫描：
  - 当天是推送日，直接创建邮件任务
  - 当天晚于推送日且未推送，执行补发（次日补发）
- `push_day=last` 或 `push_day` 超出当月天数时，使用当月最后一天
- 命中且当月有记录，写入 `mail_jobs` 为 `pending`
  - 若当前时间早于 `push_time`，`send_at` 使用 `push_time`
  - 若当前时间晚于 `push_time`，`send_at` 使用当前时间（补发立即发送）
- 邮件任务每 30 分钟扫描 `pending` 并发送，成功后更新为 `sent`
- 创建邮件任务后即更新 `last_pushed_month`

补充规则：
- 用户保存补卡设置后，触发一次“单用户推送扫描”

## 九、影响范围（用于落地实施）
- 影响路由：新增补卡设置与补卡记录相关接口
- 数据库变更：新增 `attendance_settings`、`attendance_records`、`mail_jobs`
- 是否需要迁移：需要新增迁移文件
- 任务与服务：新增定时任务与通用邮件内部服务能力

## 十一、邮件发送配置（.env 示例）
```
MAIL_SMTP_HOST=smtp.163.com
MAIL_SMTP_PORT=465
MAIL_SMTP_USERNAME=user@163.com
MAIL_SMTP_PASSWORD=授权码
MAIL_SMTP_FROM_EMAIL=user@163.com
MAIL_SMTP_FROM_NAME=user@163.com
MAIL_SMTP_TLS_MODE=ssl
MAIL_SMTP_TIMEOUT=10s
```

规则：
- 启动时加载 `.env`，并将 SMTP 配置写入上下文
- 推送时从上下文读取 SMTP 配置并发送

## 十、实现说明（自顶向下）
### 1）入口路由层
- 路由集中在 `backend/internal/router/attendance.go`，全部走 `StrictAuth`，从鉴权中取得 `user_id`
- 路径与职责：
  - `/attendance/settings/get`：读取用户补卡配置
  - `/attendance/settings/save`：保存用户补卡配置
  - `/attendance/records/query`：查询指定月份的补卡记录与汇总
  - `/attendance/records/save`：新增或更新补卡记录
  - `/attendance/records/delete`：删除补卡记录

### 2）处理器层（AttendanceHandler）
- 文件：`backend/internal/handler/attendance.go`
- 主要职责：解析请求体、鉴权取用户、调用服务、错误码映射为 HTTP 状态码
- 关键点：
  - 保存设置时，邮箱格式非法或配置非法返回 400
  - 保存记录时，类型非法、日期非法、超限、已锁定返回 400
  - 删除记录时，已锁定或记录不存在返回 400

### 3）服务层（AttendanceService）
- 文件：`backend/internal/service/attendance.go`
- 核心逻辑总览：
  - **GetAttendanceSettings**：优先取 DB，不存在返回默认配置（8 次、last、09:00）
  - **SaveAttendanceSettings**：校验邮箱与配置后 upsert
  - **QueryAttendanceRecords**：按月份范围查询记录与汇总，判断是否锁定
  - **SaveAttendanceRecord**：校验类型、日期范围、锁定状态、上限；同日同类型更新，否则新增
  - **DeleteAttendanceRecord**：按 ID 删除，已锁定禁止删除
  - **ProcessAttendancePush**：按分钟任务扫描，命中时生成邮件并锁定月份
- 关键规则落地位置：
  - 邮箱格式校验：`validateAttendanceSettings`
  - 推送日期溢出当月：`calcScheduleTime` 自动落当月最后一天
  - 当月限制与未来日期禁止：`SaveAttendanceRecord` 使用 `isSameMonth` 与 `now` 比较
  - 月度锁定：基于 `last_pushed_month` 判定

### 4）仓储层（AttendanceRepository）
- 文件：`backend/internal/repository/attendance.go`
- 关键方法：
  - `UpsertAttendanceSettings`：按 `user_id` upsert 配置
  - `GetAttendanceSettingsForUpdate`：行锁保证推送幂等
  - `GetAttendanceRecordByKey`：实现「日期+类型」去重
  - `CountAttendanceRecordsByRange`：上限校验依赖

### 5）通用邮件内部服务
- 文件：`backend/internal/service/mail.go`
- 职责：仅写入 `mail_jobs`，不提供对外接口
- 补卡服务通过 `MailService.Send` 写入发送任务

### 6）定时任务触发
- 任务封装：`backend/internal/task/attendance.go`
- 调度入口：`backend/internal/server/task.go`
- 执行频率：每分钟执行一次 `ProcessAttendancePush`

### 7）数据模型与迁移
- 模型文件：
  - `backend/internal/model/attendance_settings.go`
  - `backend/internal/model/attendance_record.go`
  - `backend/internal/model/mail_job.go`
- 迁移文件：`backend/migrations/20260212_attendance.sql`
