<!--
    SideBarMenuEmpty.vue
    描述：连接菜单为空的占位组件
 -->
<script setup>
import { eventBus } from '../utils/eventBus.js'
import { useI18n } from '../i18n/index.js'

// 国际化文案读取函数：驱动侧边栏空连接占位文案和按钮宽度适配。
const { language, t } = useI18n()
</script>

<template>
    <!-- 空连接列表：提供创建和导入两个入口，避免初次使用时停在空白菜单。 -->
    <el-empty
        :image-size="80"
        :description="t('sideBarEmpty.title')"
        class="menu-empty"
    >
        <template #description>
            <p>{{ t('sideBarEmpty.title') }}</p>
            <p>{{ t('sideBarEmpty.description') }}</p>
        </template>
        <!-- 空态操作区：短文案左右排列，空间不足时自动换行，避免英文长文案撑乱布局。 -->
        <div class="menu-empty-actions" :class="{ 'is-english': language === 'en-US' }">
            <el-button type="primary" @click="(e) => eventBus.emit('create-new-connection', e)">{{ t('sideBarEmpty.create') }}</el-button>
            <el-button type="success" @click="() => eventBus.emit('import-connection')">{{ t('sideBarEmpty.import') }}</el-button>
        </div>
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
    width: 100%;
    padding: 0 14px;
    box-sizing: border-box;
}

/* 空态说明：限制文本宽度并居中，兼容英文长句换行。 */
.menu-empty :deep(.el-empty__description) {
    width: 100%;
    max-width: 220px;
    margin-top: 12px;
}

.menu-empty :deep(.el-empty__description p) {
    margin: 0 0 6px;
    line-height: 1.45;
}

/* Element Plus 底部插槽：固定为居中布局，避免按钮换行后受默认内容流影响。 */
.menu-empty :deep(.el-empty__bottom) {
    width: 100%;
    display: flex;
    justify-content: center;
}

/* 空态按钮：优先横向排列，空间不足时自动换行，并覆盖相邻 el-button 的默认 margin-left。 */
.menu-empty-actions {
    --empty-action-button-width: 106px;
    width: min(100%, calc(var(--empty-action-button-width) * 2 + 8px));
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
}

.menu-empty-actions.is-english {
    --empty-action-button-width: 180px;
}

.menu-empty-actions .el-button {
    flex: 0 0 auto;
    width: var(--empty-action-button-width);
    max-width: 100%;
    margin-left: 0;
    height: auto;
    min-height: 32px;
    white-space: normal;
    line-height: 1.2;
}
</style>
