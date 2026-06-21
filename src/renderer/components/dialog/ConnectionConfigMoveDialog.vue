<!--
    ConnectionConfigMoveDialog.vue
    描述：移动连接配置到其他分组的对话框
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
    connection: {
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

// 响应式数据
const formRef = ref(null) // 表单引用
const targetGroupName = ref('') // 目标分组名称
const {searchModeState} = storeToRefs(useBaseStateStore())

// 表单验证规则
const formRules = {
    targetGroupName: [
        {required: true, message: '请选择目标分组', trigger: 'change'}
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
        let res = groupNames.map(name => ({value: name}))
        // 如果res中不包括`默认分组`, 则添加一个默认分组
        if (!res.some(item => item.value === '默认分组')) {
            res.unshift({value: '默认分组'})
        }
        // 过滤掉当前分组
        const currentGroupName = props.connection?.group_name || ''
        res = res.filter(item => item.value !== currentGroupName)
        cb(res)
    } catch (error) {
        console.error('获取分组列表失败:', error)
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
            ElMessage.error('连接配置ID不存在')
            return
        }

        const currentGroupName = props.connection.group_name || ''
        const trimmedTargetName = targetGroupName.value.trim()

        // 检查目标分组是否与当前分组相同
        if (currentGroupName === trimmedTargetName) {
            ElMessage.warning('目标分组与当前分组相同')
            return
        }

        // 获取当前连接配置的完整数据
        const currentConnection = await connectConfigRepository.findById(props.connection.id)
        if (!currentConnection) {
            ElMessage.error('连接配置不存在')
            return
        }

        // 准备更新数据，只更新 group_name
        const updateData = {
            ...currentConnection.modelToObject(),
            group_name: trimmedTargetName
        }

        // 调用更新连接配置接口
        await connectConfigRepository.update(props.connection.id, updateData)
        ElMessage.success('连接配置移动成功')

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }

        handleCancel()
    } catch (error) {
        console.error('移动连接配置失败:', error)
        ElMessage.error('移动连接配置失败: ' + (error.message || '未知错误'))
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
    <el-dialog v-model="dialogVisible" title="移动到其他分组" width="500px"
               :close-on-click-modal="false"
               :close-on-press-escape="false"
               @close="handleCancel">
        <el-form ref="formRef" :model="{targetGroupName}" :rules="formRules" label-width="100px" label-position="right">
            <el-form-item label="连接名称">
                <el-input
                    :value="connection?.name || ''"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>
            <el-form-item label="当前分组">
                <el-input
                    :value="connection?.group_name || ''"
                    :maxlength="25"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>
            <el-form-item label="目标分组" prop="targetGroupName">
                <el-autocomplete
                    v-model="targetGroupName"
                    :fetch-suggestions="handleGroupQuery"
                    placeholder="请选择或输入目标分组名称"
                    maxlength="25"
                    clearable
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
