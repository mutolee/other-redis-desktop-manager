<!--
    Page.vue
    描述：连接页面
 -->
<script setup>
import PageInfo from "./PageInfo.vue";
import {storeToRefs} from "pinia";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import PageHeader from "./PageHeader.vue";
import PageNavbar from "./PageNavbar.vue";

// 响应式数据
const {activeConnectionConfigId, openedConnectionConfigs} = storeToRefs(useConnectionConfigsStore())
</script>

<template>
    <div class="page-panel">
        <PageHeader/>
        <PageNavbar/>
        <keep-alive include="PageInfo">
            <PageInfo
                v-for="tab in openedConnectionConfigs"
                :key="tab.id"
                :tab-id="String(tab.id)"
                v-show="activeConnectionConfigId === tab.id"
            />
        </keep-alive>
    </div>
</template>

<style scoped>
.page-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>