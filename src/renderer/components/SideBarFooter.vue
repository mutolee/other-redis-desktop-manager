<!--
    SideBarFooter.vue
    描述：侧边栏底部入口。展示开源地址按钮，并适配侧边栏折叠状态。
 -->
<script setup>
import { Github } from '@icon-park/vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from '../i18n/index.js'
import { useUserSettingsStore } from '../stores/modules/userSettingsStore.js'

// 国际化文案读取函数：驱动侧边栏底部开源入口文案。
const { t } = useI18n()

// 用户设置 store：读取侧边栏折叠状态，控制底部入口是否展示文字。
const { sideCollapseState } = storeToRefs(useUserSettingsStore())

/**
 * 打开Github
 * @returns {Promise<void>}
 */
const openGithub = async () => {
    await window.api.mainWin.openExternal('https://github.com/')
}
</script>

<template>
    <!-- 开源入口：展开时展示图标和文字，折叠时仅保留图标。 -->
    <div :class="['github-bar', { 'is-collapsed': sideCollapseState }]" @click="openGithub">
        <el-icon :size="30">
            <Github/>
        </el-icon>
        <span v-if="!sideCollapseState">{{ t('sideBarFooter.openSource') }}</span>
    </div>
</template>

<style scoped>
/* 底部开源入口：固定在侧边栏底部，使用 titlebar 背景融入整体菜单。 */
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
