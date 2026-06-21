<!--
    SideBarDrag.vue
    描述：边栏拖拽组件
 -->
<script setup>
import {ref} from "vue";

// Props
const props = defineProps({
    sideBarWidth: {
        type: Number
    }
})

// Emits
const emit = defineEmits(['update:sideBarWidth'])

// 响应式数据
const isDragging = ref(false)      // 拖拽状态
const startX = ref(0)              // 鼠标按下时X坐标
const startWidth = ref(0)          // 鼠标按下的时候，侧边栏宽度

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
    if (newWidth >= 300 && newWidth <= 500) {
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
</script>

<template>
    <div class="side-bar-drag">
        <div class="drag-line" @mousedown="startResize"></div>
    </div>
</template>

<style scoped>
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