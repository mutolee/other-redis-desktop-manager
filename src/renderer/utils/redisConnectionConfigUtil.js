/**
 * Redis 连接运行时配置工具
 * 用于把系统设置中的连接级参数合并到连接配置对象中，避免在多个组件里重复拼装。
 */

/**
 * 规范化毫秒级超时值。
 * @param {number|string} value - 待校验的超时值。
 * @param {number} fallback - 校验失败时使用的默认值。
 * @returns {number} 可直接传给后端的超时毫秒值。
 */
const normalizeTimeout = (value, fallback) => {
    const timeout = Number(value)
    return Number.isFinite(timeout) && timeout > 0 ? timeout : fallback
}

/**
 * 把系统设置中的连接超时、命令超时合并到连接配置中。
 * @param {Object} connectionConfig - 当前连接配置。
 * @param {Object} connectionSettings - 系统设置中的连接参数。
 * @returns {Object} 适合传给 preload / main 进程的运行时连接配置。
 */
export const mergeConnectionRuntimeSettings = (connectionConfig, connectionSettings = {}) => {
    return {
        ...connectionConfig,
        // 连接建立超时：用于 ioredis connectTimeout。
        connectTimeout: normalizeTimeout(connectionSettings.connectTimeout, 10000),
        // 命令执行超时：用于后端对 ROLE / DBSIZE / INFO / SCAN 等命令做统一控制。
        commandTimeout: normalizeTimeout(connectionSettings.commandTimeout, 8000)
    }
}
