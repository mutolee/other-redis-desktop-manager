import {ungzip} from 'pako'
import {formatDecompressedBytes} from './compressedTextUtil.js'
import {getDisplayBytes, getDisplayText} from './valueByteUtil.js'

/**
 * Gzip 展示格式。
 * 基于 Redis 原始字节执行 Gzip 解压，并把解压后的 UTF-8 文本展示出来。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatGzipValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)
    const rawText = getDisplayText(value, options)

    try {
        const decompressedBytes = ungzip(bytes)

        return {
            success: true,
            text: formatDecompressedBytes(decompressedBytes),
            error: ''
        }
    } catch (error) {
        return {
            success: false,
            text: rawText,
            error: error.message || 'Failed to decompress Gzip value'
        }
    }
}
