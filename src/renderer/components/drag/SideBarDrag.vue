<!--
    SideBarDrag.vue
    描述：旧版侧边栏宽度拖拽手柄。负责把鼠标横向位移转换为侧边栏像素宽度。
 -->
<template>
    <!-- 拖拽热区：父组件决定是否展示，本组件只负责交互。 -->
    <div class="side-bar-drag">
        <div class="drag-line" @mousedown="startResize"></div>
    </div>
</template>

<script setup>
import {onUnmounted, ref} from 'vue'

// 组件入参：接收当前侧边栏宽度，拖拽时基于这个值计算新宽度。
const props = defineProps({
    sideBarWidth: {
        type: Number
    }
})

// 对外事件：把计算后的侧边栏宽度同步给父组件。
const emit = defineEmits(['update:sideBarWidth'])

// 拖拽状态：记录按下时的鼠标位置和宽度，移动时按差值计算。
const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

/**
 * 开始拖拽
 * @param event 鼠标按下事件
 */
const startResize = (event) => {
    isDragging.value = true
    startX.value = event.clientX
    startWidth.value = props.sideBarWidth

    // 添加鼠标移动和鼠标抬起事件监听器
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
}

/**
 * 拖拽中
 * @param event 鼠标移动事件
 */
const handleResize = (event) => {
    if (!isDragging.value) return

    // 计算新的宽度
    const newWidth = startWidth.value + (event.clientX - startX.value)

    // 宽度限制
    if (newWidth >= 260 && newWidth <= 500) {
        // 更新侧边栏宽度
        emit('update:sideBarWidth', newWidth)
    }
}

/**
 * 停止拖拽
 */
const stopResize = () => {
    isDragging.value = false

    // 移除鼠标移动和鼠标抬起事件监听器
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
    // 组件销毁时兜底释放拖拽监听，避免鼠标事件遗留在 document 上。
    stopResize()
})
</script>

<style scoped>
/* 拖拽线：保持窄热区，hover/active 时通过颜色反馈可拖拽状态。 */
.drag-line {
    width: 4px;
    height: 40px;
    background: #999999;
    cursor: col-resize;
    border-radius: 2px;
    transition: all 0.2s ease;
}

.drag-line:hover {
    background: #666666;
}

.drag-line:active {
    background: #333333;
}
</style>
