import {tMain} from '../utils/mainI18n.js'
import {DEFAULT_PAGE_SIZE, normalizePageCount} from './redisDataUtils.js'

// 内存分析每轮 SCAN 的建议数量，平衡扫描速度和单次命令压力。
const MEMORY_ANALYSIS_SCAN_COUNT = 1000

// 删除目录 Key 预览时每轮 SCAN 的建议数量。
const DIRECTORY_KEY_SCAN_COUNT = 1000

// 批量删除时每批 DEL 的 Key 数量，避免单条命令参数过长。
const DELETE_KEYS_BATCH_SIZE = 500

// Key 类型补全时每个 pipeline 的命令数量，避免一次提交数万条 TYPE 占用过多内存。
const KEY_TYPE_PIPELINE_BATCH_SIZE = 500

/**
 * Redis Key 查询服务。
 * 负责 Key 扫描、精确查找、类型补全、批量删除和单批内存分析。
 */
export class RedisKeyQueryService {
    /**
     * @param {{getActiveConnection: Function, executeRedisCommand: Function, executeRedisPipeline: Function}} dependencies - 连接查询和统一命令执行能力。
     */
    constructor(dependencies = {}) {
        this.getActiveConnection = dependencies.getActiveConnection
        this.executeRedisCommand = dependencies.executeRedisCommand
        this.executeRedisPipeline = dependencies.executeRedisPipeline
    }

    /**
     * 执行单轮 SCAN，并统一返回去重后的 Key 和下一游标。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @param {{cursor?:string|number,pattern?:string,count?:number,includeMatch?:boolean}} options - SCAN 参数。
     * @returns {Promise<{cursor:string,keys:string[]}>}
     */
    async scanKeyBatch(connection, options = {}) {
        const cursor = String(options.cursor ?? '0')
        const pattern = String(options.pattern || '*')
        const count = normalizePageCount(options.count)
        const scanArgs = ['SCAN', cursor]

        // MEMORY 分析在全库扫描时省略 MATCH *，普通搜索和目录扫描仍显式携带 MATCH。
        if (options.includeMatch !== false) {
            scanArgs.push('MATCH', pattern)
        }
        scanArgs.push('COUNT', count)

        const result = await this.executeRedisCommand({
            connection,
            command: 'SCAN',
            args: scanArgs.slice(1),
            source: options.source || 'key-list'
        }, () => connection.redis.call(...scanArgs))

        return {
            cursor: String(result?.[0] ?? '0'),
            keys: Array.from(new Set(result?.[1] || []))
        }
    }

    /**
     * 扫描一批 Key 名称。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string|number} cursor - Redis SCAN 游标。
     * @param {string} pattern - Redis MATCH 模式。
     * @param {number} count - 本轮建议扫描数量。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async scanKeys(connectionId, cursor = '0', pattern = '*', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const result = await this.scanKeyBatch(connection, {
                cursor,
                pattern,
                count,
                includeMatch: true,
                source: 'key-list'
            })

            return {
                success: true,
                data: {
                    cursor: result.cursor,
                    keys: result.keys,
                    hasMore: result.cursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.scanFail')}
        }
    }

    /**
     * 批量获取指定 Key 的 Redis 数据类型。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string[]} keys - 待查询类型的 Key 名称列表。
     * @returns {Promise<{success:boolean,data?:Array<{key:string,type:string}>,error?:string}>}
     */
    async getKeyTypes(connectionId, keys = []) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedKeys = Array.from(new Set(
                (Array.isArray(keys) ? keys : []).map((key) => String(key ?? ''))
            ))

            if (normalizedKeys.length === 0) {
                return {success: true, data: []}
            }

            const keyTypes = []

            // TYPE 按固定大小分批进入 pipeline，避免数万条命令一次性占用主进程内存。
            for (let index = 0; index < normalizedKeys.length; index += KEY_TYPE_PIPELINE_BATCH_SIZE) {
                const batchKeys = normalizedKeys.slice(index, index + KEY_TYPE_PIPELINE_BATCH_SIZE)
                const pipe = connection.redis.pipeline()

                for (const key of batchKeys) {
                    pipe.type(key)
                }

                const results = await this.executeRedisPipeline({
                    connection,
                    commands: batchKeys.map((key) => ({command: 'TYPE', args: [key]})),
                    source: 'key-list',
                    label: 'TYPE pipeline'
                }, () => pipe.exec())

                batchKeys.forEach((key, batchIndex) => {
                    const [typeError, type] = results[batchIndex] || []
                    keyTypes.push({
                        key,
                        type: typeError ? 'unknown' : String(type || 'unknown')
                    })
                })
            }

            return {success: true, data: keyTypes}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 按完整 Key 名精确查询 Key 及其类型。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - 待查询的完整 Key 名。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async findExactKey(connectionId, key) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedKey = String(key ?? '')
            const type = await this.executeRedisCommand({
                connection,
                command: 'TYPE',
                args: [normalizedKey],
                source: 'key-list'
            }, () => connection.redis.call('TYPE', normalizedKey))
            const normalizedType = String(type || 'none')
            const keys = normalizedType === 'none' ? [] : [{key: normalizedKey, type: normalizedType}]

            return {success: true, data: {cursor: '0', keys, hasMore: false}}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 按指定 cursor 执行一轮 SCAN MATCH。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} pattern - Redis SCAN MATCH pattern。
     * @param {{cursor?: string|number}} options - 本轮 SCAN cursor。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async scanKeysByPattern(connectionId, pattern = '*', options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedPattern = String(pattern || '*')
            const result = await this.scanKeyBatch(connection, {
                cursor: options?.cursor,
                pattern: normalizedPattern,
                count: DIRECTORY_KEY_SCAN_COUNT,
                includeMatch: true,
                source: 'directory-preview'
            })

            return {
                success: true,
                data: {
                    keys: result.keys,
                    cursor: result.cursor,
                    count: result.keys.length,
                    pattern: normalizedPattern,
                    hasMore: result.cursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.scanFail')}
        }
    }

    /**
     * 分批删除指定 Key。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string[]} keys - 待删除 Key 列表。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async deleteKeys(connectionId, keys = []) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedKeys = Array.from(new Set(
                (Array.isArray(keys) ? keys : [])
                    .map((key) => String(key || ''))
                    .filter(Boolean)
            ))
            let deletedCount = 0

            // 删除由 renderer 完成选择和确认，main 只负责限制单条 DEL 的参数规模。
            for (let index = 0; index < normalizedKeys.length; index += DELETE_KEYS_BATCH_SIZE) {
                const batchKeys = normalizedKeys.slice(index, index + DELETE_KEYS_BATCH_SIZE)
                if (batchKeys.length === 0) {
                    continue
                }

                const result = await this.executeRedisCommand({
                    connection,
                    command: 'DEL',
                    args: batchKeys,
                    source: 'batch-delete'
                }, () => connection.redis.call('DEL', ...batchKeys))
                deletedCount += Number(result) || 0
            }

            return {
                success: true,
                data: {
                    requestedCount: normalizedKeys.length,
                    deletedCount
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 分析一轮 SCAN 返回的 Key 内存占用。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {{cursor?: string|number, matchPattern?: string}} options - 游标与可选 MATCH 范围。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async analyzeKeyMemory(connectionId, options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const matchPattern = String(options?.matchPattern || '*').trim() || '*'
            const scanResult = await this.scanKeyBatch(connection, {
                cursor: options?.cursor,
                pattern: matchPattern,
                count: MEMORY_ANALYSIS_SCAN_COUNT,
                includeMatch: matchPattern !== '*',
                source: 'memory-analysis'
            })
            const rows = []
            let totalMemory = 0

            if (scanResult.keys.length > 0) {
                // 单批 Key 共用一次 pipeline；个别 MEMORY USAGE 失败时按 0 处理，不中断当前扫描。
                const pipe = connection.redis.pipeline()
                for (const key of scanResult.keys) {
                    pipe.call('MEMORY', 'USAGE', key)
                }
                const memoryResults = await this.executeRedisPipeline({
                    connection,
                    commands: scanResult.keys.map((key) => ({command: 'MEMORY', args: ['USAGE', key]})),
                    source: 'memory-analysis',
                    label: 'MEMORY USAGE pipeline'
                }, () => pipe.exec())

                scanResult.keys.forEach((key, index) => {
                    const memoryUsage = Number(memoryResults?.[index]?.[1] ?? 0) || 0
                    totalMemory += memoryUsage
                    rows.push({key, memoryUsage})
                })
            }

            // 单批先按内存倒序返回，renderer 合并各批后会再次完成全局排序。
            rows.sort((left, right) => right.memoryUsage - left.memoryUsage)

            return {
                success: true,
                data: {
                    keys: rows,
                    cursor: scanResult.cursor,
                    scannedCount: rows.length,
                    totalMemory,
                    matchPattern,
                    hasMore: scanResult.cursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }
}
