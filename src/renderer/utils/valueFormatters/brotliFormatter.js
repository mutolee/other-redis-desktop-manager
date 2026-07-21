import decompress from 'brotli/decompress.js'
import {formatDecompressedBytes} from './compressedTextUtil.js'
import {getDisplayBytes, getDisplayText} from './valueByteUtil.js'

/**
 * Brotli 展示格式。
 * 基于 Redis 原始字节执行 Brotli 解压，并把解压后的 UTF-8 文本或 JSON 文本展示出来。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatBrotliValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)
    const rawText = getDisplayText(value, options)

    try {
        const decompressedBytes = decompress(bytes)

        // brotli 库在少数无效输入下可能返回空结果而不是抛错，这里统一按解析失败处理。
        if (!decompressedBytes || (bytes.length > 1 && decompressedBytes.length === 0)) {
            throw new Error('Failed to decompress Brotli value')
        }

        return {
            success: true,
            text: formatDecompressedBytes(decompressedBytes),
            error: ''
        }
    } catch (error) {
        return {
            success: false,
            text: rawText,
            error: error.message || 'Failed to decompress Brotli value'
        }
    }
}
