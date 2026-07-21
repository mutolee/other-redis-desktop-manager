/**
 * 压缩 value 展示工具。
 * Gzip/Zlib/Deflate/Brotli 解压后的结果统一在这里执行 UTF-8 解码。
 */

/**
 * 把解压后的字节转换为 textarea 展示文本。
 * 只还原解压后的原始文本，不对合法 JSON 做隐式格式化。
 *
 * @param {Uint8Array} bytes - 解压后的字节。
 * @returns {string} 可读展示文本。
 */
export const formatDecompressedBytes = (bytes) => {
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes)
}
