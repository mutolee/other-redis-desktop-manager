<!--
    ConnectionConfigEditDialog.vue
    描述：编辑连接配置对话框
 -->
<template>
    <el-dialog v-model="dialogVisible" width="800px"
               :close-on-click-modal="false"
               :close-on-press-escape="false"
               @close="handleCancel">
        <template #header>
            <!-- 弹窗标题：编辑连接配置使用编辑图标，区分创建连接弹窗。 -->
            <DialogTitle :icon="Edit" :title="t('connectionDialog.editTitle')"/>
        </template>
        <el-form ref="formRef" :model="formData" :rules="formRules" :label-width="formLabelWidth" label-position="right">
            <div class="dialog-content">
                <div class="content-left">
                    <el-tabs v-model="activeTab" tab-position="left" class="connection-tabs">
                        <el-tab-pane :label="t('connectionDialog.tabs.basic')" name="basic">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><LinkThree/></el-icon>{{ t('connectionDialog.tabs.basic') }}
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane :label="t('connectionDialog.tabs.ssh')" name="ssh">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Clue/></el-icon>{{ t('connectionDialog.tabs.ssh') }}
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
                        <el-tab-pane :label="t('connectionDialog.tabs.cluster')" name="cluster">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Selected/></el-icon>{{ t('connectionDialog.tabs.cluster') }}
                                </span>
                            </template>
                        </el-tab-pane>
                    </el-tabs>
                </div>
                <div class="content-right">
                    <el-scrollbar>
                        <!-- 基础信息 -->
                        <div v-show="activeTab === 'basic'" class="tab-content">
                            <h3 class="section-title">{{ t('connectionDialog.sections.basic') }}</h3>
                            <el-divider/>
                            <el-form-item :label="t('connectionDialog.fields.groupName')" prop="group_name">
                                <el-autocomplete
                                    v-model="groupNameDisplay"
                                    :fetch-suggestions="handleGroupQuery"
                                    :placeholder="t('connectionDialog.placeholders.groupName')"
                                    :maxlength="25"
                                    clearable
                                    style="width: 300px"
                                    @select="handleSelectGroup"
                                >
                                    <template #default="{ item }">
                                        <span>{{ item.label }}</span>
                                    </template>
                                </el-autocomplete>
                            </el-form-item>
                            <el-form-item :label="t('connectionDialog.fields.connectionName')" prop="name">
                                <el-input
                                    v-model="formData.name"
                                    :placeholder="t('connectionDialog.placeholders.connectionName')"
                                    :maxlength="30"
                                    clearable
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item :label="t('connectionDialog.fields.host')" prop="host">
                                <el-input
                                    v-model="formData.host"
                                    placeholder="localhost"
                                />
                            </el-form-item>
                            <el-form-item :label="t('connectionDialog.fields.port')" prop="port">
                                <el-input-number
                                    v-model="formData.port"
                                    :min="1"
                                    :max="65535"
                                    style="width: 150px"
                                />
                            </el-form-item>
                            <el-form-item :label="t('connectionDialog.fields.username')">
                                <el-input
                                    v-model="formData.username"
                                    :placeholder="t('connectionDialog.placeholders.username')"
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item :label="t('connectionDialog.fields.password')">
                                <el-input
                                    v-model="formData.password"
                                    type="password"
                                    :placeholder="t('connectionDialog.placeholders.password')"
                                    show-password
                                    style="width: 300px"
                                />
                            </el-form-item>
                            <el-form-item :label="t('connectionDialog.fields.keySeparator')">
                                <el-input
                                    v-model="formData.key_split"
                                    placeholder=":"
                                    style="width: 150px"
                                />
                            </el-form-item>
                        </div>
                        <!-- SSH隧道配置 -->
                        <div v-show="activeTab === 'ssh'" class="tab-content">
                            <h3 class="section-title">{{ t('connectionDialog.sections.ssh') }}</h3>
                            <el-divider/>
                            <div class="block-tip">
                                <p class="title">{{ t('connectionDialog.tipTitle') }}</p>
                                <p>{{ t('connectionDialog.tips.sshUnavailable') }}</p>
                            </div>
                            <div class="content-header-switch">
                                <el-switch
                                    v-model="formData.use_ssh"
                                    :active-text="t('connectionDialog.options.enableSsh')"
                                />
                            </div>
                            <template v-if="formData.use_ssh">
                                <el-form-item :label="t('connectionDialog.fields.sshHost')" prop="ssh_host">
                                    <el-input
                                        v-model="formData.ssh_host"
                                        :placeholder="t('connectionDialog.placeholders.sshHost')"
                                    />
                                </el-form-item>
                                <el-form-item :label="t('connectionDialog.fields.sshUsername')" prop="ssh_username">
                                    <el-input
                                        v-model="formData.ssh_username"
                                        :placeholder="t('connectionDialog.placeholders.sshUsername')"
                                        style="width: 300px"
                                    />
                                </el-form-item>
                                <el-form-item :label="t('connectionDialog.fields.sshPort')" prop="ssh_port">
                                    <el-input-number
                                        v-model="formData.ssh_port"
                                        :min="1"
                                        :max="65535"
                                        style="width: 150px"
                                    />
                                </el-form-item>
                                <el-form-item :label="t('connectionDialog.fields.authType')">
                                    <el-radio-group v-model="formData.ssh_auth_type">
                                        <el-radio value="password">{{ t('connectionDialog.options.passwordAuth') }}</el-radio>
                                        <el-radio value="private_key">{{ t('connectionDialog.options.privateKeyAuth') }}</el-radio>
                                    </el-radio-group>
                                </el-form-item>
                                <el-form-item v-if="formData.ssh_auth_type === 'password'" :label="t('connectionDialog.fields.sshPassword')">
                                    <el-input
                                        v-model="formData.ssh_password"
                                        type="password"
                                        :placeholder="t('connectionDialog.placeholders.sshPassword')"
                                        show-password
                                        style="width: 300px"
                                    />
                                </el-form-item>
                                <template v-if="formData.ssh_auth_type === 'private_key'">
                                    <el-form-item :label="t('connectionDialog.fields.privateKeyPath')">
                                        <el-input
                                            v-model="formData.ssh_private_key"
                                            :placeholder="t('connectionDialog.placeholders.privateKeyPath')"
                                        >
                                            <template #append>
                                                <el-button :icon="More"/>
                                            </template>
                                        </el-input>
                                    </el-form-item>
                                    <el-form-item :label="t('connectionDialog.fields.privateKeyPassword')">
                                        <el-input
                                            v-model="formData.ssh_private_key_passphrase"
                                            type="password"
                                            :placeholder="t('connectionDialog.placeholders.privateKeyPassword')"
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
                            <h3 class="section-title">{{ t('connectionDialog.sections.ssl') }}</h3>
                            <el-divider/>
                            <div class="block-tip">
                                <p class="title">{{ t('connectionDialog.tipTitle') }}</p>
                                <p>{{ t('connectionDialog.tips.sslUnavailable') }}</p>
                            </div>
                            <div class="content-header-switch">
                                <el-switch
                                    v-model="formData.use_ssl"
                                    :active-text="t('connectionDialog.options.enableSsl')"
                                />
                            </div>
                            <template v-if="formData.use_ssl">
                                <el-form-item :label="t('connectionDialog.fields.caCert')">
                                    <el-input
                                        v-model="formData.ssl_ca"
                                        :placeholder="t('connectionDialog.placeholders.caCert')"
                                    >
                                        <template #append>
                                            <el-button :icon="More"/>
                                        </template>
                                    </el-input>
                                </el-form-item>

                                <el-form-item :label="t('connectionDialog.fields.clientCert')">
                                    <el-input
                                        v-model="formData.ssl_cert"
                                        :placeholder="t('connectionDialog.placeholders.clientCert')"
                                    >
                                        <template #append>
                                            <el-button :icon="More"/>
                                        </template>
                                    </el-input>
                                </el-form-item>

                                <el-form-item :label="t('connectionDialog.fields.clientKey')">
                                    <el-input
                                        v-model="formData.ssl_key"
                                        :placeholder="t('connectionDialog.placeholders.clientKey')"
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
                            <h3 class="section-title">{{ t('connectionDialog.sections.cluster') }}</h3>
                            <el-divider/>
                            <div class="block-tip">
                                <p class="title">{{ t('connectionDialog.tipTitle') }}</p>
                                <p>{{ t('connectionDialog.tips.clusterUnavailable') }}</p>
                            </div>
                            <div class="content-header-switch">
                                <el-checkbox
                                    v-model="formData.use_sentinel"
                                    @change="handleSentinelModeChange"
                                >
                                    {{ t('connectionDialog.options.enableSentinel') }}
                                </el-checkbox>
                                <el-checkbox
                                    v-model="formData.use_cluster"
                                    @change="handleClusterModeChange"
                                >
                                    {{ t('connectionDialog.options.enableCluster') }}
                                </el-checkbox>
                            </div>
                            <template v-if="formData.use_sentinel">
                                <el-form-item :label="t('connectionDialog.fields.masterName')" prop="sentinel_master_name">
                                    <el-input
                                        v-model="formData.sentinel_master_name"
                                        :placeholder="t('connectionDialog.placeholders.masterName')"
                                        style="width: 300px"
                                    />
                                </el-form-item>

                                <el-form-item :label="t('connectionDialog.fields.masterPassword')">
                                    <!-- 哨兵主节点密码：为空时后端会回退使用基础信息中的 Redis 密码。 -->
                                    <div class="password-with-tip">
                                        <el-input
                                            v-model="formData.sentinel_master_pass"
                                            type="password"
                                            :placeholder="t('connectionDialog.placeholders.masterPassword')"
                                            show-password
                                            style="width: 300px"
                                        />
                                        <el-tooltip
                                            :content="t('connectionDialog.tips.sentinelMasterPassword')"
                                            placement="top"
                                        >
                                            <Info class="field-tip-icon"/>
                                        </el-tooltip>
                                    </div>
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
                               @click="handleTestConnection">{{ t('connectionDialog.actions.test') }}
                    </el-button>
                    <el-text
                        :class="{'result-fail': testConnectStatus === 'fail', 'result-success': testConnectStatus === 'success'}">
                        {{ testConnectMessage }}
                    </el-text>
                </div>
                <div class="footer-right">
                    <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
                    <el-button type="primary" @click="handleSubmit">{{ t('connectionDialog.actions.update') }}</el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import {Clue, Edit, Info, LinkThree, Lock, More, Selected} from '@icon-park/vue-next'
import {ElMessage} from 'element-plus'
import {storeToRefs} from 'pinia'
import {connectConfigRepository} from '../../database/repositories/ConnectConfigRepository.js'
import {eventBus} from '../../utils/eventBus.js'
import {connectConfigFormData} from '../../utils/connectConfigFormData.js'
import {connectConfigFormValidate, createConnectConfigFormRules} from '../../utils/connectConfigFormValidate.js'
import {mergeConnectionRuntimeSettings} from '../../utils/redisConnectionConfigUtil.js'
import {normalizeConnectionGroupName} from '../../utils/connectionGroupUtil.js'
import {useBaseStateStore} from '../../stores/modules/baseStateStore.js'
import {useConnectionConfigsStore} from '../../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../../stores/modules/userSettingsStore.js'
import DialogTitle from '../common/DialogTitle.vue'
import {useI18n} from '../../i18n/index.js'

// 组件入参：控制弹窗显示，并传入当前要编辑的连接配置。
const props = defineProps({
    visible: {
        type: Boolean
    },
    connectionConfig: {
        type: Object,
        default: null
    }
})

// 对外事件：同步弹窗显示状态，并在关闭后通知父组件清理编辑对象。
const emit = defineEmits(['update:visible', 'closed'])

// 连接配置 store：编辑保存后同步已打开连接页签里的配置快照。
const {openedConnectionConfigs} = storeToRefs(useConnectionConfigsStore())

// 弹窗可见性代理：透传 v-model:visible 给父组件。
const dialogVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 监听对话框显示状态，当打开时加载数据
watch(() => props.visible, (newVal) => {
    if (newVal && props.connectionConfig) {
        loadConnectionConfigData()
        // 重置到基础信息标签页
        activeTab.value = 'basic'
    }
})

/**
 * 加载连接配置数据到表单
 */
const loadConnectionConfigData = () => {
    if (!props.connectionConfig) {
        return
    }

    const config = props.connectionConfig

    // 将连接配置数据填充到表单
    Object.assign(formData, {
        // 基础信息
        group_name: normalizeConnectionGroupName(config.group_name),
        name: config.name || '',
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

// 表单状态：维护当前页签、表单引用、连接配置表单数据和测试连接反馈。
const activeTab = ref('basic')
const formRef = ref(null)
const formData = reactive(Object.assign({}, connectConfigFormData))
const testConnectionLoading = ref(false)
const testConnectMessage = ref('')
const testConnectStatus = ref('')
// 基础状态 store：保存成功后根据搜索模式决定刷新搜索结果还是全量连接列表。
const {searchModeState} = storeToRefs(useBaseStateStore())
// 系统连接设置：用于为测试连接补充连接超时和命令超时。
const {connectionSettings} = storeToRefs(useUserSettingsStore())
// 国际化状态：文案驱动弹窗内容，语言驱动表单标签宽度。
const {language, t} = useI18n()

// 表单校验规则：根据当前语言动态生成 Element Plus 校验提示。
const formRules = computed(() => createConnectConfigFormRules(t))

// 表单标签宽度：中文保持紧凑，英文为长字段名预留空间。
const formLabelWidth = computed(() => language.value === 'en-US' ? '135px' : '100px')

// 分组输入框展示值：只裁剪首尾空白，不自动回填默认组，清空后交给必填校验提示用户。
const groupNameDisplay = computed({
    get: () => normalizeConnectionGroupName(formData.group_name),
    set: value => {
        formData.group_name = normalizeConnectionGroupName(value)
    }
})

/**
 * 获取分组列表
 * @param query 分组名称关键字
 * @param cb
 */
const handleGroupQuery = async (query, cb) => {
    try {
        const groupNames = await connectConfigRepository.findAllGroups(query)
        const formatGroupOption = (name) => {
            const label = normalizeConnectionGroupName(name)

            return {
                value: label,
                label,
                rawValue: name
            }
        }
        let res = groupNames.map(formatGroupOption)
        cb(res)
    } catch (error) {
        cb([])
    }
}

/**
 * 选择分组候选项。
 *
 * @param {Object} item - autocomplete 候选项
 */
const handleSelectGroup = (item) => {
    // 选择候选项时只写入真实分组名称，不额外注入系统默认组。
    formData.group_name = normalizeConnectionGroupName(item.rawValue || item.value)
}

/**
 * 切换哨兵模式。
 * 勾选哨兵时自动关闭集群模式；取消勾选时只关闭自身，保留用户手动选择空间。
 *
 * @param {boolean} checked - 哨兵模式是否被勾选
 */
const handleSentinelModeChange = (checked) => {
    if (checked) {
        formData.use_cluster = false
    }
}

/**
 * 切换集群模式。
 * 勾选集群时自动关闭哨兵模式；取消勾选时只关闭自身，满足两项都不启用的单机配置。
 *
 * @param {boolean} checked - 集群模式是否被勾选
 */
const handleClusterModeChange = (checked) => {
    if (checked) {
        formData.use_sentinel = false
    }
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
    try {
        let isValid = await connectConfigFormValidate(formRef.value)
        if (!isValid) return

        if (!props.connectionConfig || !props.connectionConfig.id) {
            ElMessage.error(t('connectionDialog.messages.missingId'))
            return
        }

        // 清理表单数据，确保只包含可序列化的内容
        const cleanFormData = JSON.parse(JSON.stringify(formData))

        // 调用更新连接配置接口
        await connectConfigRepository.update(props.connectionConfig.id, cleanFormData)
        ElMessage.success(t('connectionDialog.messages.updateSuccess'))

        // 更新已经打开的连接配置
        const connection = openedConnectionConfigs.value.find(connect => connect.id === props.connectionConfig.id);
        if (connection) {
            // 更新连接配置数据
            Object.assign(connection, cleanFormData)
        }

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }

        handleCancel()
    } catch (error) {
        ElMessage.error(t('connectionDialog.messages.updateFail') + (error.message || t('connectionDialog.messages.unknownError')))
    }
}

/**
 * 测试连接
 */
const handleTestConnection = async () => {
    try {
        testConnectionLoading.value = true
        testConnectStatus.value = ''
        testConnectMessage.value = t('connectionDialog.messages.testing')

        let isValid = await connectConfigFormValidate(formRef.value)
        if (!isValid) {
            testConnectMessage.value = ''
            testConnectStatus.value = ''
            return
        }

        // 清理表单数据，确保只包含可序列化的内容
        const cleanFormData = JSON.parse(JSON.stringify(formData))
        // 将系统设置中的超时参数注入本次测试连接请求。
        const runtimeConnectionConfig = mergeConnectionRuntimeSettings(cleanFormData, connectionSettings.value)

        // 调用测试连接接口
        let result = await window.api.redis.testConnection(runtimeConnectionConfig)
        if (result.success) {
            testConnectStatus.value = 'success'
            testConnectMessage.value = t('connectionDialog.messages.testSuccess')
        } else {
            testConnectStatus.value = 'fail'
            testConnectMessage.value = t('connectionDialog.messages.testFail') + (result.error || t('connectionDialog.messages.connectionError'))
        }
    } catch (error) {
        testConnectStatus.value = 'fail'
        testConnectMessage.value = t('connectionDialog.messages.testFail') + (error.message || t('connectionDialog.messages.unknownError'))
        ElMessage.error(testConnectMessage.value)
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
    testConnectStatus.value = ''
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

/* 表单标签：英文模式下字段名较长，固定单行避免 SSH Username 这类 label 被拆行。 */
.tab-content :deep(.el-form-item__label) {
    white-space: nowrap;
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

/* 密码提示区：让说明图标跟随输入框右侧展示，不改变表单行高度。 */
.password-with-tip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.field-tip-icon {
    display: inline-flex;
    font-size: 18px;
    color: var(--el-text-color-secondary);
    cursor: help;
    transform: translateY(1px);
}

.field-tip-icon:hover {
    color: var(--el-color-primary);
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

.footer-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.footer-left .el-text {
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;
    text-align: left;
    margin-right: 12px;
}

.result-success {
    color: var(--el-color-success);
}
</style>
