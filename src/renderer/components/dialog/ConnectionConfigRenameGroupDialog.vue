<!--
    ConnectionConfigRenameGroupDialog.vue
    描述：重命名分组的对话框
 -->
<script setup>
import {computed, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import {useBaseStateStore} from "../../stores/modules/baseStateStore.js";
import {storeToRefs} from "pinia";
import {eventBus} from "../../utils/eventBus.js";
import {connectConfigRepository} from "../../database/repositories/ConnectConfigRepository.js";

// Props
const props = defineProps({
    visible: {
        type: Boolean
    },
    groupName: {
        type: String,
        default: ''
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

// 响应式数据
const formRef = ref(null) // 表单引用
const newGroupName = ref('') // 新分组名称
const {searchModeState} = storeToRefs(useBaseStateStore())

// 表单验证规则
const formRules = {
    newGroupName: [
        {required: true, message: '请输入分组名称', trigger: 'blur'},
        {min: 1, max: 50, message: '分组名称长度在 1 到 25 个字符', trigger: 'blur'}
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
            ElMessage.warning('新分组名称与当前名称相同')
            return
        }

        // 检查新分组名称是否已存在
        const allGroups = await connectConfigRepository.findAllGroups()
        if (allGroups.includes(trimmedNewName)) {
            ElMessage.warning(`分组名称 "${trimmedNewName}" 已存在`)
            return
        }

        // 调用更新分组名称接口
        const updatedCount = await connectConfigRepository.updateGroupName(oldGroupName, trimmedNewName)
        ElMessage.success(`分组重命名成功，已更新 ${updatedCount} 个连接配置`)

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
        console.error('重命名分组失败:', error)
        ElMessage.error('重命名分组失败: ' + (error.message || '未知错误'))
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

<template>
    <el-dialog v-model="dialogVisible" title="重命名分组" width="500px"
               :close-on-click-modal="false"
               :close-on-press-escape="false"
               @close="handleCancel">
        <el-form ref="formRef" :model="{newGroupName}" :rules="formRules" label-width="100px" label-position="right">
            <el-form-item label="当前名称">
                <el-input
                    :value="groupName"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>
            <el-form-item label="新名称" prop="newGroupName">
                <el-input
                    v-model="newGroupName"
                    placeholder="请输入新的分组名称"
                    clearable
                    maxlength="25"
                    style="width: 100%"
                    @keyup.enter="handleSubmit"
                />
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleCancel">取消</el-button>
                <el-button type="primary" @click="handleSubmit">确定</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
</style>
