<!--
    ConnectCreateDialog.vue
    描述：创建连接配置的对话框
 -->
<script setup>
import {computed, reactive, ref, watch} from "vue";
import {Clue, LinkThree, Lock, More, Selected} from "@icon-park/vue-next";
import {ElMessage} from "element-plus";
import {connectConfigFormValidate, formRules} from "../../utils/connectConfigFormValidate.js";
import {connectConfigFormData} from "../../utils/connectConfigFormData.js";
import {useBaseStateStore} from "../../stores/modules/baseStateStore.js";
import {storeToRefs} from "pinia";
import {eventBus} from "../../utils/eventBus.js";
import {connectConfigRepository} from "../../database/repositories/ConnectConfigRepository.js";

// Props
const props = defineProps({
    visible: {
        type: Boolean
    },
    defaultGroupName: {
        type: String
    },
    copyFromConnectionConfig: {
        type: Object,
        default: null
    }
})

// Emits
const emit = defineEmits(['update:visible', 'closed'])

// 计算属性
const dialogVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 监听对话框显示状态，当打开时初始化数据
watch(() => props.visible, (newValue) => {
    if (newValue) {
        // 如果是复制连接配置模式，加载复制数据
        if (props.copyFromConnectionConfig) {
            loadCopyConnectionData()
        } else {
            // 否则重置表单
            Object.assign(formData, connectConfigFormData)
            // 如果传入了默认分组名称，设置它
            if (props.defaultGroupName) {
                formData.group_name = props.defaultGroupName
            }
        }
        // 重置到基础信息标签页
        activeTab.value = 'basic'
    }
})

/**
 * 加载复制连接配置的数据到表单
 */
const loadCopyConnectionData = () => {
    if (!props.copyFromConnectionConfig) {
        return
    }

    const config = props.copyFromConnectionConfig

    // 将连接配置数据填充到表单
    Object.assign(formData, {
        // 基础信息
        group_name: config.group_name || '',
        name: (config.name || '') + ' 副本', // 添加"副本"后缀
        host: config.host || 'localhost',
        port: config.port || 6379,
        username: config.username || '',
        password: config.password || '',
        db_index: config.db_index || 0,
        key_split: config.key_split || ':',

        // SSH 隧道
        use_ssh: config.use_ssh || false,
        ssh_host: config.ssh_host || 'localhost',
        ssh_port: config.ssh_port || 22,
        ssh_username: config.ssh_username || '',
        ssh_password: config.ssh_password || '',
        ssh_auth_type: config.ssh_auth_type || 'password',
        ssh_private_key: config.ssh_private_key || '',
        ssh_private_key_passphrase: config.ssh_private_key_passphrase || '',

        // SSL/TLS 配置
        use_ssl: config.use_ssl || false,
        ssl_ca: config.ssl_ca || '',
        ssl_cert: config.ssl_cert || '',
        ssl_key: config.ssl_key || '',

        // 哨兵配置
        use_sentinel: config.use_sentinel || false,
        sentinel_master_name: config.sentinel_master_name || '',
        sentinel_master_pass: config.sentinel_master_pass || '',

        // 集群模式
        use_cluster: config.use_cluster || false
    })

    // 重置表单验证状态
    if (formRef.value) {
        formRef.value.clearValidate()
    }
}

// 响应式数据
const activeTab = ref('basic') // 当前激活的标签页
const formRef = ref(null) // 表单引用
const formData = reactive(Object.assign({}, connectConfigFormData)) // 表单数据
const testConnectionLoading = ref(false) // 测试连接加载中
const testConnectMessage = ref('')  // 测试连接消息
const {searchModeState} = storeToRefs(useBaseStateStore())

/**
 * 获取分组列表
 * @param query 分组名称关键字
 * @param cb
 */
const handleGroupQuery = async (query, cb) => {
    try {
        const groupNames = await connectConfigRepository.findAllGroups(query)
        let res = groupNames.map(name => ({value: name}))
        // 如果res中不包括`默认分组`, 则添加一个默认分组
        if (!res.some(item => item.value === '默认分组')) {
            res.unshift({value: '默认分组'})
        }
        cb(res)
    } catch (error) {
        console.error('获取分组列表失败:', error)
    }
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
    try {
        let isValid = await connectConfigFormValidate(formRef.value)
        if (!isValid) return

        // 清理表单数据，确保只包含可序列化的内容
        const cleanFormData = JSON.parse(JSON.stringify(formData))

        // 调用创建连接配置接口
        await connectConfigRepository.create(cleanFormData)
        ElMessage.success('连接配置创建成功')

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }

        handleCancel()
    } catch (error) {
        console.error('创建连接配置失败:', error)
        ElMessage.error('更新连接配置失败: ' + (error.message || '未知错误'))
    }
}

/**
 * 测试连接
 */
const handleTestConnection = async () => {
    try {
        testConnectionLoading.value = true
        testConnectMessage.value = '正在测试连接...'

        let isValid = await connectConfigFormValidate(formRef.value)
        if (!isValid) {
            testConnectMessage.value = ''
            return
        }

        // 清理表单数据，确保只包含可序列化的内容
        const cleanFormData = JSON.parse(JSON.stringify(formData))

        // 调用测试连接接口
        let result = await window.api.redis.testConnection(cleanFormData)
        if (result.success) {
            testConnectMessage.value = '测试连接成功'
        } else {
            testConnectMessage.value = '测试连接失败'
        }
    } catch (error) {
        testConnectMessage.value = '测试连接失败'
        console.error('测试连接失败:', error)
        ElMessage.error('测试连接失败: ' + (error.message || '未知错误'))
    } finally {
        testConnectionLoading.value = false
    }
}

/**
 * 重置表单
 */
const resetForm = () => {
    // 重置表单的验证
    if (formRef.value) {
        formRef.value.resetFields()
    }
    // 重置表单数据
    Object.assign(formData, connectConfigFormData)
    // 重置测试连接消息
    testConnectMessage.value = ''
}

/**
 * 关闭窗口
 */
const handleCancel = () => {
    dialogVisible.value = false
    emit('closed')
    resetForm()
}
</script>

<template>
    <el-dialog v-model="dialogVisible" title="创建新连接" width="800px"
               :close-on-click-modal="false"
               :close-on-press-escape="false"
               @close="handleCancel">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" label-position="right">
            <div class="dialog-content">
                <div class="content-left">
                    <el-tabs v-model="activeTab" tab-position="left" class="connection-tabs">
                        <el-tab-pane label="基础信息" name="basic">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><LinkThree/></el-icon>基础信息
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="SSH隧道" name="ssh">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Clue/></el-icon>SSH隧道
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="SSL/TLS" name="ssl">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Lock/></el-icon>SSL/TLS
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="集群模式" name="cluster">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Selected/></el-icon>集群模式
                                </span>
                            </template>
                        </el-tab-pane>
                    </el-tabs>
                </div>
                <div class="content-right">
                    <el-scrollbar>
                        <!-- 基础信息 -->
                        <div v-show="activeTab === 'basic'" class="tab-content">
                            <h3 class="section-title">基础连接信息</h3>
                            <el-divider/>
                            <el-form-item label="分组名称" prop="group_name">
                                <el-autocomplete
                                    v-model="formData.group_name"
                                    :fetch-suggestions="handleGroupQuery"
                                    placeholder="请输入分组名称"
                                    :maxlength="25"
                                    clearable
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item label="连接名称" prop="name">
                                <el-input
                                    v-model="formData.name"
                                    placeholder="请输入连接名称"
                                    :maxlength="30"
                                    clearable
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item label="主机地址" prop="host">
                                <el-input
                                    v-model="formData.host"
                                    placeholder="localhost"
                                />
                            </el-form-item>
                            <el-form-item label="端口" prop="port">
                                <el-input-number
                                    v-model="formData.port"
                                    :min="1"
                                    :max="65535"
                                    style="width: 150px"
                                />
                            </el-form-item>
                            <el-form-item label="用户名">
                                <el-input
                                    v-model="formData.username"
                                    placeholder="可选，Redis ACL用户名"
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item label="密码">
                                <el-input
                                    v-model="formData.password"
                                    type="password"
                                    placeholder="可选，Redis密码"
                                    show-password
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item label="键分隔符">
                                <el-input
                                    v-model="formData.key_split"
                                    placeholder=":"
                                    style="width: 150px"
                                />
                            </el-form-item>
                        </div>
                        <!-- SSH隧道配置 -->
                        <div v-show="activeTab === 'ssh'" class="tab-content">
                            <h3 class="section-title">SSH隧道配置</h3>
                            <el-divider/>
                            <div class="block-tip">
                                <p class="title">TIP</p>
                                <p>SSH隧道功能暂未实现，功能开发ing，强行使用无效！</p>
                            </div>
                            <div class="content-header-switch">
                                <el-switch
                                    v-model="formData.use_ssh"
                                    active-text="启用SSH隧道"
                                />
                            </div>
                            <template v-if="formData.use_ssh">
                                <el-form-item label="SSH主机" prop="ssh_host">
                                    <el-input
                                        v-model="formData.ssh_host"
                                        placeholder="SSH服务器地址"
                                    />
                                </el-form-item>
                                <el-form-item label="SSH用户名" prop="ssh_username">
                                    <el-input
                                        v-model="formData.ssh_username"
                                        placeholder="SSH用户名"
                                        style="width: 300px"
                                    />
                                </el-form-item>
                                <el-form-item label="SSH端口" prop="ssh_port">
                                    <el-input-number
                                        v-model="formData.ssh_port"
                                        :min="1"
                                        :max="65535"
                                        style="width: 150px"
                                    />
                                </el-form-item>
                                <el-form-item label="认证方式">
                                    <el-radio-group v-model="formData.ssh_auth_type">
                                        <el-radio value="password">密码认证</el-radio>
                                        <el-radio value="private_key">私钥认证</el-radio>
                                    </el-radio-group>
                                </el-form-item>
                                <el-form-item v-if="formData.ssh_auth_type === 'password'" label="SSH密码">
                                    <el-input
                                        v-model="formData.ssh_password"
                                        type="password"
                                        placeholder="SSH密码"
                                        show-password
                                        style="width: 300px"
                                    />
                                </el-form-item>
                                <template v-if="formData.ssh_auth_type === 'private_key'">
                                    <el-form-item label="私钥路径">
                                        <el-input
                                            v-model="formData.ssh_private_key"
                                            placeholder="私钥文件路径"
                                        >
                                            <template #append>
                                                <el-button :icon="More"/>
                                            </template>
                                        </el-input>
                                    </el-form-item>
                                    <el-form-item label="私钥密码">
                                        <el-input
                                            v-model="formData.ssh_private_key_passphrase"
                                            type="password"
                                            placeholder="私钥密码（可选）"
                                            show-password
                                        >
                                            <template #append>
                                                <el-button :icon="More"/>
                                            </template>
                                        </el-input>
                                    </el-form-item>
                                </template>
                            </template>
                        </div>
                        <!-- SSL/TLS配置 -->
                        <div v-show="activeTab === 'ssl'" class="tab-content">
                            <h3 class="section-title">SSL/TLS加密配置</h3>
                            <el-divider/>
                            <div class="block-tip">
                                <p class="title">TIP</p>
                                <p>SSL/TLS加密连接暂未实现，功能开发ing，强行使用无效！</p>
                            </div>
                            <div class="content-header-switch">
                                <el-switch
                                    v-model="formData.use_ssl"
                                    active-text="启用SSL/TLS加密"
                                />
                            </div>
                            <template v-if="formData.use_ssl">
                                <el-form-item label="CA证书">
                                    <el-input
                                        v-model="formData.ssl_ca"
                                        placeholder="CA证书文件路径"
                                    >
                                        <template #append>
                                            <el-button :icon="More"/>
                                        </template>
                                    </el-input>
                                </el-form-item>

                                <el-form-item label="客户端证书">
                                    <el-input
                                        v-model="formData.ssl_cert"
                                        placeholder="客户端证书文件路径"
                                    >
                                        <template #append>
                                            <el-button :icon="More"/>
                                        </template>
                                    </el-input>
                                </el-form-item>

                                <el-form-item label="客户端私钥">
                                    <el-input
                                        v-model="formData.ssl_key"
                                        placeholder="客户端私钥文件路径"
                                    >
                                        <template #append>
                                            <el-button :icon="More"/>
                                        </template>
                                    </el-input>
                                </el-form-item>
                            </template>
                        </div>
                        <!-- 集群模式配置 -->
                        <div v-show="activeTab === 'cluster'" class="tab-content">
                            <h3 class="section-title">集群模式配置</h3>
                            <el-divider/>
                            <div class="block-tip">
                                <p class="title">TIP</p>
                                <p>集群模式配置暂未实现，功能开发ing，强行使用无效！</p>
                            </div>
                            <div class="content-header-switch">
                                <el-checkbox
                                    v-model="formData.use_sentinel"
                                    :disabled="formData.use_cluster"
                                >
                                    启用哨兵模式
                                </el-checkbox>
                                <el-checkbox
                                    v-model="formData.use_cluster"
                                    :disabled="formData.use_sentinel"
                                >
                                    启用集群模式
                                </el-checkbox>
                            </div>
                            <template v-if="formData.use_sentinel">
                                <el-form-item label="主节点名称" prop="sentinel_master_name">
                                    <el-input
                                        v-model="formData.sentinel_master_name"
                                        placeholder="哨兵主节点名称"
                                        style="width: 300px"
                                    />
                                </el-form-item>

                                <el-form-item label="主节点密码">
                                    <el-input
                                        v-model="formData.sentinel_master_pass"
                                        type="password"
                                        placeholder="哨兵主节点密码"
                                        show-password
                                        style="width: 300px"
                                    />
                                </el-form-item>
                            </template>
                        </div>
                    </el-scrollbar>
                </div>
            </div>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <div class="footer-left">
                    <el-button type="warning" plain :loading="testConnectionLoading"
                               @click="handleTestConnection">测试连接
                    </el-button>
                    <el-text
                        :class="{'result-fail':testConnectMessage.includes('失败'), 'result-success':testConnectMessage.includes('成功')}">
                        {{ testConnectMessage }}
                    </el-text>
                </div>
                <div class="footer-right">
                    <el-button @click="handleCancel">取消</el-button>
                    <el-button type="primary" @click="handleSubmit">创建连接</el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.dialog-content {
    display: flex;
    gap: 20px;
    height: 450px;
}

.connection-tabs .tab-label {
    display: flex;
    align-items: center;
    gap: 5px;
}

.content-right {
    flex: 1;
    overflow: hidden;
}

.tab-content {
    padding: 0 20px 20px 0;
}

.section-title {
    font-size: 18px;
}

.block-tip {
    padding: 8px 16px;
    background-color: var(--el-color-primary-light-8);
    border-radius: 4px;
    border-left: 5px solid var(--el-color-primary);
    margin: 20px 0
}

.block-tip .title {
    font-weight: 700;
}

.block-tip p:not(.title) {
    margin-top: 10px;
}

.content-header-switch {
    margin: 10px 0;
}

.dialog-footer {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}

.footer-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.result-fail {
    color: var(--el-color-danger);
}

.result-success {
    color: var(--el-color-success);
}
</style>