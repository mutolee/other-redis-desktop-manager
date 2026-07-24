<!--
    ConnectionConfigRenameGroupDialog.vue
    描述：重命名分组的对话框
 -->
<template>
    <el-dialog v-model="dialogVisible" width="500px"
               :close-on-click-modal="false"
               :close-on-press-escape="false"
               @close="handleCancel">
        <template #header>
            <!-- 弹窗标题：重命名分组使用编辑图标，和分组名称修改语义一致。 -->
            <DialogTitle :icon="Edit" :title="t('dialogs.renameGroup.title')"/>
        </template>
        <el-form ref="formRef" :model="{newGroupName}" :rules="formRules" label-width="100px" label-position="right">
            <el-form-item :label="t('dialogs.renameGroup.currentName')">
                <el-input
                    :value="groupName"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>
            <el-form-item :label="t('dialogs.renameGroup.newName')" prop="newGroupName">
                <el-input
                    v-model="newGroupName"
                    :placeholder="t('dialogs.renameGroup.newNamePlaceholder')"
                    clearable
                    maxlength="25"
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

<script setup>
import {computed, ref, watch} from 'vue'
import {Edit} from '@icon-park/vue-next'
import {ElMessage} from 'element-plus'
import {storeToRefs} from 'pinia'
import {connectConfigRepository} from '../../database/repositories/ConnectConfigRepository.js'
import {eventBus} from '../../utils/eventBus.js'
import {useBaseStateStore} from '../../stores/modules/baseStateStore.js'
import {useConnectionConfigsStore} from '../../stores/modules/connectionConfigsStore.js'
import DialogTitle from '../common/DialogTitle.vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动重命名分组弹窗表单、校验和操作反馈。
const {t} = useI18n()

// 组件入参：控制弹窗显示，并传入当前要重命名的分组名称。
const props = defineProps({
    visible: {
        type: Boolean
    },
    groupName: {
        type: String,
        default: ''
    }
})

// 对外事件：同步弹窗显示状态，并在关闭后通知父组件清理重命名目标。
const emit = defineEmits(['update:visible', 'closed'])

// 弹窗可见性代理：透传 v-model:visible 给父组件。
const dialogVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 表单状态：新分组名称和 Element Plus 表单实例。
const formRef = ref(null)
const newGroupName = ref('')
// 基础状态 store：重命名成功后根据搜索模式决定刷新搜索结果还是全量连接列表。
const {searchModeState} = storeToRefs(useBaseStateStore())
// 连接配置 store：分组重命名后同步所有已打开页签中的配置快照。
const connectionConfigsStore = useConnectionConfigsStore()

// 表单验证规则
const formRules = {
    newGroupName: [
        {required: true, message: t('dialogs.renameGroup.validation.nameRequired'), trigger: 'blur'},
        {min: 1, max: 50, message: t('dialogs.renameGroup.validation.nameLength'), trigger: 'blur'}
    ]
}

// 监听对话框显示状态，当打开时初始化分组名称
watch(() => props.visible, (newValue) => {
    if (newValue) {
        // 设置当前分组名称为初始值
        newGroupName.value = props.groupName || ''
        // 清除表单验证状态
        if (formRef.value) {
            formRef.value.clearValidate()
        }
    }
})

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

        const oldGroupName = props.groupName || ''
        const trimmedNewName = newGroupName.value.trim()

        // 检查新名称是否与旧名称相同
        if (oldGroupName === trimmedNewName) {
            ElMessage.warning(t('dialogs.renameGroup.messages.sameName'))
            return
        }

        // 检查新分组名称是否已存在
        const allGroups = await connectConfigRepository.findAllGroups()
        if (allGroups.includes(trimmedNewName)) {
            ElMessage.warning(t('dialogs.renameGroup.messages.nameExists', {value: trimmedNewName}))
            return
        }

        // 调用更新分组名称接口
        const updatedCount = await connectConfigRepository.updateGroupName(oldGroupName, trimmedNewName)
        ElMessage.success(t('dialogs.renameGroup.messages.renameSuccess', {value: updatedCount}))

        connectionConfigsStore.renameOpenedConnectionGroup(oldGroupName, trimmedNewName)

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }

        handleCancel()
    } catch (error) {
        if (error === false) {
            // 表单验证失败
            return
        }
        ElMessage.error(t('dialogs.renameGroup.messages.renameFail', {
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
    // 重置分组名称
    newGroupName.value = ''
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
</style>
