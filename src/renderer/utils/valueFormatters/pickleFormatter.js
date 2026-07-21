import {Parser} from 'pickleparser'
import {getDisplayBytes, getDisplayText} from './valueByteUtil.js'
import {formatParsedValueForDisplay} from './parsedValueDisplayUtil.js'

/**
 * 把 Pickle 解析结果转换成 JSON 可序列化结构。
 * Pickle 可能解析出 BigInt、Map、Set、TypedArray 或自定义对象，需要统一规整后展示。
 *
 * @param {unknown} value - Pickle 反序列化后的值。
 * @param {WeakMap<object, string>} seen - 已访问对象索引，用于避免循环引用。
 * @param {string} path - 当前对象路径。
 * @returns {unknown} 可安全 JSON.stringify 的对象。
 */
const normalizePickleValue = (value, seen = new WeakMap(), path = '$') => {
    if (typeof value === 'bigint') {
        return value.toString()
    }

    if (value === null || typeof value !== 'object') {
        return value
    }

    if (seen.has(value)) {
        return `[Circular: ${seen.get(value)}]`
    }

    seen.set(value, path)

    if (Array.isArray(value)) {
        return value.map((item, index) => normalizePickleValue(item, seen, `${path}[${index}]`))
    }

    if (value instanceof Map) {
        return Object.fromEntries(
            [...value.entries()].map(([key, item]) => [
                String(key),
                normalizePickleValue(item, seen, `${path}.${String(key)}`)
            ])
        )
    }

    if (value instanceof Set) {
        return [...value.values()].map((item, index) => normalizePickleValue(item, seen, `${path}[${index}]`))
    }

    if (ArrayBuffer.isView(value)) {
        return {
            type: value.constructor.name,
            values: [...new Uint8Array(value.buffer, value.byteOffset, value.byteLength)]
        }
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            normalizePickleValue(item, seen, `${path}.${key}`)
        ])
    )
}

/**
 * Pickle 展示格式。
 * 基于 Redis 原始字节解析 Python Pickle 协议 0-5，并按结果的实际类型生成展示文本。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatPickleValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)
    const rawText = getDisplayText(value, options)

    try {
        const parser = new Parser({
            unpicklingTypeOfSet: 'array',
            unpicklingTypeOfDictionary: 'object'
        })
        const parsedValue = parser.parse(bytes)

        return {
            success: true,
            text: formatParsedValueForDisplay(normalizePickleValue(parsedValue)),
            error: ''
        }
    } catch (error) {
        return {
            success: false,
            text: rawText,
            error: error.message || 'Failed to parse Pickle value'
        }
    }
}
