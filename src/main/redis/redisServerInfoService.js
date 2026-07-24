import {createLogger} from '../utils/logger.js'
import {tMain} from '../utils/mainI18n.js'
import {
    DEFAULT_DATABASE_COUNT,
    normalizeDatabaseCount,
    parseRedisConfigDatabases
} from './redisDataUtils.js'
import {parseRedisInfo} from './redisServerInfoUtil.js'

const log = createLogger('redis-server-info')

/**
 * Redis 服务器信息服务。
 * 负责 INFO、数据库数量和 CPU 采样等实例信息，不管理 Redis 连接的创建与关闭。
 */
export class RedisServerInfoService {
    /**
     * @param {{getActiveConnection: Function, executeRedisCommand: Function, executeRedisPipeline: Function}} dependencies - 连接查询和统一命令执行能力。
     */
    constructor(dependencies = {}) {
        this.getActiveConnection = dependencies.getActiveConnection
        this.executeRedisCommand = dependencies.executeRedisCommand
        this.executeRedisPipeline = dependencies.executeRedisPipeline

        // 运行时缓存按连接对象自动释放，避免把服务私有状态挂到连接记录上。
        this.connectionState = new WeakMap()
    }

    /**
     * 获取指定连接对应的服务器信息运行时状态。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @returns {{databaseCountInfo:Object|null,databaseCountRequest:Promise|null,lastCpuSample:Object|null}}
     */
    getConnectionState(connection) {
        let state = this.connectionState.get(connection)

        if (!state) {
            state = {
                databaseCountInfo: null,
                databaseCountRequest: null,
                lastCpuSample: null
            }
            this.connectionState.set(connection, state)
        }

        return state
    }

    /**
     * 获取并缓存当前连接的 Redis 数据库数量。
     * CONFIG GET databases 在同一条连接生命周期内无需重复读取；无权限时也缓存默认值。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @returns {Promise<{databaseCount:number, databaseCountFromConfig:boolean}>}
     */
    async getCachedDatabaseCount(connection) {
        const state = this.getConnectionState(connection)

        if (state.databaseCountInfo) {
            return state.databaseCountInfo
        }

        if (state.databaseCountRequest) {
            return state.databaseCountRequest
        }

        // 同一连接并发刷新 Header/命令抽屉时复用请求，避免重复执行 CONFIG GET databases。
        state.databaseCountRequest = (async () => {
            try {
                const configDatabases = await this.executeRedisCommand({
                    connection,
                    command: 'CONFIG',
                    args: ['GET', 'databases'],
                    source: 'server-info',
                    label: 'CONFIG GET databases'
                }, () => connection.redis.call('CONFIG', 'GET', 'databases'))

                return {
                    databaseCount: parseRedisConfigDatabases(configDatabases, DEFAULT_DATABASE_COUNT),
                    databaseCountFromConfig: true
                }
            } catch (error) {
                log.warn(`读取 Redis 数据库数量失败，当前连接使用默认 DB 列表: ${error.message || error}`)
                return {
                    databaseCount: DEFAULT_DATABASE_COUNT,
                    databaseCountFromConfig: false
                }
            }
        })()

        try {
            state.databaseCountInfo = await state.databaseCountRequest
            return state.databaseCountInfo
        } finally {
            state.databaseCountRequest = null
        }
    }

    /**
     * 通过 Pipeline 读取指定 INFO 分区。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @param {string[]} sections - 需要读取的 INFO 分区名称。
     * @returns {Promise<string>} 可交给统一解析器处理的 INFO 文本。
     */
    async readInfoSections(connection, sections) {
        // 日常摘要只读取需要的 INFO 分区，避免频繁执行体积更大的 INFO ALL。
        const pipeline = connection.redis.pipeline()
        sections.forEach(section => pipeline.call('INFO', section))

        const results = await this.executeRedisPipeline({
            connection,
            commands: sections.map((section) => ({command: 'INFO', args: [section]})),
            source: 'server-info',
            label: `INFO ${sections.join('/')} pipeline`
        }, () => pipeline.exec())
        const infoParts = []

        for (const [error, infoRaw] of results || []) {
            if (error) {
                throw error
            }
            if (typeof infoRaw !== 'string') {
                throw new Error(tMain('redis.infoFormatInvalid'))
            }
            infoParts.push(infoRaw)
        }

        return infoParts.join('\n')
    }

    /**
     * 计算 DB 选择器应展示的数据库数量。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @param {{databaseCount:number, databaseCountFromConfig:boolean}} databaseInfo - CONFIG 数据库数量缓存。
     * @param {number} maxKeyspaceDb - INFO Keyspace 中出现的最高 DB 索引。
     * @returns {number} 可展示的数据库数量。
     */
    resolveDatabaseCount(connection, databaseInfo, maxKeyspaceDb) {
        const currentDb = Math.max(0, Number(connection.config.db_index) || 0)
        const fallbackDatabaseCount = databaseInfo.databaseCountFromConfig ? 1 : DEFAULT_DATABASE_COUNT

        return Math.max(
            normalizeDatabaseCount(databaseInfo.databaseCount, DEFAULT_DATABASE_COUNT),
            fallbackDatabaseCount,
            maxKeyspaceDb + 1,
            currentDb + 1
        )
    }

    /**
     * 使用前后两次 Redis CPU 累计时间计算当前利用率。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @param {number} totalCpu - INFO CPU 中系统与用户累计 CPU 秒数之和。
     * @returns {number} 当前 CPU 利用率百分比。
     */
    updateCpuSample(connection, totalCpu) {
        const state = this.getConnectionState(connection)
        const now = Date.now() / 1000
        let cpuUsage = 0

        if (state.lastCpuSample) {
            // Redis 提供累计 CPU 时间，这里使用相邻两次采样差值换算当前利用率。
            const deltaCpu = totalCpu - state.lastCpuSample.totalCpu
            const deltaTime = now - state.lastCpuSample.timestamp
            cpuUsage = deltaTime > 0 && deltaCpu >= 0
                ? Number.parseFloat(((deltaCpu / deltaTime) * 100).toFixed(2))
                : 0
        }

        state.lastCpuSample = {totalCpu, timestamp: now}
        return cpuUsage
    }

    /**
     * 获取页面 Header 使用的 Redis 运行摘要。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getServerSummary(connectionId) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const currentDb = Math.max(0, Number(connection.config.db_index) || 0)

            // 数据库数量配置和轻量 INFO 分区互不依赖，可以并行读取以缩短 Header 刷新时间。
            const [databaseInfo, infoRaw] = await Promise.all([
                this.getCachedDatabaseCount(connection),
                this.readInfoSections(connection, ['clients', 'memory', 'cpu', 'keyspace'])
            ])
            const {data, totalCpu, maxKeyspaceDb} = parseRedisInfo(infoRaw, {currentDb})

            data.databaseCount = this.resolveDatabaseCount(connection, databaseInfo, maxKeyspaceDb)
            data.cpuUsage = this.updateCpuSample(connection, totalCpu)
            data.summary.cpu.current_usage_percent = data.cpuUsage
            data.summary.keyspace_current_db = currentDb
            data.summary.keyspace_current_keys = data.totalKeys

            return {success: true, data}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getServerInfoFail')}
        }
    }

    /**
     * 获取 DB 选择器使用的数据库数量和 Keyspace 摘要。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getDatabaseSummary(connectionId) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const currentDb = Math.max(0, Number(connection.config.db_index) || 0)
            const [databaseInfo, infoRaw] = await Promise.all([
                this.getCachedDatabaseCount(connection),
                this.readInfoSections(connection, ['keyspace'])
            ])
            const {data, maxKeyspaceDb} = parseRedisInfo(infoRaw, {currentDb})

            return {
                success: true,
                data: {
                    databaseCount: this.resolveDatabaseCount(connection, databaseInfo, maxKeyspaceDb),
                    keyspace: data.summary.keyspace
                }
            }
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getServerInfoFail')}
        }
    }

    /**
     * 获取 Redis 完整服务器信息（INFO ALL）。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async getServerInfo(connectionId) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const databaseInfo = await this.getCachedDatabaseCount(connection)
            const infoRaw = await this.executeRedisCommand({
                connection,
                command: 'INFO',
                args: ['ALL'],
                source: 'server-info'
            }, () => connection.redis.call('INFO', 'ALL'))

            if (typeof infoRaw !== 'string') {
                return {success: false, error: tMain('redis.infoFormatInvalid')}
            }

            const currentDb = Math.max(0, Number(connection.config.db_index) || 0)
            const {data, totalCpu, maxKeyspaceDb} = parseRedisInfo(infoRaw, {
                currentDb,
                includeDetails: true
            })

            data.databaseCount = this.resolveDatabaseCount(connection, databaseInfo, maxKeyspaceDb)
            data.cpuUsage = this.updateCpuSample(connection, totalCpu)
            data.summary.cpu.current_usage_percent = data.cpuUsage
            data.summary.keyspace_current_db = currentDb
            data.summary.keyspace_current_keys = data.totalKeys

            return {success: true, data}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.getServerInfoFail')}
        }
    }
}
