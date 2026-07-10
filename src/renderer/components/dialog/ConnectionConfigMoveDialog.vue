<!--
    ConnectionConfigMoveDialog.vue
    描述：移动连接配置到其他分组的对话框
 -->
<script setup>
import { computed, ref, watch } from 'vue'
import { MoveOne } from '@icon-park/vue-next'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { connectConfigRepository } from '../../database/repositories/ConnectConfigRepository.js'
import { eventBus } from '../../utils/eventBus.js'
import { normalizeConnectionGroupName } from '../../utils/connectionGroupUtil.js'
import { useBaseStateStore } from '../../stores/modules/baseStateStore.js'
import DialogTitle from '../common/DialogTitle.vue'
import { useI18n } from '../../i18n/index.js'

// 国际化文案读取函数：驱动移动分组弹窗表单、语言布局、校验和操作反馈。
const { language, t } = useI18n()

// 组件入参：控制弹窗显示，并传入当前要移动的连接配置。
const props = defineProps({
    visible: {
        type: Boolean
    },
    connection: {
        type: Object,
        default: null
    }
})

// 对外事件：同步弹窗显示状态，并在关闭后通知父组件清理移动目标。
const emit = defineEmits(['update:visible', 'closed'])

// 弹窗可见性代理：透传 v-model:visible 给父组件。
const dialogVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 表单标签宽度：英文标签更长，适当加宽避免 Current Group / Target Group 换行。
const formLabelWidth = computed(() => language.value === 'zh-CN' ? '100px' : '128px')

// 表单状态：目标分组名称和 Element Plus 表单实例。
const formRef = ref(null)
const targetGroupName = ref('')
// 基础状态 store：移动成功后根据搜索模式决定刷新搜索结果还是全量连接列表。
const { searchModeState } = storeToRefs(useBaseStateStore())

// 表单验证规则
const formRules = {
    targetGroupName: [
        {required: true, message: t('dialogs.moveConnection.validation.targetRequired'), trigger: 'change'}
    ]
}

// 监听对话框显示状态，当打开时初始化数据
watch(() => props.visible, (newValue) => {
    if (newValue && props.connection) {
        // 重置目标分组名称
        targetGroupName.value = ''
        // 清除表单验证状态
        if (formRef.value) {
            formRef.value.clearValidate()
        }
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
        let res = groupNames.map(name => ({value: normalizeConnectionGroupName(name)}))
        // 联想只展示已有分组，并过滤掉当前分组；匹配不到时不额外追加默认分组。
        const currentGroupName = normalizeConnectionGroupName(props.connection?.group_name)
        res = res.filter(item => item.value !== currentGroupName)
        cb(res)
    } catch (error) {
        cb([])
    }
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
    try {
        try {
            // 验证表单
            await formRef.value.validate()
        } catch (error) {
            return
        }

        if (!props.connection || !props.connection.id) {
            ElMessage.error(t('dialogs.moveConnection.messages.idMissing'))
            return
        }

        const currentGroupName = normalizeConnectionGroupName(props.connection.group_name)
        const trimmedTargetName = normalizeConnectionGroupName(targetGroupName.value)

        // 检查目标分组是否与当前分组相同
        if (currentGroupName === trimmedTargetName) {
            ElMessage.warning(t('dialogs.moveConnection.messages.sameGroup'))
            return
        }

        // 获取当前连接配置的完整数据
        const currentConnection = await connectConfigRepository.findById(props.connection.id)
        if (!currentConnection) {
            ElMessage.error(t('dialogs.moveConnection.messages.connectionMissing'))
            return
        }

        // 准备更新数据，只更新 group_name
        const updateData = {
            ...currentConnection.modelToObject(),
            group_name: trimmedTargetName
        }

        // 调用更新连接配置接口
        await connectConfigRepository.update(props.connection.id, updateData)
        ElMessage.success(t('dialogs.moveConnection.messages.moveSuccess'))

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }

        handleCancel()
    } catch (error) {
        ElMessage.error(t('dialogs.moveConnection.messages.moveFail', {
            value: error.message || t('common.unknownError')
        }))
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
    // 重置目标分组名称
    targetGroupName.value = ''
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
    <el-dialog v-model="dialogVisible" width="500px"
               :close-on-click-modal="false"
               :close-on-press-escape="false"
               @close="handleCancel">
        <template #header>
            <!-- 弹窗标题：移动连接到分组使用移动图标，提示这是归类操作。 -->
            <DialogTitle :icon="MoveOne" :title="t('dialogs.moveConnection.title')" />
        </template>

        <el-form ref="formRef" :model="{targetGroupName}" :rules="formRules" :label-width="formLabelWidth" label-position="right">
            <el-form-item :label="t('dialogs.moveConnection.connectionName')">
                <el-input
                    :value="connection?.name || ''"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>
            <el-form-item :label="t('dialogs.moveConnection.currentGroup')">
                <el-input
                    :value="connection?.group_name || ''"
                    :maxlength="25"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>
            <el-form-item :label="t('dialogs.moveConnection.targetGroup')" prop="targetGroupName">
                <el-autocomplete
                    v-model="targetGroupName"
                    :fetch-suggestions="handleGroupQuery"
                    :placeholder="t('dialogs.moveConnection.targetPlaceholder')"
                    maxlength="25"
                    clearable
                    style="width: 100%"
                    @keyup.enter="handleSubmit"
                />
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
                <el-button type="primary" @click="handleSubmit">{{ t('common.confirm') }}</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
</style>
