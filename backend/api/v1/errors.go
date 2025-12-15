/*
 * @Description:
 * @Author: zyq
 * @Date: 2025-12-12 16:56:59
 * @LastEditors: zyq
 * @LastEditTime: 2025-12-17 16:33:17
 */
package v1

var (
	// common errors
	ErrSuccess             = newError(0, "ok")
	ErrBadRequest          = newError(400, "请求参数错误")
	ErrUnauthorized        = newError(401, "未登录或无权限")
	ErrNotFound            = newError(404, "资源不存在")
	ErrInternalServerError = newError(500, "服务器内部错误")

	// user errors
	ErrUsernameAlreadyUse       = newError(1001, "用户名已存在")
	ErrPasswordInvalid          = newError(1002, "密码长度需6-32个字符")
	ErrUsernameInvalid          = newError(1003, "用户名长度需3-20个字符")
	ErrPasswordSimple           = newError(1004, "密码需包含特殊字符")
	ErrUserNotExist             = newError(1005, "用户不存在")
	ErrInvalidPassword          = newError(1006, "密码错误")
	ErrJWTGenFailed             = newError(1007, "生成token失败")
	ErrUserIDNotMatch           = newError(1008, "请求用户与鉴权登录用户id不匹配")
	ErrGetUserSettingsFailed    = newError(1009, "获取用户设置失败")
	ErrUpdateUserSettingsFailed = newError(1010, "更新用户设置失败")
	ErrGetUserInfoFailed        = newError(1011, "获取用户信息失败")

	// record errors
	ErrRecordNotExist     = newError(2001, "记录不存在")
	ErrGetRecordsFailed   = newError(2002, "获取记录失败")
	ErrCreateRecordFailed = newError(2003, "创建记录失败")
	ErrUpdateRecordFailed = newError(2004, "更新记录失败")
	ErrDeleteRecordFailed = newError(2005, "删除记录失败")
	ErrTooManyRecords     = newError(2006, "存在多条记录")
	ErrInvalidDate        = newError(2007, "非法日期错误")

	// report errors
	ErrReportNotExist        = newError(3001, "报告不存在")
	ErrGetReportsFailed      = newError(3002, "获取报告失败")
	ErrCreateReportFailed    = newError(3003, "创建报告失败")
	ErrUpdateReportFailed    = newError(3004, "更新报告失败")
	ErrInvalidReportPeriod   = newError(3005, "报告类型错误")
	ErrInvalidReportTemplate = newError(3006, "报告版式错误")
	ErrReportNotReady        = newError(3007, "报告尚未生成完成")

	// dashboard errors
	ErrGetDashboardFailed = newError(4001, "获取看板数据失败")
)
