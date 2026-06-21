<!--
    SideBarHeader.vue
    描述：侧边栏顶部品牌区。展示 Logo、产品名和 Redis 命令背景装饰，并适配折叠状态。
 -->
<script setup>
import { storeToRefs } from 'pinia'
import { useUserSettingsStore } from '../stores/modules/userSettingsStore.js'

// 用户设置 store：读取侧边栏折叠状态，驱动品牌区的尺寸和文字显隐。
const { sideCollapseState } = storeToRefs(useUserSettingsStore())
</script>

<template>
    <!-- 品牌容器：折叠后只保留居中的 Logo，展开时展示产品名称和命令装饰。 -->
    <div :class="['sidebar-header', { 'is-collapsed': sideCollapseState }]">
        <img class="logo" src="../assets/logo.png" alt="logo"/>
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
/* 品牌区：固定在侧边栏顶部，通过渐变和溢出裁剪承载命令装饰背景。 */
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
    height: 60px;
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
    letter-spacing: 0.5px;
    white-space: nowrap;
    font-weight: bold;
}

/* 命令装饰文字：只作为顶部视觉纹理，不参与实际交互。 */
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
