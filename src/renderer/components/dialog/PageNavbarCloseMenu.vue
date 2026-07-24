<!--
    PageNavbarCloseMenu.vue
    描述：连接页签关闭菜单。供右侧操作按钮和页签右键入口共用同一套关闭操作。
-->
<template>
    <!-- 共用关闭菜单：既可定位到操作按钮，也可跟随页签右键位置展示。 -->
    <el-popover
        v-model:visible="contextMenuVisible"
        trigger="manual"
        :width="contextMenuWidth"
        :hide-after="10"
        :placement="placement"
        virtual-triggering
        :virtual-ref="virtualRef"
        popper-class="page-navbar-close-menu-popover"
    >
        <el-menu @select="handleSelect">
            <el-menu-item index="closeOther" :disabled="!canCloseOther">
                <el-icon><CloseSmall/></el-icon>
                <span>{{ t('pageNavbar.closeOther') }}</span>
            </el-menu-item>
            <el-menu-item index="closeLeft" :disabled="!canCloseLeft">
                <el-icon><ToLeft/></el-icon>
                <span>{{ t('pageNavbar.closeLeft') }}</span>
            </el-menu-item>
            <el-menu-item index="closeRight" :disabled="!canCloseRight">
                <el-icon><ToRight/></el-icon>
                <span>{{ t('pageNavbar.closeRight') }}</span>
            </el-menu-item>
            <el-menu-item index="closeAll">
                <el-icon><CloseOne/></el-icon>
                <span>{{ t('pageNavbar.closeAll') }}</span>
            </el-menu-item>
        </el-menu>
    </el-popover>
</template>

<script setup>
import {CloseOne, CloseSmall, ToLeft, ToRight} from '@icon-park/vue-next'
import {computed} from 'vue'
import {useI18n} from '../../i18n/index.js'

// 国际化状态：菜单文案和英文模式下的菜单宽度依赖当前语言。
const {language, t} = useI18n()

// 组件入参：父组件控制显示、定位和弹出方向，并传入目标页签两侧是否存在可关闭页签。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    virtualRef: {
        type: Object,
        default: null
    },
    placement: {
        type: String,
        default: 'bottom-start'
    },
    canCloseOther: {
        type: Boolean,
        default: false
    },
    canCloseLeft: {
        type: Boolean,
        default: false
    },
    canCloseRight: {
        type: Boolean,
        default: false
    }
})

// 组件事件：同步菜单显示状态，并把关闭命令交给 PageNavbar 统一执行。
const emit = defineEmits(['update:visible', 'command'])

// Popover 双向绑定：父组件负责右键目标和菜单生命周期。
const contextMenuVisible = computed({
    get: () => props.visible,
    set: value => emit('update:visible', value)
})

// 菜单宽度：英文文案略长，增加宽度避免文本拥挤。
const contextMenuWidth = computed(() => language.value === 'zh-CN' ? 160 : 180)

/**
 * 派发页签关闭命令并收起右键菜单。
 *
 * @param {string} command - 当前选择的关闭命令。
 */
const handleSelect = (command) => {
    emit('command', command)
    contextMenuVisible.value = false
}
</script>

<style scoped>
/* 页签关闭菜单浮层挂载到 body，使用全局选择器统一 Element Plus 菜单样式。 */
:global(.page-navbar-close-menu-popover) {
    padding: 4px 0 !important;
}

:global(.page-navbar-close-menu-popover .el-menu) {
    border: none !important;
    background: var(--el-bg-color-overlay) !important;
}

:global(.page-navbar-close-menu-popover .el-menu-item) {
    gap: 8px;
    height: 36px !important;
    padding: 0 14px !important;
    color: var(--el-text-color-regular) !important;
    line-height: 36px !important;
}

:global(.page-navbar-close-menu-popover .el-menu-item:not(.is-disabled):hover) {
    color: var(--el-color-primary) !important;
}

:global(.page-navbar-close-menu-popover .el-menu-item .el-icon) {
    display: inline-flex;
    width: 18px;
    height: 18px;
    margin-right: 0;
    align-items: center;
    justify-content: center;
    line-height: 0;
}

/* icon-park 图标视觉重心略偏上，轻微下移后与菜单文字居中。 */
:global(.page-navbar-close-menu-popover .el-menu-item .el-icon .i-icon) {
    display: inline-flex;
    font-size: 18px;
    transform: translateY(1px);
}
</style>
