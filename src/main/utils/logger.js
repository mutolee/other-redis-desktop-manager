/**
 * 主进程日志工具。
 * 提供统一的日志前缀、级别和模块名，避免主进程日志散落成难以检索的 console 文本。
 */

/**
 * 格式化当前时间。
 * 主进程日志主要用于本地排查，保留到秒即可避免日志过长。
 *
 * @returns {string} 当前本地时间字符串
 */
const formatLogTime = () => {
    return new Date().toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

/**
 * 输出带有统一前缀的日志。
 *
 * @param {'info' | 'warn' | 'error'} level - 日志级别
 * @param {string} scope - 日志所属模块
 * @param {string} message - 主要日志信息
 * @param {unknown[]} details - 附加对象或错误信息
 */
const writeLog = (level, scope, message, details) => {
    const prefix = `[${formatLogTime()}] [${scope}] [${level.toUpperCase()}]`
    const logger = console[level] || console.log

    logger(prefix, message, ...details)
}

/**
 * 创建指定模块的日志记录器。
 *
 * @param {string} scope - 模块名，例如 main、startup、lifecycle
 * @returns {{info: Function, warn: Function, error: Function}} 模块日志方法集合
 */
export const createLogger = (scope) => ({
    info(message, ...details) {
        writeLog('info', scope, message, details)
    },
    warn(message, ...details) {
        writeLog('warn', scope, message, details)
    },
    error(message, ...details) {
        writeLog('error', scope, message, details)
    }
})
