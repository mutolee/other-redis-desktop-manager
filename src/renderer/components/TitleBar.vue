<!--
    TitleBar.vue
    描述：应用窗口标题栏，负责展示应用标识、窗口控制按钮、主题切换入口和设置入口。
 -->
<template>
    <!-- 标题栏主容器：左侧应用信息，中间拖拽区，右侧窗口控制区。 -->
    <div class="title-bar">
        <!-- 应用标识区：展示 Logo 和产品名称。 -->
        <div class="icon-container">
            <div class="icon">
                <img src="../assets/logo.png" alt=""/>
            </div>
            <span class="title">Other Redis Desktop Manager</span>
        </div>

        <!-- Electron 窗口拖拽区域：占据标题栏剩余空间。 -->
        <div class="drag-container"></div>

        <!-- 标题栏控制区：设置、刷新、主题切换和窗口控制按钮。 -->
        <div class="control-container">
            <el-tooltip :content="t('titleBar.settings')" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl ctrl-settings" @click="openSetting">
                    <span class="chip">
                        <el-icon size="18">
                            <SettingTwo/>
                        </el-icon>
                        <span v-if="hasAvailableUpdate" class="settings-update-dot"></span>
                    </span>
                </button>
            </el-tooltip>
            <el-tooltip :content="t('titleBar.reload')" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl" @click="onReload">
                    <el-icon size="18">
                        <Refresh/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip :content="isDarkMode ? t('titleBar.switchToLight') : t('titleBar.switchToDark')" placement="bottom" :show-after="200"
                        :offset="6">
                <button class="ctrl" @click="handleThemeToggle">
                    <el-icon size="18">
                        <Moon v-if="isDarkMode"/>
                        <SunOne v-else/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip :content="t('titleBar.minimize')" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl" @click="onMinimize">
                    <el-icon size="18">
                        <Minus/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip :content="t('titleBar.maximizeRestore')" placement="bottom" :show-after="200" :offset="6">
                <button class="ctrl" @click="onToggleMax">
                    <el-icon size="18">
                        <FullScreen/>
                    </el-icon>
                </button>
            </el-tooltip>
            <el-tooltip :content="t('titleBar.close')" placement="bottom" :show-after="200" :offset="6">
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

<script setup>
import {Close, FullScreen, Minus, Moon, Refresh, SettingTwo, SunOne} from '@icon-park/vue-next';
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {eventBus} from "../utils/eventBus.js";
import CloseConfirmDialog from "./dialog/CloseConfirmDialog.vue";
import SettingsDrawer from "./drawer/SettingsDrawer.vue";
import {storeToRefs} from "pinia";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";
import {useAppUpdateStore} from "../stores/modules/appUpdateStore.js";
import {applyThemeTransition} from "../utils/themeTransition.js";
import {useI18n} from "../i18n/index.js";

// 标题栏本地状态：控制关闭确认弹窗与设置抽屉的显示。
const closeConfirmDialogVisible = ref(false)
const showSettingsDrawerVisible = ref(false)

// 国际化文案读取函数：驱动标题栏 tooltip 文案。
const {t} = useI18n()

// 用户设置 Store：主题、主题色、关闭行为配置驱动标题栏按钮和关闭逻辑。
const {theme, color, closeManagement} = storeToRefs(useUserSettingsStore())
const {setTheme, setColor} = useUserSettingsStore()
const appUpdateStore = useAppUpdateStore()
const {hasAvailableUpdate} = storeToRefs(appUpdateStore)

// 暗黑模式状态：用于切换按钮图标和 tooltip 文案。
const isDarkMode = computed(() => {
    return theme.value === 'dark'
})

// 全局设置入口事件处理器：保持函数引用稳定，便于卸载时解绑。
const handleOpenSettingEvent = () => {
    openSetting()
}

onMounted(() => {
    // 监听全局打开设置事件，允许其他组件唤起设置抽屉。
    eventBus.on('open-setting', handleOpenSettingEvent)

    // 初始化已持久化的主题与主题色，保证标题栏首次渲染时状态正确。
    setTheme(theme.value)
    setColor(color.value)

    initializeAutoUpdateCheck()
})

onBeforeUnmount(() => {
    // 释放标题栏注册的全局事件监听，避免组件重建后重复打开设置抽屉。
    eventBus.off('open-setting', handleOpenSettingEvent)
})

/**
 * 处理标题栏主题切换按钮点击（带圆形扩散动画）
 * 将点击事件传给 applyThemeTransition 以获取动画圆心坐标
 */
const handleThemeToggle = (e) => {
    applyThemeTransition(() => {
        setTheme(isDarkMode.value ? 'light' : 'dark')
    }, e)
}

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
        // 未开启关闭确认时，直接根据用户设置隐藏到托盘或退出应用。
        if (closeManagement.value.closeToTray) {
            window.api?.mainWin.hide()
        } else {
            window.api?.mainWin.quit()
        }
        return
    }

    // 开启关闭确认时，交由对话框处理最小化到托盘、退出或取消。
    closeConfirmDialogVisible.value = true
}

/**
 * 打开设置抽屉
 * 可由标题栏设置按钮直接触发，也可由 eventBus 间接触发
 */
const openSetting = () => {
    showSettingsDrawerVisible.value = true
}

/**
 * 初始化自动版本检查。
 * 先恢复 Pinia 中持久化的更新提示状态，再静默请求 GitHub Release 最新版本。
 */
const initializeAutoUpdateCheck = async () => {
    await appUpdateStore.initializeUpdateState()
    appUpdateStore.checkForUpdates().catch(() => {})
}
</script>

<style scoped>
/* 标题栏整体布局：横向分布，并使用主题色渐变增强窗口顶部识别度。 */
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

/* 应用标识区域：固定在左侧，不参与窗口拖拽。 */
.icon-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

/* Logo 容器：小尺寸圆角底色，与主题色保持一致。 */
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

/* Electron 拖拽区域：让空白标题栏可以拖动窗口。 */
.drag-container {
    flex: 1;
    height: 100%;
    -webkit-app-region: drag; /* 启用拖拽功能 */
}

/* 右侧控制按钮容器：固定宽度，不被中间拖拽区域压缩。 */
.control-container {
    display: flex;
    flex-direction: row;
    height: 100%;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* 标题栏通用按钮：图标居中，保持稳定点击区域。 */
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

/* 普通按钮悬浮态：设置和关闭按钮有独立交互样式，因此排除。 */
.ctrl:not(.ctrl-settings,.ctrl-close):hover {
    background: #29292e;
    color: var(--el-color-white);
}

.ctrl:not(.ctrl-settings,.ctrl-close):active {
    background: #1e1e24;
}

/* 设置按钮内部 chip：让设置按钮悬浮反馈更克制，不占满标题栏高度。 */
.ctrl.ctrl-settings .chip {
    position: relative;
    height: 30px;
    width: 30px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.settings-update-dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 7px;
    height: 7px;
    border: 1px solid var(--titlebar-bg-color);
    border-radius: 50%;
    background: #f56c6c;
}

.ctrl.ctrl-settings:hover .chip {
    background: rgba(0, 0, 0, 0.6);
}

.ctrl.ctrl-settings:active .chip {
    background: rgba(0, 0, 0, 0.8);
}

/* 关闭按钮悬浮态：使用红色反馈，符合桌面窗口控制习惯。 */
.ctrl.ctrl-close:hover {
    background: red;
    color: #fff;
}

.ctrl.ctrl-close:active {
    background: darkred;
}
</style>
