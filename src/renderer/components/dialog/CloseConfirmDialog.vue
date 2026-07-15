<!--
  关闭确认对话框
  描述：提供关闭窗口时的确认提示，让用户选择：最小化到托盘、退出或取消
 -->
<template>
    <el-dialog
        v-model="dialogVisible"
        width="400px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @close="handleCancel"
    >
        <template #header>
            <!-- 弹窗标题：关闭确认属于提示操作，使用问号图标降低误操作风险。 -->
            <DialogTitle :icon="Help" :title="t('dialogs.closeConfirm.title')"/>
        </template>
        <div class="dialog-content">
            <el-text>{{ t('dialogs.closeConfirm.message') }}</el-text>
            <el-radio-group v-model="selectedAction" class="select-radio-group">
                <el-radio label="hide">{{ t('dialogs.closeConfirm.hideToTray') }}</el-radio>
                <el-radio label="quit">{{ t('dialogs.closeConfirm.quit') }}</el-radio>
            </el-radio-group>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-checkbox v-model="neverTipsAgain">{{ t('dialogs.closeConfirm.neverTipsAgain') }}</el-checkbox>
                <span class="dialog-footer-buttons">
                    <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
                    <el-button type="primary" @click="handleConfirm">{{ t('common.confirm') }}</el-button>
                </span>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref} from 'vue'
import {Help} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {useUserSettingsStore} from '../../stores/modules/userSettingsStore.js'
import DialogTitle from '../common/DialogTitle.vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动关闭确认弹窗标题、选项和按钮文案。
const {t} = useI18n()

// 组件入参：由标题栏控制关闭确认弹窗的显示状态。
const props = defineProps({
    visible: {
        type: Boolean
    }
})

// 对外事件：同步 v-model:visible，关闭弹窗时通知父组件。
const emit = defineEmits(['update:visible'])

// 弹窗可见性代理：把 Element Plus Dialog 的 v-model 透传给父组件。
const dialogVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 关闭选项状态：记录是否不再提示，以及本次关闭行为。
const neverTipsAgain = ref(false)
const selectedAction = ref('hide')
// 用户设置 store：读写关闭行为偏好。
const {closeManagement} = storeToRefs(useUserSettingsStore())
// 关闭动作延迟定时器：弹窗动画结束前延迟执行窗口隐藏/退出，卸载时需要清理。
const closeActionTimer = ref(null)

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
        closeActionTimer.value = setTimeout(() => {
            // 根据用户选择执行相应操作
            if (selectedAction.value === 'hide') {
                // 最小化到托盘
                window.api?.mainWin.hide()
            } else if (selectedAction.value === 'quit') {
                // 退出应用
                window.api?.mainWin.quit()
            }
            closeActionTimer.value = null
        }, 100)
    })
}

onUnmounted(() => {
    if (closeActionTimer.value) {
        clearTimeout(closeActionTimer.value)
    }
})

/**
 * 退出取消
 */
const handleCancel = () => {
    dialogVisible.value = false
}
</script>

<style scoped>
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
