<!--
    PageInfo.vue
    描述：打开连接的 Redis Keys Values 页面
 -->
<script setup>
import {storeToRefs} from "pinia";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {computed} from "vue";
import PageFailed from "./PageFailed.vue";

// Props
const props = defineProps({
    // Tab ID，用于区分不同的连接
    tabId: {
        type: String,
        required: true
    }
})

// 响应式数据
const {openedConnectionConfigs} = storeToRefs(useConnectionConfigsStore())
// 计算属性，当前打开的连接配置
const currOpenedConnectionConfig = computed(() => {
    // 确保类型一致进行比较（tabId 是 String，config.id 可能是 Number）
    return openedConnectionConfigs.value.find(config => String(config.id) === props.tabId)
})
</script>

<template>
    <div class="page-info-panel">
        <div class="page-info-container" v-loading="currOpenedConnectionConfig.status === 'reconnecting' || currOpenedConnectionConfig.status === 'connecting'"
             :element-loading-text="currOpenedConnectionConfig.host + ':' + currOpenedConnectionConfig.port + ' 连接中...'">
            <PageFailed v-if="currOpenedConnectionConfig.status === 'disconnected' || currOpenedConnectionConfig.status === 'error'"/>
            <template v-if="currOpenedConnectionConfig.status === 'connected'">
                <el-text>{{ currOpenedConnectionConfig.status }}</el-text>
            </template>
        </div>
    </div>
</template>

<style scoped>
.page-info-panel {
    height: 100%;
    padding: 15px;
}
.page-info-container{
    height: 100%;
}
</style>