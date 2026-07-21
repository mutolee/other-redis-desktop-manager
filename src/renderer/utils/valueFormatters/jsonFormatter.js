import {getDisplayText} from './valueByteUtil.js'

/**
 * JSON 展示格式。
 * 只在预览模式格式化展示 JSON，文本来源优先使用 Redis 原始字节的 UTF-8 解码结果。
 *
 * @param {unknown} value - Redis value 文本值。
 * @param {{rawBase64?: string}} options - formatter 额外上下文。
 * @returns {{success:boolean, text:string, error:string}} 格式化结果。
 */
export const formatJsonValue = (value, options = {}) => {
    const rawText = getDisplayText(value, options)

    try {
        return {
            success: true,
            text: JSON.stringify(JSON.parse(rawText), null, 4),
            error: ''
        }
    } catch (error) {
        return {
            success: false,
            text: rawText,
            error: error.message || 'Invalid JSON'
        }
    }
}
