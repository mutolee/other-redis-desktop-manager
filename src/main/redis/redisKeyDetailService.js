import {tMain} from '../utils/mainI18n.js'
import {
    DEFAULT_PAGE_SIZE,
    normalizeHashScanResult,
    normalizeIndexRange,
    normalizeInfoPairs,
    normalizePageCount,
    normalizeStreamEntries
} from './redisDataUtils.js'

// String 详情首屏最多读取的字节数，避免超大 Value 打开详情时直接跨 IPC 传输完整内容。
const STRING_DETAIL_PREVIEW_MAX_BYTES = 1024 * 1024

// 主动加载完整 String 超过该阈值时，需要 renderer 明确确认后才能读取。
const STRING_FULL_VALUE_CONFIRM_BYTES = 50 * 1024 * 1024

/**
 * Redis Key 详情服务。
 * 负责各 Redis 类型的首屏读取、分页读取和 Stream 消费组查询，不管理连接生命周期。
 */
export class RedisKeyDetailService {
    /**
     * @param {{getActiveConnection: Function, executeRedisCommand: Function, executeRedisPipeline: Function}} dependencies - 连接查询和统一命令执行能力。
     */
    constructor(dependencies = {}) {
        this.getActiveConnection = dependencies.getActiveConnection
        this.executeRedisCommand = dependencies.executeRedisCommand
        this.executeRedisPipeline = dependencies.executeRedisPipeline
    }

    /**
     * 获取 Key 的首屏详情。
     * 首屏对 String 和集合类型使用不同的受限读取策略，避免大 Value 阻塞主进程。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis Key。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getKeyData(connectionId, key) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            // Header 元信息共用一次 pipeline；MEMORY USAGE 不支持或失败时保持 0，不影响 Value 展示。
            const pipe = connection.redis.pipeline()
            pipe.type(key)
            pipe.ttl(key)
            pipe.call('MEMORY', 'USAGE', key)
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'TYPE', args: [key]},
                    {command: 'TTL', args: [key]},
                    {command: 'MEMORY', args: ['USAGE', key]}
                ],
                source: 'key-detail',
                label: 'Key metadata pipeline'
            }, () => pipe.exec())
            const keyType = (results[0] && results[0][1] && results[0][1].toString()) || 'unknown'
            const ttl = (results[1] && typeof results[1][1] === 'number') ? results[1][1] : -1
            const memoryUsage = Number(results[2]?.[1] ?? 0) || 0

            let value = null
            let size = 0
            let cursor
            let valueRawBase64
            let valueTruncated = false
            let loadedBytes = 0

            if (keyType === 'string') {
                // String 首屏只读取固定字节预览，同时保留 Base64，供二进制和序列化解析器使用。
                const stringPipe = connection.redis.pipeline()
                stringPipe.strlen(key)
                stringPipe.getrangeBuffer(key, 0, STRING_DETAIL_PREVIEW_MAX_BYTES - 1)
                const stringResults = await this.executeRedisPipeline({
                    connection,
                    commands: [
                        {command: 'STRLEN', args: [key]},
                        {command: 'GETRANGE', args: [key, 0, STRING_DETAIL_PREVIEW_MAX_BYTES - 1]}
                    ],
                    source: 'key-detail',
                    label: 'String preview pipeline'
                }, () => stringPipe.exec())
                const rawValue = stringResults?.[1]?.[1] ?? Buffer.alloc(0)

                size = Number(stringResults?.[0]?.[1] ?? 0)
                value = rawValue ? rawValue.toString('utf8') : ''
                valueRawBase64 = rawValue ? rawValue.toString('base64') : ''
                loadedBytes = rawValue?.length ?? 0
                valueTruncated = loadedBytes < size
            } else if (keyType === 'hash') {
                // Hash 使用 HSCAN 首游标读取，避免打开详情时执行全量 HGETALL/HKEYS。
                const hashPipe = connection.redis.pipeline()
                hashPipe.hlen(key)
                hashPipe.hscanBuffer(key, '0', 'COUNT', DEFAULT_PAGE_SIZE)
                const hashResults = await this.executeRedisPipeline({
                    connection,
                    commands: [
                        {command: 'HLEN', args: [key]},
                        {command: 'HSCAN', args: [key, '0', 'COUNT', DEFAULT_PAGE_SIZE]}
                    ],
                    source: 'key-detail',
                    label: 'Hash preview pipeline'
                }, () => hashPipe.exec())
                const hashPage = normalizeHashScanResult(hashResults?.[1]?.[1])

                size = Number(hashResults?.[0]?.[1] ?? 0)
                cursor = hashPage.cursor
                value = hashPage.items
            } else if (keyType === 'list') {
                // List 首屏只读取第一页，后续由 renderer 分批调用 getListRange。
                size = await this.executeRedisCommand({
                    connection,
                    command: 'LLEN',
                    args: [key],
                    source: 'key-detail'
                }, () => connection.redis.llen(key))
                const stop = Math.min(size - 1, DEFAULT_PAGE_SIZE - 1)
                const items = stop >= 0
                    ? await this.executeRedisCommand({
                        connection,
                        command: 'LRANGE',
                        args: [key, 0, stop],
                        source: 'key-detail'
                    }, () => connection.redis.lrangeBuffer(key, 0, stop))
                    : []
                value = (items || []).map((item) => ({
                    value: item?.toString('utf8') ?? '',
                    valueRawBase64: item?.toString('base64') ?? ''
                }))
            } else if (keyType === 'set') {
                // Set 必须通过 SSCAN 保留游标，避免 SMEMBERS 一次性拉取超大集合。
                size = await this.executeRedisCommand({
                    connection,
                    command: 'SCARD',
                    args: [key],
                    source: 'key-detail'
                }, () => connection.redis.scard(key))
                const scanResult = size > 0
                    ? await this.executeRedisCommand({
                        connection,
                        command: 'SSCAN',
                        args: [key, '0', 'COUNT', DEFAULT_PAGE_SIZE],
                        source: 'key-detail'
                    }, () => connection.redis.sscanBuffer(key, '0', 'COUNT', DEFAULT_PAGE_SIZE))
                    : ['0', []]
                cursor = scanResult?.[0]?.toString('utf8') ?? '0'
                value = (Array.isArray(scanResult?.[1]) ? scanResult[1] : []).map((item) => ({
                    member: item?.toString('utf8') ?? '',
                    memberRawBase64: item?.toString('base64') ?? ''
                }))
            } else if (keyType === 'zset') {
                // ZSet 首屏按分数倒序读取，并按 member/score 交替 Buffer 还原为稳定对象结构。
                size = await this.executeRedisCommand({
                    connection,
                    command: 'ZCARD',
                    args: [key],
                    source: 'key-detail'
                }, () => connection.redis.zcard(key))
                const stop = Math.min(size - 1, DEFAULT_PAGE_SIZE - 1)
                const items = stop >= 0
                    ? await this.executeRedisCommand({
                        connection,
                        command: 'ZREVRANGE',
                        args: [key, 0, stop, 'WITHSCORES'],
                        source: 'key-detail'
                    }, () => connection.redis.zrevrangeBuffer(key, 0, stop, 'WITHSCORES'))
                    : []
                value = []
                for (let index = 0; index < items.length; index += 2) {
                    value.push({
                        member: items[index]?.toString('utf8') ?? '',
                        memberRawBase64: items[index]?.toString('base64') ?? '',
                        score: parseFloat(items[index + 1]?.toString('utf8')) || 0
                    })
                }
            } else if (keyType === 'stream') {
                // Stream 首屏从最新消息开始倒序读取，后续分页继续使用最后一条消息 ID。
                size = await this.executeRedisCommand({
                    connection,
                    command: 'XLEN',
                    args: [key],
                    source: 'key-detail'
                }, () => connection.redis.xlen(key))
                const streamEntries = size > 0
                    ? await this.executeRedisCommand({
                        connection,
                        command: 'XREVRANGE',
                        args: [key, '+', '-', 'COUNT', DEFAULT_PAGE_SIZE],
                        source: 'key-detail'
                    }, () => connection.redis.xrevrangeBuffer(key, '+', '-', 'COUNT', DEFAULT_PAGE_SIZE))
                    : []
                value = normalizeStreamEntries(streamEntries)
            }

            return {
                success: true,
                data: {
                    key,
                    type: keyType,
                    ttl,
                    value,
                    valueRawBase64,
                    size,
                    memoryUsage,
                    cursor,
                    valueTruncated,
                    loadedBytes
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getKeyDataFail')}
        }
    }

    /**
     * 主动读取完整 Redis String Value。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis String Key。
     * @param {{confirmed?:boolean}} options - 是否已经确认读取超大 Value。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getFullStringValue(connectionId, key, options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const size = await this.executeRedisCommand({
                connection,
                command: 'STRLEN',
                args: [key],
                source: 'key-detail'
            }, () => connection.redis.strlen(key))

            // 超过阈值时先返回确认状态，避免一次 GET 将几十 MB 数据直接跨 IPC 发送到 renderer。
            if (size >= STRING_FULL_VALUE_CONFIRM_BYTES && !options?.confirmed) {
                return {success: true, data: {key, size, confirmationRequired: true}}
            }

            const rawValue = await this.executeRedisCommand({
                connection,
                command: 'GET',
                args: [key],
                source: 'key-detail'
            }, () => connection.redis.getBuffer(key))

            if (rawValue === null) {
                return {success: false, error: tMain('redis.getKeyDataFail')}
            }

            return {
                success: true,
                data: {
                    key,
                    value: rawValue.toString('utf8'),
                    valueRawBase64: rawValue.toString('base64'),
                    size: rawValue.length,
                    loadedBytes: rawValue.length,
                    valueTruncated: false
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getKeyDataFail')}
        }
    }

    /**
     * 分段获取 Redis Hash 字段。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis Hash Key。
     * @param {string|number} cursor - HSCAN 游标。
     * @param {number} count - 本次扫描建议数量。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getHashRange(connectionId, key, cursor = '0', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedCount = normalizePageCount(count)

            // HLEN 和当前 HSCAN 页共用一次往返，使分页结果同时携带最新总长度。
            const pipe = connection.redis.pipeline()
            pipe.hlen(key)
            pipe.hscanBuffer(key, String(cursor ?? '0'), 'COUNT', normalizedCount)
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'HLEN', args: [key]},
                    {command: 'HSCAN', args: [key, String(cursor ?? '0'), 'COUNT', normalizedCount]}
                ],
                source: 'key-detail',
                label: 'Hash range pipeline'
            }, () => pipe.exec())
            const size = Number(results?.[0]?.[1] ?? 0)
            const hashPage = normalizeHashScanResult(results?.[1]?.[1])

            return {
                success: true,
                data: {
                    key,
                    cursor: hashPage.cursor,
                    items: hashPage.items,
                    size,
                    hasMore: hashPage.cursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getHashDataFail')}
        }
    }

    /**
     * 分段获取 Redis List 元素。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis List Key。
     * @param {number} start - LRANGE 起始下标。
     * @param {number} stop - LRANGE 结束下标。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getListRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const {normalizedStart, normalizedStop} = normalizeIndexRange(start, stop)

            // 总长度与当前 LRANGE 页共用 pipeline，renderer 据此计算是否还有后续数据。
            const pipe = connection.redis.pipeline()
            pipe.llen(key)
            pipe.lrangeBuffer(key, normalizedStart, normalizedStop)
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'LLEN', args: [key]},
                    {command: 'LRANGE', args: [key, normalizedStart, normalizedStop]}
                ],
                source: 'key-detail',
                label: 'List range pipeline'
            }, () => pipe.exec())
            const size = Number(results?.[0]?.[1] ?? 0)
            const rawItems = Array.isArray(results?.[1]?.[1]) ? results[1][1] : []
            const items = rawItems.map((item) => ({
                value: item?.toString('utf8') ?? '',
                valueRawBase64: item?.toString('base64') ?? ''
            }))

            return {
                success: true,
                data: {
                    key,
                    start: normalizedStart,
                    stop: normalizedStop,
                    items,
                    size,
                    hasMore: normalizedStart + items.length < size
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getListDataFail')}
        }
    }

    /**
     * 分段扫描 Redis Set 成员。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis Set Key。
     * @param {string|number} cursor - SSCAN 游标。
     * @param {number} count - 本次扫描建议数量。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getSetRange(connectionId, key, cursor = '0', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedCount = normalizePageCount(count)

            // SCARD 和 SSCAN 同批执行，游标归零表示 Set 已扫描完成。
            const pipe = connection.redis.pipeline()
            pipe.scard(key)
            pipe.sscanBuffer(key, String(cursor ?? '0'), 'COUNT', normalizedCount)
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'SCARD', args: [key]},
                    {command: 'SSCAN', args: [key, String(cursor ?? '0'), 'COUNT', normalizedCount]}
                ],
                source: 'key-detail',
                label: 'Set range pipeline'
            }, () => pipe.exec())
            const size = Number(results?.[0]?.[1] ?? 0)
            const scanResult = Array.isArray(results?.[1]?.[1]) ? results[1][1] : ['0', []]
            const nextCursor = scanResult?.[0]?.toString('utf8') ?? '0'
            const items = (Array.isArray(scanResult?.[1]) ? scanResult[1] : []).map((item) => ({
                member: item?.toString('utf8') ?? '',
                memberRawBase64: item?.toString('base64') ?? ''
            }))

            return {
                success: true,
                data: {
                    key,
                    cursor: nextCursor,
                    items,
                    size,
                    hasMore: nextCursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getSetDataFail')}
        }
    }

    /**
     * 分段获取 Redis ZSet 元素，按分数从高到低返回 member/score。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis ZSet Key。
     * @param {number} start - ZREVRANGE 起始排名下标。
     * @param {number} stop - ZREVRANGE 结束排名下标。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getZSetRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const {normalizedStart, normalizedStop} = normalizeIndexRange(start, stop)

            // ZCARD 与倒序分页共用一次 pipeline，避免分页后再额外请求总长度。
            const pipe = connection.redis.pipeline()
            pipe.zcard(key)
            pipe.zrevrangeBuffer(key, normalizedStart, normalizedStop, 'WITHSCORES')
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'ZCARD', args: [key]},
                    {command: 'ZREVRANGE', args: [key, normalizedStart, normalizedStop, 'WITHSCORES']}
                ],
                source: 'key-detail',
                label: 'ZSet range pipeline'
            }, () => pipe.exec())
            const size = Number(results?.[0]?.[1] ?? 0)
            const rawItems = Array.isArray(results?.[1]?.[1]) ? results[1][1] : []
            const items = []

            for (let index = 0; index < rawItems.length; index += 2) {
                items.push({
                    member: rawItems[index]?.toString('utf8') ?? '',
                    memberRawBase64: rawItems[index]?.toString('base64') ?? '',
                    score: parseFloat(rawItems[index + 1]?.toString('utf8')) || 0
                })
            }

            return {
                success: true,
                data: {
                    key,
                    start: normalizedStart,
                    stop: normalizedStop,
                    items,
                    size,
                    hasMore: normalizedStart + items.length < size
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getZSetDataFail')}
        }
    }

    /**
     * 分段获取 Redis Stream entries，默认按倒序读取最新消息。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis Stream Key。
     * @param {string} maxId - XREVRANGE 最大 ID。
     * @param {string} minId - XREVRANGE 最小 ID。
     * @param {number} count - 本次读取数量。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getStreamRange(connectionId, key, maxId = '+', minId = '-', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedCount = normalizePageCount(count)

            // 多读取一条只用于判断 hasMore，返回 renderer 前会去掉该额外条目。
            const pipe = connection.redis.pipeline()
            pipe.xlen(key)
            pipe.xrevrangeBuffer(key, maxId || '+', minId || '-', 'COUNT', normalizedCount + 1)
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'XLEN', args: [key]},
                    {command: 'XREVRANGE', args: [key, maxId || '+', minId || '-', 'COUNT', normalizedCount + 1]}
                ],
                source: 'key-detail',
                label: 'Stream range pipeline'
            }, () => pipe.exec())
            const size = Number(results?.[0]?.[1] ?? 0)
            const rangeEntries = normalizeStreamEntries(results?.[1]?.[1] || [])
            const hasMore = rangeEntries.length > normalizedCount

            return {
                success: true,
                data: {
                    key,
                    items: hasMore ? rangeEntries.slice(0, normalizedCount) : rangeEntries,
                    size,
                    hasMore
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getStreamDataFail')}
        }
    }

    /**
     * 获取 Redis Stream 消费组列表。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis Stream Key。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getStreamGroups(connectionId, key) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const rawGroups = await this.executeRedisCommand({
                connection,
                command: 'XINFO',
                args: ['GROUPS', key],
                source: 'key-detail'
            }, () => connection.redis.call('XINFO', 'GROUPS', key))
            const groups = (Array.isArray(rawGroups) ? rawGroups : []).map((groupInfo) => {
                const group = normalizeInfoPairs(groupInfo)
                return {
                    name: String(group.name ?? ''),
                    consumers: Number(group.consumers ?? 0),
                    pending: Number(group.pending ?? 0),
                    lastDeliveredId: String(group['last-delivered-id'] ?? ''),
                    entriesRead: group['entries-read'] ?? null,
                    lag: group.lag ?? null
                }
            })

            return {success: true, data: {key, groups}}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getStreamGroupsFail')}
        }
    }

    /**
     * 获取指定 Redis Stream 消费组下的消费者列表。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} key - Redis Stream Key。
     * @param {string} groupName - 消费组名称。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getStreamConsumers(connectionId, key, groupName) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const rawConsumers = await this.executeRedisCommand({
                connection,
                command: 'XINFO',
                args: ['CONSUMERS', key, groupName],
                source: 'key-detail'
            }, () => connection.redis.call('XINFO', 'CONSUMERS', key, groupName))
            const consumers = (Array.isArray(rawConsumers) ? rawConsumers : []).map((consumerInfo) => {
                const consumer = normalizeInfoPairs(consumerInfo)
                return {
                    name: String(consumer.name ?? ''),
                    pending: Number(consumer.pending ?? 0),
                    idle: Number(consumer.idle ?? 0),
                    inactive: consumer.inactive ?? null
                }
            })

            return {success: true, data: {key, groupName, consumers}}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getStreamConsumersFail')}
        }
    }
}
