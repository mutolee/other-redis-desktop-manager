import {decode} from '@msgpack/msgpack'
import {getDisplayBytes, getDisplayText} from './valueByteUtil.js'
import {formatParsedValueForDisplay} from './parsedValueDisplayUtil.js'

/**
 * 把 MessagePack 解析结果转换成 JSON 可序列化结构。
 * MessagePack 可能包含 BigInt、Map、TypedArray 或扩展类型，展示前需要统一规整。
 *
 * @param {unknown} value - MessagePack 解码后的值。
 * @param {WeakMap<object, string>} seen - 已访问对象索引，用于避免循环引用。
 * @param {string} path - 当前对象路径。
 * @returns {unknown} 可安全 JSON.stringify 的对象。
 */
const normalizeMessagePackValue = (value, seen = new WeakMap(), path = '$') => {
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
        return value.map((item, index) => normalizeMessagePackValue(item, seen, `${path}[${index}]`))
    }

    if (value instanceof Map) {
        return Object.fromEntries(
            [...value.entries()].map(([key, item]) => [
                String(key),
                normalizeMessagePackValue(item, seen, `${path}.${String(key)}`)
            ])
        )
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
            normalizeMessagePackValue(item, seen, `${path}.${key}`)
        ])
    )
}

/**
 * MessagePack 展示格式。
 * 基于 Redis 原始字节解析 MessagePack，并按结果的实际类型生成展示文本。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatMessagePackValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)
    const rawText = getDisplayText(value, options)

    try {
        const parsedValue = decode(bytes)

        return {
            success: true,
            text: formatParsedValueForDisplay(normalizeMessagePackValue(parsedValue)),
            error: ''
        }
    } catch (error) {
        return {
            success: false,
            text: rawText,
            error: error.message || 'Failed to parse MessagePack value'
        }
    }
}
