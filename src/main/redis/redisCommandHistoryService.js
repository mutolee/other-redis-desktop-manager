/**
 * Redis 命令执行记录服务。
 * 仅在开发者模式开启期间接收记录，并维护内存循环缓冲区与本地持久化文件。
 */
import {redisCommandHistoryStorage} from './redisCommandHistoryStorage.js'

// 内存中最多保留的命令记录数；达到上限后覆盖最早的数据。
const DEFAULT_HISTORY_LIMIT = 10000

// 单个参数最多保留的字符数，避免 Value、导入数据等大参数挤占主进程内存。
const MAX_ARGUMENT_LENGTH = 200

// 单条命令最多保留的参数数量，超出部分只记录省略数量。
const MAX_ARGUMENT_COUNT = 20

// Pipeline 最多保留的子命令摘要数量，避免批量 TYPE 等操作产生超大日志对象。
const MAX_PIPELINE_COMMAND_COUNT = 20

// Pipeline 子命令使用更紧凑的参数摘要，防止 10000 条批处理记录占用过多内存。
const MAX_PIPELINE_ARGUMENT_LENGTH = 80
const MAX_PIPELINE_ARGUMENT_COUNT = 6

// Drawer 单页允许读取的最大记录数。
const MAX_PAGE_SIZE = 200

const REDACTED_VALUE = '<redacted>'

/**
 * 解析用于历史筛选的逻辑连接 ID。
 * 命令面板使用 command:{sourceId}:{timestamp} 建立独立连接，但日志中仍归并到原始连接配置。
 *
 * @param {string|number} runtimeConnectionId - main 连接池中的运行时 ID。
 * @param {Object} config - renderer 传入的运行时连接配置。
 * @returns {string|number} 原始连接配置 ID 或运行时 ID。
 */
const resolveHistoryConnectionId = (runtimeConnectionId, config = {}) => {
    if (config.historyConnectionId !== '' && config.historyConnectionId !== undefined && config.historyConnectionId !== null) {
        return config.historyConnectionId
    }

    const normalizedRuntimeId = String(runtimeConnectionId ?? '')
    const commandSessionMatch = normalizedRuntimeId.match(/^command:(.+):\d+$/)

    return commandSessionMatch?.[1] || runtimeConnectionId || ''
}

/**
 * 截断用于日志展示的字符串。
 *
 * @param {string} value - 原始字符串。
 * @returns {string} 限长后的字符串。
 */
const truncateText = (value, maxLength = MAX_ARGUMENT_LENGTH) => {
    const text = String(value ?? '')

    if (text.length <= maxLength) {
        return text
    }

    return `${text.slice(0, maxLength)}... (${text.length} chars)`
}

/**
 * 将任意 Redis 参数转换为适合日志保存的短文本。
 * Buffer 只记录字节数，避免二进制 Value 被复制到命令历史中。
 *
 * @param {*} value - Redis 命令参数。
 * @returns {string} 可安全展示的参数摘要。
 */
const serializeArgument = (value, maxLength = MAX_ARGUMENT_LENGTH) => {
    if (Buffer.isBuffer(value)) {
        return `<Buffer ${value.length} bytes>`
    }

    if (value instanceof Uint8Array) {
        return `<Uint8Array ${value.byteLength} bytes>`
    }

    if (value === null) {
        return 'null'
    }

    if (value === undefined) {
        return 'undefined'
    }

    if (typeof value === 'object') {
        try {
            return truncateText(JSON.stringify(value), maxLength)
        } catch {
            return truncateText(String(value), maxLength)
        }
    }

    return truncateText(String(value), maxLength)
}

/**
 * 判断 CONFIG SET 的配置项是否包含认证凭据。
 *
 * @param {*} value - CONFIG 配置项名称。
 * @returns {boolean} 是否需要隐藏对应配置值。
 */
const isSensitiveConfigKey = (value) => {
    const normalizedValue = String(value || '').toLowerCase()
    return normalizedValue === 'requirepass' || normalizedValue === 'masterauth'
}

/**
 * 清理命令参数中的敏感信息和大体积内容。
 * AUTH、HELLO AUTH、ACL SETUSER 密码以及 CONFIG SET 密码不会进入历史记录。
 *
 * @param {string} command - Redis 命令名称。
 * @param {Array} args - 原始命令参数。
 * @returns {string[]} 可展示的参数摘要。
 */
export const sanitizeRedisCommandArgs = (command, args = [], limits = {}) => {
    const normalizedCommand = String(command || '').trim().toUpperCase()
    const sourceArgs = Array.isArray(args) ? args : [args]
    const maxArgumentCount = Math.max(Number(limits.maxArgumentCount) || MAX_ARGUMENT_COUNT, 1)
    const maxArgumentLength = Math.max(Number(limits.maxArgumentLength) || MAX_ARGUMENT_LENGTH, 20)
    const limitedArgs = sourceArgs.slice(0, maxArgumentCount)
    const serialize = (value) => serializeArgument(value, maxArgumentLength)
    let sanitizedArgs

    if (normalizedCommand === 'AUTH') {
        sanitizedArgs = limitedArgs.map(() => REDACTED_VALUE)
    } else if (normalizedCommand === 'HELLO') {
        let redactRemainingAuthArgs = 0
        sanitizedArgs = limitedArgs.map((arg) => {
            const normalizedArg = String(arg || '').toUpperCase()

            if (normalizedArg === 'AUTH') {
                redactRemainingAuthArgs = 2
                return serialize(arg)
            }

            if (redactRemainingAuthArgs > 0) {
                redactRemainingAuthArgs -= 1
                return REDACTED_VALUE
            }

            return serialize(arg)
        })
    } else if (normalizedCommand === 'ACL' && String(limitedArgs[0] || '').toUpperCase() === 'SETUSER') {
        sanitizedArgs = limitedArgs.map((arg, index) => {
            const text = String(arg ?? '')
            return index > 1 && (text.startsWith('>') || text.startsWith('#'))
                ? REDACTED_VALUE
                : serialize(arg)
        })
    } else if (
        normalizedCommand === 'CONFIG' &&
        String(limitedArgs[0] || '').toUpperCase() === 'SET' &&
        isSensitiveConfigKey(limitedArgs[1])
    ) {
        sanitizedArgs = limitedArgs.map((arg, index) => index === 2 ? REDACTED_VALUE : serialize(arg))
    } else {
        sanitizedArgs = limitedArgs.map(serialize)
    }

    if (sourceArgs.length > maxArgumentCount) {
        sanitizedArgs.push(`<${sourceArgs.length - maxArgumentCount} more args>`)
    }

    return sanitizedArgs
}

/**
 * 生成 Pipeline 子命令摘要。
 *
 * @param {Array<{command:string,args?:Array}>} commands - Pipeline 中的命令描述。
 * @returns {{items:Array<{command:string,args:string[]}>,omittedCount:number,totalCount:number}}
 */
const sanitizePipelineCommands = (commands = []) => {
    const sourceCommands = Array.isArray(commands) ? commands : []
    const items = sourceCommands.slice(0, MAX_PIPELINE_COMMAND_COUNT).map((item) => {
        const command = String(item?.command || 'UNKNOWN').toUpperCase()

        return {
            command,
            args: sanitizeRedisCommandArgs(command, item?.args || [], {
                maxArgumentCount: MAX_PIPELINE_ARGUMENT_COUNT,
                maxArgumentLength: MAX_PIPELINE_ARGUMENT_LENGTH
            })
        }
    })

    return {
        items,
        omittedCount: Math.max(sourceCommands.length - items.length, 0),
        totalCount: sourceCommands.length
    }
}

/**
 * Redis 命令历史有界缓冲区。
 * 使用循环数组保证达到上限后覆盖最旧记录时仍为 O(1)。
 */
export class RedisCommandHistoryService {
    /**
     * @param {{limit?:number,storage?:Object}} options - 历史记录容量和存储实现。
     */
    constructor(options = {}) {
        this.limit = Math.max(Number(options.limit) || DEFAULT_HISTORY_LIMIT, 1)
        this.storage = options.storage || redisCommandHistoryStorage
        this.records = new Array(this.limit)
        this.startIndex = 0
        this.size = 0
        this.sequence = 0
        this.enabled = false
        this.initialized = false
        this.initializationPromise = null
        this.clearing = false
        this.clearPromise = null
        this.deferredRecords = []
    }

    /**
     * 从持久化文件恢复最近的命令记录。
     * 多个查询或开发者模式初始化同时触发时，共用同一个恢复任务。
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            return
        }

        if (!this.initializationPromise) {
            this.initializationPromise = (async () => {
                const persistedRecords = await this.storage.load()

                for (const record of persistedRecords.slice(-this.limit)) {
                    this.pushRecord(this.normalizePersistedRecord(record))
                }

                this.initialized = true
            })().catch((error) => {
                this.initializationPromise = null
                throw error
            })
        }

        await this.initializationPromise
    }

    /**
     * 规范化磁盘中的历史记录，兼容字段缺失或旧版本数据结构。
     *
     * @param {Object} record - JSONL 文件中的原始记录。
     * @returns {Object} 可供当前查询和 Drawer 安全读取的记录。
     */
    normalizePersistedRecord(record = {}) {
        const pipelineCommands = Array.isArray(record.pipelineCommands)
            ? record.pipelineCommands.map((item) => ({
                command: String(item?.command || 'UNKNOWN').toUpperCase(),
                args: Array.isArray(item?.args) ? item.args.map((arg) => truncateText(arg)) : []
            }))
            : []

        return {
            id: String(record.id || `restored-${Date.now()}-${this.sequence += 1}`),
            timestamp: Number(record.timestamp) || Date.now(),
            connectionId: record.connectionId ?? '',
            connectionName: String(record.connectionName || ''),
            host: String(record.host || ''),
            port: Number(record.port) || null,
            dbIndex: Number(record.dbIndex) || 0,
            source: String(record.source || 'system'),
            command: String(record.command || 'REDIS').toUpperCase(),
            args: Array.isArray(record.args) ? record.args.map((arg) => truncateText(arg)) : [],
            durationMs: Math.max(Number(record.durationMs) || 0, 0),
            status: String(record.status || 'success'),
            error: truncateText(record.error || ''),
            pipelineCommands,
            pipelineOmittedCount: Math.max(Number(record.pipelineOmittedCount) || 0, 0),
            pipelineTotalCount: Math.max(Number(record.pipelineTotalCount) || pipelineCommands.length, 0)
        }
    }

    /**
     * 切换命令记录状态。
     * 开启时先恢复持久化记录；关闭时先停止采集，再完成待写数据落盘。
     *
     * @param {boolean} enabled - 是否允许新增命令记录。
     * @returns {Promise<void>}
     */
    async setEnabled(enabled) {
        const nextEnabled = Boolean(enabled)

        if (nextEnabled) {
            await this.initialize()
            this.enabled = true
            return
        }

        this.enabled = false
        await this.waitForPendingClearAndCloseStorage()
    }

    /**
     * 等待可能正在执行的清空事务，再关闭持久化写入队列。
     * 即使清空失败，也要执行 close，保证失败分支补回的记录仍有落盘机会。
     *
     * @returns {Promise<void>}
     */
    async waitForPendingClearAndCloseStorage() {
        if (!this.clearPromise) {
            await this.storage.close()
            return
        }

        try {
            await this.clearPromise
        } finally {
            await this.storage.close()
        }
    }

    /**
     * 将记录写入循环缓冲区，不触发持久化。
     * 该方法同时服务于磁盘恢复和新命令追加。
     *
     * @param {Object} record - 已规范化的命令记录。
     */
    pushRecord(record) {
        if (this.size < this.limit) {
            const writeIndex = (this.startIndex + this.size) % this.limit
            this.records[writeIndex] = record
            this.size += 1
            return
        }

        this.records[this.startIndex] = record
        this.startIndex = (this.startIndex + 1) % this.limit
    }

    /**
     * 追加一条命令执行记录。
     *
     * @param {Object} record - 执行器生成的命令元数据。
     * @returns {Object|null} 已保存记录；开发者模式关闭时返回 null。
     */
    append(record = {}) {
        if (!this.enabled) {
            return null
        }

        const command = String(record.command || 'REDIS').toUpperCase()
        const connection = record.connection || {}
        const config = connection.config || record.config || {}
        const pipeline = sanitizePipelineCommands(record.pipelineCommands)
        const connectionId = resolveHistoryConnectionId(
            connection.id ?? record.connectionId ?? '',
            config
        )
        const savedRecord = {
            id: `${Date.now()}-${this.sequence += 1}`,
            timestamp: Number(record.timestamp) || Date.now(),
            connectionId,
            connectionName: String(config.name || connection.name || record.connectionName || ''),
            host: String(config.host || connection.host || record.host || ''),
            port: Number(config.port || connection.port || record.port) || null,
            dbIndex: Number(config.db_index ?? config.dbIndex ?? record.dbIndex) || 0,
            source: String(record.source || 'system'),
            command,
            args: sanitizeRedisCommandArgs(command, record.args || []),
            durationMs: Math.max(Number(record.durationMs) || 0, 0),
            status: String(record.status || 'success'),
            error: truncateText(record.error || ''),
            pipelineCommands: pipeline.items,
            pipelineOmittedCount: pipeline.omittedCount,
            pipelineTotalCount: pipeline.totalCount
        }

        if (this.clearing) {
            // 清空事务完成前暂存新记录，避免它被文件清空覆盖或只存在于内存。
            this.deferredRecords.push(savedRecord)
        } else {
            this.pushRecord(savedRecord)
            this.storage.scheduleAppend(savedRecord)
        }

        return savedRecord
    }

    /**
     * 按时间正序读取当前缓冲区，供持久化和测试使用。
     *
     * @returns {Object[]} 最早记录在前的数组。
     */
    toOldestFirstArray() {
        const result = []

        for (let offset = 0; offset < this.size; offset += 1) {
            const index = (this.startIndex + offset) % this.limit
            result.push(this.records[index])
        }

        return result
    }

    /**
     * 按时间倒序读取当前缓冲区。
     *
     * @returns {Object[]} 最新记录在前的数组。
     */
    toNewestFirstArray() {
        const result = []

        for (let offset = this.size - 1; offset >= 0; offset -= 1) {
            const index = (this.startIndex + offset) % this.limit
            result.push(this.records[index])
        }

        return result
    }

    /**
     * 查询命令记录并在 main 进程完成搜索、筛选和分页。
     *
     * @param {{page?:number,pageSize?:number,keyword?:string,connectionId?:string|number,status?:string,source?:string}} options - 查询条件。
     * @returns {{items:Object[],total:number,page:number,pageSize:number,connections:Object[],sources:string[]}}
     */
    query(options = {}) {
        const page = Math.max(Number(options.page) || 1, 1)
        const pageSize = Math.min(Math.max(Number(options.pageSize) || 50, 1), MAX_PAGE_SIZE)
        const keyword = String(options.keyword || '').trim().toLowerCase()
        const connectionId = String(options.connectionId ?? '')
        const status = String(options.status || '')
        const source = String(options.source || '')
        const records = this.toNewestFirstArray()
        const connectionMap = new Map()
        const sourceSet = new Set()

        for (const record of records) {
            const normalizedConnectionId = String(record.connectionId ?? '')
            const connectionAddress = [record.host, record.port].filter(Boolean).join(':')
            const connectionLabel = record.connectionName && connectionAddress
                ? `${record.connectionName} (${connectionAddress})`
                : record.connectionName || connectionAddress || normalizedConnectionId

            if (normalizedConnectionId && !connectionMap.has(normalizedConnectionId)) {
                connectionMap.set(normalizedConnectionId, {
                    value: normalizedConnectionId,
                    label: connectionLabel
                })
            }

            if (record.source) {
                sourceSet.add(record.source)
            }
        }

        const filteredRecords = records.filter((record) => {
            if (connectionId && String(record.connectionId ?? '') !== connectionId) {
                return false
            }

            if (status && record.status !== status) {
                return false
            }

            if (source && record.source !== source) {
                return false
            }

            if (!keyword) {
                return true
            }

            const searchableText = [
                record.connectionName,
                record.host,
                record.port,
                record.dbIndex,
                record.source,
                record.command,
                Array.isArray(record.args) ? record.args.join(' ') : '',
                record.status,
                record.error
            ].join(' ').toLowerCase()

            return searchableText.includes(keyword)
        })

        const total = filteredRecords.length
        const start = (page - 1) * pageSize

        return {
            items: filteredRecords.slice(start, start + pageSize),
            total,
            page,
            pageSize,
            connections: Array.from(connectionMap.values()),
            sources: Array.from(sourceSet).sort()
        }
    }

    /**
     * 清空当前会话中的所有命令记录。
     *
     * @returns {Promise<number>} 清空前的记录数量。
     */
    async clear() {
        if (this.clearPromise) {
            return await this.clearPromise
        }

        const clearedCount = this.size
        this.clearing = true
        this.clearPromise = (async () => {
            try {
                await this.storage.clear()
                this.records = new Array(this.limit)
                this.startIndex = 0
                this.size = 0

                const deferredRecords = this.deferredRecords.splice(0)
                this.clearing = false

                // 清空过程中完成的命令属于新的时间边界，清空后重新加入内存并落盘。
                for (const record of deferredRecords) {
                    this.pushRecord(record)
                    this.storage.scheduleAppend(record)
                }

                return clearedCount
            } catch (error) {
                const deferredRecords = this.deferredRecords.splice(0)
                this.clearing = false

                // 文件清空失败时保留原内存记录，并把清空期间的新记录正常补回。
                for (const record of deferredRecords) {
                    this.pushRecord(record)
                    this.storage.scheduleAppend(record)
                }

                throw error
            }
        })()

        try {
            return await this.clearPromise
        } finally {
            this.clearing = false
            this.clearPromise = null
        }
    }

    /**
     * 应用退出前停止采集并等待持久化队列完成。
     *
     * @returns {Promise<void>}
     */
    async close() {
        this.enabled = false
        await this.waitForPendingClearAndCloseStorage()
    }
}

// main 进程单例：执行器、开发者模式 IPC 和查询 IPC 共用同一份内存记录。
export const redisCommandHistoryService = new RedisCommandHistoryService()
