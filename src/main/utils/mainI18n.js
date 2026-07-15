/**
 * 主进程轻量国际化工具。
 * main 进程无法直接读取 renderer 的 Pinia store，因此由 renderer 启动和语言变化时通过 IPC 同步当前语言。
 */

// 主进程支持的语言列表：与 renderer i18n 保持一致。
const SUPPORTED_LANGUAGES = new Set(['zh-CN', 'en-US'])

// 主进程文案字典：只放托盘菜单、main IPC 和 Redis IPC 会返回给用户的文案。
const MAIN_MESSAGES = {
    'zh-CN': {
        tray: {
            showWindow: '显示窗口',
            hideWindow: '隐藏窗口',
            quit: '退出'
        },
        mainWindow: {
            missing: '主窗口不存在',
            externalUrlRequired: '外部链接不能为空',
            unsupportedProtocol: '不支持打开该协议: {value}',
            openExternalFail: '打开外部链接失败'
        },
        appInfo: {
            updateRequestFail: 'GitHub Release 请求失败: {value}',
            updateVersionMissing: 'GitHub Release 未返回有效版本号',
            updateCheckTimeout: '检查更新超时',
            updateCheckFail: '检查更新失败'
        },
        redis: {
            commandTimeout: '{label}执行超时（>{timeout}ms）',
            sentinelMasterMissing: '未连接到 Redis 主节点（请检查哨兵配置）',
            connecting: '正在连接...',
            tcpConnected: 'TCP连接已建立',
            connectSuccess: '连接成功',
            connectFail: '连接失败',
            connectionMissing: '连接不存在',
            connectionClosed: '连接已关闭',
            connectionEnded: '连接已结束',
            connectionError: '连接发生错误',
            connectionDisconnected: '连接已断开',
            reconnecting: '正在重连，延迟{delay}ms',
            closeConnectionFail: '关闭连接失败',
            connectionRequired: '连接不存在，请先建立连接',
            connectionStatusInvalid: '连接状态异常: {value}',
            commandFail: '命令执行失败',
            databaseSelected: '已切换到数据库 {value}',
            selectDatabaseFail: '切换数据库失败',
            connectionMissingOrDisconnected: '连接不存在或未连接',
            scanFail: 'SCAN 执行失败',
            getKeyDataFail: '获取 key 数据失败',
            exportKeysEmpty: '请选择需要导出的 Key',
            exportKeysTooMany: '单次最多导出 {value} 个 Key',
            exportKeysFail: '导出 Key 失败',
            importFileInvalid: '导入文件格式不正确',
            importKeysFail: '导入 Key 失败',
            getHashDataFail: '获取 Hash 数据失败',
            getListDataFail: '获取 List 数据失败',
            getSetDataFail: '获取 Set 数据失败',
            getZSetDataFail: '获取 ZSet 数据失败',
            getStreamDataFail: '获取 Stream 数据失败',
            getStreamGroupsFail: '获取 Stream 消费组失败',
            getStreamConsumersFail: '获取 Stream 消费者失败',
            infoFormatInvalid: 'INFO 返回格式异常',
            getServerInfoFail: '获取服务器信息失败',
            clusterNotImplemented: '集群模式暂未实现'
        }
    },
    'en-US': {
        tray: {
            showWindow: 'Show Window',
            hideWindow: 'Hide Window',
            quit: 'Quit'
        },
        mainWindow: {
            missing: 'Main window does not exist',
            externalUrlRequired: 'External URL is required',
            unsupportedProtocol: 'Unsupported protocol: {value}',
            openExternalFail: 'Failed to open external URL'
        },
        appInfo: {
            updateRequestFail: 'GitHub Release request failed: {value}',
            updateVersionMissing: 'GitHub Release did not return a valid version',
            updateCheckTimeout: 'Update check timed out',
            updateCheckFail: 'Failed to check for updates'
        },
        redis: {
            commandTimeout: '{label} timed out (>{timeout}ms)',
            sentinelMasterMissing: 'Not connected to the Redis master. Check Sentinel configuration.',
            connecting: 'Connecting...',
            tcpConnected: 'TCP connection established',
            connectSuccess: 'Connected',
            connectFail: 'Connection failed',
            connectionMissing: 'Connection does not exist',
            connectionClosed: 'Connection closed',
            connectionEnded: 'Connection ended',
            connectionError: 'Connection error',
            connectionDisconnected: 'Connection disconnected',
            reconnecting: 'Reconnecting, delay {delay}ms',
            closeConnectionFail: 'Failed to close connection',
            connectionRequired: 'Connection does not exist. Connect first.',
            connectionStatusInvalid: 'Invalid connection status: {value}',
            commandFail: 'Command execution failed',
            databaseSelected: 'Switched to database {value}',
            selectDatabaseFail: 'Failed to switch database',
            connectionMissingOrDisconnected: 'Connection does not exist or is not connected',
            scanFail: 'SCAN failed',
            getKeyDataFail: 'Failed to get key data',
            exportKeysEmpty: 'Select Keys to export',
            exportKeysTooMany: 'Export up to {value} Keys at a time',
            exportKeysFail: 'Failed to export Keys',
            importFileInvalid: 'Invalid import file format',
            importKeysFail: 'Failed to import Keys',
            getHashDataFail: 'Failed to get Hash data',
            getListDataFail: 'Failed to get List data',
            getSetDataFail: 'Failed to get Set data',
            getZSetDataFail: 'Failed to get ZSet data',
            getStreamDataFail: 'Failed to get Stream data',
            getStreamGroupsFail: 'Failed to get Stream groups',
            getStreamConsumersFail: 'Failed to get Stream consumers',
            infoFormatInvalid: 'Invalid INFO response format',
            getServerInfoFail: 'Failed to get server info',
            clusterNotImplemented: 'Cluster mode is not implemented yet'
        }
    }
}

let currentLanguage = 'zh-CN'

/**
 * 规范化语言值。
 *
 * @param {string} language - renderer 同步过来的语言值
 * @returns {'zh-CN'|'en-US'} main 进程可使用的语言值
 */
const normalizeLanguage = (language) => {
    return SUPPORTED_LANGUAGES.has(language) ? language : 'zh-CN'
}

/**
 * 按点路径读取对象值。
 *
 * @param {Object} source - 文案对象
 * @param {string} key - 点路径 key
 * @returns {string|undefined} 文案值
 */
const readMessage = (source, key) => {
    return key.split('.').reduce((target, segment) => target?.[segment], source)
}

/**
 * 替换文案中的占位符。
 *
 * @param {string} message - 原始文案
 * @param {Object} params - 占位参数
 * @returns {string} 替换后的文案
 */
const formatMessage = (message, params = {}) => {
    return Object.entries(params).reduce((text, [key, value]) => {
        return text.replaceAll(`{${key}}`, String(value ?? ''))
    }, message)
}

/**
 * 设置 main 进程当前语言。
 *
 * @param {string} language - 新语言
 * @returns {'zh-CN'|'en-US'} 实际生效的语言
 */
export const setMainLanguage = (language) => {
    currentLanguage = normalizeLanguage(language)
    return currentLanguage
}

/**
 * 获取 main 进程当前语言。
 *
 * @returns {'zh-CN'|'en-US'} 当前语言
 */
export const getMainLanguage = () => currentLanguage

/**
 * 读取 main 进程文案。
 *
 * @param {string} key - 文案 key
 * @param {Object} [params] - 插值参数
 * @returns {string} 当前语言文案
 */
export const tMain = (key, params = {}) => {
    const message = readMessage(MAIN_MESSAGES[currentLanguage], key)
        ?? readMessage(MAIN_MESSAGES['zh-CN'], key)
        ?? key

    return formatMessage(message, params)
}
