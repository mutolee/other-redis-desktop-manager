import {createLogger} from '../utils/logger.js'
import {tMain} from '../utils/mainI18n.js'

const log = createLogger('redis-slow-log')

// 慢查询默认读取条数，打开 Drawer 时先给出适中的最近记录范围。
const SLOW_LOG_DEFAULT_COUNT = 128

// 慢查询允许读取的最大条数，避免一次性拉取过多日志影响界面。
const SLOW_LOG_MAX_COUNT = 512

/**
 * Redis 慢查询服务。
 * 负责实例级 SLOWLOG 读取、配置补充和日志清空，不持有 Redis 连接生命周期。
 */
export class RedisSlowLogService {
    /**
     * @param {{getActiveConnection: Function, executeRedisCommand: Function, executeRedisPipeline: Function}} dependencies - 连接查询和统一命令执行能力。
     */
    constructor(dependencies = {}) {
        this.getActiveConnection = dependencies.getActiveConnection
        this.executeRedisCommand = dependencies.executeRedisCommand
        this.executeRedisPipeline = dependencies.executeRedisPipeline
    }

    /**
     * 读取 Redis 实例级慢查询日志。
     * SLOWLOG 不按 DB 隔离；CONFIG GET 可能因权限限制失败，失败时仅返回空配置。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @param {{count?: number}} options - 慢日志读取数量。
     * @returns {Promise<{success:boolean,data?:Object,error?:string}>}
     */
    async getSlowLog(connectionId, options = {}) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            const count = Math.min(
                Math.max(Number(options?.count) || SLOW_LOG_DEFAULT_COUNT, 1),
                SLOW_LOG_MAX_COUNT
            )

            // 日志总数和最近记录共用一次 pipeline，避免 Drawer 打开时产生两次网络往返。
            const pipe = connection.redis.pipeline()
            pipe.call('SLOWLOG', 'LEN')
            pipe.call('SLOWLOG', 'GET', count)
            const results = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'SLOWLOG', args: ['LEN']},
                    {command: 'SLOWLOG', args: ['GET', count]}
                ],
                source: 'slow-log',
                label: 'SLOWLOG pipeline'
            }, () => pipe.exec())
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
            const config = await this.readSlowLogConfig(connection)

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
     * 读取慢查询阈值和最大日志长度。
     * 当前连接没有 CONFIG 权限时返回空配置，不影响慢日志主体展示。
     *
     * @param {Object} connection - 活跃 Redis 连接。
     * @returns {Promise<{slowerThan:number|null,maxLen:number|null}>}
     */
    async readSlowLogConfig(connection) {
        const config = {
            slowerThan: null,
            maxLen: null
        }

        try {
            // CONFIG 可能被 ACL 禁止，配置读取失败不能影响已经成功获取的慢查询日志。
            const configPipe = connection.redis.pipeline()
            configPipe.call('CONFIG', 'GET', 'slowlog-log-slower-than')
            configPipe.call('CONFIG', 'GET', 'slowlog-max-len')
            const configResults = await this.executeRedisPipeline({
                connection,
                commands: [
                    {command: 'CONFIG', args: ['GET', 'slowlog-log-slower-than']},
                    {command: 'CONFIG', args: ['GET', 'slowlog-max-len']}
                ],
                source: 'slow-log',
                label: 'CONFIG GET slowlog pipeline'
            }, () => configPipe.exec())

            config.slowerThan = this.parseConfigNumber(configResults?.[0]?.[1])
            config.maxLen = this.parseConfigNumber(configResults?.[1]?.[1])
        } catch (error) {
            log.warn(`读取 Redis 慢查询配置失败: ${error.message || error}`)
        }

        return config
    }

    /**
     * 从 CONFIG GET 返回值中读取数值配置。
     *
     * @param {Array} result - CONFIG GET 的键值数组。
     * @returns {number|null} 可用数值或 null。
     */
    parseConfigNumber(result) {
        if (!Array.isArray(result)) {
            return null
        }

        const value = Number(result[1])
        return Number.isFinite(value) ? value : null
    }

    /**
     * 清空 Redis 实例级慢查询日志。
     *
     * @param {string|number} connectionId - 当前连接 ID。
     * @returns {Promise<{success:boolean,message?:string,error?:string}>}
     */
    async resetSlowLog(connectionId) {
        try {
            const connection = this.getActiveConnection(connectionId)
            if (!connection) {
                return {success: false, error: tMain('redis.connectionMissingOrDisconnected')}
            }

            await this.executeRedisCommand({
                connection,
                command: 'SLOWLOG',
                args: ['RESET'],
                source: 'slow-log'
            }, () => connection.redis.call('SLOWLOG', 'RESET'))

            return {success: true, message: 'OK'}
        } catch (error) {
            return {success: false, error: error.message || tMain('redis.commandFail')}
        }
    }
}
