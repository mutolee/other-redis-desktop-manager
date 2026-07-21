import {DEFAULT_VALUE_FORMAT_TYPE, VALUE_FORMAT_TYPES} from './valueFormatTypes.js'
import {formatBinaryValue} from './binaryFormatter.js'
import {formatBrotliValue} from './brotliFormatter.js'
import {formatGzipValue} from './gzipFormatter.js'
import {formatHexValue} from './hexFormatter.js'
import {formatJavaSerializationValue} from './javaSerializationFormatter.js'
import {formatJsonValue} from './jsonFormatter.js'
import {formatMessagePackValue} from './messagePackFormatter.js'
import {formatPhpSerializeValue} from './phpSerializeFormatter.js'
import {formatPickleValue} from './pickleFormatter.js'
import {formatTextValue} from './textFormatter.js'
import {formatZlibDeflateValue} from './zlibDeflateFormatter.js'

// Value formatter 注册表：新增展示格式时只需要在这里挂载解析函数。
const VALUE_FORMATTERS = {
    [VALUE_FORMAT_TYPES.TEXT]: formatTextValue,
    [VALUE_FORMAT_TYPES.JSON]: formatJsonValue,
    [VALUE_FORMAT_TYPES.HEX]: formatHexValue,
    [VALUE_FORMAT_TYPES.BINARY]: formatBinaryValue,
    [VALUE_FORMAT_TYPES.JAVA_SERIALIZATION]: formatJavaSerializationValue,
    [VALUE_FORMAT_TYPES.PHP_SERIALIZE]: formatPhpSerializeValue,
    [VALUE_FORMAT_TYPES.PICKLE]: formatPickleValue,
    [VALUE_FORMAT_TYPES.MESSAGE_PACK]: formatMessagePackValue,
    [VALUE_FORMAT_TYPES.GZIP]: formatGzipValue,
    [VALUE_FORMAT_TYPES.ZLIB_DEFLATE]: formatZlibDeflateValue,
    [VALUE_FORMAT_TYPES.BROTLI]: formatBrotliValue
}

/**
 * 判断展示格式是否已经注册。
 *
 * @param {string} formatType - 展示格式类型。
 * @returns {boolean} 是否存在对应 formatter。
 */
export const isSupportedValueFormat = (formatType) => Boolean(VALUE_FORMATTERS[formatType])

/**
 * 按指定格式解析 Redis value 展示文本。
 * 未知格式自动回退到 Text，保证 UI 不因格式配置异常而无法展示原始内容。
 *
 * @param {unknown} value - Redis value 原始展示值。
 * @param {string} formatType - 展示格式类型。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string, formatType:string}} 格式化结果。
 */
export const formatValueForDisplay = (value, formatType = DEFAULT_VALUE_FORMAT_TYPE, options = {}) => {
    const normalizedFormatType = isSupportedValueFormat(formatType)
        ? formatType
        : DEFAULT_VALUE_FORMAT_TYPE
    const result = VALUE_FORMATTERS[normalizedFormatType](value, options)

    return {
        ...result,
        formatType: normalizedFormatType
    }
}

export {DEFAULT_VALUE_FORMAT_TYPE, VALUE_FORMAT_TYPES}
