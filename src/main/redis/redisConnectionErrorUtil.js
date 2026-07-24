// Redis 连接中断类错误码，用于统一判断命令失败是否需要同步连接状态。
const REDIS_CONNECTION_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EPIPE'
])

/**
 * 判断异常是否属于 Redis 连接中断。
 * 优先使用稳定的 error.code，消息匹配只用于兼容 ioredis 未提供错误码的连接关闭异常。
 *
 * @param {unknown} error - Redis 命令异常。
 * @returns {boolean} 是否应将连接状态更新为 disconnected。
 */
export const isRedisConnectionError = (error) => {
    if (!error || typeof error !== 'object') {
        return false
    }

    if (REDIS_CONNECTION_ERROR_CODES.has(error.code)) {
        return true
    }

    const message = String(error.message || '').toLowerCase()
    return message.includes('connection is closed')
        || message.includes('connection closed')
        || message.includes('connection lost')
        || message.includes('stream isn\'t writeable')
        || message.includes('connection')
}
