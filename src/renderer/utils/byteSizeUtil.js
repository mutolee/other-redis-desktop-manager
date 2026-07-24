/**
 * 字节容量格式化工具。
 * 用于 Redis Value、Key 内存占用等界面统一展示可读容量单位。
 */

/**
 * 将字节数格式化为人类可读单位。
 * @param {number|string} bytes - 原始字节数。
 * @returns {string} 格式化后的容量文本。
 */
export const formatByteSize = (bytes) => {
    const normalizedBytes = Number(bytes)

    if (!Number.isFinite(normalizedBytes) || normalizedBytes <= 0) {
        return '0 B'
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const unitIndex = Math.min(Math.floor(Math.log(normalizedBytes) / Math.log(1024)), units.length - 1)
    const value = normalizedBytes / (1024 ** unitIndex)
    const precision = unitIndex === 0 ? 0 : 2

    return `${Number(value.toFixed(precision))} ${units[unitIndex]}`
}
