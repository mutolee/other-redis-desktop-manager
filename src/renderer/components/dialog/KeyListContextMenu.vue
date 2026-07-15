<!--
    KeyListContextMenu.vue
    描述：Key 列表行右键菜单组件。
    职责：根据树形目录节点或真实 Key 节点展示不同的上下文操作入口。
-->
<template>
    <!-- 虚拟触发右键菜单：根据鼠标右键位置定位，不依赖真实 DOM 常驻。 -->
    <el-popover
        v-model:visible="contextMenuVisible"
        trigger="click"
        :width="contextMenuWidth"
        :hide-after="10"
        virtual-triggering
        :virtual-ref="virtualRef"
        popper-class="key-list-context-menu-popover"
    >
        <el-menu @select="handleSelect">
            <template v-if="isDirectoryMenu">
                <el-menu-item index="export-directory-keys">
                    <el-icon>
                        <Upload/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.exportKeys') }}</span>
                </el-menu-item>
                <div class="context-menu-divider"></div>
                <el-menu-item index="load-directory-keys">
                    <el-icon>
                        <FolderDownload/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.loadDirectoryKeys') }}</span>
                </el-menu-item>
                <el-menu-item index="directory-memory-analysis">
                    <el-icon>
                        <Memory/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.memoryAnalysis') }}</span>
                </el-menu-item>
                <div class="context-menu-divider"></div>
                <el-menu-item index="batch-delete-keys">
                    <el-icon>
                        <DeleteKey/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.batchDeleteKeys') }}</span>
                </el-menu-item>
                <el-menu-item index="delete-directory-keys" class="danger-menu-item">
                    <el-icon>
                        <Delete/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.deleteDirectoryKeys') }}</span>
                </el-menu-item>
            </template>
            <template v-else>
                <el-menu-item index="export-key">
                    <el-icon>
                        <Upload/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.exportKey') }}</span>
                </el-menu-item>
                <el-menu-item index="copy-key">
                    <el-icon>
                        <Copy/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.copyKey') }}</span>
                </el-menu-item>
                <div class="context-menu-divider"></div>
                <el-menu-item index="batch-delete-keys">
                    <el-icon>
                        <DeleteKey/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.batchDeleteKeys') }}</span>
                </el-menu-item>
                <el-menu-item index="delete-key" class="danger-menu-item">
                    <el-icon>
                        <Delete/>
                    </el-icon>
                    <span>{{ t('keyList.contextMenu.deleteKey') }}</span>
                </el-menu-item>
            </template>
        </el-menu>
    </el-popover>
</template>

<script setup>
import {Copy, Delete, DeleteKey, FolderDownload, Memory, Upload} from '@icon-park/vue-next'
import {computed} from 'vue'
import {useI18n} from '../../i18n/index.js'

// 国际化状态：右键菜单文案和英文模式下的菜单宽度都依赖当前语言。
const {language, t} = useI18n()

// 组件入参：由 KeyListPanel 传入菜单显示状态、右键目标行和虚拟触发位置。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    row: {
        type: Object,
        default: null
    },
    virtualRef: {
        type: Object,
        default: null
    }
})

// 组件事件：同步菜单显示状态，并把菜单命令交还给父组件处理。
const emit = defineEmits(['update:visible', 'command'])

// Popover 双向绑定：让父组件统一控制右键菜单开关。
const contextMenuVisible = computed({
    get: () => props.visible,
    set: value => emit('update:visible', value)
})

// 当前右键目标是否为树形目录节点：目录和真实 Key 使用不同菜单。
const isDirectoryMenu = computed(() => Boolean(props.row?.isDirectory))

// 菜单宽度：英文目录菜单文案更长，需要额外空间避免文字挤压。
const contextMenuWidth = computed(() => {
    if (language.value === 'zh-CN') {
        return 180
    }

    return isDirectoryMenu.value ? 240 : 220
})

/**
 * 派发右键菜单命令。
 * @param {string} command 菜单命令
 */
const handleSelect = (command) => {
    emit('command', {
        command,
        row: props.row
    })
    contextMenuVisible.value = false
}
</script>

<style scoped>
/* 右键菜单浮层：挂载到 body，需要使用全局选择器覆盖 Element Plus 菜单边框和间距。 */
:global(.key-list-context-menu-popover) {
    padding: 4px 0 !important;
}

:global(.key-list-context-menu-popover .el-menu) {
    border: none !important;
    background: var(--el-bg-color-overlay) !important;
}

:global(.key-list-context-menu-popover .el-menu-item) {
    gap: 8px;
    height: 36px !important;
    padding: 0 14px !important;
    color: var(--el-text-color-regular) !important;
    line-height: 36px !important;
}

:global(.key-list-context-menu-popover .el-menu-item:hover) {
    color: var(--el-color-primary) !important;
}

:global(.key-list-context-menu-popover .context-menu-divider) {
    height: 1px;
    margin: 4px 0;
    background: var(--el-border-color-lighter);
}

:global(.key-list-context-menu-popover .el-menu-item .el-icon) {
    display: inline-flex;
    width: 18px;
    height: 18px;
    margin-right: 0;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

:global(.key-list-context-menu-popover .el-menu-item .el-icon .i-icon) {
    display: inline-flex;
    font-size: 18px;
    align-items: center;
    justify-content: center;
}

:global(.key-list-context-menu-popover .danger-menu-item) {
    color: var(--el-color-danger) !important;
}

:global(.key-list-context-menu-popover .danger-menu-item:hover) {
    color: var(--el-color-danger) !important;
    background: var(--el-color-danger-light-9) !important;
}
</style>
