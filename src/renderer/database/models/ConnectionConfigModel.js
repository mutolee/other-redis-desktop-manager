/**
 * Redis连接配置数据模型
 * 对应数据库表 connection_configs
 */
class ConnectionConfigModel {
    constructor(data = {}) {
        // 主键
        this.id = data.id || null;

        // 基础信息
        this.group_name = data.group_name || '';
        this.name = data.name || '';
        this.host = data.host || 'localhost';
        this.port = data.port || 6379;
        this.username = data.username || null;
        this.password = data.password || null;
        this.db_index = data.db_index || 0;
        this.key_split = data.key_split || ':';

        // SSH 隧道配置
        this.use_ssh = data.use_ssh || false;
        this.ssh_host = data.ssh_host || null;
        this.ssh_port = data.ssh_port || 22;
        this.ssh_username = data.ssh_username || null;
        this.ssh_auth_type = data.ssh_auth_type || 'password';
        this.ssh_password = data.ssh_password || null;
        this.ssh_private_key = data.ssh_private_key || null;
        this.ssh_private_key_passphrase = data.ssh_private_key_passphrase || null;

        // SSL/TLS 配置
        this.use_ssl = data.use_ssl || false;
        this.ssl_ca = data.ssl_ca || null;
        this.ssl_cert = data.ssl_cert || null;
        this.ssl_key = data.ssl_key || null;

        // 哨兵配置
        this.use_sentinel = data.use_sentinel || false;
        this.sentinel_master_name = data.sentinel_master_name || null;
        this.sentinel_master_pass = data.sentinel_master_pass || null;

        // 集群配置
        this.use_cluster = data.use_cluster || false;

        // 时间戳
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        this.last_active_at = data.last_active_at || null;
    }


    /**
     * 将模型转换为纯对象（用于 IndexedDB 存储）
     * @returns {Object} 纯对象，不包含方法
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
        };
    }

    /**
     * 验证模型数据是否有效
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.group_name || this.group_name.trim() === '') {
            errors.push('分组名称不能为空');
        }

        if (!this.name || this.name.trim() === '') {
            errors.push('连接名称不能为空');
        }

        if (!this.host || this.host.trim() === '') {
            errors.push('主机地址不能为空');
        }

        if (!this.port || this.port < 1 || this.port > 65535) {
            errors.push('端口号必须在 1-65535 之间');
        }

        if (this.use_ssh) {
            if (!this.ssh_host || this.ssh_host.trim() === '') {
                errors.push('启用SSH隧道时，SSH主机地址不能为空');
            }
            if (!this.ssh_port || this.ssh_port < 1 || this.ssh_port > 65535) {
                errors.push('SSH端口号必须在 1-65535 之间');
            }
            if (!this.ssh_username || this.ssh_username.trim() === '') {
                errors.push('启用SSH隧道时，SSH用户名不能为空');
            }
        }

        if (this.use_sentinel && (!this.sentinel_master_name || this.sentinel_master_name.trim() === '')) {
            errors.push('启用哨兵模式时，主节点名称不能为空');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// 导出模型
export default ConnectionConfigModel;