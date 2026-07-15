<!--
    Page.vue
    描述：连接工作区容器。承载连接页头、页签导航和每个连接对应的 PageInfo 内容页。
 -->
<template>
    <div class="page-panel">
        <!-- 当前连接的运行状态、数据库选择和快捷操作区域。 -->
        <PageHeader/>

        <!-- 已打开连接页签导航。 -->
        <PageNavbar/>

        <!-- 连接内容区：缓存每个连接页，切换页签时保留 Key 列表和详情状态。 -->
        <keep-alive include="PageInfo">
            <PageInfo
                v-for="tab in openedConnectionConfigs"
                :key="tab.id"
                :tab-id="String(tab.id)"
                v-show="String(activeConnectionConfigId) === String(tab.id)"
            />
        </keep-alive>
    </div>
</template>

<script setup>
import {storeToRefs} from 'pinia'
import PageHeader from './PageHeader.vue'
import PageInfo from './PageInfo.vue'
import PageNavbar from './PageNavbar.vue'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'

// 连接配置 store：读取当前激活连接 ID 和已打开连接列表，用于控制 PageInfo 缓存和显隐。
const {activeConnectionConfigId, openedConnectionConfigs} = storeToRefs(useConnectionConfigsStore())
</script>

<style scoped>
/* 连接工作区使用纵向布局：页头、页签固定在上方，内容区由 PageInfo 自行撑满。 */
.page-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>
