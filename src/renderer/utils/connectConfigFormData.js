/**
 * 连接配置表单默认值。
 * 用于创建/编辑连接配置弹窗初始化表单状态。
 */
export const connectConfigFormData = {
    // 基础信息
    group_name: '',
    name: '',
    host: 'localhost',
    port: 6379,
    username: '',
    password: '',
    db_index: 0,
    key_split: ':',

    // SSH 隧道配置
    use_ssh: false,
    ssh_host: 'localhost',
    ssh_port: 22,
    ssh_username: '',
    ssh_password: '',
    ssh_auth_type: 'password',
    ssh_private_key: '',
    ssh_private_key_passphrase: '',

    // SSL/TLS 配置
    use_ssl: false,
    ssl_ca: '',
    ssl_cert: '',
    ssl_key: '',

    // 哨兵配置
    use_sentinel: false,
    sentinel_master_name: '',
    sentinel_master_pass: '',

    // 集群模式配置
    use_cluster: false
}
