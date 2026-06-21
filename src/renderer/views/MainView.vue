<!--
    MainView.vue
    描述：主界面
 -->
<script setup>
import TitleBar from "../components/TitleBar.vue";
import SideBar from "../components/SideBar.vue";
import SideBarDrag from "../components/drag/SideBarDrag.vue";
import {onMounted, onUnmounted, ref} from "vue";
import {useBaseStateStore} from "../stores/modules/baseStateStore";
import {storeToRefs} from "pinia";
import Page from "../components/Page.vue";
import Welcome from "../components/Welcome.vue";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {eventBus} from "../utils/eventBus.js";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const sideBarWidth = ref(300) // 侧边栏宽度
const {searchModeState, exportModeState} = storeToRefs(useBaseStateStore())
const {sideCollapseState, developerMode} = storeToRefs(useUserSettingsStore())
const {openedConnectionConfigs, activeConnectionConfigId} = storeToRefs(useConnectionConfigsStore())

onMounted(() => {
    // 监听Redis连接状态变化
    window.api.redis.onConnectionStatusChanged(handleConnectionStatusChanged)
    // 初始化开发者模式，如果开启了开发者模式，则打开开发者模式
    initDevelopMode()
    // 监听关闭已打开的连接事件
    eventBus.on('close-opened-connection', closeOpenedConnection)
    // 监听左侧菜单折叠状态
    eventBus.on('toggle-side-bar-collapse', toggleSideBarCollapse)
})

/**
 * 关闭已打开的连接
 * @param openedConnectionConfig
 */
const closeOpenedConnection = (openedConnectionConfig) => {
    // 要关闭的连接ID
    const oldConnectionId = openedConnectionConfig.id;

    // 获取要删除的连接对象的索引位置
    const index = openedConnectionConfigs.value.findIndex(connect => connect.id === oldConnectionId)

    // 切换激活的连接，默认切换到被删除的前一个连接，如果不存在前一个连接，则切换到后一个连接，如果后一个不存在，则切换激活连接为0
    if (activeConnectionConfigId.value === oldConnectionId) {
        // 优先切换到前一个连接（index - 1）
        if (index > 0) {
            // 前一个连接存在，切换到前一个
            activeConnectionConfigId.value = openedConnectionConfigs.value[index - 1].id
        } else if (index < openedConnectionConfigs.value.length - 1) {
            // 前一个不存在，但后一个存在，切换到后一个
            activeConnectionConfigId.value = openedConnectionConfigs.value[index + 1].id
        } else {
            // 前后都不存在，切换激活连接为空（0）
            activeConnectionConfigId.value = 0
        }
    }

    // 删除已打开的连接
    openedConnectionConfigs.value = openedConnectionConfigs.value.filter(connect => connect.id !== oldConnectionId)

    // 关闭Redis连接
    window.api.redis.disconnect(oldConnectionId)
}

/**
 * 监听Redis连接状态变化
 */
const handleConnectionStatusChanged = (data) => {
    console.log('连接状态变化', data)
    // 使用 find 查找对应的连接对象，更新打开的连接对象
    const connection = openedConnectionConfigs.value.find(connect => connect.id === data.connectionId);
    if (connection) {
        // 直接更新响应式对象的属性，Vue 会自动触发视图更新
        connection.status = data.status;
    }
}

/**
 * 切换侧边栏折叠状态
 */
const toggleSideBarCollapse = () => {
    // 折叠侧边栏
    sideCollapseState.value = !sideCollapseState.value
    if (sideCollapseState.value) {
        // 关闭搜索模式
        searchModeState.value = false
        // 关闭导出模式
        exportModeState.value = false
    }
}

/**
 * 初始化开发模式
 */
const initDevelopMode = async () => {
    if (developerMode.value) {
        await window.api.develop.openDevelopMode()
    } else {
        await window.api.develop.closeDevelopMode()
    }
}

onUnmounted(() => {
    // 移除Redis连接状态变化监听器
    window.api.redis.removeConnectionStatusListener()
})
</script>

<template>
    <div class="main-page no-select">
        <div class="header">
            <TitleBar/>
        </div>
        <div class="container">
            <div class="side" :class="{'is-collapsed': sideCollapseState}" :style="{width: sideBarWidth + 'px'}">
                <SideBar/>
                <div v-if="!sideCollapseState" class="drag">
                    <SideBarDrag :sideBarWidth="sideBarWidth"
                                 @update:sideBarWidth="newWidth => sideBarWidth = newWidth"/>
                </div>
            </div>
            <div class="content">
                <Page v-if="openedConnectionConfigs.length > 0"/>
                <Welcome v-else/>
            </div>
        </div>
    </div>
</template>

<style scoped>
.main-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 深色模式 */
.dark .main-page {
    background: linear-gradient(135deg, #020202 40%, #636363 100%) !important;
}

.header {
    height: 40px;
    flex-shrink: 0;
    overflow: hidden;
}

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
    transition: width .2s ease-out;
}

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