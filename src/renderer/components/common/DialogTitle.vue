<!--
    DialogTitle.vue
    描述：统一弹窗标题区域的图标和文字展示，避免各个 el-dialog 重复维护标题样式。
-->
<template>
    <!-- 弹窗标题：左侧图标强调操作类型，右侧文字保持单行省略。 -->
    <div class="dialog-title">
        <span class="dialog-title-icon">
            <component :is="icon" />
        </span>
        <span class="dialog-title-text">{{ title }}</span>
    </div>
</template>

<script setup>
// 组件入参：title 是弹窗标题文案，icon 是来自 @icon-park/vue-next 的图标组件。
defineProps({
    title: {
        type: String,
        required: true
    },
    icon: {
        type: [Object, Function],
        required: true
    }
})
</script>

<style scoped>
/* 标题容器：和 Element Plus 默认 header 保持紧凑横向排布。 */
.dialog-title {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 8px;
    line-height: 1;
}

/* 标题图标：统一使用主题色，和项目内操作按钮形成一致的视觉语言。 */
.dialog-title-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    color: var(--el-color-primary);
    font-size: 20px;
}

/* 标题文字：长标题不撑破弹窗头部。 */
.dialog-title-text {
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
