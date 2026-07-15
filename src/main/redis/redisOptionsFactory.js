import {tMain} from '../utils/mainI18n.js'

/**
 * Redis ioredis 连接选项工厂。
 * 集中处理单机、哨兵、集群等连接配置到 ioredis options 的转换。
 */
import {DEFAULT_CONNECT_TIMEOUT_MS, normalizeTimeout, REDIS_KEEP_ALIVE_MS} from './redisDataUtils.js'

/**
 * 读取连接配置中的连接超时。
 * @param {Object} config - 连接配置。
 * @returns {number} ioredis 连接建立超时毫秒值。
 */
export const getConnectTimeout = (config = {}) => {
    return normalizeTimeout(config.connectTimeout, DEFAULT_CONNECT_TIMEOUT_MS)
}

/**
 * 根据配置构建 ioredis 选项。
 * @param {Object} config - 连接配置 { host, port, password, use_sentinel, ... }。
 * @returns {Object} ioredis 构造函数选项。
 */
export const buildRedisOptions = (config = {}) => {
    // 哨兵模式：通过哨兵节点发现主节点地址。
    if (config.use_sentinel) {
        return {
            sentinels: [{host: config.host, port: config.port}],
            name: config.sentinel_master_name,
            password: config.sentinel_master_pass || config.password || undefined,
            db: config.db_index || 0,
            connectTimeout: getConnectTimeout(config),
            keepAlive: REDIS_KEEP_ALIVE_MS,
        }
    }

    // 集群模式暂未实现，先显式报错，避免误走单机连接逻辑。
    if (config.use_cluster) {
        throw new Error(tMain('redis.clusterNotImplemented'))
    }

    // 默认单机模式：直接连接配置中的 Redis 节点。
    return {
        host: config.host,
        port: config.port,
        username: config.username || undefined,
        password: config.password || undefined,
        db: config.db_index || 0,
        connectTimeout: getConnectTimeout(config),
        keepAlive: REDIS_KEEP_ALIVE_MS,
    }
}
