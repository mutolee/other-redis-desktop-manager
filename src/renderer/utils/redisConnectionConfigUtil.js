/**
 * Redis 连接运行时配置工具
 * 用于把系统设置中的连接级参数合并到连接配置对象中，避免在多个组件里重复拼装。
 */

// main 进程建立 Redis 连接所需字段；连接名称作为非敏感元数据保留，供命令记录展示。
const REDIS_CONNECTION_FIELDS = [
    'host',
    'port',
    'username',
    'password',
    'db_index',
    'use_ssh',
    'ssh_host',
    'ssh_port',
    'ssh_username',
    'ssh_auth_type',
    'ssh_password',
    'ssh_private_key',
    'ssh_private_key_passphrase',
    'use_ssl',
    'ssl_ca',
    'ssl_cert',
    'ssl_key',
    'use_sentinel',
    'sentinel_master_name',
    'sentinel_master_pass',
    'use_cluster'
]

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
 * 提取 main 进程建立 Redis 连接真正需要的配置字段。
 *
 * @param {Object} connectionConfig - 持久化配置或带运行状态的已打开页签快照。
 * @returns {Object} 不包含 renderer 私有状态的 Redis 配置。
 */
const pickRedisRuntimeConfig = (connectionConfig = {}) => {
    return Object.fromEntries(
        REDIS_CONNECTION_FIELDS.map(field => [field, connectionConfig[field]])
    )
}

/**
 * 把系统设置中的连接超时、命令超时合并到连接配置中。
 * @param {Object} connectionConfig - 当前连接配置。
 * @param {Object} connectionSettings - 系统设置中的连接参数。
 * @returns {Object} 适合传给 preload / main 进程的运行时连接配置。
 */
export const mergeConnectionRuntimeSettings = (connectionConfig, connectionSettings = {}) => {
    return {
        ...pickRedisRuntimeConfig(connectionConfig),
        // 连接名称不参与 Redis 鉴权，只用于命令历史和命令面板识别当前连接。
        name: connectionConfig?.name || '',
        // 命令面板会创建独立运行时连接，该字段用于把记录归并到原始连接配置。
        historyConnectionId: connectionConfig?.sourceConnectionId || connectionConfig?.id || '',
        // 连接建立超时：用于 ioredis connectTimeout。
        connectTimeout: normalizeTimeout(connectionSettings.connectTimeout, 10000),
        // 命令执行超时：用于后端对 ROLE / DBSIZE / INFO / SCAN 等命令做统一控制。
        commandTimeout: normalizeTimeout(connectionSettings.commandTimeout, 8000)
    }
}
