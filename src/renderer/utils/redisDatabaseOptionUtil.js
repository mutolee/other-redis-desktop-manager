// Redis DB 下拉列表工具：负责数据库数量兜底、Keyspace 数量映射和 DBSize 文案格式化。
export const DEFAULT_DATABASE_COUNT = 16

/**
 * 格式化 DBSize 数量。
 * 下拉列表空间较窄，超过千、百万后用 K/M 缩写，避免撑破选项布局。
 * @param {number|string} size - 当前 DB 的 Key 数量。
 * @returns {string} 适合下拉列表展示的数量文本。
 */
export const formatDbSize = (size) => {
    const value = Number(size) || 0

    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
    }

    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
    }

    return String(value)
}

/**
 * 规范化 Redis DB 数量。
 * 后端无法读取 CONFIG 时会返回默认 16，这里仍做一次前端兜底，并保证当前 DB 一定可选。
 * @param {number|string} count - 后端返回的数据库数量。
 * @param {number|string} currentDbIndex - 当前选中的 DB 索引。
 * @returns {number} 可用于生成 DB 下拉列表的数量。
 */
export const normalizeDatabaseCount = (count, currentDbIndex = 0) => {
    const nextDatabaseCount = Number(count)
    const normalizedDatabaseCount = Number.isFinite(nextDatabaseCount) && nextDatabaseCount > 0
        ? Math.floor(nextDatabaseCount)
        : DEFAULT_DATABASE_COUNT
    const normalizedCurrentDbIndex = Number(currentDbIndex) || 0

    return Math.max(normalizedDatabaseCount, normalizedCurrentDbIndex + 1)
}

/**
 * 将 INFO Keyspace 转成 DB 索引到 Key 数量的映射。
 * Redis INFO 只返回非空 DB，未出现的 DB 由展示层按 0 处理。
 * @param {Array<{db:string, keys:number}>} keyspace - getServerInfo 返回的 keyspace 摘要。
 * @returns {Object<string, number>} DB 索引到 Key 数量的映射。
 */
export const buildDbSizeMap = (keyspace = []) => {
    const nextSizeMap = {}

    for (const item of keyspace) {
        const dbMatch = String(item.db || '').match(/^db(\d+)$/i)

        if (dbMatch) {
            nextSizeMap[dbMatch[1]] = Number(item.keys) || 0
        }
    }

    return nextSizeMap
}

/**
 * 构建 DB 下拉列表选项。
 * @param {number} databaseCount - Redis 实际数据库数量。
 * @param {Object<string, number>} dbSizeMap - DB 索引到 Key 数量的映射。
 * @returns {Array<{label:string, value:string, size:number}>} Element Plus Select 选项。
 */
export const buildDbOptions = (databaseCount, dbSizeMap = {}) => {
    return Array.from({length: normalizeDatabaseCount(databaseCount)}, (_, index) => ({
        label: `DB ${index}`,
        value: String(index),
        size: dbSizeMap[String(index)] ?? 0
    }))
}
