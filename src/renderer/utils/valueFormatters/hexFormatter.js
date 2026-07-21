import {getDisplayBytes} from './valueByteUtil.js'

const HEX_BYTES_PER_LINE = 16

/**
 * 把字节数组格式化为可阅读的 Hex 文本。
 * 每行固定 16 字节，便于后续接入真正二进制读取后继续复用同一展示规则。
 *
 * @param {Uint8Array} bytes - 待展示的字节数组。
 * @returns {string} 分行后的 Hex 文本。
 */
const formatBytesToHexLines = (bytes) => {
    const lines = []

    for (let offset = 0; offset < bytes.length; offset += HEX_BYTES_PER_LINE) {
        const chunk = bytes.slice(offset, offset + HEX_BYTES_PER_LINE)
        const hexText = [...chunk]
            .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
            .join(' ')

        lines.push(`${offset.toString(16).padStart(8, '0').toUpperCase()}  ${hexText}`)
    }

    return lines.join('\n')
}

/**
 * Hex 展示格式。
 * 优先基于 Redis 原始字节展示；缺少原始字节上下文时，退回文本 UTF-8 字节展示。
 *
 * @param {unknown} value - Redis value 原始展示值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatHexValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)

    return {
        success: true,
        text: formatBytesToHexLines(bytes),
        error: ''
    }
}
