<!--
  关闭确认对话框
  描述：提供关闭窗口时的确认提示，让用户选择：最小化到托盘、退出或取消
 -->
<script setup>
import {computed, defineEmits, defineProps, nextTick, onMounted, ref} from 'vue'
import {Help} from '@icon-park/vue-next';
import {useUserSettingsStore} from "../../stores/modules/userSettingsStore.js";
import {storeToRefs} from "pinia";

// Props
const props = defineProps({
    visible: {
        type: Boolean
    }
})

// Emits
const emit = defineEmits(['update:visible'])

// 计算属性
const dialogVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 响应式数据
const neverTipsAgain = ref(false)  // 不再提示复选框
const selectedAction = ref('hide') // 默认选择：最小化到托盘
const {closeManagement} = storeToRefs(useUserSettingsStore())

onMounted(() => {
    // 初始化关闭行为
    selectedAction.value = closeManagement.value.closeToTray ? 'hide' : 'quit'
})

/**
 * 退出确认
 */
const handleConfirm = () => {
    // 保存默认操作
    closeManagement.value.closeToTray = selectedAction.value === 'hide'

    // 如果选择了"不再提示"，保存设置到 localData
    if (neverTipsAgain.value) {
        closeManagement.value.prompt = false
    }

    // 先关闭弹窗
    dialogVisible.value = false

    // 使用 nextTick 确保弹窗状态已更新到父组件
    nextTick(() => {
        // 再使用 setTimeout 确保状态完全同步后再隐藏窗口
        setTimeout(() => {
            // 根据用户选择执行相应操作
            if (selectedAction.value === 'hide') {
                // 最小化到托盘
                window.api?.mainWin.hide()
            } else if (selectedAction.value === 'quit') {
                // 退出应用
                window.api?.mainWin.quit()
            }
        }, 100)
    })
}

/**
 * 退出取消
 */
const handleCancel = () => {
    dialogVisible.value = false
}
</script>

<template>
    <el-dialog
        v-model="dialogVisible"
        width="400px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @close="handleCancel"
    >
        <template #header>
            <div class="dialog-header">
                <el-icon class="dialog-header-icon">
                    <Help/>
                </el-icon>
                <el-text size="large">关闭确认</el-text>
            </div>
        </template>
        <div class="dialog-content">
            <el-text>您点击了关闭按钮，您想要:</el-text>
            <el-radio-group v-model="selectedAction" class="select-radio-group">
                <el-radio label="hide">最小化到托盘</el-radio>
                <el-radio label="quit">退出</el-radio>
            </el-radio-group>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-checkbox v-model="neverTipsAgain">不再提示</el-checkbox>
                <span class="dialog-footer-buttons">
                    <el-button @click="handleCancel">取消</el-button>
                    <el-button type="primary" @click="handleConfirm">确定</el-button>
                </span>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.dialog-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dialog-header-icon {
    font-size: 24px;
    color: var(--el-color-primary);
}

.dialog-content {
    padding: 10px 0;
}

.select-radio-group {
    margin-top: 20px;
    margin-bottom: 15px;
    margin-left: 20px;
    display: flex;
    flex-direction: column;
    align-items: start;
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dialog-footer-buttons {
    display: flex;
    gap: 10px;
}
</style>