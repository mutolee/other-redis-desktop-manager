<!--
    AddKeyDialog.vue
    描述：Redis Key 新增弹窗。
    职责：在当前连接和当前 DB 下创建基础 Redis Key，并把创建结果通知 KeyListPanel 做局部列表更新。
-->
<template>
    <el-dialog
        v-model="dialogVisible"
        width="620px"
        destroy-on-close
        :close-on-click-modal="false"
    >
        <template #header>
            <!-- 弹窗标题：新增 Key 属于创建操作，使用加号图标强化语义。 -->
            <DialogTitle :icon="Plus" :title="t('dialogs.addKey.title')"/>
        </template>

        <!-- 新增 Key 表单：先覆盖基础 Redis 类型，每种类型提供创建所需的最小初始值。 -->
        <el-form label-width="92px" class="add-key-form" @submit.prevent>
            <el-form-item :label="t('dialogs.addKey.keyName')" required>
                <el-input
                    v-model="formData.key"
                    :placeholder="t('dialogs.addKey.keyNamePlaceholder')"
                    clearable
                    @keyup.enter="handleSubmit"
                />
            </el-form-item>

            <el-form-item :label="t('dialogs.addKey.keyType')" required>
                <el-select v-model="formData.type" class="type-select">
                    <el-option
                        v-for="item in typeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </el-select>
            </el-form-item>

            <el-form-item :label="t('dialogs.addKey.ttl')">
                <el-input-number
                    v-model="formData.ttl"
                    class="ttl-input"
                    :min="-1"
                    :precision="0"
                />
                <span class="form-tip">{{ t('dialogs.addKey.ttlTip') }}</span>
            </el-form-item>

            <!-- String 初始值：允许为空字符串，因为 Redis String 可以保存空内容。 -->
            <el-form-item v-if="formData.type === 'string'" :label="t('keyDetailPanels.common.labels.value')">
                <el-input
                    v-model="formData.value"
                    type="textarea"
                    class="fixed-textarea"
                    :rows="5"
                    :placeholder="t('dialogs.addKey.stringValuePlaceholder')"
                />
            </el-form-item>

            <!-- Hash 初始字段：Redis Hash 至少需要一个 field/value 才能创建 Key。 -->
            <template v-else-if="formData.type === 'hash'">
                <el-form-item :label="t('keyDetailPanels.common.labels.field')" required>
                    <el-input v-model="formData.field" :placeholder="t('dialogs.addKey.fieldPlaceholder')" clearable/>
                </el-form-item>
                <el-form-item :label="t('keyDetailPanels.common.labels.value')">
                    <el-input
                        v-model="formData.value"
                        type="textarea"
                        class="fixed-textarea"
                        :rows="4"
                        :placeholder="t('dialogs.addKey.fieldValuePlaceholder')"
                    />
                </el-form-item>
            </template>

            <!-- List 初始元素：支持选择从左侧或右侧写入首个元素。 -->
            <template v-else-if="formData.type === 'list'">
                <el-form-item :label="t('dialogs.addKey.writeDirection')" required>
                    <el-radio-group v-model="formData.listDirection">
                        <el-radio-button label="right">{{ t('dialogs.addKey.rightPush') }}</el-radio-button>
                        <el-radio-button label="left">{{ t('dialogs.addKey.leftPush') }}</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item :label="t('keyDetailPanels.common.labels.value')" required>
                    <el-input
                        v-model="formData.value"
                        type="textarea"
                        class="fixed-textarea"
                        :rows="4"
                        :placeholder="t('dialogs.addKey.listValuePlaceholder')"
                    />
                </el-form-item>
            </template>

            <!-- Set 初始成员：通过 SADD 创建首个成员。 -->
            <el-form-item v-else-if="formData.type === 'set'" :label="t('keyDetailPanels.common.labels.member')" required>
                <el-input
                    v-model="formData.member"
                    type="textarea"
                    class="fixed-textarea"
                    :placeholder="t('dialogs.addKey.setMemberPlaceholder')"
                    clearable
                />
            </el-form-item>

            <!-- ZSet 初始成员：通过 ZADD 创建首个成员和分数。 -->
            <template v-else-if="formData.type === 'zset'">
                <el-form-item :label="t('keyDetailPanels.common.labels.score')" required>
                    <el-input-number v-model="formData.score" class="score-input" style="width: 250px"/>
                </el-form-item>
                <el-form-item :label="t('keyDetailPanels.common.labels.member')" required>
                    <el-input
                        v-model="formData.member"
                        type="textarea"
                        class="fixed-textarea"
                        :placeholder="t('dialogs.addKey.zsetMemberPlaceholder')"
                        clearable
                    />
                </el-form-item>
            </template>

            <!-- Stream 初始 entry：通过 XADD * 创建首条消息。 -->
            <template v-else-if="formData.type === 'stream'">
                <el-form-item :label="t('dialogs.addKey.messageId')">
                    <!-- Stream 消息 ID：允许留空交给 Redis 自动生成，也可以一键生成一个合法随机 ID。 -->
                    <el-input
                        v-model="formData.messageId"
                        class="message-id-input"
                        :placeholder="t('dialogs.addKey.autoMessageIdPlaceholder')"
                        clearable
                    >
                        <template #append>
                            <el-button @click="handleGenerateRandomMessageId">{{ t('dialogs.addKey.randomGenerate') }}</el-button>
                        </template>
                    </el-input>
                </el-form-item>
                <!-- Stream Fields：强制使用 JSON 对象格式，提交时展开为 XADD 的 field/value 参数。 -->
                <el-form-item :label="t('keyDetailPanels.common.labels.fields')" required>
                    <el-input
                        v-model="formData.streamFieldsText"
                        type="textarea"
                        class="stream-fields-textarea"
                        :placeholder="t('dialogs.addKey.fieldsJsonPlaceholder')"
                    />
                </el-form-item>
            </template>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
                <el-button type="primary" :loading="creating" @click="handleSubmit">
                    {{ t('dialogs.addKey.create') }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import {Plus} from '@icon-park/vue-next'
import {ElMessage} from 'element-plus'
import DialogTitle from '../common/DialogTitle.vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动新增 Key 弹窗表单、校验和提交反馈。
const {t} = useI18n()

// 组件入参：visible 控制弹窗显隐，tabId 定位当前 Redis 连接。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    tabId: {
        type: String,
        default: ''
    }
})

// 组件事件：update:visible 同步弹窗状态，created 通知父组件局部插入并选中新 Key。
const emit = defineEmits(['update:visible', 'created'])

// 弹窗双向绑定状态：对接父组件的 v-model:visible。
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 支持创建的基础 Redis 类型列表。
const typeOptions = [
    {label: 'String', value: 'string'},
    {label: 'Hash', value: 'hash'},
    {label: 'List', value: 'list'},
    {label: 'Set', value: 'set'},
    {label: 'ZSet', value: 'zset'},
    {label: 'Stream', value: 'stream'}
]

// 表单数据：不同类型共用最小字段集合，切换类型时由命令构造函数选择需要的字段。
const formData = reactive({
    key: '',
    type: 'string',
    value: '',
    field: '',
    member: '',
    listDirection: 'right',
    messageId: '*',
    streamFieldsText: '',
    score: 0,
    ttl: -1
})

// 创建中状态：防止重复提交。
const creating = ref(false)

/**
 * 重置新增表单。
 * 每次打开弹窗时都回到 String 默认状态，避免上次残留影响下一次创建。
 */
const resetForm = () => {
    Object.assign(formData, {
        key: '',
        type: 'string',
        value: '',
        field: '',
        member: '',
        listDirection: 'right',
        messageId: '*',
        streamFieldsText: '',
        score: 0,
        ttl: -1
    })
}

/**
 * 解析 Stream Fields JSON 文本。
 * 格式约定为 JSON 对象，例如 {"key1":"value1"}，对象属性名会作为 Stream Field。
 * @param {string} text 用户输入的 Fields 文本
 * @returns {{fields:Array<{field:string,value:string}>, errors:Array<string>}} 解析结果和格式错误
 */
const parseStreamFieldsText = (text) => {
    const fields = []
    const errors = []
    const source = text.trim()

    if (!source) {
        return {fields, errors}
    }

    let parsedValue = null

    try {
        parsedValue = JSON.parse(source)
    } catch (error) {
        errors.push(t('dialogs.addKey.messages.fieldsJsonInvalid'))
        return {fields, errors}
    }

    if (!parsedValue || Array.isArray(parsedValue) || typeof parsedValue !== 'object') {
        errors.push(t('dialogs.addKey.messages.fieldsMustObject'))
        return {fields, errors}
    }

    Object.entries(parsedValue).forEach(([rawField, rawValue]) => {
        const field = String(rawField).trim()

        if (!field) {
            errors.push(t('dialogs.addKey.messages.emptyFieldName'))
            return
        }

        // Redis Stream 的 field/value 最终都是字符串，复杂值保留为 JSON 字符串写入。
        const value = typeof rawValue === 'string'
            ? rawValue
            : JSON.stringify(rawValue)

        fields.push({field, value: value ?? ''})
    })

    return {fields, errors}
}

/**
 * 提取当前 Stream Fields 文本中的有效字段。
 * @returns {Array<{field:string,value:string}>} 已通过格式解析的字段列表
 */
const getValidStreamFields = () => {
    return parseStreamFieldsText(formData.streamFieldsText).fields
}

/**
 * 校验新增 Key 表单。
 * @returns {boolean} 表单是否满足当前类型的最小创建条件
 */
const validateForm = () => {
    if (!formData.key.trim()) {
        ElMessage.warning(t('dialogs.addKey.messages.keyNameRequired'))
        return false
    }

    if (formData.type === 'hash' && !formData.field.trim()) {
        ElMessage.warning(t('dialogs.addKey.messages.hashFieldRequired'))
        return false
    }

    if (formData.type === 'list' && !formData.value.trim()) {
        ElMessage.warning(t('dialogs.addKey.messages.listValueRequired'))
        return false
    }

    if (formData.type === 'set' && !formData.member.trim()) {
        ElMessage.warning(t('dialogs.addKey.messages.setMemberRequired'))
        return false
    }

    if (formData.type === 'zset' && !formData.member.trim()) {
        ElMessage.warning(t('dialogs.addKey.messages.zsetMemberRequired'))
        return false
    }

    if (formData.type === 'stream') {
        const {fields, errors} = parseStreamFieldsText(formData.streamFieldsText)

        if (errors.length > 0) {
            ElMessage.warning(errors[0])
            return false
        }

        if (fields.length === 0) {
            ElMessage.warning(t('dialogs.addKey.messages.streamFieldRequired'))
            return false
        }
    }

    return true
}

/**
 * 根据当前类型构造 Redis 创建命令。
 * @returns {{command:string,args:Array<string>}} 可交给 executeCommand 执行的命令对象
 */
const buildCreateCommand = () => {
    const key = formData.key.trim()

    if (formData.type === 'hash') {
        return {command: 'HSET', args: [key, formData.field.trim(), formData.value]}
    }

    if (formData.type === 'list') {
        const command = formData.listDirection === 'left' ? 'LPUSH' : 'RPUSH'
        return {command, args: [key, formData.value]}
    }

    if (formData.type === 'set') {
        return {command: 'SADD', args: [key, formData.member]}
    }

    if (formData.type === 'zset') {
        return {command: 'ZADD', args: [key, String(formData.score), formData.member]}
    }

    if (formData.type === 'stream') {
        // Message ID 留空时按 Redis 约定使用 *，由 Redis 自动生成消息 ID。
        const messageId = formData.messageId.trim() || '*'
        const fieldArgs = getValidStreamFields().flatMap((item) => [item.field, item.value])
        return {command: 'XADD', args: [key, messageId, ...fieldArgs]}
    }

    return {command: 'SET', args: [key, formData.value]}
}

/**
 * 执行 Redis 命令并校验执行结果。
 * @param {string} command Redis 命令
 * @param {Array<string>} args 命令参数
 * @returns {Promise<unknown>} Redis 原始返回结果
 */
const runRedisCommand = async (command, args) => {
    const response = await window.api.redis.executeCommand(props.tabId, command, args, {source: 'key-detail'})

    if (!response.success) {
        throw new Error(response.error || t('dialogs.addKey.messages.commandFail', {value: command}))
    }

    return response.data?.result
}

/**
 * 随机生成 Stream 消息 ID。
 * Redis Stream ID 使用 毫秒时间戳-序号 格式，这里生成可读且合法的手动 ID。
 */
const handleGenerateRandomMessageId = () => {
    // 序号部分控制在较小范围内，既能随机，又不会让输入框展示过长。
    const sequence = Math.floor(Math.random() * 1000)
    formData.messageId = `${Date.now()}-${sequence}`
}

/**
 * 提交创建 Key。
 * 先用 EXISTS 做存在性检查，再执行对应类型创建命令，避免误覆盖或追加到已有 Key。
 */
const handleSubmit = async () => {
    if (!props.tabId || creating.value || !validateForm()) {
        return
    }

    creating.value = true

    try {
        const key = formData.key.trim()
        const existsResult = await runRedisCommand('EXISTS', [key])

        if (Number(existsResult) > 0) {
            ElMessage.warning(t('dialogs.addKey.messages.keyExists'))
            return
        }

        const {command, args} = buildCreateCommand()
        await runRedisCommand(command, args)

        // TTL 只有正整数才执行 EXPIRE；-1 表示永不过期，0 没有实际意义所以忽略。
        if (Number(formData.ttl) > 0) {
            await runRedisCommand('EXPIRE', [key, String(Number(formData.ttl))])
        }

        ElMessage.success(t('dialogs.addKey.messages.createSuccess'))
        emit('created', {key, type: formData.type})
        dialogVisible.value = false
    } catch (error) {
        ElMessage.error(error.message || t('dialogs.addKey.messages.createFail'))
    } finally {
        creating.value = false
    }
}

/**
 * 取消创建。
 */
const handleCancel = () => {
    dialogVisible.value = false
}

// 监听弹窗打开：每次打开都重置表单，保证创建流程从干净状态开始。
watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            resetForm()
        }
    }
)
</script>

<style scoped>
/* 新增 Key 表单：限制内部输入宽度，避免对话框内控件贴边。 */
.add-key-form {
    padding: 4px 6px 0 0;
}

.type-select,
.ttl-input,
.score-input {
    width: 180px;
}

/* Stream 消息 ID 输入框：宽度收窄，保持和截图里的短输入组接近。 */
.message-id-input {
    width: 300px;
}

/* 多行输入框：固定新增弹窗里的文本域高度，避免内容变化或拖拽撑动弹窗布局。 */
.fixed-textarea :deep(.el-textarea__inner) {
    height: 110px;
    min-height: 110px !important;
    max-height: 110px;
    resize: none;
}

/* Stream Fields 文本域：强制输入 JSON 对象，给用户直接粘贴结构化字段的空间。 */
.stream-fields-textarea :deep(.el-textarea__inner) {
    height: 150px;
    min-height: 150px !important;
    max-height: 150px;
    resize: none;
    line-height: 1.7;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 过期时间说明：贴近输入框展示，但不抢占主表单视觉。 */
.form-tip {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

/* 弹窗底部：操作按钮右对齐，保持和项目内其他对话框一致。 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
}
</style>
