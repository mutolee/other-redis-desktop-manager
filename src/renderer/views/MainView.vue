<!--
    MainView.vue
    描述：主界面布局容器。承载标题栏、侧边栏、拖拽分割线和主内容区。
    职责：维护侧边栏状态、打开连接页签状态，并同步主进程推送的 Redis 连接状态。
 -->
<template>
    <div class="main-page">
        <!-- 顶部自定义标题栏。 -->
        <div class="header">
            <TitleBar/>
        </div>

        <div class="container">
            <!-- 左侧边栏：包含菜单主体和右侧拖拽分割线。 -->
            <aside class="side" :class="{ 'is-collapsed': sideCollapseState }" :style="{ width: sideBarWidth + 'px' }">
                <SideBar/>
                <div v-if="!sideCollapseState" class="drag">
                    <SideBarDrag
                        :side-bar-width="sideBarWidth"
                        @update:sideBarWidth="(newWidth) => sideBarWidth = newWidth"
                    />
                </div>
            </aside>

            <!-- 主内容区：有打开连接时展示连接工作区，否则展示欢迎页。 -->
            <main class="content">
                <Page v-if="openedConnectionConfigs.length > 0"/>
                <Welcome v-else/>
            </main>
        </div>
    </div>
</template>

<script setup>
import {onMounted, onUnmounted, ref} from 'vue'
import {storeToRefs} from 'pinia'
import TitleBar from '../components/TitleBar.vue'
import SideBar from '../components/SideBar.vue'
import SideBarDrag from '../components/drag/SideBarDrag.vue'
import Page from '../components/Page.vue'
import Welcome from '../components/Welcome.vue'
import {useBaseStateStore} from '../stores/modules/baseStateStore'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import {eventBus} from '../utils/eventBus.js'

// 侧边栏宽度：用户可以通过 SideBarDrag 拖拽调整。
const sideBarWidth = ref(260)
const SIDE_BAR_AUTO_COLLAPSE_WIDTH = 1180

// 基础 UI 状态：侧边栏折叠时需要关闭搜索/导出模式。
const {searchModeState, exportModeState} = storeToRefs(useBaseStateStore())

// 用户设置状态：主布局读取侧边栏折叠状态和开发者模式开关。
const {sideCollapseState, developerMode} = storeToRefs(useUserSettingsStore())

// 连接页签状态：主内容区根据打开连接数量决定展示 Page 还是 Welcome。
const connectionConfigsStore = useConnectionConfigsStore()
const {openedConnectionConfigs} = storeToRefs(connectionConfigsStore)

// Redis 连接状态监听解绑函数：组件卸载时必须释放 preload 注册的事件监听。
let removeConnectionStatusListener = null
let isSideBarAutoCollapsed = false
let sideBarStateBeforeAutoCollapse = false

onMounted(() => {
    // 监听主进程推送的 Redis 连接状态变化，并同步到已打开连接对象上。
    removeConnectionStatusListener = window.api.redis.onConnectionStatusChanged(handleConnectionStatusChanged)

    // 根据用户设置恢复开发者模式快捷键状态。
    initDevelopMode()

    // 注册跨组件事件，标题栏通过 eventBus 通知主布局切换侧边栏。
    eventBus.on('toggle-side-bar-collapse', toggleSideBarCollapse)

    // 首屏和窗口尺寸变化时自动评估侧边栏状态，避免窄窗口下内容区被挤压。
    handleResponsiveSideBar()
    window.addEventListener('resize', handleResponsiveSideBar)
})

/**
 * 同步 Redis 连接状态。
 * 主进程连接状态变化通过 preload 通知 renderer，这里只更新已打开连接列表中的对应对象。
 *
 * @param {{connectionId:number|string, status:string}} data - 连接状态事件数据
 */
const handleConnectionStatusChanged = (data) => {
    connectionConfigsStore.updateConnectionStatus(data)
}

/**
 * 折叠侧边栏时关闭依赖展开宽度的临时模式。
 * 搜索面板和导出面板在折叠状态下不可见，提前关闭可以避免残留不可见状态。
 */
const closeSideBarTransientModes = () => {
    searchModeState.value = false
    exportModeState.value = false
}

/**
 * 切换侧边栏折叠状态。
 * 折叠后关闭搜索和导出模式，避免折叠菜单仍保留不可见的操作状态。
 */
const toggleSideBarCollapse = () => {
    isSideBarAutoCollapsed = false
    sideCollapseState.value = !sideCollapseState.value

    if (sideCollapseState.value) {
        closeSideBarTransientModes()
    }
}

/**
 * 根据窗口宽度自动折叠或恢复侧边栏。
 * 只有“自动折叠”触发的状态才会在窗口变宽后恢复，避免覆盖用户手动折叠偏好。
 */
const handleResponsiveSideBar = () => {
    const shouldCollapse = window.innerWidth <= SIDE_BAR_AUTO_COLLAPSE_WIDTH

    if (shouldCollapse && !sideCollapseState.value) {
        sideBarStateBeforeAutoCollapse = sideCollapseState.value
        isSideBarAutoCollapsed = true
        sideCollapseState.value = true
        closeSideBarTransientModes()
        return
    }

    if (!shouldCollapse && isSideBarAutoCollapsed) {
        sideCollapseState.value = sideBarStateBeforeAutoCollapse
        isSideBarAutoCollapsed = false
    }
}

/**
 * 初始化开发者模式。
 * 根据持久化设置恢复 DevTools 快捷键启用状态。
 */
const initDevelopMode = async () => {
    if (developerMode.value) {
        await window.api.develop.openDevelopMode()
        return
    }

    await window.api.develop.closeDevelopMode()
}

onUnmounted(() => {
    // 释放 preload 注册的连接状态监听器。
    removeConnectionStatusListener?.()

    // 移除当前组件注册的事件总线监听，避免非 KeepAlive 场景重复注册。
    eventBus.off('toggle-side-bar-collapse', toggleSideBarCollapse)
    window.removeEventListener('resize', handleResponsiveSideBar)
})
</script>

<style scoped>
.main-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 暗色模式主背景：覆盖浅色渐变，和全局暗色主题保持一致。 */
.dark .main-page {
    background: linear-gradient(135deg, #020202 40%, #636363 100%) !important;
}

.header {
    height: 40px;
    flex-shrink: 0;
    overflow: hidden;
}

/* 主布局容器：横向承载侧边栏和内容区，内部滚动交给各子区域处理。 */
.container {
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
}

.side {
    position: relative;
    flex-shrink: 0;
}

.side.is-collapsed {
    width: 64px !important;
    transition: width 0.2s ease-out;
}

/* 侧边栏拖拽入口：居中贴在侧栏右侧，视觉上不占用菜单宽度。 */
.drag {
    position: absolute;
    top: 50%;
    right: -8px;
    z-index: 100;
}

.content {
    flex: 1;
    overflow: hidden;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
