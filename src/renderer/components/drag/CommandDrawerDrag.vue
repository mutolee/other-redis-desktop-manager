<!--
    CommandDrawerDrag.vue
    描述：命令行抽屉高度拖拽手柄。负责把纵向拖拽转换为抽屉高度百分比。
 -->
<template>
    <!-- 抽屉顶部拖拽线：只提供高度调整入口。 -->
    <div class="drag-line" @mousedown="handleHeaderMouseDown"></div>
</template>

<script setup>
import {onUnmounted, ref} from 'vue'

// 组件入参：接收当前抽屉高度，支持百分比字符串。
const props = defineProps({
    drawerHeight: {
        type: String,
        default: '40%'
    }
})

// 对外事件：同步抽屉高度，并在拖拽结束后通知父组件恢复状态。
const emit = defineEmits(['update:drawerHeight', 'update:stopDragging'])

// 高度边界：避免抽屉被拖到遮挡整个窗口或低到不可操作。
const maxHeightPercent = 80
const minHeight = 200

// 拖拽状态：记录按下位置、起始高度和待处理动画帧。
const isDragging = ref(false)
const startY = ref(0)
const startHeight = ref(0)
const rafId = ref(null)
const currentMouseY = ref(0)

/**
 * 处理头部鼠标按下事件（开始拖拽）
 * @param e
 */
const handleHeaderMouseDown = (e) => {
    // 只在拖拽手柄区域才能拖拽
    if (!e.target.classList.contains('drag') &&
        !e.target.closest('.drag')) {
        return
    }

    isDragging.value = true
    startY.value = e.clientY

    // 保存当前高度（可能是百分比字符串）
    startHeight.value = props.drawerHeight

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
    e.stopPropagation()
}

/**
 * 处理鼠标移动事件（拖拽中）
 */
const handleMouseMove = (e) => {
    if (!isDragging.value) return

    // 保存最新的鼠标位置
    currentMouseY.value = e.clientY

    // 如果还没有待处理的动画帧，请求一帧
    if (rafId.value === null) {
        rafId.value = requestAnimationFrame(updateDrawerHeight)
    }
}

/**
 * 更新抽屉高度（在 requestAnimationFrame 中调用）
 */
const updateDrawerHeight = () => {
    if (!isDragging.value) {
        rafId.value = null
        return
    }

    const deltaY = startY.value - currentMouseY.value // 向上拖拽为正值
    const windowHeight = window.innerHeight

    // 将起始高度转换为像素值
    let currentHeightPx
    if (typeof startHeight.value === 'string' && startHeight.value.endsWith('%')) {
        const percent = parseFloat(startHeight.value)
        currentHeightPx = (percent / 100) * windowHeight
    } else {
        currentHeightPx = parseFloat(startHeight.value) || windowHeight * 0.4
    }

    const newHeightPx = currentHeightPx + deltaY

    // 限制高度范围
    const maxHeightPx = windowHeight * (maxHeightPercent / 100)
    const minHeightPx = minHeight

    let finalHeightPx = newHeightPx
    if (finalHeightPx > maxHeightPx) {
        finalHeightPx = maxHeightPx
    } else if (finalHeightPx < minHeightPx) {
        finalHeightPx = minHeightPx
    }

    // 转换为百分比
    const newHeightPercent = (finalHeightPx / windowHeight) * 100
    // 发送更新事件
    emit('update:drawerHeight', `${newHeightPercent}%`)

    // 重置 rafId
    rafId.value = null

    // 如果还在拖拽中，继续请求下一帧
    if (isDragging.value) {
        rafId.value = requestAnimationFrame(updateDrawerHeight)
    }
}

/**
 * 处理鼠标抬起事件（结束拖拽）
 */
const handleMouseUp = () => {
    if (!isDragging.value && rafId.value === null) {
        return
    }

    isDragging.value = false

    // 取消未完成的动画帧
    if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value)
        rafId.value = null
    }

    // 发送更新事件
    emit('update:stopDragging')

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
}

onUnmounted(() => {
    // 组件销毁时兜底结束拖拽，清理 document 监听和未执行完的动画帧。
    handleMouseUp()
})
</script>

<style scoped>
/* 拖拽线：横向铺满抽屉顶部，使用 row-resize 光标提示可上下拖动。 */
.drag-line {
    height: 4px;
    width: 40px;
    background: #999999;
    cursor: row-resize;
    border-radius: 2px;
    transition: all 0.2s ease;
}

.drag-line:hover {
    background: #ffffff;
}
</style>
