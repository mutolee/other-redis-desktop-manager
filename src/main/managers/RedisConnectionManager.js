import Redis from 'ioredis'
import {getMainWindow} from '../windows/mainWindow.js'
import {createLogger} from '../utils/logger.js'
import {
    DEFAULT_COMMAND_TIMEOUT_MS,
    DEFAULT_DATABASE_COUNT,
    DEFAULT_PAGE_SIZE,
    normalizeConnectionId,
    normalizeDatabaseCount,
    normalizeIndexRange,
    normalizeInfoPairs,
    normalizePageCount,
    normalizeStreamEntries,
    normalizeTimeout,
    parseRedisConfigDatabases
} from '../redis/redisDataUtils.js'
import {buildRedisOptions} from '../redis/redisOptionsFactory.js'
import {RedisKeyTransferService} from '../redis/redisKeyTransferService.js'
import {tMain} from '../utils/mainI18n.js'

const log = createLogger('redis-manager')

// 内存分析最多扫描的 Key 数量，避免全库超大规模扫描长时间占用 Redis 与主进程。
const MEMORY_ANALYSIS_MAX_KEYS = 200000

// 内存分析每轮 SCAN 的建议数量，平衡扫描速度和单次命令压力。
const MEMORY_ANALYSIS_SCAN_COUNT = 1000

// 删除目录 Key 前最多预览的 Key 数量，超过后禁止删除，避免用户误删不可见范围。
const DIRECTORY_KEY_PREVIEW_MAX_KEYS = 50000

// 删除目录 Key 预览时每轮 SCAN 的建议数量。
const DIRECTORY_KEY_SCAN_COUNT = 1000

// 批量删除时每批 DEL 的 Key 数量，避免单条命令参数过长。
const DELETE_KEYS_BATCH_SIZE = 500

// 慢查询默认读取条数，打开 Drawer 时先给出适中的最近记录范围。
const SLOW_LOG_DEFAULT_COUNT = 128

// 慢查询允许读取的最大条数，避免一次性拉取过多日志影响界面。
const SLOW_LOG_MAX_COUNT = 512

/**
 * Redis 连接管理器 - 管理所有活跃的 Redis 连接
 * 支持单机模式、哨兵模式（集群模式待实现）
 * 连接状态变更通过 IPC 事件通知渲染进程
 */
class RedisConnectionManager {
    constructor() {
        this.connections = new Map()
        this.keyTransferService = new RedisKeyTransferService({
            getActiveConnection: (connectionId) => this.getActiveConnection(connectionId),
            runWithCommandTimeout: (config, task, label) => this.runWithCommandTimeout(config, task, label)
        })
    }

    /**
     * 解析连接池中真实存在的连接 ID。
     * 兼容历史上可能已经用字符串 ID 存入 Map 的连接，同时为新连接提供统一的数字 ID。
     * @param {string|number} connectionId - 渲染进程传入的连接 ID。
     * @returns {string|number} 连接池中可用于查询或写入的 ID。
     */
    resolveConnectionId(connectionId) {
        const normalizedConnectionId = normalizeConnectionId(connectionId)

        // 优先命中规范化后的 ID，兼容当前推荐的连接池存储方式。
        if (this.connections.has(normalizedConnectionId)) {
            return normalizedConnectionId
        }

        // 兜底兼容旧连接：如果 Map 里曾经以原始字符串保存，也不要让调用方查不到。
        if (this.connections.has(connectionId)) {
            return connectionId
        }

        return normalizedConnectionId
    }

    /**
     * 获取连接池中的连接条目。
     * @param {string|number} connectionId - 渲染进程传入的连接 ID。
     * @returns {{managedConnectionId:string|number, connection:Object|null}} 解析后的连接 ID 与连接对象。
     */
    getConnectionEntry(connectionId) {
        const managedConnectionId = this.resolveConnectionId(connectionId)

        return {
            managedConnectionId,
            connection: this.connections.get(managedConnectionId) || null
        }
    }

    /**
     * 读取连接配置中的命令超时。
     * @param {Object} config - 连接配置。
     * @returns {number} Redis 命令执行超时毫秒值。
     */
    getCommandTimeout(config = {}) {
        return normalizeTimeout(config.commandTimeout, DEFAULT_COMMAND_TIMEOUT_MS)
    }

    /**
     * 为 Redis 命令统一增加超时控制，避免单次调用长时间悬挂。
     * @param {Object} config - 连接配置或运行时配置。
     * @param {Function} task - 实际执行 Redis 命令的异步函数。
     * @param {string} label - 当前超时控制对应的命令名称。
     * @returns {Promise<*>} 实际命令执行结果。
     */
    async runWithCommandTimeout(config, task, label = 'Redis') {
        const commandTimeout = this.getCommandTimeout(config)
        let timer = null

        try {
            return await Promise.race([
                task(),
                new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        reject(new Error(tMain('redis.commandTimeout', {label, timeout: commandTimeout})))
                    }, commandTimeout)
                })
            ])
        } finally {
            if (timer) {
                clearTimeout(timer)
            }
        }
    }

    /**
     * 测试连接
     * 创建临时连接 → DBSIZE 验证数据命令可用与鉴权 → 返回延迟
     * @param {Object} config - 连接配置
     * @returns {Promise<{success:boolean, message?:string, latency?:number, error?:string}>}
     */
    async testConnection(config) {
        const startTime = Date.now()
        const redisOpts = buildRedisOptions(config)
        // 测试连接：不自动连接、不重试
        redisOpts.lazyConnect = true
        redisOpts.maxRetriesPerRequest = 0
        redisOpts.retryStrategy = () => false
        redisOpts.sentinelRetryStrategy = () => false
        const redis = new Redis(redisOpts)
        let connErr = null
        // 监听 error 事件获取原始错误信息（connect() 抛出的错误可能更泛化）
        redis.on('error', (err) => {
            connErr = err
        })
        try {
            await redis.connect()
            // 哨兵模式下 ioredis 会先通过 Sentinel 发现 Redis 数据节点，DBSIZE 实际在数据节点上执行。
            // 如果普通模式误连到 Sentinel 端口，或数据节点密码不正确，DBSIZE 会失败并给出真实错误。
            await this.runWithCommandTimeout(config, () => redis.call('DBSIZE'), 'DBSIZE')
            const latency = Date.now() - startTime
            await redis.quit()
            return {success: true, message: tMain('redis.connectSuccess'), latency}
        } catch (error) {
            try {
                await redis.quit()
            } catch (e) { /* ignore */
            }
            return {success: false, error: (connErr && connErr.message) || error.message || tMain('redis.connectFail')}
        }
    }

    /**
     * 创建持久 Redis 连接（不重试，连接失败直接报错）
     * 通过 IPC 事件将连接状态实时通知渲染进程
     * @param {string|number} connectionId - 连接配置 ID
     * @param {Object} config - 连接配置
     */
    async createConnection(connectionId, config) {
        const managedConnectionId = this.resolveConnectionId(connectionId)

        try {
            // 如已有连接则先清理旧连接
            const existing = this.connections.get(managedConnectionId)
            if (existing && existing.redis) {
                // 先移除监听再 quit，防止回调污染已删除的连接
                existing.redis.removeAllListeners()
                try {
                    await existing.redis.quit()
                } catch (e) { /* ignore */
                }
            }

            // 通知前端进入连接中状态
            this.updateConnectionStatus(managedConnectionId, 'connecting', tMain('redis.connecting'))

            const redisOpts = buildRedisOptions(config)
            redisOpts.maxRetriesPerRequest = 0
            redisOpts.retryStrategy = () => false
            redisOpts.sentinelRetryStrategy = () => false
            const redis = new Redis(redisOpts)

            // 存入 Map 后才注册事件监听，避免时序问题
            const connObj = {id: managedConnectionId, config, redis, status: 'connecting', connectedAt: null, lastStatusChange: new Date().toISOString()}
            this.connections.set(managedConnectionId, connObj)

            // ioredis 事件 → 更新状态 → IPC 通知渲染进程
            redis.on('connect', () => {
                this.updateConnectionStatus(managedConnectionId, 'connecting', tMain('redis.tcpConnected'))
            })
            redis.on('ready', () => {
                const conn = this.connections.get(managedConnectionId)
                if (conn) {
                    conn.connectedAt = new Date().toISOString()
                }
                this.updateConnectionStatus(managedConnectionId, 'connected', tMain('redis.connectSuccess'))
            })
            redis.on('error', (error) => {
                this.updateConnectionStatus(managedConnectionId, 'error', tMain('redis.connectionError'), error)
            })
            redis.on('close', () => {
                this.updateConnectionStatus(managedConnectionId, 'disconnected', tMain('redis.connectionClosed'))
            })
            redis.on('end', () => {
                this.updateConnectionStatus(managedConnectionId, 'disconnected', tMain('redis.connectionEnded'))
            })
            redis.on('reconnecting', (delay) => {
                this.updateConnectionStatus(managedConnectionId, 'reconnecting', tMain('redis.reconnecting', {delay}))
            })

        } catch (error) {
            log.error('创建 Redis 连接失败', error)
            this.updateConnectionStatus(managedConnectionId, 'error', tMain('redis.connectFail'), error)
        }
    }

    /**
     * 关闭指定连接
     * 移除事件监听 → 优雅 quit → 从 Map 中删除 → 通知状态变更
     * @param {string|number} connectionId
     * @returns {Promise<{success:boolean, message?:string, error?:string}>}
     */
    async closeConnection(connectionId) {
        const {managedConnectionId, connection} = this.getConnectionEntry(connectionId)

        try {
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissing')}
            }
            // 先移除监听再 quit，防止 quit 过程中的事件导致状态错乱
            if (connection.redis) {
                connection.redis.removeAllListeners()
                try {
                    await connection.redis.quit()
                } catch (e) { /* ignore */
                }
            }
            // 从管理器中移除后通知状态变更
            this.connections.delete(managedConnectionId)
            this.updateConnectionStatus(managedConnectionId, 'disconnected', tMain('redis.connectionClosed'))
            return {success: true, message: tMain('redis.connectionClosed')}
        } catch (error) {
            this.updateConnectionStatus(managedConnectionId, 'error', tMain('redis.closeConnectionFail'), error)
            return {success: false, error: error.message || tMain('redis.closeConnectionFail')}
        }
    }

    /**
     * 关闭当前管理器中的全部 Redis 连接。
     * 应用于应用退出、主进程资源回收等场景，避免 Electron 进程继续持有 Redis socket。
     * @returns {Promise<void>}
     */
    async closeAllConnections() {
        const connectionIds = Array.from(this.connections.keys())

        // 逐个复用已有的单连接关闭逻辑，保证监听移除、quit 和状态清理行为一致。
        for (const connectionId of connectionIds) {
            try {
                await this.closeConnection(connectionId)
            } catch (error) {
                log.error(`关闭 Redis 连接失败: ${connectionId}`, error)
            }
        }
    }

    /**
     * 关闭当前管理器持有的全部 Redis 连接。
     * 提供给主进程生命周期直接调用，语义上明确表达“关闭 Redis 连接池”。
     * @returns {Promise<void>}
     */
    async closeAllRedisConnections() {
        await this.closeAllConnections()
    }

    /**
     * 执行 Redis 命令
     * @param {string|number} connectionId
     * @param {string} command - Redis 命令（如 GET, SET, KEYS）
     * @param {Array} [args=[]] - 命令参数
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async executeCommand(connectionId, command, args = []) {
        const {managedConnectionId, connection} = this.getConnectionEntry(connectionId)

        try {
            if (!connection) {
                return {success: false, error: tMain('redis.connectionRequired')}
            }
            // 非 connected 状态不允许执行命令
            if (connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionStatusInvalid', {value: connection.status})}
            }
            const startedAt = Date.now()
            // 通过 ioredis.call 发送任意 Redis 命令
            const result = await this.runWithCommandTimeout(
                connection.config,
                () => connection.redis.call(command, ...args),
                String(command || 'Redis').toUpperCase()
            )

            // 命令行执行 SELECT 后，需要同步更新当前连接上下文中的 db_index。
            if (String(command || '').toUpperCase() === 'SELECT') {
                const nextDbIndex = Number(args[0])
                if (Number.isInteger(nextDbIndex) && nextDbIndex >= 0) {
                    connection.config.db_index = nextDbIndex
                }
            }

            return {
                success: true,
                data: {
                    command,
                    args,
                    result,
                    durationMs: Date.now() - startedAt,
                    timestamp: new Date().toISOString()
                }
            }
        } catch (error) {
            // 识别连接断开类错误并主动更新状态
            const connErr = error.message && (
                error.message.includes('Connection') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('ENOTFOUND')
            )
            if (connErr) {
                this.updateConnectionStatus(managedConnectionId, 'disconnected', tMain('redis.connectionDisconnected'), error)
            }
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 获取当前连接对象。
     * 渲染进程传入的 tabId 可能是字符串，而连接池中的 key 可能是数字，这里统一做兼容查找。
     * @param {string|number} connectionId - 连接 ID 或页面 tabId
     * @returns {Object|null} 当前连接对象
     */
    getActiveConnection(connectionId) {
        const {connection} = this.getConnectionEntry(connectionId)

        if (!connection || connection.status !== 'connected') {
            return null
        }

        return connection
    }

    /**
     * 切换数据库（SELECT）
     * @param {string|number} connectionId
     * @param {number} dbIndex - 数据库索引 0-15
     * @returns {Promise<{success:boolean, message?:string, error?:string}>}
     */
    async selectDatabase(connectionId, dbIndex) {
        try {
            const {connection} = this.getConnectionEntry(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissing')}
            }
            // 执行 SELECT 命令并更新本地缓存的 db_index
            await this.runWithCommandTimeout(connection.config, () => connection.redis.select(dbIndex), 'SELECT')
            connection.config.db_index = dbIndex
            return {success: true, message: tMain('redis.databaseSelected', {value: dbIndex})}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.selectDatabaseFail')}
        }
    }

    /**
     * SCAN 扫描 key 列表（带类型）
     */
    async scanKeys(connectionId, cursor = '0', pattern = '*', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }
            const normalizedCount = normalizePageCount(count)
            const normalizedPattern = String(pattern || '*')
            const shouldFillSearchPage = normalizedPattern !== '*'
            let nextCursor = String(cursor ?? '0')
            const keySet = new Set()

            do {
                // 搜索模式下需要连续推进游标，直到攒够一页命中结果；否则第一批未命中会让前端误以为没有数据。
                const result = await this.runWithCommandTimeout(
                    connection.config,
                    () => connection.redis.call('SCAN', nextCursor, 'MATCH', normalizedPattern, 'COUNT', normalizedCount),
                    'SCAN'
                )
                nextCursor = String(result[0])

                for (const key of result[1] || []) {
                    keySet.add(key)
                }
            } while (shouldFillSearchPage && nextCursor !== '0' && keySet.size < normalizedCount)

            const keys = Array.from(keySet)
            const keyList = []
            if (keys.length > 0) {
                // 批量 pipeline 获取类型，避免逐个 type 调用增加网络开销
                const pipe = connection.redis.pipeline()
                for (const k of keys) pipe.type(k)
                const types = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'TYPE管道')
                for (let i = 0; i < keys.length; i += 1) {
                    keyList.push({key: keys[i], type: (types[i] && types[i][1]) || 'unknown'})
                }
            }
            // cursor === '0' 表示扫描完成
            return {success: true, data: {cursor: nextCursor, keys: keyList, hasMore: nextCursor !== '0'}}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.scanFail')}
        }
    }

    /**
     * 按 SCAN MATCH 完整预览一组 Key。
     * 主要用于危险操作前的确认列表，例如删除目录下全部 Key。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} pattern - Redis SCAN MATCH pattern
     * @param {{maxKeys?: number}} options - 预览上限，避免超大目录把 renderer 压垮
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async scanKeysByPattern(connectionId, pattern = '*', options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedPattern = String(pattern || '*')
            const maxKeys = Math.min(
                Math.max(Number(options?.maxKeys) || DIRECTORY_KEY_PREVIEW_MAX_KEYS, 1),
                DIRECTORY_KEY_PREVIEW_MAX_KEYS
            )
            const keySet = new Set()
            let cursor = '0'

            do {
                const result = await this.runWithCommandTimeout(
                    connection.config,
                    () => connection.redis.call('SCAN', cursor, 'MATCH', normalizedPattern, 'COUNT', DIRECTORY_KEY_SCAN_COUNT),
                    'SCAN'
                )
                cursor = String(result?.[0] ?? '0')

                for (const key of result?.[1] || []) {
                    if (keySet.size >= maxKeys) {
                        break
                    }

                    keySet.add(key)
                }
            } while (cursor !== '0' && keySet.size < maxKeys)

            const keys = Array.from(keySet).sort((left, right) => left.localeCompare(right))

            return {
                success: true,
                data: {
                    keys,
                    count: keys.length,
                    maxKeys,
                    pattern: normalizedPattern,
                    hasMore: cursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.scanFail')}
        }
    }

    /**
     * 批量删除指定 Key。
     * 删除目录前由 renderer 传入已经预览并确认过的 Key 列表，main 负责分批 DEL，避免单条命令参数过长。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string[]} keys - 待删除 Key 列表
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async deleteKeys(connectionId, keys = []) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedKeys = Array.from(new Set(
                (Array.isArray(keys) ? keys : [])
                    .map((key) => String(key || ''))
                    .filter(Boolean)
            ))
            let deletedCount = 0

            for (let index = 0; index < normalizedKeys.length; index += DELETE_KEYS_BATCH_SIZE) {
                const batchKeys = normalizedKeys.slice(index, index + DELETE_KEYS_BATCH_SIZE)
                if (batchKeys.length === 0) {
                    continue
                }

                const result = await this.runWithCommandTimeout(
                    connection.config,
                    () => connection.redis.call('DEL', ...batchKeys),
                    'DEL'
                )
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
     * 分析当前 DB 中 Key 的 Redis 内存占用。
     * 通过 SCAN 分批遍历 Key，再用 pipeline 执行 MEMORY USAGE，避免 renderer 发起大量 IPC。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {{maxKeys?: number, matchPattern?: string}} options - 分析上限与可选 SCAN MATCH 范围。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async analyzeKeyMemory(connectionId, options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const maxKeys = Math.min(
                Math.max(Number(options?.maxKeys) || MEMORY_ANALYSIS_MAX_KEYS, 1),
                MEMORY_ANALYSIS_MAX_KEYS
            )
            const matchPattern = String(options?.matchPattern || '*').trim() || '*'
            const rows = []
            const seenKeys = new Set()
            let cursor = '0'
            let totalMemory = 0

            do {
                const scanArgs = matchPattern === '*'
                    ? ['SCAN', cursor, 'COUNT', MEMORY_ANALYSIS_SCAN_COUNT]
                    : ['SCAN', cursor, 'MATCH', matchPattern, 'COUNT', MEMORY_ANALYSIS_SCAN_COUNT]
                const scanResult = await this.runWithCommandTimeout(
                    connection.config,
                    () => connection.redis.call(...scanArgs),
                    'SCAN'
                )
                cursor = String(scanResult?.[0] ?? '0')

                const batchKeys = []
                for (const key of scanResult?.[1] || []) {
                    if (seenKeys.has(key) || seenKeys.size >= maxKeys) {
                        continue
                    }

                    seenKeys.add(key)
                    batchKeys.push(key)
                }

                if (batchKeys.length > 0) {
                    // MEMORY USAGE 可能因 Redis 版本或模块类型返回错误，单个 Key 失败时按 0 处理，不中断整批分析。
                    const pipe = connection.redis.pipeline()
                    for (const key of batchKeys) {
                        pipe.call('MEMORY', 'USAGE', key)
                    }
                    const memoryResults = await this.runWithCommandTimeout(
                        connection.config,
                        () => pipe.exec(),
                        'MEMORY USAGE'
                    )

                    batchKeys.forEach((key, index) => {
                        const memoryUsage = Number(memoryResults?.[index]?.[1] ?? 0) || 0
                        totalMemory += memoryUsage
                        rows.push({
                            key,
                            memoryUsage
                        })
                    })
                }
            } while (cursor !== '0' && seenKeys.size < maxKeys)

            rows.sort((left, right) => right.memoryUsage - left.memoryUsage)

            return {
                success: true,
                data: {
                    keys: rows,
                    scannedCount: seenKeys.size,
                    totalMemory,
                    maxKeys,
                    matchPattern,
                    hasMore: cursor !== '0'
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 读取 Redis 实例级慢查询日志。
     * SLOWLOG 是 Redis 实例级能力，不按 DB 隔离；CONFIG GET 可能因权限限制失败，失败时仅返回空配置。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {{count?: number}} options - 慢日志读取数量
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getSlowLog(connectionId, options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const count = Math.min(
                Math.max(Number(options?.count) || SLOW_LOG_DEFAULT_COUNT, 1),
                SLOW_LOG_MAX_COUNT
            )

            const pipe = connection.redis.pipeline()
            pipe.call('SLOWLOG', 'LEN')
            pipe.call('SLOWLOG', 'GET', count)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'SLOWLOG')
            const total = Number(results?.[0]?.[1] ?? 0) || 0
            const rawItems = Array.isArray(results?.[1]?.[1]) ? results[1][1] : []

            const items = rawItems.map((entry) => {
                const commandParts = Array.isArray(entry?.[3]) ? entry[3].map((part) => String(part)) : []

                return {
                    id: Number(entry?.[0] ?? 0),
                    timestamp: Number(entry?.[1] ?? 0),
                    durationMicroseconds: Number(entry?.[2] ?? 0) || 0,
                    command: commandParts.join(' '),
                    commandParts,
                    clientAddress: String(entry?.[4] ?? ''),
                    clientName: String(entry?.[5] ?? '')
                }
            })

            const config = {
                slowerThan: null,
                maxLen: null
            }

            try {
                const configPipe = connection.redis.pipeline()
                configPipe.call('CONFIG', 'GET', 'slowlog-log-slower-than')
                configPipe.call('CONFIG', 'GET', 'slowlog-max-len')
                const configResults = await this.runWithCommandTimeout(connection.config, () => configPipe.exec(), 'CONFIG GET slowlog')
                const parseConfigNumber = (result) => {
                    if (!Array.isArray(result)) {
                        return null
                    }

                    const value = Number(result[1])

                    return Number.isFinite(value) ? value : null
                }

                config.slowerThan = parseConfigNumber(configResults?.[0]?.[1])
                config.maxLen = parseConfigNumber(configResults?.[1]?.[1])
            } catch (error) {
                log.warn(`读取 Redis 慢查询配置失败: ${error.message || error}`)
            }

            return {
                success: true,
                data: {
                    total,
                    count,
                    items,
                    config
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 清空 Redis 实例级慢查询日志。
     * @param {string|number} connectionId - 当前连接 ID
     * @returns {Promise<{success:boolean,message?:string,error?:string}>}
     */
    async resetSlowLog(connectionId) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            await this.runWithCommandTimeout(
                connection.config,
                () => connection.redis.call('SLOWLOG', 'RESET'),
                'SLOWLOG RESET'
            )

            return {success: true, message: 'OK'}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }

    /**
     * 获取 key 的完整信息（类型、TTL、值）
     */
    async getKeyData(connectionId, key) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }
            // 批量获取类型、TTL 和 Redis 估算的 Key 内存占用，减少详情 Header 的额外往返。
            const pipe = connection.redis.pipeline()
            pipe.type(key)
            pipe.ttl(key)
            pipe.call('MEMORY', 'USAGE', key)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'Key信息管道')
            const keyType = (results[0] && results[0][1] && results[0][1].toString()) || 'unknown'
            const ttl = (results[1] && typeof results[1][1] === 'number') ? results[1][1] : -1
            const memoryUsage = Number(results[2]?.[1] ?? 0) || 0
            // 根据类型获取值
            let value = null, size = 0, cursor = undefined, valueRawBase64 = undefined
            if (keyType === 'string') {
                const rawValue = await this.runWithCommandTimeout(connection.config, () => connection.redis.getBuffer(key), 'GETBUFFER')
                const v = rawValue ? rawValue.toString('utf8') : ''
                value = typeof v === 'string' ? v : ''
                valueRawBase64 = rawValue ? rawValue.toString('base64') : ''
                size = rawValue ? rawValue.length : 0
            } else if (keyType === 'hash') {
                // Hash 的 HSCAN COUNT 只是建议值，详情页首屏改用 HKEYS + HMGET 做严格 100 条分页。
                size = await this.runWithCommandTimeout(connection.config, () => connection.redis.hlen(key), 'HLEN')
                const fields = await this.runWithCommandTimeout(connection.config, () => connection.redis.hkeys(key), 'HKEYS')
                const pageFields = Array.isArray(fields) ? fields.slice(0, Math.min(size, DEFAULT_PAGE_SIZE)) : []
                const values = pageFields.length > 0
                    ? await this.runWithCommandTimeout(connection.config, () => connection.redis.hmgetBuffer(key, ...pageFields), 'HMGET')
                    : []
                value = pageFields.map((field, index) => ({
                    field,
                    value: values[index]?.toString('utf8') ?? '',
                    valueRawBase64: values[index]?.toString('base64') ?? ''
                }))
            } else if (keyType === 'list') {
                // List 可能非常大，详情页首屏只加载第一段，后续由加载更多/加载全部继续拉取。
                size = await this.runWithCommandTimeout(connection.config, () => connection.redis.llen(key), 'LLEN')
                const stop = Math.min(size - 1, DEFAULT_PAGE_SIZE - 1)
                const v = stop >= 0
                    ? await this.runWithCommandTimeout(connection.config, () => connection.redis.lrangeBuffer(key, 0, stop), 'LRANGE')
                    : []
                value = (v || []).map((item) => ({
                    value: item?.toString('utf8') ?? '',
                    valueRawBase64: item?.toString('base64') ?? ''
                }))
            } else if (keyType === 'set') {
                // Set 可能非常大，首屏只通过 SSCAN 拉取第一段，避免 SMEMBERS 一次性阻塞主进程和渲染进程。
                size = await this.runWithCommandTimeout(connection.config, () => connection.redis.scard(key), 'SCARD')
                const scanResult = size > 0
                    ? await this.runWithCommandTimeout(connection.config, () => connection.redis.sscanBuffer(key, '0', 'COUNT', DEFAULT_PAGE_SIZE), 'SSCAN')
                    : ['0', []]
                cursor = scanResult?.[0]?.toString('utf8') ?? '0'
                value = (Array.isArray(scanResult?.[1]) ? scanResult[1] : []).map((item) => ({
                    member: item?.toString('utf8') ?? '',
                    memberRawBase64: item?.toString('base64') ?? ''
                }))
            } else if (keyType === 'zset') {
                // ZSet 可能用于排行榜等大数据集合，首屏只按分数倒序加载第一段。
                size = await this.runWithCommandTimeout(connection.config, () => connection.redis.zcard(key), 'ZCARD')
                const stop = Math.min(size - 1, DEFAULT_PAGE_SIZE - 1)
                const v = stop >= 0
                    ? await this.runWithCommandTimeout(
                        connection.config,
                        () => connection.redis.zrevrangeBuffer(key, 0, stop, 'WITHSCORES'),
                        'ZREVRANGE'
                    )
                    : []
                value = []
                for (let i = 0; i < v.length; i += 2) {
                    value.push({
                        member: v[i]?.toString('utf8') ?? '',
                        memberRawBase64: v[i]?.toString('base64') ?? '',
                        score: parseFloat(v[i + 1]?.toString('utf8')) || 0
                    })
                }
            } else if (keyType === 'stream') {
                // Stream 可能持续增长，详情页首屏默认按最新消息倒序加载第一段。
                size = await this.runWithCommandTimeout(connection.config, () => connection.redis.xlen(key), 'XLEN')
                const streamEntries = size > 0
                    ? await this.runWithCommandTimeout(
                        connection.config,
                        () => connection.redis.xrevrangeBuffer(key, '+', '-', 'COUNT', DEFAULT_PAGE_SIZE),
                        'XREVRANGE'
                    )
                    : []
                value = normalizeStreamEntries(streamEntries)
            }
            return {success: true, data: {key, type: keyType, ttl, value, valueRawBase64, size, memoryUsage, cursor}}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getKeyDataFail')}
        }
    }

    /**
     * 批量导出选中的 Key 数据。
     * 具体读取和序列化逻辑委托给 RedisKeyTransferService，连接管理器只保留对外入口。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string[]} keys - 需要导出的 Key 列表
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async exportKeys(connectionId, keys = []) {
        return this.keyTransferService.exportKeys(connectionId, keys)
    }

    /**
     * 导入 Key 导出文件中的数据。
     * 具体类型恢复和批量写入逻辑委托给 RedisKeyTransferService。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {Object} importData - renderer 解析后的导出文件内容
     * @param {{replace?: boolean}} options - 导入选项
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async importKeys(connectionId, importData = {}, options = {}) {
        return this.keyTransferService.importKeys(connectionId, importData, options)
    }

    /**
     * 分段获取 Redis Hash 字段。
     * 用于右侧 Hash 详情页的“加载更多/加载全部”，按 start/stop 严格控制本次返回数量。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Hash Key
     * @param {number} start - 字段列表起始下标
     * @param {number} stop - 字段列表结束下标
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getHashRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const {normalizedStart, normalizedStop} = normalizeIndexRange(start, stop)

            // HSCAN 的 COUNT 不是严格分页大小，这里先取字段列表，再按范围切片保证 UI 分页稳定。
            const fields = await this.runWithCommandTimeout(connection.config, () => connection.redis.hkeys(key), 'HKEYS')
            const safeFields = Array.isArray(fields) ? fields : []
            const pageFields = safeFields.slice(normalizedStart, normalizedStop + 1)
            const values = pageFields.length > 0
                ? await this.runWithCommandTimeout(connection.config, () => connection.redis.hmgetBuffer(key, ...pageFields), 'HMGET')
                : []
            const items = []

            // ioredis hmgetBuffer 返回值顺序和 pageFields 一致，同时保留 UTF-8 文本和解析器需要的原始字节。
            for (let i = 0; i < pageFields.length; i += 1) {
                items.push({
                    field: pageFields[i],
                    value: values[i]?.toString('utf8') ?? '',
                    valueRawBase64: values[i]?.toString('base64') ?? ''
                })
            }

            return {
                success: true,
                data: {
                    key,
                    start: normalizedStart,
                    stop: normalizedStop,
                    items,
                    size: safeFields.length,
                    hasMore: normalizedStart + items.length < safeFields.length
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getHashDataFail')}
        }
    }

    /**
     * 分段获取 Redis List 元素。
     * 用于右侧 List 详情页的“加载更多/加载全部”，避免首屏一次性拉取超大 List。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis List Key
     * @param {number} start - LRANGE 起始下标
     * @param {number} stop - LRANGE 结束下标
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getListRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const {normalizedStart, normalizedStop} = normalizeIndexRange(start, stop)

            // 先读取总长度，再按请求范围读取元素，前端据此判断是否还有后续数据。
            const pipe = connection.redis.pipeline()
            pipe.llen(key)
            pipe.lrangeBuffer(key, normalizedStart, normalizedStop)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'List分页管道')

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
     * 用于右侧 Set 详情页的“加载更多/加载全部”，避免 SMEMBERS 一次性拉取超大 Set。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Set Key
     * @param {string|number} cursor - SSCAN 游标
     * @param {number} count - 本次扫描建议数量
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getSetRange(connectionId, key, cursor = '0', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedCursor = String(cursor ?? '0')
            const normalizedCount = normalizePageCount(count)

            // SSCAN 的 COUNT 是建议值，不保证严格条数；前端通过 cursor 是否为 0 判断是否还有后续。
            const pipe = connection.redis.pipeline()
            pipe.scard(key)
            pipe.sscanBuffer(key, normalizedCursor, 'COUNT', normalizedCount)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'Set分页扫描管道')

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
     * 分段获取 Redis ZSet 元素。
     * 用于右侧 ZSet 详情页的“加载更多/加载全部”，按分数从高到低返回 member/score。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis ZSet Key
     * @param {number} start - ZREVRANGE 起始排名下标
     * @param {number} stop - ZREVRANGE 结束排名下标
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getZSetRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const {normalizedStart, normalizedStop} = normalizeIndexRange(start, stop)

            // 先读取总长度，再按分数倒序读取当前页，前端据此判断是否还有后续数据。
            const pipe = connection.redis.pipeline()
            pipe.zcard(key)
            pipe.zrevrangeBuffer(key, normalizedStart, normalizedStop, 'WITHSCORES')
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'ZSet分页管道')

            const size = Number(results?.[0]?.[1] ?? 0)
            const rawItems = Array.isArray(results?.[1]?.[1]) ? results[1][1] : []
            const items = []

            // ioredis zrevrangeBuffer 返回 member/score 交替 Buffer，Member 保留原始字节供解析器使用。
            for (let i = 0; i < rawItems.length; i += 2) {
                items.push({
                    member: rawItems[i]?.toString('utf8') ?? '',
                    memberRawBase64: rawItems[i]?.toString('base64') ?? '',
                    score: parseFloat(rawItems[i + 1]?.toString('utf8')) || 0
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
     * 分段获取 Redis Stream entries。
     * 默认按倒序读取最新消息，加载更多时传入上一页最后一条 ID 作为 maxId。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Stream Key
     * @param {string} maxId - XREVRANGE 最大 ID
     * @param {string} minId - XREVRANGE 最小 ID
     * @param {number} count - 本次读取数量
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getStreamRange(connectionId, key, maxId = '+', minId = '-', count = DEFAULT_PAGE_SIZE) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const normalizedCount = normalizePageCount(count)

            // 先读总长度，再按 ID 范围倒序读取当前页，前端据此判断是否还有更多。
            const pipe = connection.redis.pipeline()
            pipe.xlen(key)
            pipe.xrevrangeBuffer(key, maxId || '+', minId || '-', 'COUNT', normalizedCount)
            const results = await this.runWithCommandTimeout(connection.config, () => pipe.exec(), 'Stream分页管道')

            const size = Number(results?.[0]?.[1] ?? 0)
            const entries = normalizeStreamEntries(results?.[1]?.[1] || [])

            return {
                success: true,
                data: {
                    key,
                    items: entries,
                    size,
                    hasMore: entries.length === normalizedCount && entries.length < size
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getStreamDataFail')}
        }
    }

    /**
     * 获取 Redis Stream 消费组列表。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Stream Key
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getStreamGroups(connectionId, key) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const rawGroups = await this.runWithCommandTimeout(
                connection.config,
                () => connection.redis.call('XINFO', 'GROUPS', key),
                'XINFO GROUPS'
            )
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
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Stream Key
     * @param {string} groupName - 消费组名称
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getStreamConsumers(connectionId, key, groupName) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const rawConsumers = await this.runWithCommandTimeout(
                connection.config,
                () => connection.redis.call('XINFO', 'CONSUMERS', key, groupName),
                'XINFO CONSUMERS'
            )
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

    /**
     * 获取 Redis 服务器信息（INFO 命令）。
     * 用于页面 Header 展示连接数、CPU、内存、当前数据库 Key 数等运行指标。
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getServerInfo(connectionId) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection || connection.status !== 'connected') {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            let databaseCount = DEFAULT_DATABASE_COUNT
            let databaseCountFromConfig = false

            try {
                // CONFIG GET databases 能读取 Redis 实际配置的逻辑库数量；权限受限时允许后续 INFO 兜底。
                const configDatabases = await this.runWithCommandTimeout(
                    connection.config,
                    () => connection.redis.call('CONFIG', 'GET', 'databases'),
                    'CONFIG GET databases'
                )
                databaseCount = parseRedisConfigDatabases(configDatabases, DEFAULT_DATABASE_COUNT)
                databaseCountFromConfig = true
            } catch (error) {
                log.warn(`读取 Redis 数据库数量失败，使用默认 DB 列表: ${error.message || error}`)
            }

            const infoRaw = await this.runWithCommandTimeout(connection.config, () => connection.redis.call('INFO', 'ALL'), 'INFO')
            if (typeof infoRaw !== 'string') {
                return {success: false, error: tMain('redis.infoFormatInvalid')}
            }
            const data = {
                databaseCount,
                connectedClients: 0,
                cpuUsage: 0,
                usedMemory: 0,
                usedMemoryHuman: '0',
                totalKeys: 0,
                rows: [],
                sections: [],
                summary: {
                    server: {},
                    clients: {},
                    memory: {},
                    persistence: {},
                    stats: {},
                    replication: {},
                    cpu: {},
                    cluster: {},
                    keyspace: []
                }
            }
            // 当前选中的数据库索引
            const currentDb = connection.config.db_index ?? 0
            let uptime = 0, cpuSys = 0, cpuUser = 0
            let maxKeyspaceDb = currentDb
            const now = Date.now() / 1000  // 当前时间（秒）
            let currentSection = 'General'
            const sectionMap = new Map()

            /**
             * 将 INFO 解析出的字段写入行列表和分区索引。
             * @param {string} section - INFO 当前 section。
             * @param {string} key - INFO 字段名。
             * @param {string} value - INFO 字段值。
             */
            const appendInfoRow = (section, key, value) => {
                const row = {section, key, value}
                data.rows.push(row)

                if (!sectionMap.has(section)) {
                    sectionMap.set(section, {name: section, rows: []})
                }
                sectionMap.get(section).rows.push(row)
            }

            /**
             * 按 INFO section 收集核心摘要字段，供 Drawer 顶部卡片和图表使用。
             * @param {string} section - INFO section。
             * @param {string} key - INFO 字段名。
             * @param {string} value - INFO 字段值。
             */
            const appendSummaryField = (section, key, value) => {
                const sectionKey = String(section || '').toLowerCase()
                if (Object.prototype.hasOwnProperty.call(data.summary, sectionKey) && sectionKey !== 'keyspace') {
                    data.summary[sectionKey][key] = value
                }
            }

            // 逐行解析 INFO ALL 输出
            for (const line of infoRaw.split('\n')) {
                const t = line.trim()
                if (!t) {
                    continue
                }

                // INFO 用 "# SectionName" 分隔内容，后续字段都归入当前 section。
                if (t.startsWith('#')) {
                    currentSection = t.replace(/^#\s*/, '') || 'General'
                    continue
                }

                const separatorIndex = t.indexOf(':')
                if (separatorIndex <= 0) {
                    continue
                }

                const key = t.slice(0, separatorIndex)
                const value = t.slice(separatorIndex + 1)
                appendInfoRow(currentSection, key, value)
                appendSummaryField(currentSection, key, value)

                // 当前客户端连接数
                if (t.startsWith('connected_clients:')) data.connectedClients = parseInt(t.split(':')[1], 10) || 0
                // CPU 使用率（原始值为秒数，转为百分比）
                else if (t.startsWith('uptime_in_seconds:')) uptime = parseInt(t.split(':')[1], 10) || 0
                else if (t.startsWith('used_cpu_sys:')) cpuSys = parseFloat(t.split(':')[1]) || 0
                else if (t.startsWith('used_cpu_user:')) cpuUser = parseFloat(t.split(':')[1]) || 0
                // 已用内存（字节）
                else if (t.startsWith('used_memory:')) data.usedMemory = parseInt(t.split(':')[1], 10) || 0
                // 已用内存（人类可读格式）
                else if (t.startsWith('used_memory_human:')) data.usedMemoryHuman = t.split(':')[1] || '0'
                // 各数据库的 Key 数量（如 db0:keys=100）
                else if (/^db\d+:/i.test(t)) {
                    const dbMatch = t.match(/^db(\d+):/)
                    const keysMatch = t.match(/keys=(\d+)/)
                    const expiresMatch = t.match(/expires=(\d+)/)
                    const avgTtlMatch = t.match(/avg_ttl=(\d+)/)
                    if (keysMatch) {
                        const keyCount = parseInt(keysMatch[1], 10) || 0
                        const dbIndex = dbMatch ? parseInt(dbMatch[1], 10) : 0
                        maxKeyspaceDb = Math.max(maxKeyspaceDb, dbIndex)
                        data.summary.keyspace.push({
                            db: dbMatch ? `db${dbMatch[1]}` : key,
                            keys: keyCount,
                            expires: expiresMatch ? parseInt(expiresMatch[1], 10) || 0 : 0,
                            avgTtl: avgTtlMatch ? parseInt(avgTtlMatch[1], 10) || 0 : 0
                        })

                        // 只统计当前选中库的 key 数
                        if (dbMatch && dbIndex === currentDb) {
                            data.totalKeys = keyCount
                        }
                    }
                }
            }
            // CPU 利用率 = (系统CPU + 用户CPU) / 运行时长 × 100%
            const totalCpu = cpuSys + cpuUser
            if (connection._lastCpuSample) {
                const deltaCpu = totalCpu - connection._lastCpuSample.totalCpu
                const deltaTime = now - connection._lastCpuSample.timestamp
                data.cpuUsage = deltaTime > 0 ? parseFloat(((deltaCpu / deltaTime) * 100).toFixed(2)) : 0
            } else {
                data.cpuUsage = 0  // 首次采样，还没有差值数据
            }
            // 保存本次采样供下次计算差值
            connection._lastCpuSample = {totalCpu, timestamp: now}
            // CONFIG 不可用时至少保留默认 16 个库；若 INFO 暴露了更高库索引，也要保证下拉列表可选到。
            const fallbackDatabaseCount = databaseCountFromConfig ? 1 : DEFAULT_DATABASE_COUNT
            data.databaseCount = Math.max(
                normalizeDatabaseCount(data.databaseCount, DEFAULT_DATABASE_COUNT),
                fallbackDatabaseCount,
                maxKeyspaceDb + 1,
                currentDb + 1
            )
            data.sections = Array.from(sectionMap.values())
            data.summary.cpu.current_usage_percent = data.cpuUsage
            data.summary.keyspace_current_db = currentDb
            data.summary.keyspace_current_keys = data.totalKeys
            return {success: true, data}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getServerInfoFail')}
        }
    }

    /**
     * 通过 IPC 向渲染进程发送连接状态变更事件
     * @param {string|number} connectionId
     * @param {string} status - connected / disconnected / error / reconnecting / connecting
     * @param {string} message - 状态描述文本
     * @param {Error} [error] - 错误对象（可选）
     */
    notifyConnectionStatusChange(connectionId, status, message, error = null) {
        const mainWindow = getMainWindow()
        if (mainWindow && mainWindow.win && mainWindow.win.webContents) {
            mainWindow.win.webContents.send('redis:connection-status-changed', {
                connectionId, status, message,
                error: error ? {message: error.message, code: error.code || null} : null,
                timestamp: new Date().toISOString()
            })
        }
    }

    /**
     * 更新本地连接状态并通知渲染进程
     * @param {string|number} connectionId
     * @param {string} status
     * @param {string} message
     * @param {Error} [error]
     */
    updateConnectionStatus(connectionId, status, message, error = null) {
        const {managedConnectionId, connection} = this.getConnectionEntry(connectionId)

        if (connection) {
            connection.status = status
            connection.lastStatusChange = new Date().toISOString()
            if (error) {
                connection.lastError = {message: error.message, code: error.code || null, timestamp: new Date().toISOString()}
            }
        }

        this.notifyConnectionStatusChange(managedConnectionId, status, message, error)
    }
}

// 主进程级 Redis 连接管理单例：所有 IPC 和生命周期清理共享同一份连接池。
export const redisConnectionManager = new RedisConnectionManager()
