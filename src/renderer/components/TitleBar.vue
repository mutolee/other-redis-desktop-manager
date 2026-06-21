<!--
    TitleBar.vue
    描述：标题栏
 -->
<script setup>
import {Close, FullScreen, Minus, Moon, Refresh, SettingTwo, SunOne} from '@icon-park/vue-next';
import {computed, onMounted, ref} from "vue";
import {eventBus} from "../utils/eventBus.js";
import CloseConfirmDialog from "./dialog/CloseConfirmDialog.vue";
import SettingsDrawer from "./drawer/SettingsDrawer.vue";
import {storeToRefs} from "pinia";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const closeConfirmDialogVisible = ref(false)
const showSettingsDrawerVisible = ref(false)
const {theme, color, closeManagement} = storeToRefs(useUserSettingsStore())
const {setTheme, setColor} = useUserSettingsStore()

// 暗黑模式状态
const isDarkMode = computed(() => {
    return theme.value === 'dark'
})

onMounted(() => {
    // 监听打开设置事件
    eventBus.on('open-setting', () => {
        openSetting()
    })

    // 初始化主题
    setTheme(theme.value)
    // 初始化颜色
    setColor(color.value)
})

/**
 * 最小化窗口
 * 调用主进程的窗口最小化方法
 */
const onMinimize = () => {
    window.api?.mainWin.minimize()
}

/**
 * 切换窗口最大化状态
 * 在最大化和还原之间切换
 */
const onToggleMax = () => {
    window.api?.mainWin.toggleMaximize()
}

/**
 * 重新加载页面
 * 刷新当前渲染进程内容
 */
const onReload = () => {
    window.api?.mainWin.reload()
}

/**
 * 关闭窗口
 * 显示关闭确认对话框，让用户选择：最小化到托盘、退出或取消
 */
const onClose = () => {
    if (!closeManagement.value.prompt) {
        // 如果设置了不再提示，验证是否缩小到托盘
        if (closeManagement.value.closeToTray) {
            window.api?.mainWin.hide()
        } else {
            window.api?.mainWin.quit()
        }
        return
    }

    // 显示关闭确认对话框
    closeConfirmDialogVisible.value = true
}

/**
 * 打开设置抽屉
 */
const openSetting = () => {
    showSettingsDrawerVisible.value = true
}
</script>

<template>
    <div class="title-bar">
        <div class="icon-container">
            <div class="icon">
                <img src="../assets/img/logo.png" alt=""/>
            </div>
            <span class="title">Other Redis Desktop Manager</span>
        </div>
        <div class="drag-container"></div>
        <div class="control-container">
            <el-tooltip content="设置" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl ctrl-settings" @click="openSetting">
                    <span class="chip">
                        <el-icon size="18">
                            <SettingTwo/>
                        </el-icon>
                    </span>
                </button>
            </el-tooltip>
            <el-tooltip content="重新加载窗体" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl" @click="onReload">
                    <el-icon size="18">
                        <Refresh/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip :content="isDarkMode ? '切换到浅色模式' : '切换到暗黑模式'" placement="bottom" :show-after="200"
                        :offset="6">
                <button class="ctrl" @click="setTheme(isDarkMode ? 'light' : 'dark')">
                    <el-icon size="18">
                        <Moon v-if="isDarkMode"/>
                        <SunOne v-else/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip content="最小化" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl" @click="onMinimize">
                    <el-icon size="18">
                        <Minus/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip content="最大化/还原" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl" @click="onToggleMax">
                    <el-icon size="18">
                        <FullScreen/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip content="关闭" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl ctrl-close" @click="onClose">
                    <el-icon size="18">
                        <Close/>
                    </el-icon>
                </button>
            </el-tooltip>
        </div>
    </div>

    <!-- 关闭确认对话框 -->
    <CloseConfirmDialog v-if="closeConfirmDialogVisible" v-model:visible="closeConfirmDialogVisible"/>
    <!-- 设置抽屉 -->
    <SettingsDrawer v-model:visible="showSettingsDrawerVisible"/>
</template>

<style scoped>
.title-bar {
    height: 100%;
    display: flex;
    flex-direction: row;
    background: linear-gradient(
        123deg,
        var(--titlebar-bg-color) 50%,
        var(--el-color-primary) 80%,
        var(--titlebar-bg-color) 90%,
        var(--titlebar-bg-color) 100%
    );
}

.icon-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.icon {
    width: 25px;
    height: 25px;
    border-radius: 4px;
    background: var(--el-color-primary);
    margin-left: 8px;
}

.icon img {
    width: 100%;
    height: 100%;
}

.title {
    font-size: 14px;
    color: var(--el-color-white);
}

.drag-container {
    flex: 1;
    height: 100%;
    -webkit-app-region: drag; /* 启用拖拽功能 */
}

.control-container {
    display: flex;
    flex-direction: row;
    height: 100%;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 45px;
    height: 100%;
    background: transparent;
    border: none;
    transition: all 0.15s ease;
    cursor: pointer;
    color: var(--el-color-white);
}

.ctrl:not(.ctrl-settings,.ctrl-close):hover {
    background: #29292e;
    color: var(--el-color-white);
}

.ctrl:not(.ctrl-settings,.ctrl-close):active {
    background: #1e1e24;
}

.ctrl.ctrl-settings .chip {
    height: 30px;
    width: 30px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.ctrl.ctrl-settings:hover .chip {
    background: rgba(0, 0, 0, 0.6);
}

.ctrl.ctrl-settings:active .chip {
    background: rgba(0, 0, 0, 0.8);
}

.ctrl.ctrl-close:hover {
    background: red;
    color: #fff;
}

.ctrl.ctrl-close:active {
    background: darkred;
}
</style>