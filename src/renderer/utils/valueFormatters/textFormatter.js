import {getDisplayText} from './valueByteUtil.js'

/**
 * Text/UTF-8 展示格式。
 * 优先基于 Redis 原始字节解码 UTF-8，缺少原始字节或解码失败时退回字符串值。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatTextValue = (value, options = {}) => ({
    success: true,
    text: getDisplayText(value, options),
    error: ''
})
