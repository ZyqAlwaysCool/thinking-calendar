<!--
 * @Description: 
 * @Author: zyq
 * @Date: 2025-12-11 11:45:33
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 21:08:17
-->
### General Rules
- 永远、永远、永远用中文输出。禁止出现英文解释、英文注释（代码中的变量名、类型名、API 路径除外）；
- 禁止道歉、禁止说“可能”“猜测”“大概”，必须先阅读代码或运行测试后再下结论；
- 每次修改代码前，必须先列出「影响文件列表 + 修改目的 + 潜在副作用」；
- 可读性永远高于炫技，代码必须让初中级开发者也能一眼看懂；
- 提出方案时必须至少对比至少 2 种做法，并说明为什么选当前方案；

### Frontend Rules
- 必须使用 Next.js 14 App Router，所有页面放在 src/app/ 目录，禁止使用 pages/ 目录；
- UI 只能使用 shadcn/ui 组件，禁止手写或使用 Antd、Mantine、Chakra、Material-UI；
- 编辑器只能使用 @tiptap/react + starter-kit，禁止使用 Quill、Slate、Lexical；
- 状态管理只能使用 Zustand，禁止 Redux、Context+Reducer、MobX；
- 所有网络请求必须走 src/lib/api.ts 中的 axios 实例，开发阶段必须被 MSW 100% 拦截，使用 mock/data.json 数据；
- 日期处理只能用 date-fns，禁止 dayjs、moment、原生 Date；
- 所有类型定义集中放在 src/types/index.ts，禁止使用 any；
- 文件名 kebab-case，组件名 PascalCase，变量/函数 camelCase；
- Tailwind 类名书写顺序：布局 → 尺寸 → 颜色 → 状态 → 动画，单行不超过 120 字符；
- 代码末尾一律不写分号（与 shadcn/ui 官方保持一致）；
- 所有异步操作必须 try/catch + react-hot-toast 错误提示；
- 页面首次加载必须显示 Skeleton，数据回来再替换真实内容；
- 所有可交互元素必须加 hover:scale-105 transition-all duration-200 和暗黑模式支持；
- 文案统一从 src/lib/constants.ts 读取，禁止组件内直接写中文字符串；
- 暗黑模式强制使用 dark: 前缀；

### Backend Rules
- 全部使用中文输出，日志和注释用中文；
- 包名一律小写无下划线（例如 handler user middleware）；
- 结构体字段使用大驼峰 CamelCase，json 标签小写 `json:"user_id"`；
- 变量、函数、方法一律小驼峰 camelCase；
- 错误处理统一返回 error，不允许忽略错误；
- 所有 HTTP handler 必须返回 JSON 结构：
  { "code": 0, "msg": "ok", "data": {...} }
- 密码使用 bcrypt，JWT 使用 HS256 或 RS256；
- 数据库操作使用 GORM，迁移文件放在 migrations/ 目录；
- 路由使用 Gin 或 Echo，格式：r.POST("/api/login", handler.Login)；
- 所有接口必须有结构体请求体和响应体定义并写注释；
- 日志使用 zap 或 zerolog，禁止 fmt.Println；
- 代码末尾可以有分号，但建议省略（go fmt 会自动处理）；
- 每次修改必须说明「影响的路由 + 数据库变更 + 是否需要迁移」;
- 不允许修改wire_gen.go文件;

### about project
- docs/project.md: 项目说明
- docs/frontend-ui.md: 前端工程设计说明