import {getDisplayBytes} from './valueByteUtil.js'

const BINARY_BYTES_PER_LINE = 8

/**
 * 把字节数组格式化为可阅读的 Binary 文本。
 * 每行固定 8 字节，避免二进制文本过长导致 textarea 横向阅读困难。
 *
 * @param {Uint8Array} bytes - 待展示的字节数组。
 * @returns {string} 分行后的 Binary 文本。
 */
const formatBytesToBinaryLines = (bytes) => {
    const lines = []

    for (let offset = 0; offset < bytes.length; offset += BINARY_BYTES_PER_LINE) {
        const chunk = bytes.slice(offset, offset + BINARY_BYTES_PER_LINE)
        const binaryText = [...chunk]
            .map((byte) => byte.toString(2).padStart(8, '0'))
            .join(' ')

        lines.push(`${offset.toString(16).padStart(8, '0').toUpperCase()}  ${binaryText}`)
    }

    return lines.join('\n')
}

/**
 * Binary 展示格式。
 * 优先基于 Redis 原始字节展示；缺少原始字节上下文时，退回文本 UTF-8 字节展示。
 *
 * @param {unknown} value - Redis value 原始展示值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatBinaryValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)

    return {
        success: true,
        text: formatBytesToBinaryLines(bytes),
        error: ''
    }
}
