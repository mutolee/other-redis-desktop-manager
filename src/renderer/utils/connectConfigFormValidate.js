/**
 * 表单验证规则
 */
const formRules = {
    group_name: [
        {required: true, message: '请输入分组名称', trigger: 'blur'}
    ],
    name: [
        {required: true, message: '请输入连接名称', trigger: 'blur'}
    ],
    host: [
        {required: true, message: '请输入主机地址', trigger: 'blur'}
    ],
    port: [
        {required: true, message: '请输入端口号', trigger: 'blur'},
        {type: 'number', min: 1, max: 65535, message: '端口号必须在1-65535之间', trigger: 'blur'}
    ],
    ssh_host: [
        {required: true, message: '请输入SSH主机地址', trigger: 'blur'}
    ],
    ssh_port: [
        {required: true, message: '请输入SSH端口号', trigger: 'blur'},
        {type: 'number', min: 1, max: 65535, message: 'SSH端口号必须在1-65535之间', trigger: 'blur'}
    ],
    ssh_username: [
        {required: true, message: '请输入SSH用户名', trigger: 'blur'}
    ],
    sentinel_master_name: [
        {required: true, message: '请输入哨兵主节点名称', trigger: 'blur'}
    ]
}

/**
 * 验证表单
 * @param {object} formRef 表单引用
 * @returns {boolean} 验证结果
 */
const connectConfigFormValidate = async (formRef) => {
    try {
        await formRef.validate()
        return true
    } catch (error) {
        return false
    }
}

// 导出
export {
    formRules,
    connectConfigFormValidate
}