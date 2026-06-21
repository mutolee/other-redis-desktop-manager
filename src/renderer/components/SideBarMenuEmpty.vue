<!--
    SideBarMenuEmpty.vue
    描述：连接菜单为空的占位组件
 -->
<script setup>
import {eventBus} from "../utils/eventBus.js";
</script>

<template>
    <el-empty
        :image-size="80"
        description="还没有任何连接信息"
        class="menu-empty"
    >
        <template #description>
            <p>还没有任何连接信息</p>
            <p>点击下方按钮创建第一个连接</p>
        </template>
        <el-button type="primary" @click="(e) => eventBus.emit('create-new-connection', e)">创建连接</el-button>
        <el-button type="success" @click="() => eventBus.emit('import-connection')">导入连接</el-button>
    </el-empty>
</template>

<style scoped>
.menu-empty {
    --el-empty-fill-color-0: #595959 !important;
    --el-empty-fill-color-1: #909097 !important;
    --el-empty-fill-color-2: #717379 !important;
    --el-empty-fill-color-3: #3c3c3f !important;
    --el-empty-fill-color-4: #2d2d31 !important;
    --el-empty-fill-color-5: #2c2d31 !important;
    --el-empty-fill-color-6: #202123 !important;
    --el-empty-fill-color-7: #51545e !important;
    --el-empty-fill-color-8: #36383c !important;
    --el-empty-fill-color-9: #2e2e32 !important;
}
</style>