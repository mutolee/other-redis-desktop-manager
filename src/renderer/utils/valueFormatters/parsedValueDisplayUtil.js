/**
 * 解析结果展示工具。
 * 基础类型保持自然文本，对象和数组才转换为便于 textarea 阅读的缩进结构。
 */

/**
 * 把反序列化结果转换为展示文本。
 *
 * @param {unknown} value - Java、PHP、Pickle 或 MessagePack 的解析结果。
 * @returns {string} 保留基础类型语义的展示文本。
 */
export const formatParsedValueForDisplay = (value) => {
    if (typeof value === 'string') {
        return value
    }

    if (value === null) {
        return 'null'
    }

    if (typeof value !== 'object') {
        return String(value)
    }

    const structuredText = JSON.stringify(value, null, 4)

    return typeof structuredText === 'string' ? structuredText : String(value)
}
