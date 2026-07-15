<!--
    ViewerTextarea.vue
    描述：详情查看弹窗里复用的只读文本域。
    职责：统一固定高度和只读文本展示样式，避免各类型详情页重复维护 textarea 交互。
-->
<template>
    <!-- 查看文本域容器：textarea 承载完整文本内容，弹窗底部按钮负责复制操作。 -->
    <div class="viewer-textarea-wrap" :style="wrapStyle">
        <el-input
            :model-value="modelValue"
            type="textarea"
            readonly
            class="viewer-textarea"
        />
    </div>
</template>

<script setup>
import {computed} from 'vue'

// 组件入参：modelValue 是展示文本，height 控制查看弹窗中文本域的固定高度。
const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    height: {
        type: [Number, String],
        default: 180
    }
})

// 文本域高度样式：支持传入数字或带单位字符串，统一落到 CSS 变量里。
const wrapStyle = computed(() => {
    const heightValue = typeof props.height === 'number'
        ? `${props.height}px`
        : props.height

    return {
        '--viewer-textarea-height': heightValue
    }
})

</script>

<style scoped>
/* 查看文本域容器：作为复制按钮的定位上下文，同时撑满弹窗宽度。 */
.viewer-textarea-wrap {
    position: relative;
    width: 100%;
}

/* 只读文本域：固定高度，长内容使用内部滚动，避免弹窗布局被内容撑开。 */
.viewer-textarea :deep(.el-textarea__inner) {
    height: var(--viewer-textarea-height);
    min-height: var(--viewer-textarea-height) !important;
    max-height: var(--viewer-textarea-height);
    padding-right: 14px;
    resize: none;
    color: var(--el-text-color-primary);
    line-height: 1.7;
    background: var(--el-fill-color-lighter);
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
