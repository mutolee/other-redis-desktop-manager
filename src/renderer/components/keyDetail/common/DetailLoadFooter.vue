<!--
    DetailLoadFooter.vue
    描述：Key 详情集合类面板的底部加载操作区，统一“加载全部 / 加载更多”的布局和禁用状态。
 -->
<template>
    <!-- 底部加载区：集合类详情页共用，保持加载按钮顺序和左侧 Key 列表一致。 -->
    <div class="load-footer">
        <el-button
            type="warning"
            plain
            class="load-btn"
            :loading="loadingAll"
            :disabled="!hasMore || loadingMore"
            @click="$emit('load-all')"
        >
            {{ t('keyDetailPanels.common.loadAll') }}
        </el-button>

        <el-button
            type="primary"
            plain
            class="load-btn"
            :loading="loadingMore"
            :disabled="!hasMore || loadingAll"
            @click="$emit('load-more')"
        >
            {{ t('keyDetailPanels.common.loadMore') }}
        </el-button>
    </div>
</template>

<script setup>
/**
 * DetailLoadFooter 只负责展示分页加载按钮。
 * 具体加载游标、数据合并和错误处理仍由各类型详情页自行管理。
 */
import {useI18n} from '../../../i18n/index.js'

const {t} = useI18n()

defineProps({
    hasMore: {
        type: Boolean,
        default: false
    },
    loadingMore: {
        type: Boolean,
        default: false
    },
    loadingAll: {
        type: Boolean,
        default: false
    }
})

defineEmits(['load-more', 'load-all'])
</script>

<style scoped>
/* 底部加载操作区：固定在底部，和主列表视觉分层。 */
.load-footer {
    display: flex;
    gap: 8px;
    padding: 10px 12px 0;
    flex-shrink: 0;
    align-items: center;
}

/* 底部加载按钮：左右均分，避免不同语言文案导致按钮宽度跳动。 */
.load-btn {
    flex: 1;
    height: 32px;
}
</style>
