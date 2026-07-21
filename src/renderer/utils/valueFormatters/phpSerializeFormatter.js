import {Buffer} from 'buffer'
import {isSerialized, unserialize} from 'php-serialize'
import {getDisplayBytes, getDisplayText} from './valueByteUtil.js'
import {formatParsedValueForDisplay} from './parsedValueDisplayUtil.js'

/**
 * 确保 php-serialize 在 renderer 中可以访问 Buffer。
 * 该库内部会调用 Buffer.from，Electron renderer 默认不保证存在 Node 全局对象。
 */
const ensureBufferGlobal = () => {
    if (!globalThis.Buffer) {
        globalThis.Buffer = Buffer
    }
}

/**
 * 把 PHP unserialize 结果转换成 JSON 可序列化结构。
 *
 * @param {unknown} value - PHP 反序列化后的值。
 * @param {WeakMap<object, string>} seen - 已访问对象索引，用于避免循环引用。
 * @param {string} path - 当前对象路径。
 * @returns {unknown} 可安全 JSON.stringify 的对象。
 */
const normalizePhpValue = (value, seen = new WeakMap(), path = '$') => {
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
        return value.map((item, index) => normalizePhpValue(item, seen, `${path}[${index}]`))
    }

    const normalized = Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            normalizePhpValue(item, seen, `${path}.${key}`)
        ])
    )

    if (value.constructor && value.constructor.name && value.constructor.name !== 'Object') {
        return {
            className: value.constructor.name,
            fields: normalized
        }
    }

    return normalized
}

/**
 * PHP Serialize 展示格式。
 * 优先使用 Redis 原始字节构造二进制字符串，保证 PHP string 的长度检查尽量基于原始字节。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatPhpSerializeValue = (value, options = {}) => {
    ensureBufferGlobal()

    const bytes = getDisplayBytes(value, options)
    const rawText = getDisplayText(value, options)
    const binaryText = Buffer.from(bytes).toString('binary')

    if (!isSerialized(rawText, false) && !isSerialized(binaryText, false)) {
        return {
            success: false,
            text: rawText,
            error: 'Invalid PHP serialized value'
        }
    }

    try {
        const parsedValue = unserialize(binaryText, {}, {strict: false, encoding: 'binary'})

        return {
            success: true,
            text: formatParsedValueForDisplay(normalizePhpValue(parsedValue)),
            error: ''
        }
    } catch (binaryError) {
        try {
            const parsedValue = unserialize(rawText, {}, {strict: false, encoding: 'utf8'})

            return {
                success: true,
                text: formatParsedValueForDisplay(normalizePhpValue(parsedValue)),
                error: ''
            }
        } catch (textError) {
            return {
                success: false,
                text: rawText,
                error: textError.message || binaryError.message || 'Failed to parse PHP serialized value'
            }
        }
    }
}
