<!--
    ConnectionConfigContextMenu.vue
    描述：连接配置上下文菜单组件（性能优化：所有菜单项共用一个下拉菜单）
-->
<script setup>
import {CodeOne, Delete, Edit, MinusTheTop, MoveOne, Plus} from "@icon-park/vue-next";
import {computed} from "vue";
import {ElMessage} from "element-plus";
import {eventBus} from "../../utils/eventBus.js";

// Props
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    menuType: {
        type: String,
        default: 'connection', // 'connection' 或 'group'
    },
    menuItem: {
        type: Object, // 连接配置对象
        default: null
    },
    virtualRef: {
        type: Object, // 引用的元素
        default: null
    }
})

// Emits
const emit = defineEmits(['update:visible'])

// 计算属性
const contextMenuVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

/**
 * 处理上下文菜单的命令
 */
const handleContextMenuCommand = async (command) => {
    switch (command) {
        case 'edit-connection':
            eventBus.emit('edit-connection', props.menuItem)
            break
        case 'delete-connection':
            eventBus.emit('delete-connection', props.menuItem)
            break
        case 'move-to-folder':
            eventBus.emit('move-connection', props.menuItem)
            break
        case 'rename-folder':
            eventBus.emit('rename-connection-group', props.menuItem)
            break
        case 'delete-folder':
            eventBus.emit('delete-connection-group', props.menuItem)
            break
        case 'add-connection':
            eventBus.emit('create-new-connection', props.menuItem.group_name)
            break
        case 'open-command':
            eventBus.emit('open-command', props.menuItem)
            break
        case 'copy-connect':
            eventBus.emit('create-new-connection', props.menuItem)
            break
        default:
            ElMessage.info(`执行操作: ${command}`)
    }

    // 关闭上下文菜单
    contextMenuVisible.value = false
}
</script>

<template>
    <template>
        <el-popover
            v-model:visible="contextMenuVisible"
            trigger="click"
            :width="180"
            :hide-after="10"
            virtual-triggering
            :virtual-ref="props.virtualRef"
            popper-class="connection-config-context-menu-popover"
        >
            <el-menu
                v-if="menuType === 'group'"
                @select="handleContextMenuCommand"
            >
                <el-menu-item index="rename-folder">
                    <el-icon style="margin-right: 6px;">
                        <Edit/>
                    </el-icon>
                    <span>重命名分组</span>
                </el-menu-item>
                <el-menu-item index="delete-folder">
                    <el-icon style="margin-right: 6px;">
                        <Delete/>
                    </el-icon>
                    <span>删除分组</span>
                </el-menu-item>
                <el-menu-item index="add-connection">
                    <el-icon style="margin-right: 6px;">
                        <Plus/>
                    </el-icon>
                    <span>添加连接</span>
                </el-menu-item>
            </el-menu>
            <el-menu
                v-else
                @select="handleContextMenuCommand"
            >
                <el-menu-item index="edit-connection">
                    <el-icon style="margin-right: 6px;">
                        <Edit/>
                    </el-icon>
                    <span>编辑连接</span>
                </el-menu-item>
                <el-menu-item index="delete-connection">
                    <el-icon style="margin-right: 6px;">
                        <Delete/>
                    </el-icon>
                    <span>删除连接</span>
                </el-menu-item>
                <el-menu-item index="open-command">
                    <el-icon style="margin-right: 6px;">
                        <CodeOne/>
                    </el-icon>
                    <span>打开命令行</span>
                </el-menu-item>
                <el-menu-item index="move-to-folder">
                    <el-icon style="margin-right: 6px;">
                        <MoveOne/>
                    </el-icon>
                    <span>移动到其他分组</span>
                </el-menu-item>
                <el-menu-item index="copy-connect">
                    <el-icon style="margin-right: 6px;">
                        <MinusTheTop/>
                    </el-icon>
                    <span>复制链接</span>
                </el-menu-item>
            </el-menu>
        </el-popover>
    </template>
</template>

<style>
/* 上下文菜单的样式重写 */
.connection-config-context-menu-popover {
    padding: 4px 0 !important;
}

.connection-config-context-menu-popover .el-menu {
    border: none !important;
    background: var(--el-bg-color-overlay) !important;
}

.connection-config-context-menu-popover .el-menu-item {
    height: 36px !important;
    line-height: 36px !important;
    padding: 0 16px !important;
    color: var(--el-text-color-regular) !important;
}

.connection-config-context-menu-popover .el-menu-item:hover {
    color: var(--el-color-primary) !important;
}
</style>