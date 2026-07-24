import Redis from 'ioredis'
import {getMainWindow} from '../windows/mainWindow.js'
import {createLogger} from '../utils/logger.js'
import {
    DEFAULT_COMMAND_TIMEOUT_MS,
    DEFAULT_PAGE_SIZE,
    normalizeConnectionId,
    normalizeTimeout
} from '../redis/redisDataUtils.js'
import {buildRedisOptions} from '../redis/redisOptionsFactory.js'
import {isRedisConnectionError} from '../redis/redisConnectionErrorUtil.js'
import {RedisKeyDetailService} from '../redis/redisKeyDetailService.js'
import {RedisKeyTransferService} from '../redis/redisKeyTransferService.js'
import {RedisKeyQueryService} from '../redis/redisKeyQueryService.js'
import {RedisServerInfoService} from '../redis/redisServerInfoService.js'
import {RedisSlowLogService} from '../redis/redisSlowLogService.js'
import {RedisCommandExecutor} from '../redis/redisCommandExecutor.js'
import {redisCommandHistoryService} from '../redis/redisCommandHistoryService.js'
import {tMain} from '../utils/mainI18n.js'

const log = createLogger('redis-manager')

/**
 * Redis 连接管理器 - 管理所有活跃的 Redis 连接
 * 支持单机模式、哨兵模式（集群模式待实现）
 * 连接状态变更通过 IPC 事件通知渲染进程
 */
export class RedisConnectionManager {
    /**
     * @param {{RedisClient?: typeof Redis, getMainWindow?: Function, commandHistoryService?: Object, commandExecutor?: Object}} dependencies - 测试或运行时可替换的外部依赖。
     */
    constructor(dependencies = {}) {
        this.connections = new Map()
        this.RedisClient = dependencies.RedisClient || Redis
        this.getMainWindow = dependencies.getMainWindow || getMainWindow
        this.commandHistoryService = dependencies.commandHistoryService || redisCommandHistoryService
        this.commandExecutor = dependencies.commandExecutor || new RedisCommandExecutor({
            historyService: this.commandHistoryService,
            getCommandTimeout: (config) => this.getCommandTimeout(config)
        })

        // 业务服务只依赖连接查询和统一命令执行能力，不直接读写连接池，避免服务反向承担生命周期职责。
        const serviceDependencies = {
            getActiveConnection: (connectionId) => this.getActiveConnection(connectionId),
            executeRedisCommand: (options, task) => this.commandExecutor.execute(options, task),
            executeRedisPipeline: (options, task) => this.commandExecutor.executePipeline(options, task)
        }

        // Manager 保留统一门面，IPC 通道无需感知内部服务拆分。
        this.keyDetailService = new RedisKeyDetailService(serviceDependencies)
        this.keyTransferService = new RedisKeyTransferService(serviceDependencies)
        this.keyQueryService = new RedisKeyQueryService(serviceDependencies)
        this.serverInfoService = new RedisServerInfoService(serviceDependencies)
        this.slowLogService = new RedisSlowLogService(serviceDependencies)
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
        return await this.commandExecutor.execute({
            config,
            command: label,
            label,
            source: 'connection-lifecycle',
            record: false
        }, task)
    }

    /**
     * 释放单个 ioredis 客户端。
     * 优先发送 QUIT；超时或失败时强制断开 socket，保证连接池清理不会被网络状态长期阻塞。
     *
     * @param {Redis|null} redis - 待释放的 ioredis 客户端。
     * @param {Object} config - 当前连接运行时配置，用于读取命令超时。
     * @returns {Promise<void>}
     */
    async disposeRedisClient(redis, config = {}) {
        if (!redis) {
            return
        }

        redis.removeAllListeners()

        if (redis.status === 'end') {
            return
        }

        try {
            await this.runWithCommandTimeout(config, () => redis.quit(), 'QUIT')
        } catch (error) {
            log.warn('Redis QUIT 失败，改为强制断开连接', error)

            try {
                redis.disconnect(false)
            } catch (disconnectError) {
                log.warn('强制断开 Redis 连接失败', disconnectError)
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
        const redis = new this.RedisClient(redisOpts)
        let connErr = null
        // 监听 error 事件获取原始错误信息（connect() 抛出的错误可能更泛化）
        redis.on('error', (err) => {
            connErr = err
        })
        try {
            await redis.connect()
            // 哨兵模式下 ioredis 会先通过 Sentinel 发现 Redis 数据节点，DBSIZE 实际在数据节点上执行。
            // 如果普通模式误连到 Sentinel 端口，或数据节点密码不正确，DBSIZE 会失败并给出真实错误。
            await this.commandExecutor.execute({
                connection: {
                    id: `connection-test:${Date.now()}`,
                    config,
                    redis,
                    status: 'connected'
                },
                command: 'DBSIZE',
                args: [],
                source: 'connection-test'
            }, () => redis.call('DBSIZE'))
            const latency = Date.now() - startTime
            return {success: true, message: tMain('redis.connectSuccess'), latency}
        } catch (error) {
            return {success: false, error: (connErr && connErr.message) || error.message || tMain('redis.connectFail')}
        } finally {
            await this.disposeRedisClient(redis, config)
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
                // 旧实例先从连接池移除并同步摘掉监听，socket 在后台释放，不阻塞新连接创建。
                this.connections.delete(managedConnectionId)
                this.disposeRedisClient(existing.redis, existing.config).catch((error) => {
                    log.error(`释放旧 Redis 连接失败: ${managedConnectionId}`, error)
                })
            }

            // 通知前端进入连接中状态
            this.updateConnectionStatus(managedConnectionId, 'connecting', tMain('redis.connecting'))

            const redisOpts = buildRedisOptions(config)
            redisOpts.maxRetriesPerRequest = 0
            redisOpts.retryStrategy = () => false
            redisOpts.sentinelRetryStrategy = () => false
            const redis = new this.RedisClient(redisOpts)

            // 存入 Map 后才注册事件监听，避免时序问题
            const connObj = {
                id: managedConnectionId,
                config,
                redis,
                status: 'connecting'
            }
            this.connections.set(managedConnectionId, connObj)

            // 旧连接的排队事件不得覆盖同 ID 的新连接状态。
            const updateCurrentConnectionStatus = (status, message, error = null) => {
                if (this.connections.get(managedConnectionId)?.redis !== redis) {
                    return
                }

                this.updateConnectionStatus(managedConnectionId, status, message, error)
            }

            // ioredis 事件 → 更新状态 → IPC 通知渲染进程
            redis.on('connect', () => {
                updateCurrentConnectionStatus('connecting', tMain('redis.tcpConnected'))
            })
            redis.on('ready', () => {
                updateCurrentConnectionStatus('connected', tMain('redis.connectSuccess'))
            })
            redis.on('error', (error) => {
                updateCurrentConnectionStatus('error', tMain('redis.connectionError'), error)
            })
            redis.on('close', () => {
                updateCurrentConnectionStatus('disconnected', tMain('redis.connectionClosed'))
            })
            redis.on('end', () => {
                updateCurrentConnectionStatus('disconnected', tMain('redis.connectionEnded'))
            })

        } catch (error) {
            log.error('创建 Redis 连接失败', error)
            this.updateConnectionStatus(managedConnectionId, 'error', tMain('redis.connectFail'), error)
        }
    }

    /**
     * 关闭指定连接
     * 先从连接池移除并通知 renderer，再在后台任务中优雅释放 socket。
     * @param {string|number} connectionId
     * @returns {Promise<{success:boolean, message?:string, error?:string}>}
     */
    async closeConnection(connectionId) {
        const {managedConnectionId, connection} = this.getConnectionEntry(connectionId)

        if (!connection) {
            // 即使底层连接尚未建立或已经结束，也要传递主动关闭意图，让关联的命令抽屉同步收起。
            this.notifyConnectionStatusChange(
                managedConnectionId,
                'disconnected',
                tMain('redis.connectionClosed'),
                null,
                'manual'
            )
            return {success: true, message: tMain('redis.connectionClosed')}
        }

        // 连接池先移除并立即通知 renderer，快速关闭后重开同一连接不会被旧清理任务误删。
        this.connections.delete(managedConnectionId)
        this.notifyConnectionStatusChange(
            managedConnectionId,
            'disconnected',
            tMain('redis.connectionClosed'),
            null,
            'manual'
        )

        this.disposeRedisClient(connection.redis, connection.config).catch((error) => {
            log.error(`释放 Redis 连接失败: ${managedConnectionId}`, error)
        })
        return {success: true, message: tMain('redis.connectionClosed')}
    }

    /**
     * 关闭当前管理器持有的全部 Redis 连接。
     * 应用退出时 renderer 即将销毁，这里直接清空连接池并并行释放 socket，不再发送无意义的状态事件。
     * @returns {Promise<void>}
     */
    async closeAllRedisConnections() {
        const connections = Array.from(this.connections.values())

        this.connections.clear()

        const closeResults = await Promise.allSettled(
            connections.map(connection => this.disposeRedisClient(connection.redis, connection.config))
        )

        for (const result of closeResults) {
            if (result.status === 'rejected') {
                log.error('关闭 Redis 连接失败', result.reason)
            }
        }
    }

    /**
     * 执行 Redis 命令
     * @param {string|number} connectionId
     * @param {string} command - Redis 命令（如 GET, SET, KEYS）
     * @param {Array} [args=[]] - 命令参数
     * @param {{source?:string}} [options] - 命令来源，用于开发者命令记录筛选。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async executeCommand(connectionId, command, args = [], options = {}) {
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
            const result = await this.commandExecutor.execute({
                connection,
                command,
                args,
                source: options?.source || 'renderer-command'
            }, () => connection.redis.call(command, ...args))

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
            if (isRedisConnectionError(error)) {
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
            await this.commandExecutor.execute({
                connection,
                command: 'SELECT',
                args: [dbIndex],
                source: 'database-selector'
            }, () => connection.redis.select(dbIndex))
            connection.config.db_index = dbIndex
            return {success: true, message: tMain('redis.databaseSelected', {value: dbIndex})}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.selectDatabaseFail')}
        }
    }

    /**
     * SCAN 扫描 Key 名称列表。
     * 每次调用只推进一轮游标，COUNT 仅表示本轮建议扫描量，不作为必须凑满的结果数量。
     * Key 类型由独立的批量接口异步补充，避免远程 Redis 的 TYPE 往返阻塞首批列表渲染。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string|number} cursor - Redis SCAN 游标
     * @param {string} pattern - Redis MATCH 模式
     * @param {number} count - 本轮建议扫描数量
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>} 当前批次 Key 名称、下一游标与分页状态
     */
    scanKeys(connectionId, cursor = '0', pattern = '*', count = DEFAULT_PAGE_SIZE) {
        return this.keyQueryService.scanKeys(connectionId, cursor, pattern, count)
    }

    /**
     * 批量获取指定 Key 的 Redis 数据类型。
     * 按固定大小的 pipeline 分批执行 TYPE，供渲染进程在 Key 名称已经展示后异步补充类型标签。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string[]} keys - 待查询类型的 Key 名称列表
     * @returns {Promise<{success:boolean,data?:Array<{key:string,type:string}>,error?:string}>} Key 与类型的对应列表
     */
    getKeyTypes(connectionId, keys = []) {
        return this.keyQueryService.getKeyTypes(connectionId, keys)
    }

    /**
     * 按完整 Key 名精确查询 Key 及其类型。
     * 精确查询直接使用 TYPE，避免通过 SCAN MATCH 遍历整个数据库。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - 待查询的完整 Key 名
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>} 单条精确查询结果
     */
    findExactKey(connectionId, key) {
        return this.keyQueryService.findExactKey(connectionId, key)
    }

    /**
     * 按指定 cursor 执行一轮 SCAN MATCH，返回当前批次 Key 和下一轮 cursor。
     * renderer 负责循环拉取、累计展示、数量上限和旧请求失效，main 不持有跨 IPC 的扫描任务。
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {string} pattern - Redis SCAN MATCH pattern。
     * @param {{cursor?: string|number}} options - 本轮 SCAN cursor。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    scanKeysByPattern(connectionId, pattern = '*', options = {}) {
        return this.keyQueryService.scanKeysByPattern(connectionId, pattern, options)
    }

    /**
     * 批量删除指定 Key。
     * 删除目录前由 renderer 传入已经预览并确认过的 Key 列表，main 负责分批 DEL，避免单条命令参数过长。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string[]} keys - 待删除 Key 列表
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    deleteKeys(connectionId, keys = []) {
        return this.keyQueryService.deleteKeys(connectionId, keys)
    }

    /**
     * 分析一轮 SCAN 返回的 Key 内存占用，并返回下一轮 cursor。
     * 当前批次使用 pipeline 执行 MEMORY USAGE；renderer 负责循环拉取、合并排序和数量上限。
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {{cursor?: string|number, matchPattern?: string}} options - 本轮 cursor 与可选 SCAN MATCH 范围。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    analyzeKeyMemory(connectionId, options = {}) {
        return this.keyQueryService.analyzeKeyMemory(connectionId, options)
    }

    /**
     * 读取 Redis 实例级慢查询日志。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {{count?: number}} options - 慢日志读取数量
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    getSlowLog(connectionId, options = {}) {
        return this.slowLogService.getSlowLog(connectionId, options)
    }

    /**
     * 清空 Redis 实例级慢查询日志。
     * @param {string|number} connectionId - 当前连接 ID
     * @returns {Promise<{success:boolean,message?:string,error?:string}>}
     */
    resetSlowLog(connectionId) {
        return this.slowLogService.resetSlowLog(connectionId)
    }

    /**
     * 获取 key 的完整信息（类型、TTL、值）
     */
    getKeyData(connectionId, key) {
        return this.keyDetailService.getKeyData(connectionId, key)
    }

    /**
     * 主动读取完整 Redis String Value。
     * 首屏详情只返回受限预览；用户确认后通过该接口读取完整字节，避免常规浏览被大 Value 阻塞。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis String Key
     * @param {{confirmed?:boolean}} options - 超大 Value 是否已经由用户确认
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    getFullStringValue(connectionId, key, options = {}) {
        return this.keyDetailService.getFullStringValue(connectionId, key, options)
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
     * 按 HSCAN 游标分段获取 Redis Hash 字段。
     * 用于右侧 Hash 详情页的“加载更多/加载全部”，避免每一页都执行全量 HKEYS。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Hash Key
     * @param {string|number} cursor - HSCAN 当前游标
     * @param {number} count - 本次扫描建议数量
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    getHashRange(connectionId, key, cursor = '0', count = DEFAULT_PAGE_SIZE) {
        return this.keyDetailService.getHashRange(connectionId, key, cursor, count)
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
    getListRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        return this.keyDetailService.getListRange(connectionId, key, start, stop)
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
    getSetRange(connectionId, key, cursor = '0', count = DEFAULT_PAGE_SIZE) {
        return this.keyDetailService.getSetRange(connectionId, key, cursor, count)
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
    getZSetRange(connectionId, key, start = 0, stop = DEFAULT_PAGE_SIZE - 1) {
        return this.keyDetailService.getZSetRange(connectionId, key, start, stop)
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
    getStreamRange(connectionId, key, maxId = '+', minId = '-', count = DEFAULT_PAGE_SIZE) {
        return this.keyDetailService.getStreamRange(connectionId, key, maxId, minId, count)
    }

    /**
     * 获取 Redis Stream 消费组列表。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Stream Key
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    getStreamGroups(connectionId, key) {
        return this.keyDetailService.getStreamGroups(connectionId, key)
    }

    /**
     * 获取指定 Redis Stream 消费组下的消费者列表。
     * @param {string|number} connectionId - 当前连接 ID
     * @param {string} key - Redis Stream Key
     * @param {string} groupName - 消费组名称
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    getStreamConsumers(connectionId, key, groupName) {
        return this.keyDetailService.getStreamConsumers(connectionId, key, groupName)
    }

    /**
     * 获取页面 Header 使用的 Redis 运行摘要。
     * 只读取 clients、memory、cpu 和 keyspace，避免日常刷新执行 INFO ALL。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>} 页面 Header 所需摘要。
     */
    getServerSummary(connectionId) {
        return this.serverInfoService.getServerSummary(connectionId)
    }

    /**
     * 获取 DB 选择器使用的数据库数量和 Keyspace 摘要。
     * 命令面板只需要这两项，因此不读取客户端、内存、CPU 和完整 INFO 数据。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>} DB 数量及各 DB Key 数。
     */
    getDatabaseSummary(connectionId) {
        return this.serverInfoService.getDatabaseSummary(connectionId)
    }

    /**
     * 获取 Redis 完整服务器信息（INFO ALL）。
     * 该接口只供 RedisInfoDrawer 使用，需要保留全部分区、原始行和图表摘要。
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    getServerInfo(connectionId) {
        return this.serverInfoService.getServerInfo(connectionId)
    }

    /**
     * 通过 IPC 向渲染进程发送连接状态变更事件
     * @param {string|number} connectionId
     * @param {string} status - connected / disconnected / error / reconnecting / connecting
     * @param {string} message - 状态描述文本
     * @param {Error} [error] - 错误对象（可选）
     * @param {'runtime'|'manual'} [reason] - 状态变化来源；manual 表示调用方主动关闭连接。
     */
    notifyConnectionStatusChange(connectionId, status, message, error = null, reason = 'runtime') {
        const mainWindow = this.getMainWindow()
        if (mainWindow && mainWindow.win && mainWindow.win.webContents) {
            mainWindow.win.webContents.send('redis:connection-status-changed', {
                connectionId, status, message, reason,
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
     * @param {'runtime'|'manual'} [reason] - 状态变化来源。
     */
    updateConnectionStatus(connectionId, status, message, error = null, reason = 'runtime') {
        const {managedConnectionId, connection} = this.getConnectionEntry(connectionId)

        if (connection) {
            // ioredis 断线时可能连续触发 error、close、end；相同状态不重复广播。
            if (connection.status === status) {
                return
            }

            // error 后紧随的 close/end 不再覆盖详细错误，也避免命令抽屉连续追加两条断线信息。
            if (connection.status === 'error' && status === 'disconnected' && reason === 'runtime') {
                return
            }

            connection.status = status
        }

        this.notifyConnectionStatusChange(managedConnectionId, status, message, error, reason)
    }

    /**
     * 查询已恢复到内存中的 Redis 命令执行记录。
     * 搜索、筛选和分页留在 main 进程完成，renderer 只接收当前页数据。
     *
     * @param {Object} options - Drawer 查询条件。
     * @returns {Promise<{success:boolean,data:Object}>}
     */
    async getCommandHistory(options = {}) {
        await this.commandHistoryService.initialize()

        return {
            success: true,
            data: this.commandHistoryService.query(options)
        }
    }

    /**
     * 清空内存和持久化文件中的 Redis 命令执行记录。
     *
     * @returns {Promise<{success:boolean,data:{clearedCount:number}}>}
     */
    async clearCommandHistory() {
        const clearedCount = await this.commandHistoryService.clear()

        return {
            success: true,
            data: {
                clearedCount
            }
        }
    }

    /**
     * 应用退出前停止采集并完成 Redis 命令记录落盘。
     *
     * @returns {Promise<void>}
     */
    async closeCommandHistory() {
        await this.commandHistoryService.close()
    }
}

// 主进程级 Redis 连接管理单例：所有 IPC 和生命周期清理共享同一份连接池。
export const redisConnectionManager = new RedisConnectionManager()
