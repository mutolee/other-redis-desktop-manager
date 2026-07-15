import {normalizeStreamEntries} from './redisDataUtils.js'
import {tMain} from '../utils/mainI18n.js'

// 单次导出允许选择的最大 Key 数量，控制 IPC 传输和 JSON 文件体积。
const KEY_EXPORT_MAX_KEYS = 50000

// Set 导出时每轮 SSCAN 的建议数量，避免直接 SMEMBERS 拉取超大集合。
const KEY_EXPORT_SET_SCAN_COUNT = 1000

// Hash 导出时每轮 HSCAN 的建议数量，避免直接 HGETALL 拉取超大对象。
const KEY_EXPORT_HASH_SCAN_COUNT = 1000

// String 导出最大字节数，超出后使用 GETRANGE 截断导出内容。
const KEY_EXPORT_STRING_MAX_BYTES = 50 * 1024 * 1024

// 集合类 Key 单个对象最多导出的元素数量，超出后标记 truncated。
const KEY_EXPORT_COLLECTION_MAX_ITEMS = 100000

// 导入集合类 Key 时每批写入的元素数量，避免单条 Redis 命令参数过长。
const KEY_IMPORT_BATCH_SIZE = 500

/**
 * Redis Key 导入导出服务。
 * 只处理 Key 数据序列化和恢复，不管理连接生命周期。
 */
export class RedisKeyTransferService {
    /**
     * @param {{getActiveConnection: Function, runWithCommandTimeout: Function}} dependencies - 来自连接管理器的依赖。
     */
    constructor(dependencies = {}) {
        this.getActiveConnection = dependencies.getActiveConnection
        this.runWithCommandTimeout = dependencies.runWithCommandTimeout
    }

    /**
     * 分段读取 Hash 字段，避免 HGETALL 一次性读取超大 Hash。
     * @param {Object} connection - 活跃 Redis 连接对象
     * @param {string} key - Redis Hash Key
     * @param {number} maxItems - 最大读取条目数
     * @returns {Promise<Object>} Hash 字段对象
     */
    async readLimitedHashFields(connection, key, maxItems = KEY_EXPORT_COLLECTION_MAX_ITEMS) {
        const fields = {}
        let cursor = '0'

        while (Object.keys(fields).length < maxItems) {
            const scanResult = await this.runWithCommandTimeout(
                connection.config,
                () => connection.redis.hscan(key, cursor, 'COUNT', KEY_EXPORT_HASH_SCAN_COUNT),
                'HSCAN'
            )
            const nextItems = Array.isArray(scanResult?.[1]) ? scanResult[1] : []

            cursor = String(scanResult?.[0] ?? '0')
            for (let index = 0; index < nextItems.length && Object.keys(fields).length < maxItems; index += 2) {
                fields[nextItems[index]] = nextItems[index + 1]
            }

            if (cursor === '0') {
                break
            }
        }

        return fields
    }

    /**
     * 分段读取 Set 成员，避免 SMEMBERS 一次性读取超大集合。
     * @param {Object} connection - 活跃 Redis 连接对象
     * @param {string} key - Redis Set Key
     * @param {number} maxItems - 最大读取条目数
     * @returns {Promise<string[]>} Set 成员列表
     */
    async readLimitedSetMembers(connection, key, maxItems = KEY_EXPORT_COLLECTION_MAX_ITEMS) {
        const members = []
        let cursor = '0'

        while (members.length < maxItems) {
            const scanResult = await this.runWithCommandTimeout(
                connection.config,
                () => connection.redis.sscan(key, cursor, 'COUNT', KEY_EXPORT_SET_SCAN_COUNT),
                'SSCAN'
            )
            const nextMembers = Array.isArray(scanResult?.[1]) ? scanResult[1] : []

            cursor = String(scanResult?.[0] ?? '0')
            members.push(...nextMembers.slice(0, Math.max(maxItems - members.length, 0)))

            if (cursor === '0') {
                break
            }
        }

        return members
    }

    /**
     * 读取单个 Key 的完整导出数据。
     * 不复用详情页读取逻辑，因为详情页为了性能只读取复杂类型首页数据，而导出需要全量内容。
     * @param {Object} connection - 活跃 Redis 连接对象
     * @param {string} key - Redis Key
     * @returns {Promise<Object>} 可序列化的 Key 导出数据
     */
    async readCompleteKeyExportData(connection, key) {
        const metadataPipe = connection.redis.pipeline()
        metadataPipe.type(key)
        metadataPipe.pttl(key)
        metadataPipe.call('MEMORY', 'USAGE', key)
        const metadataResults = await this.runWithCommandTimeout(
            connection.config,
            () => metadataPipe.exec(),
            'Key导出元信息管道'
        )

        const keyType = String(metadataResults?.[0]?.[1] || 'none')
        const ttlMs = Number(metadataResults?.[1]?.[1] ?? -2)
        const memoryUsage = Number(metadataResults?.[2]?.[1] ?? 0) || 0

        if (keyType === 'none') {
            return {
                key,
                type: 'none',
                ttlMs,
                memoryUsage,
                exists: false,
                value: null,
                size: 0,
                truncated: false,
                limit: null
            }
        }

        let value = null
        let size = 0
        let truncated = false
        let limit = null

        if (keyType === 'string') {
            size = await this.runWithCommandTimeout(connection.config, () => connection.redis.strlen(key), 'STRLEN')
            limit = KEY_EXPORT_STRING_MAX_BYTES
            truncated = size > limit
            value = truncated
                ? await this.runWithCommandTimeout(connection.config, () => connection.redis.getrange(key, 0, limit - 1), 'GETRANGE')
                : await this.runWithCommandTimeout(connection.config, () => connection.redis.get(key), 'GET')
        } else if (keyType === 'hash') {
            size = await this.runWithCommandTimeout(connection.config, () => connection.redis.hlen(key), 'HLEN')
            limit = KEY_EXPORT_COLLECTION_MAX_ITEMS
            truncated = size > limit
            value = await this.readLimitedHashFields(connection, key, limit)
        } else if (keyType === 'list') {
            const pipe = connection.redis.pipeline()
            pipe.llen(key)
            pipe.lrange(key, 0, KEY_EXPORT_COLLECTION_MAX_ITEMS - 1)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'List导出管道')
            size = Number(results?.[0]?.[1] ?? 0)
            limit = KEY_EXPORT_COLLECTION_MAX_ITEMS
            truncated = size > limit
            value = Array.isArray(results?.[1]?.[1]) ? results[1][1] : []
        } else if (keyType === 'set') {
            const pipe = connection.redis.pipeline()
            pipe.scard(key)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'Set导出元信息管道')
            size = Number(results?.[0]?.[1] ?? 0)
            limit = KEY_EXPORT_COLLECTION_MAX_ITEMS
            truncated = size > limit
            value = await this.readLimitedSetMembers(connection, key, limit)
        } else if (keyType === 'zset') {
            const pipe = connection.redis.pipeline()
            pipe.zcard(key)
            pipe.zrange(key, 0, KEY_EXPORT_COLLECTION_MAX_ITEMS - 1, 'WITHSCORES')
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'ZSet导出管道')
            const rawItems = Array.isArray(results?.[1]?.[1]) ? results[1][1] : []

            size = Number(results?.[0]?.[1] ?? 0)
            limit = KEY_EXPORT_COLLECTION_MAX_ITEMS
            truncated = size > limit
            value = []
            for (let index = 0; index < rawItems.length; index += 2) {
                value.push({
                    member: rawItems[index],
                    score: Number.parseFloat(rawItems[index + 1]) || 0
                })
            }
        } else if (keyType === 'stream') {
            const pipe = connection.redis.pipeline()
            pipe.xlen(key)
            pipe.xrange(key, '-', '+', 'COUNT', KEY_EXPORT_COLLECTION_MAX_ITEMS)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'Stream导出管道')

            size = Number(results?.[0]?.[1] ?? 0)
            limit = KEY_EXPORT_COLLECTION_MAX_ITEMS
            truncated = size > limit
            value = normalizeStreamEntries(results?.[1]?.[1] || [])
        }

        return {
            key,
            type: keyType,
            ttlMs,
            memoryUsage,
            exists: true,
            value,
            size,
            truncated,
            limit
        }
    }

    /**
     * 批量导出选中的 Key 数据。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string[]} keys - 需要导出的 Key 列表
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async exportKeys(connectionId, keys = []) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const uniqueKeys = [...new Set((Array.isArray(keys) ? keys : []).filter(Boolean).map(String))]

            if (uniqueKeys.length === 0) {
                return {success: false, error: tMain('redis.exportKeysEmpty')}
            }

            if (uniqueKeys.length > KEY_EXPORT_MAX_KEYS) {
                return {success: false, error: tMain('redis.exportKeysTooMany', {value: KEY_EXPORT_MAX_KEYS})}
            }

            const exportedKeys = []
            const failedKeys = []

            for (const key of uniqueKeys) {
                try {
                    exportedKeys.push(await this.readCompleteKeyExportData(connection, key))
                } catch (error) {
                    failedKeys.push({
                        key,
                        error: error.message || String(error)
                    })
                }
            }

            return {
                success: true,
                data: {
                    keys: exportedKeys,
                    failedKeys,
                    requestedCount: uniqueKeys.length,
                    exportedCount: exportedKeys.length,
                    failedCount: failedKeys.length,
                    limits: {
                        maxKeys: KEY_EXPORT_MAX_KEYS,
                        maxStringBytes: KEY_EXPORT_STRING_MAX_BYTES,
                        maxCollectionItems: KEY_EXPORT_COLLECTION_MAX_ITEMS
                    }
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.exportKeysFail')}
        }
    }

    /**
     * 按批次切分数组。
     * @param {Array} items - 待切分数据
     * @param {number} batchSize - 每批数量
     * @returns {Array<Array>} 批次数组
     */
    createImportBatches(items = [], batchSize = KEY_IMPORT_BATCH_SIZE) {
        const batches = []

        for (let index = 0; index < items.length; index += batchSize) {
            batches.push(items.slice(index, index + batchSize))
        }

        return batches
    }

    /**
     * 导入完成后恢复 Key 的 TTL。
     * @param {Object} connection - 活跃 Redis 连接对象
     * @param {string} key - Redis Key
     * @param {number} ttlMs - 导出文件中的 PTTL 值
     */
    async applyImportedKeyTtl(connection, key, ttlMs) {
        const normalizedTtlMs = Number(ttlMs)

        if (Number.isFinite(normalizedTtlMs) && normalizedTtlMs > 0) {
            await this.runWithCommandTimeout(connection.config, () => connection.redis.pexpire(key, normalizedTtlMs), 'PEXPIRE')
        }
    }

    /**
     * 导入单个 Key。
     * @param {Object} connection - 活跃 Redis 连接对象
     * @param {Object} keyData - 导出文件中的单个 Key 数据
     * @param {{replace?: boolean}} options - 导入选项
     * @returns {Promise<{status:'imported'|'skipped', key:string, reason?:string}>}
     */
    async importSingleKeyData(connection, keyData, options = {}) {
        const key = String(keyData?.key || '')
        const keyType = String(keyData?.type || '')

        if (!key || !keyData?.exists || keyType === 'none') {
            return {status: 'skipped', key, reason: 'missing'}
        }

        if (!options.replace) {
            const exists = await this.runWithCommandTimeout(connection.config, () => connection.redis.exists(key), 'EXISTS')
            if (Number(exists) > 0) {
                return {status: 'skipped', key, reason: 'exists'}
            }
        }

        if (options.replace) {
            await this.runWithCommandTimeout(connection.config, () => connection.redis.del(key), 'DEL')
        }

        if (keyType === 'string') {
            await this.runWithCommandTimeout(connection.config, () => connection.redis.set(key, keyData.value ?? ''), 'SET')
        } else if (keyType === 'hash') {
            const entries = Object.entries(keyData.value || {})
            for (const batch of this.createImportBatches(entries)) {
                if (batch.length > 0) {
                    await this.runWithCommandTimeout(connection.config, () => connection.redis.hset(key, ...batch.flat()), 'HSET')
                }
            }
        } else if (keyType === 'list') {
            const items = Array.isArray(keyData.value) ? keyData.value : []
            for (const batch of this.createImportBatches(items)) {
                if (batch.length > 0) {
                    await this.runWithCommandTimeout(connection.config, () => connection.redis.rpush(key, ...batch), 'RPUSH')
                }
            }
        } else if (keyType === 'set') {
            const members = Array.isArray(keyData.value) ? keyData.value : []
            for (const batch of this.createImportBatches(members)) {
                if (batch.length > 0) {
                    await this.runWithCommandTimeout(connection.config, () => connection.redis.sadd(key, ...batch), 'SADD')
                }
            }
        } else if (keyType === 'zset') {
            const members = Array.isArray(keyData.value) ? keyData.value : []
            for (const batch of this.createImportBatches(members)) {
                const args = batch.flatMap((item) => [Number(item.score) || 0, item.member ?? ''])
                if (args.length > 0) {
                    await this.runWithCommandTimeout(connection.config, () => connection.redis.zadd(key, ...args), 'ZADD')
                }
            }
        } else if (keyType === 'stream') {
            const entries = Array.isArray(keyData.value) ? keyData.value : []
            for (const entry of entries) {
                const fields = Array.isArray(entry.fields) ? entry.fields : []
                const args = fields.flatMap((item) => [item.field ?? '', item.value ?? ''])

                if (entry.id && args.length > 0) {
                    await this.runWithCommandTimeout(connection.config, () => connection.redis.xadd(key, entry.id, ...args), 'XADD')
                }
            }
        } else {
            return {status: 'skipped', key, reason: 'unsupported'}
        }

        await this.applyImportedKeyTtl(connection, key, keyData.ttlMs)

        return {status: 'imported', key}
    }

    /**
     * 导入 Key 导出文件中的数据。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {Object} importData - renderer 解析后的导出文件内容
     * @param {{replace?: boolean}} options - 导入选项
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async importKeys(connectionId, importData = {}, options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            if (importData?.format !== 'other-redis-desktop-manager.key-export' || !Array.isArray(importData.keys)) {
                return {success: false, error: tMain('redis.importFileInvalid')}
            }

            const importedKeys = []
            const skippedKeys = []
            const failedKeys = []

            for (const keyData of importData.keys) {
                try {
                    const result = await this.importSingleKeyData(connection, keyData, {
                        replace: options.replace !== false
                    })

                    if (result.status === 'imported') {
                        importedKeys.push(result.key)
                    } else {
                        skippedKeys.push({
                            key: result.key,
                            reason: result.reason || 'skipped'
                        })
                    }
                } catch (error) {
                    failedKeys.push({
                        key: keyData?.key || '',
                        error: error.message || String(error)
                    })
                }
            }

            return {
                success: true,
                data: {
                    importedKeys,
                    skippedKeys,
                    failedKeys,
                    importedCount: importedKeys.length,
                    skippedCount: skippedKeys.length,
                    failedCount: failedKeys.length,
                    requestedCount: importData.keys.length,
                    truncatedSourceCount: importData.keys.filter((item) => item.truncated).length
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.importKeysFail')}
        }
    }
}
