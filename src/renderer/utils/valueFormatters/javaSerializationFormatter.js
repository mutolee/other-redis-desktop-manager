import {ObjectInputStream} from 'java-object-serialization'
import {getDisplayBytes} from './valueByteUtil.js'
import {formatParsedValueForDisplay} from './parsedValueDisplayUtil.js'

const JAVA_SERIALIZATION_MAGIC = [0xAC, 0xED, 0x00, 0x05]

/**
 * 判断字节内容是否符合 Java Object Serialization 流头。
 *
 * @param {Uint8Array} bytes - Redis value 原始字节。
 * @returns {boolean} 是否是 Java Serialization 流。
 */
const isJavaSerializationStream = (bytes) => (
    bytes.length >= JAVA_SERIALIZATION_MAGIC.length
    && JAVA_SERIALIZATION_MAGIC.every((byte, index) => bytes[index] === byte)
)

/**
 * 把 Java Serialization 解析结果转换成 JSON 可序列化对象。
 * 未注册 Java 类时，java-object-serialization 会返回带 className/fields 的 JavaObject。
 *
 * @param {unknown} value - 解析后的 Java 对象。
 * @param {WeakMap<object, string>} seen - 已访问对象索引，用于避免循环引用。
 * @param {string} path - 当前对象路径。
 * @returns {unknown} 可安全 JSON.stringify 的对象。
 */
const normalizeJavaValue = (value, seen = new WeakMap(), path = '$') => {
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
        return value.map((item, index) => normalizeJavaValue(item, seen, `${path}[${index}]`))
    }

    if (value instanceof Map) {
        return Object.fromEntries(
            [...value.entries()].map(([key, item]) => [
                String(key),
                normalizeJavaValue(item, seen, `${path}.${String(key)}`)
            ])
        )
    }

    if (value.fields instanceof Map && typeof value.className === 'string') {
        const normalized = {
            className: value.className,
            serialVersionUid: typeof value.serialVersionUid === 'bigint'
                ? value.serialVersionUid.toString()
                : value.serialVersionUid,
            fields: normalizeJavaValue(value.fields, seen, `${path}.fields`)
        }

        if (Array.isArray(value.annotations) && value.annotations.length > 0) {
            normalized.annotations = normalizeJavaValue(value.annotations, seen, `${path}.annotations`)
        }

        return normalized
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            normalizeJavaValue(item, seen, `${path}.${key}`)
        ])
    )
}

/**
 * Java Serialization 展示格式。
 * 基于 Redis 原始字节读取 ObjectInputStream，并按解析结果的实际类型生成展示文本。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatJavaSerializationValue = (value, options = {}) => {
    const bytes = getDisplayBytes(value, options)

    if (!isJavaSerializationStream(bytes)) {
        return {
            success: false,
            text: typeof value === 'string' ? value : '',
            error: 'Invalid Java serialization stream header'
        }
    }

    try {
        const stream = new ObjectInputStream(bytes)
        const parsedValue = stream.readObject()

        return {
            success: true,
            text: formatParsedValueForDisplay(normalizeJavaValue(parsedValue)),
            error: ''
        }
    } catch (error) {
        return {
            success: false,
            text: typeof value === 'string' ? value : '',
            error: error.message || 'Failed to parse Java serialization data'
        }
    }
}
