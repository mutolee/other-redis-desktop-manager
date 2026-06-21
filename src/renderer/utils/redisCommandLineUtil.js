/**
 * Redis 命令行工具。
 * 负责把用户输入的命令字符串解析为命令名和参数，并将执行结果格式化为适合终端面板展示的文本。
 */

/**
 * 解析 Redis 命令输入。
 * 支持双引号、单引号和反斜杠转义，便于输入带空格的参数。
 * @param {string} input 命令行原始输入文本。
 * @returns {{ command: string, args: string[] }} 解析后的命令名和参数数组。
 */
export const parseRedisCommandInput = (input) => {
    const tokens = []
    let currentToken = ''
    let quoteChar = ''
    let isEscaped = false

    for (const char of String(input || '')) {
        // 处理反斜杠转义，允许输入空格、引号等特殊字符。
        if (isEscaped) {
            currentToken += char
            isEscaped = false
            continue
        }

        if (char === '\\') {
            isEscaped = true
            continue
        }

        // 引号内的内容保持原样，直到遇到对应的闭合引号。
        if (quoteChar) {
            if (char === quoteChar) {
                quoteChar = ''
            } else {
                currentToken += char
            }
            continue
        }

        if (char === '"' || char === '\'') {
            quoteChar = char
            continue
        }

        // 非引号状态下，空白符用于分割命令和参数。
        if (/\s/.test(char)) {
            if (currentToken) {
                tokens.push(currentToken)
                currentToken = ''
            }
            continue
        }

        currentToken += char
    }

    if (isEscaped) {
        currentToken += '\\'
    }

    if (currentToken) {
        tokens.push(currentToken)
    }

    return {
        command: tokens[0] || '',
        args: tokens.slice(1)
    }
}

/**
 * 将 Redis 命令执行结果转换为终端文本。
 * @param {*} result Redis 返回的原始结果。
 * @returns {string} 适合在命令面板中展示的格式化文本。
 */
export const formatRedisCommandResult = (result) => {
    // Redis nil 统一展示为常见 CLI 语义。
    if (result === null || typeof result === 'undefined') {
        return '(nil)'
    }

    // 布尔值常见于部分命令结果，转为更直观的整数语义。
    if (typeof result === 'boolean') {
        return result ? '(integer) 1' : '(integer) 0'
    }

    // 简单数值直接展示，整数带上 Redis CLI 风格前缀。
    if (typeof result === 'number') {
        return Number.isInteger(result) ? `(integer) ${result}` : String(result)
    }

    if (typeof result === 'string') {
        return result
    }

    // 数组按行编号展示，便于阅读多条返回结果。
    if (Array.isArray(result)) {
        if (result.length === 0) {
            return '(empty array)'
        }

        return result
            .map((item, index) => `${index + 1}) ${formatRedisCommandResult(item)}`)
            .join('\n')
    }

    // 对象结果统一格式化为 JSON，兼顾 hash / info 之类结构化返回。
    if (typeof result === 'object') {
        try {
            return JSON.stringify(result, null, 2)
        } catch (error) {
            return String(result)
        }
    }

    return String(result)
}
