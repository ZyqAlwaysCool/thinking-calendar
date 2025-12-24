export const NAV_LABELS = {
  brand: 'Thinking-Calendar',
  today: '今天',
  history: '历史',
  dashboard: '看板',
  reports: '报告',
  settings: '设置',
  recent: '最近报告',
  viewAll: '查看全部 →'
}

export const PAGE_TEXT = {
  loginTitle: 'Thinking-Calendar',
  loginSubtitle: '专注工作记录，AI 帮你写总结',
  loginButton: '登录/注册',
  loginSuccess: '登录成功',
  loginFail: '登录失败，请稍后重试',
  loginRequired: '请填写用户名和密码',
  loginUsernameLength: '用户名长度需 6-20 个字符',
  loginPasswordLength: '密码长度需 6-32 个字符',
  loginAuthRequired: '请先登录后再访问',
  usernamePlaceholder: '请输入用户名',
  passwordPlaceholder: '请输入密码',
  futureDateForbidden: '不能编辑未来日期的日志',
  reportFutureDateForbidden: '不能选择未来日期生成报告',
  todayTitle: '今天',
  historyTitle: '历史记录',
  dashboardTitle: '记录看板',
  reportsTitle: '报告中心',
  editorPlaceholder: '记录今天的重点、产出、问题与下一步计划...',
  emptyLog: '暂无记录，开始书写吧',
  statisticsPrefix: '本月已记录',
  statisticsGap: '未记录',
  statisticsRate: '记录率',
  reportTypeLabel: '报告类型',
  templateLabel: '版式',
  timeRangeLabel: '时间范围',
  reportWeekLabel: '周报',
  reportMonthLabel: '月报',
  reportYearLabel: '年报',
  selectReportHint: '选择一条报告查看详情',
  confirmReport: '确认报告',
  copyReport: '复制',
  exportReport: '导出 PDF',
  exportBatch: '批量导出 PDF',
  generateNow: '立即生成',
  generateYearly: '生成年终总结',
  weeklyReport: '周报',
  monthlyReport: '月报',
  yearlyReport: '年报',
  confirmed: '已确认',
  unconfirmed: '未确认',
  noReport: '暂无报告',
  noLog: '暂无日志',
  loading: '加载中…',
  loadFail: '加载失败',
  save: '保存',
  generating: '生成中…',
  saveSuccess: '保存成功',
  saveFail: '保存失败',
  generateSuccess: '生成成功',
  generateFail: '生成失败',
  generateAgain: '重新生成',
  confirmSuccess: '确认成功',
  confirmFail: '确认失败',
  copySuccess: '已复制到剪贴板',
  copyFail: '复制失败',
  exportSuccess: '已打开打印窗口，可选择保存为 PDF',
  exportFail: '导出失败',
  reportGeneratingHint: 'AI 正在生成，稍候即会出现内容',
  viewInDialog: '在弹窗中编辑',
  recordsCount: '条记录',
  lastUpdated: '更新',
  lastUpdatedRecent: '最近更新',
  recordedTag: '已记录',
  todayWeekPrefix: '第',
  todayWeekSuffix: '周',
  todayGenerateAction: '生成本周报告 →',
  searchDate: '选择日期',
  missingFill: '点击补充',
  yearlyHint: '基于已确认的周报或月报生成',
  userMenuGuest: '未登录',
  userMenuLogout: '退出登录',
  settingsTitle: '设置',
  settingsSubtitle: '配置周报、月报生成模板',
  settingsWeekTitle: '周报模板',
  settingsMonthTitle: '月报模板',
  settingsTemplateHint: '模板将用于生成报告时替换默认提示词',
  settingsEmpty: '暂无模板，点击编辑',
  settingsEdit: '编辑模板',
  settingsSave: '保存模板',
  settingsLoadFail: '加载设置失败',
  settingsSaveFail: '保存设置失败'
}

export const REPORT_OPTIONS = {
  period: [
    { value: 'week', label: '周报' },
    { value: 'month', label: '月报' },
    { value: 'year', label: '年报' }
  ],
  template: [
    { value: 'formal', label: '正式版' },
    { value: 'simple', label: '简约版' }
  ]
}

export const TOOLBAR_TEXT = {
  bold: '加粗',
  italic: '斜体',
  bullet: '无序列表',
  ordered: '有序列表',
  h2: '二级标题',
  h3: '三级标题'
}

export const DIALOG_TEXT = {
  editLog: '编辑',
  edit: '编辑',
  close: '关闭'
}

export const METADATA_TEXT = {
  title: 'Thinking-Calendar',
  description: '专注工作记录与报告生成的极简工具'
}
