/**
 * Redis 主进程侧通用数据工具。
 * 只放纯函数和默认常量，不持有 Redis 连接，也不依赖 Electron IPC，便于连接管理器保持聚焦。
 */

export const DEFAULT_CONNECT_TIMEOUT_MS = 10000
export const DEFAULT_COMMAND_TIMEOUT_MS = 8000
export const DEFAULT_DATABASE_COUNT = 16
export const DEFAULT_PAGE_SIZE = 100
export const REDIS_KEEP_ALIVE_MS = 30000

/**
 * 规范化跨进程传入的连接 ID。
 * 渲染进程的 tabId/connectionId 可能是字符串，数据库配置 ID 通常是数字，这里统一转成可复用的 Map key。
 * @param {string|number} connectionId - 渲染进程传入的连接 ID。
 * @returns {string|number} 用于连接池读写的连接 ID。
 */
export const normalizeConnectionId = (connectionId) => {
    const numericConnectionId = Number(connectionId)

    // 只把明确的整数 ID 归一成 number，避免空字符串、非数字 tabId 被错误转成 0 或 NaN。
    if (connectionId !== '' && Number.isInteger(numericConnectionId)) {
        return numericConnectionId
    }

    return connectionId
}

/**
 * 规范化基于下标的分页范围。
 * Hash/List/ZSet 这类详情面板都使用 start/stop 模式，集中处理可以避免各方法边界规则不一致。
 * @param {number|string} start - 起始下标。
 * @param {number|string} stop - 结束下标。
 * @returns {{normalizedStart:number, normalizedStop:number}} 可直接传给 Redis 范围命令的下标。
 */
export const normalizeIndexRange = (start = 0, stop = DEFAULT_PAGE_SIZE - 1) => {
    const normalizedStart = Math.max(0, Number(start) || 0)
    const normalizedStop = Math.max(normalizedStart, Number(stop) || normalizedStart)

    return { normalizedStart, normalizedStop }
}

/**
 * 规范化 Redis 扫描/分页数量。
 * @param {number|string} count - 外部传入的数量。
 * @param {number} fallback - 非法数量时使用的默认值。
 * @returns {number} 大于等于 1 的安全数量。
 */
export const normalizePageCount = (count = DEFAULT_PAGE_SIZE, fallback = DEFAULT_PAGE_SIZE) => {
    return Math.max(1, Number(count) || fallback)
}

/**
 * 规范化毫秒级超时值。
 * @param {number|string} value - 待校验的超时值。
 * @param {number} fallback - 校验失败时使用的默认值。
 * @returns {number} 可安全用于连接和命令控制的超时值。
 */
export const normalizeTimeout = (value, fallback) => {
    const timeout = Number(value)
    return Number.isFinite(timeout) && timeout > 0 ? timeout : fallback
}

/**
 * 规范化 Redis 数据库数量。
 * CONFIG GET databases 可能返回字符串，统一转成正整数，失败时使用调用方提供的兜底值。
 * @param {number|string} value - Redis 配置中的 databases 值。
 * @param {number} fallback - 读取失败或格式异常时的兜底数据库数量。
 * @returns {number} 可用于生成 DB 选择列表的数据库数量。
 */
export const normalizeDatabaseCount = (value, fallback = DEFAULT_DATABASE_COUNT) => {
    const databaseCount = Number(value)

    return Number.isFinite(databaseCount) && databaseCount > 0
        ? Math.floor(databaseCount)
        : fallback
}

/**
 * 解析 CONFIG GET databases 的返回值。
 * ioredis 通常返回 ['databases', '16']，这里兼容对象形式，避免不同 Redis 客户端返回结构差异影响 UI。
 * @param {Array|Object} configResult - Redis CONFIG GET databases 返回值。
 * @param {number} fallback - 解析失败时使用的兜底数据库数量。
 * @returns {number} Redis 配置的数据库数量。
 */
export const parseRedisConfigDatabases = (configResult, fallback = DEFAULT_DATABASE_COUNT) => {
    if (Array.isArray(configResult)) {
        const databaseKeyIndex = configResult.findIndex(item => String(item).toLowerCase() === 'databases')

        if (databaseKeyIndex >= 0) {
            return normalizeDatabaseCount(configResult[databaseKeyIndex + 1], fallback)
        }
    }

    if (configResult && typeof configResult === 'object') {
        return normalizeDatabaseCount(configResult.databases ?? configResult.DATABASES, fallback)
    }

    return fallback
}

/**
 * 将 XREVRANGE/XRANGE 返回的 Stream entry 转成前端表格结构。
 * @param {Array} entries - Redis 返回的 [id, [field, value...]] 列表。
 * @returns {Array<{id:string, fields:Array, summary:string}>}
 */
export const normalizeStreamEntries = (entries = []) => {
    if (!Array.isArray(entries)) {
        return []
    }

    return entries.map((entry) => {
        const id = String(entry?.[0] ?? '')
        const rawFields = Array.isArray(entry?.[1]) ? entry[1] : []
        const fields = []

        // Stream entry 字段和值交替出现，前端展示前先转成稳定的 field/value 数组。
        for (let i = 0; i < rawFields.length; i += 2) {
            fields.push({
                field: String(rawFields[i] ?? ''),
                value: String(rawFields[i + 1] ?? '')
            })
        }

        return {
            id,
            fields,
            summary: fields.map((item) => `${item.field}: ${item.value}`).join(', ')
        }
    })
}

/**
 * 将 XINFO 返回的交替键值数组转成普通对象。
 * @param {Array} pairs - Redis 返回的 [key, value, key, value...] 数组。
 * @returns {Object}
 */
export const normalizeInfoPairs = (pairs = []) => {
    const data = {}

    if (!Array.isArray(pairs)) {
        return data
    }

    // XINFO GROUPS/CONSUMERS 每一项都是交替键值数组，统一转对象后便于后续映射字段。
    for (let i = 0; i < pairs.length; i += 2) {
        data[String(pairs[i] ?? '')] = pairs[i + 1]
    }

    return data
}
