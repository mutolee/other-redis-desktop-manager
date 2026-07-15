/**
 * 连接配置表单验证规则。
 * 由创建/编辑连接配置弹窗的 Element Plus Form 直接使用。
 */
const createConnectConfigFormRules = (translate = null) => {
    // 校验文案通过调用方传入的 t 函数生成，保证语言切换后提示跟随当前界面语言。
    const t = (key, fallback) => typeof translate === 'function'
        ? translate(`connectionDialog.validation.${key}`, fallback)
        : fallback

    return {
        group_name: [
            {required: true, message: t('groupNameRequired', '请输入分组名称'), trigger: 'blur'}
        ],
        name: [
            {required: true, message: t('connectionNameRequired', '请输入连接名称'), trigger: 'blur'}
        ],
        host: [
            {required: true, message: t('hostRequired', '请输入主机地址'), trigger: 'blur'}
        ],
        port: [
            {required: true, message: t('portRequired', '请输入端口号'), trigger: 'blur'},
            {type: 'number', min: 1, max: 65535, message: t('portRange', '端口号必须在1-65535之间'), trigger: 'blur'}
        ],
        ssh_host: [
            {required: true, message: t('sshHostRequired', '请输入SSH主机地址'), trigger: 'blur'}
        ],
        ssh_port: [
            {required: true, message: t('sshPortRequired', '请输入SSH端口号'), trigger: 'blur'},
            {type: 'number', min: 1, max: 65535, message: t('sshPortRange', 'SSH端口号必须在1-65535之间'), trigger: 'blur'}
        ],
        ssh_username: [
            {required: true, message: t('sshUsernameRequired', '请输入SSH用户名'), trigger: 'blur'}
        ],
        sentinel_master_name: [
            {required: true, message: t('sentinelMasterRequired', '请输入哨兵主节点名称'), trigger: 'blur'}
        ]
    }
}

const formRules = createConnectConfigFormRules()

/**
 * 执行 Element Plus 表单验证。
 *
 * @param {Object} formRef - Element Plus Form 实例引用
 * @returns {Promise<boolean>} 表单是否通过验证
 */
const connectConfigFormValidate = async (formRef) => {
    try {
        await formRef.validate()
        return true
    } catch (error) {
        return false
    }
}

export {
    createConnectConfigFormRules,
    formRules,
    connectConfigFormValidate
}
