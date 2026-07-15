<!--
    KeyListBody.vue
    描述：Key 列表主体渲染区。负责空态、Loading 遮罩、虚拟列表行和树形目录展开控件。
 -->
<template>
    <!-- 列表主体区：根据加载状态展示遮罩，根据数据状态展示空态或虚拟列表。 -->
    <div
        v-loading="loading"
        class="keys-body"
        :element-loading-text="loadingText"
    >
        <div v-if="emptyVisible" class="empty-state">
            <el-empty :description="emptyDescription"/>
        </div>

        <!-- 虚拟列表区域：仅渲染可视区内的行，降低大数据量下的 DOM 压力。 -->
        <AutoResizer v-else class="keys-auto-resizer">
            <template #default="{ height, width }">
                <FixedSizeList
                    class-name="keys-virtual-list"
                    :data="rows"
                    :total="rows.length"
                    :height="height"
                    :width="width"
                    :item-size="rowHeight"
                    :cache="8"
                >
                    <template #default="{ data, index, style }">
                        <!-- Key 行：目录节点支持展开，普通 Key 支持选中。 -->
                        <div
                            v-if="data[index]"
                            :key="data[index].nodeId || data[index].key"
                            class="key-row"
                            :class="getRowClass(data[index])"
                            :style="getRowStyle(data[index], style)"
                            @click="$emit('row-click', data[index])"
                            @contextmenu.prevent.stop="$emit('row-context-menu', $event, data[index])"
                        >
                            <el-checkbox
                                v-if="selectionMode"
                                class="key-export-checkbox"
                                :model-value="isRowSelectionChecked(data[index])"
                                :indeterminate="isRowSelectionIndeterminate(data[index])"
                                :disabled="isRowSelectionDisabled(data[index])"
                                @click.stop
                                @change="$emit('toggle-selection', data[index])"
                            />

                            <!-- 树形目录展开按钮。 -->
                            <span
                                v-if="data[index].isDirectory"
                                class="expand-icon"
                                @click.stop="$emit('toggle-expand', data[index])"
                            >
                                <el-icon>
                                    <ArrowRight v-if="!isExpanded(data[index].nodeId || data[index].key)"/>
                                    <ArrowDown v-else/>
                                </el-icon>
                            </span>

                            <!-- Key 类型标签：仅真实 Key 展示数据类型，目录节点保留占位宽度。 -->
                            <el-tag
                                v-if="!data[index].isDirectory"
                                :type="getTagType(data[index].type)"
                                size="small"
                                class="key-type-tag"
                            >
                                {{ String(data[index].type || '').toUpperCase() }}
                            </el-tag>

                            <!-- Key 名称：树形模式显示当前层级名称，列表模式显示完整 Key。 -->
                            <span class="key-name">{{ data[index].displayKey }}</span>

                            <!-- 父节点 Key 数量：仅树形目录展示当前子树下包含的真实 Key 总数。 -->
                            <span v-if="data[index].isDirectory" class="key-count">
                                ({{ data[index].keyCount ?? 0 }})
                            </span>
                        </div>
                    </template>
                </FixedSizeList>
            </template>
        </AutoResizer>
    </div>
</template>

<script setup>
/**
 * KeyListBody 是 KeyListPanel 的渲染子组件。
 * 复杂判断通过函数 props 注入，组件本身不持有业务状态，避免和父组件产生双份选择状态。
 */
import {ElAutoResizer as AutoResizer, FixedSizeList} from 'element-plus'
import {Down as ArrowDown, Right as ArrowRight} from '@icon-park/vue-next'

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    },
    loadingText: {
        type: String,
        default: ''
    },
    emptyVisible: {
        type: Boolean,
        default: false
    },
    emptyDescription: {
        type: String,
        default: ''
    },
    rows: {
        type: Array,
        default: () => []
    },
    rowHeight: {
        type: Number,
        default: 40
    },
    activeKey: {
        type: String,
        default: ''
    },
    selectionMode: {
        type: Boolean,
        default: false
    },
    isAncestorOfActiveKey: {
        type: Function,
        required: true
    },
    isContextMenuActive: {
        type: Function,
        required: true
    },
    getRowStyle: {
        type: Function,
        required: true
    },
    isRowSelectionChecked: {
        type: Function,
        required: true
    },
    isRowSelectionIndeterminate: {
        type: Function,
        required: true
    },
    isRowSelectionDisabled: {
        type: Function,
        required: true
    },
    isExpanded: {
        type: Function,
        required: true
    },
    getTagType: {
        type: Function,
        required: true
    }
})

defineEmits(['row-click', 'row-context-menu', 'toggle-selection', 'toggle-expand'])

/**
 * 汇总 Key 行 class，保持 template 中的行状态更易读。
 * @param {Object} row 当前渲染行
 * @returns {Object} 行状态 class map
 */
const getRowClass = (row) => ({
    'is-active': !row.isDirectory && props.activeKey === row.key,
    'is-directory': row.isDirectory,
    'is-export-selection': props.selectionMode,
    'is-ancestor-active': props.isAncestorOfActiveKey(row),
    'is-context-active': props.isContextMenuActive(row)
})
</script>

<style scoped>
/* 列表主体区：让滚动区域正确继承剩余高度。 */
.keys-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* 虚拟列表自适应容器：承接剩余高度，让虚拟滚动区域正确铺满主体区。 */
.keys-auto-resizer {
    width: 100%;
    height: 100%;
}

/* 单行 Key 项：统一行高、悬浮反馈和边界线，便于高频浏览。 */
.key-row {
    display: flex;
    gap: 6px;
    padding: 7px 12px;
    height: 40px;
    cursor: pointer;
    font-size: 13px;
    box-sizing: border-box;
    align-items: center;
    transition: background 0.15s ease;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 导出/批量选择模式下保持行点击含义清晰，checkbox 不改变行高。 */
.key-row.is-export-selection {
    cursor: default;
}

/* 行悬浮态：轻量高亮当前鼠标所在项。 */
.key-row:hover {
    background: var(--el-table-row-hover-bg-color, var(--el-color-primary-light-9));
}

/* 当前选中项：使用主题色浅色背景强化焦点。 */
.key-row.is-active {
    background: var(--el-color-primary-light-8) !important;
    color: var(--el-color-primary);
}

/* 右键菜单临时高亮：仅菜单打开期间生效，关闭后由状态自动移除。 */
.key-row.is-context-active {
    background: var(--el-color-primary-light-9);
}

/* 目录节点：仅通过稍大的字号区分，默认不加粗，避免未选中时视觉过重。 */
.key-row.is-directory {
    font-weight: 400;
    font-size: 15px;
}

/* 祖先目录高亮：当子节点被选中时，用主题色和更高字重标识当前路径上的父节点。 */
.key-row.is-ancestor-active {
    color: var(--el-color-primary);
    font-weight: 600;
}

/* 祖先目录下的展开图标同步使用主题色，保持整条路径视觉一致。 */
.key-row.is-ancestor-active .expand-icon {
    color: var(--el-color-primary);
}

/* 展开图标区域：提供稳定点击热区，避免文本抖动。 */
.expand-icon {
    display: flex;
    width: 16px;
    cursor: pointer;
    flex-shrink: 0;
    align-items: center;
    color: var(--el-text-color-secondary);
}

/* 选择框：固定宽度，避免进入选择模式后文本列对齐抖动。 */
.key-export-checkbox {
    display: inline-flex;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
}

/* 类型标签：固定最小宽度，避免不同类型导致列对齐不齐。 */
.key-type-tag {
    min-width: 40px;
    padding: 2px 6px;
    font-size: 11px;
    flex-shrink: 0;
    text-align: center;
}

/* Key 名称区域：在有限宽度下省略超长内容。 */
.key-name {
    flex: 1;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 父节点数量：固定贴在行尾，用较轻的颜色提示目录下的真实 Key 数量。 */
.key-count {
    flex-shrink: 0;
    margin-left: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

/* 空态容器：保证无数据时仍然维持居中展示。 */
.empty-state {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
}
</style>
