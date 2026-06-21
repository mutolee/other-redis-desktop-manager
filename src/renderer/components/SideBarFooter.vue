<!--
    SideBarFooter.vue
    描述：侧边栏Footer部分
 -->
<script setup>
import {Github} from "@icon-park/vue-next";
import {storeToRefs} from "pinia";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const {sideCollapseState} = storeToRefs(useUserSettingsStore()) // 侧边栏折叠状态

/**
 * 打开Github
 * @returns {Promise<void>}
 */
const openGithub = async () => {
    await window.api.mainWin.openExternal('https://github.com/')
}
</script>

<template>
    <div :class="['github-bar', { 'is-collapsed': sideCollapseState }]" @click="openGithub">
        <el-icon :size="30">
            <Github/>
        </el-icon>
        <span v-if="!sideCollapseState">开源地址</span>
    </div>
</template>

<style scoped>
/* ==================== 侧边栏-Github内容 ==================== */
.github-bar {
    display: flex;
    align-items: center;
    justify-content: left;
    gap: 10px;
    padding: 10px 16px;
    background: var(--titlebar-bg-color);
    cursor: pointer;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
    color: var(--el-text-color-secondary);
    font-size: 14px;
    flex-shrink: 0;
}

.github-bar.is-collapsed {
    justify-content: center;
}

.github-bar:hover {
    color: var(--el-color-white);
}
</style>