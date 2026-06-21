/**
 * 连接配置表单数据，用户初始化表单数据，以及重置表单数据
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

    // SSH 隧道
    use_ssh: false,
    ssh_host: 'localhost',
    ssh_port: 22,
    ssh_username: '',
    ssh_password: '',
    ssh_auth_type: 'password', // 认证方式('password', 'private_key')
    ssh_private_key: '',       // 私钥路径
    ssh_private_key_passphrase: '', // 私钥密码

    // SSL/TLS 配置
    use_ssl: false,
    ssl_ca: '',      // CA 证书路径
    ssl_cert: '',    // 客户端证书路径
    ssl_key: '',     // 客户端私钥路径

    // 哨兵配置
    use_sentinel: false,
    sentinel_master_name: '',
    sentinel_master_pass: '',

    // 集群模式
    use_cluster: false
}