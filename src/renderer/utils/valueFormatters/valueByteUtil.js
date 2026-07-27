/**
 * Redis value 字节工具。
 * Hex/Binary 等格式必须基于 Redis 原始字节展示，不能把前端字符串再次编码后展示。
 */

/**
 * 从 base64 还原 Redis 原始字节。
 *
 * @param {string} base64Text - main 进程传回的原始字节 base64 文本。
 * @returns {Uint8Array|null} 还原后的字节数组，解析失败时返回 null。
 */
export const decodeBase64ToBytes = (base64Text) => {
    // Empty raw bytes mean that the caller has no Redis byte payload; use the text fallback.
    if (typeof base64Text !== 'string' || base64Text.length === 0) {
        return null
    }

    try {
        const binaryText = globalThis.atob(base64Text)
        const bytes = new Uint8Array(binaryText.length)

        for (let index = 0; index < binaryText.length; index += 1) {
            bytes[index] = binaryText.charCodeAt(index)
        }

        return bytes
    } catch (error) {
        return null
    }
}

/**
 * 获取 Redis value 的展示字节。
 * 有 raw base64 时使用 Redis 原始字节；没有 raw base64 时才退回 UTF-8 字符串字节。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {Uint8Array} 可用于 Hex/Binary 展示的字节数组。
 */
export const getDisplayBytes = (value, options = {}) => {
    const rawBytes = decodeBase64ToBytes(options.rawBase64)

    if (rawBytes) {
        return rawBytes
    }

    const rawText = typeof value === 'string' ? value : ''

    return new TextEncoder().encode(rawText)
}

/**
 * 获取 Redis value 的 UTF-8 展示文本。
 * Text/JSON 等文本格式优先从 Redis 原始字节解码，解码失败时退回 main 进程给出的字符串值。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {string} 可用于文本预览和 JSON 解析的字符串。
 */
export const getDisplayText = (value, options = {}) => {
    const fallbackText = typeof value === 'string' ? value : ''
    const rawBytes = decodeBase64ToBytes(options.rawBase64)

    if (!rawBytes) {
        return fallbackText
    }

    try {
        return new TextDecoder('utf-8', {fatal: true}).decode(rawBytes)
    } catch (error) {
        return fallbackText
    }
}
