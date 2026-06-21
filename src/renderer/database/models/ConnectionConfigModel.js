// 连接配置默认值：用于创建模型时填补缺失字段。
const CONNECTION_CONFIG_DEFAULTS = {
    id: null,
    group_name: '',
    name: '',
    host: 'localhost',
    port: 6379,
    username: null,
    password: null,
    db_index: 0,
    key_split: ':',
    use_ssh: false,
    ssh_host: null,
    ssh_port: 22,
    ssh_username: null,
    ssh_auth_type: 'password',
    ssh_password: null,
    ssh_private_key: null,
    ssh_private_key_passphrase: null,
    use_ssl: false,
    ssl_ca: null,
    ssl_cert: null,
    ssl_key: null,
    use_sentinel: false,
    sentinel_master_name: null,
    sentinel_master_pass: null,
    use_cluster: false,
    created_at: null,
    updated_at: null,
    last_active_at: null
}

/**
 * 读取字段值。
 * 只在字段值为 undefined 时使用默认值，避免 false、0、空字符串被错误替换。
 *
 * @param {Object} data - 原始数据
 * @param {string} key - 字段名
 * @returns {unknown} 字段值
 */
const valueOrDefault = (data, key) => data[key] ?? CONNECTION_CONFIG_DEFAULTS[key]

/**
 * 读取校验文案。
 * 模型层不直接依赖 i18n，由 repository 在需要面向用户抛错时传入翻译函数。
 *
 * @param {Function|null} t - 国际化翻译函数
 * @param {string} key - i18n 文案 key
 * @param {string} fallback - 默认中文文案
 * @returns {string} 校验文案
 */
const validationMessage = (t, key, fallback) => {
    return typeof t === 'function'
        ? t(key, {}, fallback)
        : fallback
}

/**
 * Redis 连接配置数据模型。
 * 对应 IndexedDB 表 connection_configs，用于统一默认值、序列化和基础校验。
 */
class ConnectionConfigModel {
    constructor(data = {}) {
        // 主键
        this.id = valueOrDefault(data, 'id')

        // 基础信息
        this.group_name = valueOrDefault(data, 'group_name')
        this.name = valueOrDefault(data, 'name')
        this.host = valueOrDefault(data, 'host')
        this.port = valueOrDefault(data, 'port')
        this.username = valueOrDefault(data, 'username')
        this.password = valueOrDefault(data, 'password')
        this.db_index = valueOrDefault(data, 'db_index')
        this.key_split = valueOrDefault(data, 'key_split')

        // SSH 隧道配置
        this.use_ssh = valueOrDefault(data, 'use_ssh')
        this.ssh_host = valueOrDefault(data, 'ssh_host')
        this.ssh_port = valueOrDefault(data, 'ssh_port')
        this.ssh_username = valueOrDefault(data, 'ssh_username')
        this.ssh_auth_type = valueOrDefault(data, 'ssh_auth_type')
        this.ssh_password = valueOrDefault(data, 'ssh_password')
        this.ssh_private_key = valueOrDefault(data, 'ssh_private_key')
        this.ssh_private_key_passphrase = valueOrDefault(data, 'ssh_private_key_passphrase')

        // SSL/TLS 配置
        this.use_ssl = valueOrDefault(data, 'use_ssl')
        this.ssl_ca = valueOrDefault(data, 'ssl_ca')
        this.ssl_cert = valueOrDefault(data, 'ssl_cert')
        this.ssl_key = valueOrDefault(data, 'ssl_key')

        // 哨兵配置
        this.use_sentinel = valueOrDefault(data, 'use_sentinel')
        this.sentinel_master_name = valueOrDefault(data, 'sentinel_master_name')
        this.sentinel_master_pass = valueOrDefault(data, 'sentinel_master_pass')

        // 集群配置
        this.use_cluster = valueOrDefault(data, 'use_cluster')

        // 时间戳
        this.created_at = valueOrDefault(data, 'created_at')
        this.updated_at = valueOrDefault(data, 'updated_at')
        this.last_active_at = valueOrDefault(data, 'last_active_at')
    }

    /**
     * 将模型转换为纯对象。
     * IndexedDB 只存储 plain object，不存储 class 方法。
     *
     * @returns {Object} 可写入 IndexedDB 的连接配置对象
     */
    modelToObject() {
        return {
            group_name: this.group_name,
            name: this.name,
            host: this.host,
            port: this.port,
            username: this.username || null,
            password: this.password || null,
            db_index: this.db_index,
            key_split: this.key_split,
            use_ssh: this.use_ssh,
            ssh_host: this.ssh_host || null,
            ssh_port: this.ssh_port,
            ssh_username: this.ssh_username || null,
            ssh_auth_type: this.ssh_auth_type,
            ssh_password: this.ssh_password || null,
            ssh_private_key: this.ssh_private_key || null,
            ssh_private_key_passphrase: this.ssh_private_key_passphrase || null,
            use_ssl: this.use_ssl,
            ssl_ca: this.ssl_ca || null,
            ssl_cert: this.ssl_cert || null,
            ssl_key: this.ssl_key || null,
            use_sentinel: this.use_sentinel,
            sentinel_master_name: this.sentinel_master_name || null,
            sentinel_master_pass: this.sentinel_master_pass || null,
            use_cluster: this.use_cluster,
            created_at: this.created_at || null,
            updated_at: this.updated_at || null,
            last_active_at: this.last_active_at || null
        }
    }

    /**
     * 验证模型数据是否有效。
     *
     * @param {Function|null} [t] - 可选国际化翻译函数
     * @returns {{ valid: boolean, errors: string[] }} 校验结果
     */
    validate(t = null) {
        const errors = []

        if (!this.group_name || this.group_name.trim() === '') {
            errors.push(validationMessage(t, 'database.connectionConfig.validation.groupNameRequired', '分组名称不能为空'))
        }

        if (!this.name || this.name.trim() === '') {
            errors.push(validationMessage(t, 'database.connectionConfig.validation.nameRequired', '连接名称不能为空'))
        }

        if (!this.host || this.host.trim() === '') {
            errors.push(validationMessage(t, 'database.connectionConfig.validation.hostRequired', '主机地址不能为空'))
        }

        if (!this.port || this.port < 1 || this.port > 65535) {
            errors.push(validationMessage(t, 'database.connectionConfig.validation.portRange', '端口号必须在 1-65535 之间'))
        }

        if (this.use_ssh) {
            if (!this.ssh_host || this.ssh_host.trim() === '') {
                errors.push(validationMessage(t, 'database.connectionConfig.validation.sshHostRequired', '启用 SSH 隧道时，SSH 主机地址不能为空'))
            }

            if (!this.ssh_port || this.ssh_port < 1 || this.ssh_port > 65535) {
                errors.push(validationMessage(t, 'database.connectionConfig.validation.sshPortRange', 'SSH 端口号必须在 1-65535 之间'))
            }

            if (!this.ssh_username || this.ssh_username.trim() === '') {
                errors.push(validationMessage(t, 'database.connectionConfig.validation.sshUsernameRequired', '启用 SSH 隧道时，SSH 用户名不能为空'))
            }
        }

        if (this.use_sentinel && (!this.sentinel_master_name || this.sentinel_master_name.trim() === '')) {
            errors.push(validationMessage(t, 'database.connectionConfig.validation.sentinelMasterRequired', '启用哨兵模式时，主节点名称不能为空'))
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }
}

export default ConnectionConfigModel
