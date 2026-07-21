// Redis value 展示格式常量：只描述展示方式，不参与编辑和保存序列化。
export const VALUE_FORMAT_TYPES = {
    TEXT: 'text',
    JSON: 'json',
    HEX: 'hex',
    BINARY: 'binary',
    JAVA_SERIALIZATION: 'javaSerialization',
    PHP_SERIALIZE: 'phpSerialize',
    PICKLE: 'pickle',
    MESSAGE_PACK: 'messagePack',
    GZIP: 'gzip',
    ZLIB_DEFLATE: 'zlibDeflate',
    BROTLI: 'brotli'
}

export const DEFAULT_VALUE_FORMAT_TYPE = VALUE_FORMAT_TYPES.TEXT
