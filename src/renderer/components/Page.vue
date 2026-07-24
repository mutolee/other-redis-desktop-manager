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

        <!-- 连接内容区：只挂载当前页，并为最近使用的连接保留有限缓存，控制大 Key 列表的内存占用。 -->
        <keep-alive :max="PAGE_INFO_CACHE_LIMIT">
            <PageInfo
                v-if="currOpenedConnectionConfig.id"
                :key="currOpenedConnectionConfig.pageInstanceKey || currOpenedConnectionConfig.id"
                :tab-id="String(activeConnectionConfigId)"
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

// PageInfo 缓存上限：限制大型 Key 列表和详情状态长期驻留的连接数量。
const PAGE_INFO_CACHE_LIMIT = 8

// 连接配置 store：当前只渲染活动连接，其余最近使用页面由 KeepAlive 缓存。
const {activeConnectionConfigId, currOpenedConnectionConfig} = storeToRefs(useConnectionConfigsStore())
</script>

<style scoped>
/* 连接工作区使用纵向布局：页头、页签固定在上方，内容区由 PageInfo 自行撑满。 */
.page-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>
