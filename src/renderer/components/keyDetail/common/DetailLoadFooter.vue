<!--
    DetailLoadFooter.vue
    描述：Key 详情集合类面板的底部加载操作区，统一“加载全部 / 加载更多”的布局和禁用状态。
 -->
<template>
    <!-- 底部加载区：集合类详情页共用，保持加载按钮顺序和左侧 Key 列表一致。 -->
    <div class="load-footer">
        <div v-if="limitReached" class="load-limit-tip">
            {{ t('keyDetailPanels.common.loadLimitReached', {value: formattedMaxItems}) }}
        </div>

        <div class="load-actions">
            <el-button
                :type="loadingAll ? 'danger' : 'warning'"
                :plain="!loadingAll"
                class="load-btn"
                :disabled="!loadingAll && (!hasMore || loadingMore)"
                @click="$emit('load-all')"
            >
                {{ loadingAll ? t('keyDetailPanels.common.stopLoading') : t('keyDetailPanels.common.loadAll') }}
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
    </div>
</template>

<script setup>
/**
 * DetailLoadFooter 只负责展示分页加载按钮。
 * 具体加载游标、数据合并和错误处理仍由各类型详情页自行管理。
 */
import {useI18n} from '../../../i18n/index.js'
import {KEY_DETAIL_MAX_ITEMS} from '../../../utils/keyDetailCollectionUtil.js'

const {t} = useI18n()

// 展示上限文案：使用本地数字分组提升大数可读性。
const formattedMaxItems = KEY_DETAIL_MAX_ITEMS.toLocaleString()

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
    },
    limitReached: {
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
    gap: 6px;
    padding-top: 10px;
    flex-shrink: 0;
    flex-direction: column;
}

.load-actions {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 底部加载按钮：左右均分，避免不同语言文案导致按钮宽度跳动。 */
.load-btn {
    width: 100%;
    height: 32px;
    margin-left: 0;
}

/* 达到上限提示：说明按钮停止加载的真实原因，避免用户误认为请求失败。 */
.load-limit-tip {
    color: var(--el-color-warning);
    font-size: 12px;
    line-height: 18px;
    text-align: left;
}
</style>
