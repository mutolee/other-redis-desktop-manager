import electron from 'electron'
import { createLogger } from '../../utils/logger.js'
import { redisConnectionManager } from '../../managers/RedisConnectionManager.js'

const { ipcMain } = electron
const log = createLogger('redis-ipc')

/**
 * Redis IPC 通道注册表。
 * 当前注册表只声明 IPC 通道和 RedisConnectionManager 方法的对应关系。
 */
const REDIS_IPC_HANDLERS = [
    {
        channel: 'redis:testConnection',
        description: '测试连接（返回结果，不持久化）',
        handler: (config) => redisConnectionManager.testConnection(config)
    },
    {
        channel: 'redis:connect',
        description: '创建持久连接（状态通过事件通知，不直接返回）',
        handler: (connectionId, config) => redisConnectionManager.createConnection(connectionId, config)
    },
    {
        channel: 'redis:disconnect',
        description: '关闭指定连接',
        handler: (connectionId) => redisConnectionManager.closeConnection(connectionId)
    },
    {
        channel: 'redis:execute-command',
        description: '执行 Redis 命令',
        handler: (connectionId, command, args = []) => redisConnectionManager.executeCommand(connectionId, command, args)
    },
    {
        channel: 'redis:scan-keys',
        description: 'SCAN 扫描 Key',
        handler: (connectionId, cursor, pattern, count) => redisConnectionManager.scanKeys(connectionId, cursor, pattern, count)
    },
    {
        channel: 'redis:get-key-data',
        description: '获取 Key 详细信息',
        handler: (connectionId, key) => redisConnectionManager.getKeyData(connectionId, key)
    },
    {
        channel: 'redis:get-hash-range',
        description: '分段扫描 Hash 字段',
        handler: (connectionId, key, start, stop) => redisConnectionManager.getHashRange(connectionId, key, start, stop)
    },
    {
        channel: 'redis:get-list-range',
        description: '分段获取 List 数据',
        handler: (connectionId, key, start, stop) => redisConnectionManager.getListRange(connectionId, key, start, stop)
    },
    {
        channel: 'redis:get-set-range',
        description: '分段扫描 Set 成员',
        handler: (connectionId, key, cursor, count) => redisConnectionManager.getSetRange(connectionId, key, cursor, count)
    },
    {
        channel: 'redis:get-zset-range',
        description: '分段获取 ZSet 数据',
        handler: (connectionId, key, start, stop) => redisConnectionManager.getZSetRange(connectionId, key, start, stop)
    },
    {
        channel: 'redis:get-stream-range',
        description: '分段获取 Stream entries',
        handler: (connectionId, key, maxId, minId, count) => redisConnectionManager.getStreamRange(connectionId, key, maxId, minId, count)
    },
    {
        channel: 'redis:get-stream-groups',
        description: '获取 Stream 消费组列表',
        handler: (connectionId, key) => redisConnectionManager.getStreamGroups(connectionId, key)
    },
    {
        channel: 'redis:get-stream-consumers',
        description: '获取 Stream 指定消费组下的消费者列表',
        handler: (connectionId, key, groupName) => redisConnectionManager.getStreamConsumers(connectionId, key, groupName)
    },
    {
        channel: 'redis:get-server-info',
        description: '获取服务器信息（INFO）',
        handler: (connectionId) => redisConnectionManager.getServerInfo(connectionId)
    },
    {
        channel: 'redis:select-database',
        description: '切换数据库',
        handler: (connectionId, dbIndex) => redisConnectionManager.selectDatabase(connectionId, dbIndex)
    }
]

/**
 * 注册所有 Redis 相关 IPC 处理器。
 * 当前文件只负责 IPC 边界，Redis 连接、命令执行和数据读取由 RedisConnectionManager 承担。
 */
export default () => {
    REDIS_IPC_HANDLERS.forEach(({ channel, description, handler }) => {
        // 每个通道统一丢弃 event，只把渲染进程传入的业务参数交给 manager。
        ipcMain.handle(channel, async (event, ...args) => {
            return await handler(...args)
        })

        log.info(`Redis IPC 已注册: ${channel} - ${description}`)
    })
}
