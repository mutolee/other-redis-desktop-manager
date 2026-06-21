<!--
    SideBarHeader.vue
    描述：侧边栏Header部分
 -->
<script setup>
import {storeToRefs} from "pinia";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const {sideCollapseState} = storeToRefs(useUserSettingsStore()) // 侧边栏折叠状态
</script>

<template>
    <div :class="['sidebar-header', { 'is-collapsed': sideCollapseState }]">
        <img class="logo" src="../assets/img/logo.png" alt="logo"/>
        <span class="title" v-if="!sideCollapseState">Other Redis Client</span>
        <div class="example" v-if="!sideCollapseState">
            <span>KEYS pattern</span>
            <span>SET key value</span>
            <span>HSET key field value</span>
            <span>LPUSH key value [value ...]</span>
            <span>SADD key member [member ...]</span>
            <span>ZADD key score member [...]</span>
            <span>ZREVRANK key member</span>
        </div>
    </div>
</template>

<style scoped>
.sidebar-header {
    padding: 16px;
    background: linear-gradient(90deg, var(--el-color-primary) 90%, #00537e 120%);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
}

.sidebar-header.is-collapsed {
    padding: 5px;
}

.sidebar-header .logo {
    width: 100px;
    height: auto;
}

.sidebar-header.is-collapsed .logo {
    width: 54px;
    height: auto;
}

.sidebar-header .title {
    font-size: 24px;
    color: #FFF;
    letter-spacing: 0.5px; /* 增加字间距 */
    white-space: nowrap;
    font-weight: bold;
}

.sidebar-header .example {
    position: absolute;
    top: 1px;
    right: 4px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.25) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
</style>