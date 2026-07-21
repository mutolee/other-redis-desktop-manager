<!--
    ResizableSplitPane.vue
    描述：通用左右分栏拖拽容器。
    职责：管理左右面板比例、拖拽状态、全局鼠标事件清理和中间拖拽线样式。
    使用场景：适合 Key 列表/详情、导航/内容等需要横向调整比例的页面区域。
 -->
<template>
    <!-- 左右分栏根容器：通过 slot 承载业务内容，本组件只负责布局和拖拽。 -->
    <div ref="containerRef" class="resizable-split-pane">
        <!-- 左侧面板：宽度由 v-model:left-width 控制。 -->
        <div class="split-pane-panel split-pane-left" :style="leftPaneStyle">
            <slot name="left"></slot>
        </div>

        <!-- 中间拖拽热区：扩大鼠标命中范围，内部细线提供视觉反馈。 -->
        <div class="split-pane-resizer" :class="{ 'is-dragging': isDragging }" @mousedown="startResize">
            <div class="split-pane-resizer-line"></div>
        </div>

        <!-- 右侧面板：自动占据剩余空间。 -->
        <div class="split-pane-panel split-pane-right">
            <slot name="right"></slot>
        </div>
    </div>
</template>

<script setup>
/**
 * 左右分栏拖拽组件。
 * 通过 v-model:left-width 向父组件同步左侧宽度百分比。
 */
import {computed, nextTick, onMounted, onUnmounted, ref} from 'vue'

// 组件入参：控制左侧宽度、最小/最大百分比范围。
const props = defineProps({
    leftWidth: {
        type: Number,
        default: 28
    },
    minWidth: {
        type: Number,
        default: 20
    },
    minLeftPixelWidth: {
        type: Number,
        default: 0
    },
    defaultLeftPixelWidth: {
        type: Number,
        default: 0
    },
    maxWidth: {
        type: Number,
        default: 80
    }
})

// 对外事件：同步左侧面板宽度。
const emit = defineEmits(['update:leftWidth'])

// 当前是否正在拖拽分割线。
const isDragging = ref(false)

// 记录拖拽起点鼠标 X 坐标，用于计算横向位移。
const dragStartX = ref(0)

// 记录拖拽开始时的左侧宽度，避免移动过程累计误差。
const dragStartWidth = ref(28)

// 分栏容器引用，用于把像素位移换算为容器内百分比。
const containerRef = ref(null)

// 左侧面板样式：由父组件传入的宽度百分比派生。
const leftPaneStyle = computed(() => ({
    width: `${props.leftWidth}%`,
    minWidth: props.minLeftPixelWidth > 0 ? `${props.minLeftPixelWidth}px` : undefined
}))

const getMinAllowedWidth = (containerWidth) => {
    const minPixelWidthPercent = props.minLeftPixelWidth > 0
        ? (props.minLeftPixelWidth / containerWidth) * 100
        : 0

    return Math.max(props.minWidth, minPixelWidthPercent)
}

const clampLeftWidth = (nextWidth, containerWidth) => {
    const minAllowedWidth = getMinAllowedWidth(containerWidth)

    return Math.min(props.maxWidth, Math.max(minAllowedWidth, nextWidth))
}

const applyDefaultLeftPixelWidth = async () => {
    if (props.defaultLeftPixelWidth <= 0) {
        return
    }

    await nextTick()

    const containerWidth = containerRef.value?.clientWidth || 0

    if (!containerWidth) {
        return
    }

    emit('update:leftWidth', clampLeftWidth((props.defaultLeftPixelWidth / containerWidth) * 100, containerWidth))
}

/**
 * 开始拖拽左右分栏。
 * @param {MouseEvent} event 鼠标按下事件
 */
const startResize = (event) => {
    if (!containerRef.value) {
        return
    }

    event.preventDefault()
    isDragging.value = true

    // 记录拖拽起始信息，移动时按相对位移计算下一次宽度。
    dragStartX.value = event.clientX
    dragStartWidth.value = props.leftWidth

    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)

    // 拖拽期间锁定光标与文本选择，避免误选中页面内容。
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
}

/**
 * 根据鼠标移动距离更新左侧面板宽度。
 * @param {MouseEvent} event 鼠标移动事件
 */
const handleResize = (event) => {
    if (!isDragging.value || !containerRef.value) {
        return
    }

    const containerWidth = containerRef.value.clientWidth

    if (!containerWidth) {
        return
    }

    // 将像素位移转换为百分比，让不同窗口宽度下拖拽手感一致。
    const deltaPercent = ((event.clientX - dragStartX.value) / containerWidth) * 100
    const nextWidth = dragStartWidth.value + deltaPercent
    // 限制左右面板最小/最大宽度，避免某一侧被拖到不可用。
    emit('update:leftWidth', clampLeftWidth(nextWidth, containerWidth))
}

/**
 * 结束拖拽并清理全局事件。
 */
const stopResize = () => {
    if (!isDragging.value) {
        return
    }

    isDragging.value = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)

    // 恢复页面默认交互状态。
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
}

onMounted(() => {
    applyDefaultLeftPixelWidth()
})

onUnmounted(() => {
    // 组件销毁时主动清理拖拽监听，避免遗留全局事件。
    stopResize()
})
</script>

<style scoped>
/* 分栏根容器：横向布局，填满父级可用空间。 */
.resizable-split-pane {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    align-items: stretch;
    box-sizing: border-box;
}

/* 左右面板通用规则：允许内部内容自行管理纵向滚动。 */
.split-pane-panel {
    display: flex;
    min-width: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    flex-direction: column;
    box-sizing: border-box;
}

/* 左侧面板：宽度由内联样式控制，避免拖拽过程中出现动画延迟。 */
.split-pane-left {
    flex-shrink: 0;
    transition: width 0s;
}

/* 右侧面板：自动占据剩余空间。 */
.split-pane-right {
    flex: 1;
}

/* 中间拖拽热区：扩大命中范围，提升分栏拖动的可操作性。 */
.split-pane-resizer {
    z-index: 10;
    display: flex;
    width: 10px;
    margin: 0 2px;
    cursor: col-resize;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
}

/* 拖拽线主体：默认使用细线，悬浮与拖拽时通过颜色强化反馈。 */
.split-pane-resizer-line {
    position: relative;
    width: 1px;
    height: 100%;
    background: linear-gradient(
        to bottom,
        transparent 0%,
        var(--el-border-color) 10%,
        var(--el-border-color) 90%,
        transparent 100%
    );
    transition: width 0.16s ease, background 0.16s ease;
}

/* 拖拽线中心高亮：只在悬浮与拖拽时出现，帮助用户感知当前焦点。 */
.split-pane-resizer-line::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 40px;
    opacity: 0;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, color-mix(in srgb, var(--el-color-primary) 30%, transparent) 0%, transparent 70%);
    transition: opacity 0.16s ease;
}

/* 拖拽线交互态：悬浮或拖拽时稍微加粗并强调主题色。 */
.split-pane-resizer:hover .split-pane-resizer-line,
.split-pane-resizer.is-dragging .split-pane-resizer-line {
    width: 2px;
    background: linear-gradient(
        to bottom,
        transparent 0%,
        var(--el-color-primary) 10%,
        var(--el-color-primary) 90%,
        transparent 100%
    );
}

/* 拖拽线聚焦态：仅显示中心高亮，不引入额外背景块。 */
.split-pane-resizer:hover .split-pane-resizer-line::before,
.split-pane-resizer.is-dragging .split-pane-resizer-line::before {
    opacity: 1;
}
</style>
