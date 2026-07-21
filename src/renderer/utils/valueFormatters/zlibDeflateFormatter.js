import {inflate, inflateRaw} from 'pako'
import {formatDecompressedBytes} from './compressedTextUtil.js'
import {getDisplayBytes, getDisplayText} from './valueByteUtil.js'

/**
 * Zlib/Deflate 展示格式。
 * 先尝试 zlib-wrapped deflate，再尝试 raw deflate，覆盖 Redis value 中常见的两类 Deflate 存储方式。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatZlibDeflateValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)
    const rawText = getDisplayText(value, options)

    try {
        return {
            success: true,
            text: formatDecompressedBytes(inflate(bytes)),
            error: ''
        }
    } catch (zlibError) {
        try {
            return {
                success: true,
                text: formatDecompressedBytes(inflateRaw(bytes)),
                error: ''
            }
        } catch (rawError) {
            return {
                success: false,
                text: rawText,
                error: rawError.message || zlibError.message || 'Failed to decompress Zlib/Deflate value'
            }
        }
    }
}
