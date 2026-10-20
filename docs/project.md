# project.md

# Thinking-Calendar（思考日历）—— 项目总说明

## 一、项目定位（一句话）
一个极简黑白冷调网页工具，专注工作场景下零碎记录自动聚合成周/月/年报，解决人工回顾费时遗漏问题。

## 二、核心价值
1. 每天打开即写工作记录，无多余干扰。
2. AI 一键生成周/月报，用户修改确认后存档。
3. 年终总结独立基于确认周/月报，一键生成。
4. 月看板显示记录天数，未记录天点击补充。
5. 极简 UI，黑白冷调，左侧导航提升效率。

## 三、目标用户
忙碌知识工作者（如程序员、产品经理），需周报/月报/年终总结。

## 四、核心功能清单（按优先级）
1. 今天页：日期 + 编辑器，自由书写工作记录。
2. 历史页：日历视图快速找日期，点击弹出编辑。
3. 看板页：月记录统计，未记录点击补充。
4. 报告页：生成周/月报 (版式+日期)，修改/确认/导出；年终独立生成。
5. 左侧导航：常驻最近报告列表。

## 五、技术选型
### 前端
- Next.js 14（App Router + TypeScript）
- Tailwind CSS + shadcn/ui
- Zustand
- Tiptap 编辑器
- axios + MSW (mock)
- react

### 后端
- Go（Gin/Echo）+ GORM + MySQL
- JWT 认证

## 六、页面与路由
/
/today          → 今天记录
/history        → 历史日志
/dashboard      → 月看板
/reports        → 报告生成 + 历史

## 七、UI 风格关键词
- 极简黑白冷调（gray-900/100），无彩色。
- 左侧导航 (w-280) + 右侧内容。
- 响应式，移动菜单折叠。
- 所有卡片 hover 阴影，弹出 Dialog 编辑。

## 八、开发阶段数据策略
- MSW 拦截接口，返回 mock/data.json (60天数据)。
- 页面加载即有内容，看板/报告可见。

## 九、项目最终交付形态
网页应用，登录后每天记录，AI 生成报告，用户确认/导出。

## 十、Docker 镜像标签与部署

项目根目录的 `.env.docker` 统一配置镜像标签：

```dotenv
BACKEND_TAG=20261020-01
FRONTEND_TAG=20261020-01
```

- `backend`、`migrate`、`task` 共用 `thinking-calendar-backend:${BACKEND_TAG}`。
- `frontend` 使用 `thinking-calendar-frontend:${FRONTEND_TAG}`。
- 两个标签独立维护，只更新前端时仅修改 `FRONTEND_TAG`；新版本使用新标签，不复用旧标签。
- Compose 不会自动加载 `.env.docker`，以下命令均需显式传入 `--env-file .env.docker`。
  缺少或清空任一标签会直接报错，不回退到 `latest`。
- 已导出的同名 Shell 环境变量优先于环境文件；以文件为准时先执行 `unset BACKEND_TAG FRONTEND_TAG`。
- `.env.docker` 只配置镜像标签，不替代后端容器使用的 `deploy_docker/backend/.env`，
  也不改变前端构建参数和后端运行配置。

仅构建前端镜像，不更新正在运行的容器：

```bash
docker compose --env-file .env.docker build frontend
```

使用新标签更新前端，不启动或重建后端及数据库：

```bash
docker compose --env-file .env.docker up -d --no-deps frontend
```

构建并更新全部应用服务：

```bash
docker compose --env-file .env.docker build backend frontend
docker compose --env-file .env.docker up -d
```

后端镜像只需构建一次，迁移与定时任务会使用同一标签；后端版本更新时，
不要对后端使用 `--no-deps` 跳过已有迁移依赖。新镜像需要通过 `up -d` 重建容器，
`restart` 不会切换容器使用的镜像。

部署前可检查解析后的镜像标签：

```bash
docker compose --env-file .env.docker config --images
```