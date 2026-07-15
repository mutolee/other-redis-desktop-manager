<!--
    OverflowTooltip.vue
    描述：仅在内容真实发生单行省略时启用 Element Plus Tooltip。
    职责：为虚拟表格、标签、长文本等区域提供统一的溢出检测提示能力。
-->
<template>
    <el-tooltip
        :content="contentText"
        :placement="placement"
        :show-after="showAfter"
        :disabled="!isOverflowing || !contentText"
        :popper-style="popperStyle"
        popper-class="overflow-tooltip-popper"
    >
        <!-- Tooltip 触发容器：保持宽度跟随父单元格，鼠标进入时再测量是否溢出。 -->
        <span
            ref="triggerRef"
            class="overflow-tooltip-trigger"
            @mouseenter.capture="syncOverflowState"
            @focusin.capture="syncOverflowState"
        >
            <slot>{{ contentText }}</slot>
        </span>
    </el-tooltip>
</template>

<script setup>
import {computed, ref, watch} from 'vue'

// 组件入参：content 负责 tooltip 展示文本，placement/showAfter 沿用 Element Plus Tooltip 的基础配置。
const props = defineProps({
    content: {
        type: [String, Number],
        default: ''
    },
    placement: {
        type: String,
        default: 'top'
    },
    showAfter: {
        type: Number,
        default: 200
    },
    maxWidth: {
        type: Number,
        default: 500
    },
    maxContentLength: {
        type: Number,
        default: 1500
    }
})

// Tooltip 触发 DOM：用于在 hover 时读取真实宽度和滚动宽度。
const triggerRef = ref(null)

// 是否真实溢出：只有 scrollWidth 大于 clientWidth 时才启用 tooltip。
const isOverflowing = ref(false)

// Tooltip 原始文案：统一把数字等内容转成字符串，避免空值误触发。
const rawContentText = computed(() => String(props.content ?? ''))

// Tooltip 最大展示长度：默认限制为 1000 字符，避免超长值撑大弹层和拖慢渲染。
const normalizedMaxContentLength = computed(() => Math.max(0, Number(props.maxContentLength) || 0))

// Tooltip 展示文案：只裁剪弹层内容，不影响表格单元格里真实展示的文本。
const contentText = computed(() => {
    const text = rawContentText.value
    const maxLength = normalizedMaxContentLength.value

    if (!maxLength || text.length <= maxLength) {
        return text
    }

    // 省略号也计入最大长度，保证最终 tooltip 内容不超过 maxContentLength。
    const ellipsis = '...'
    const keepLength = Math.max(0, maxLength - ellipsis.length)
    return `${text.slice(0, keepLength)}${ellipsis}`
})

// Tooltip 弹层样式：限制最大宽度，长内容超过后自动换行展示。
const popperStyle = computed(() => ({
    maxWidth: `${props.maxWidth}px`,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: '1.5'
}))

/**
 * 找到最适合测量溢出的 DOM。
 * 普通文本优先使用 data-overflow-target，Element Plus Tag 优先测量内部内容节点。
 *
 * @param {HTMLElement} triggerEl tooltip 触发容器
 * @returns {HTMLElement} 实际用于测量宽度的元素
 */
const resolveMeasureTarget = (triggerEl) => {
    return triggerEl.querySelector('[data-overflow-target]') ||
        triggerEl.querySelector('.el-tag__content') ||
        triggerEl.firstElementChild ||
        triggerEl
}

/**
 * 同步溢出状态。
 * 鼠标进入时测量可以避免给虚拟列表每一行都常驻监听尺寸变化，减少高数据量表格的额外开销。
 */
const syncOverflowState = () => {
    const triggerEl = triggerRef.value

    if (!triggerEl) {
        isOverflowing.value = false
        return
    }

    const measureTarget = resolveMeasureTarget(triggerEl)

    // 加 1px 容差，避免浏览器小数像素导致没有省略时也误判为溢出。
    isOverflowing.value = measureTarget.scrollWidth > measureTarget.clientWidth + 1
}

// 内容变化后先关闭 tooltip，下一次 hover 再基于新内容重新测量。
watch(contentText, () => {
    isOverflowing.value = false
})
</script>

<style scoped>
/* 触发层：撑满父级单元格并隐藏横向溢出，让内部省略号样式保持稳定。 */
.overflow-tooltip-trigger {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
}

/* Tooltip 弹层：Element Plus popper 挂在 body 下，这里用 :global 保证换行样式能作用到真实弹层。 */
:global(.overflow-tooltip-popper) {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
</style>
