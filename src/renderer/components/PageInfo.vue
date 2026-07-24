<!--
    PageInfo.vue
    描述：单个连接页签的 Key 浏览骨架。根据连接状态展示失败页、Key 列表和右侧多标签详情区。
 -->
<template>
    <!-- Key 浏览页骨架：根据连接状态切换失败页或左右分栏内容 -->
    <div class="page-info-panel">
        <div
            class="page-info-container"
            v-loading="isConnectionLoading"
            :element-loading-text="loadingText"
        >
            <!-- 连接失败或已断开时，展示统一失败页 -->
            <PageFailed v-if="isConnectionFailed"/>

            <!-- 连接成功后，展示 Key 列表和 Key 详情分栏 -->
            <template v-else-if="isConnectionReady">
                <ResizableSplitPane
                    v-model:left-width="leftWidth"
                    class="content-page"
                    :min-width="0"
                    :max-width="80"
                    :min-left-pixel-width="315"
                    :default-left-pixel-width="368"
                >
                    <!-- 左侧 Key 列表区域 -->
                    <template #left>
                        <el-card shadow="never" class="content-left">
                            <KeyListPanel
                                :tab-id="tabId"
                                :active-key="activeDetailTab?.key"
                                :db-index="currentDbIndex"
                                :renamed-key-patch="renamedKeyPatch"
                                :deleted-key-patch="deletedKeyPatch"
                                :reset-version="keyListResetVersion"
                                @select="onSelectKey"
                                @close-all-opened-keys="closeAllDetailTabs"
                            />
                        </el-card>
                    </template>

                    <!-- 右侧 Key 详情区域 -->
                    <template #right>
                        <!-- 右侧 Key 详情 Tab 头部：放在 el-card__body 上方，贴合内容区。 -->
                        <template v-if="detailTabs.length > 0">
                            <div class="key-detail-tabs-header">
                                <el-tabs
                                    v-model="activeDetailTabKey"
                                    type="card"
                                    class="detail-tabs"
                                    @contextmenu.prevent.stop="handleDetailTabsContextMenu"
                                >
                                    <el-tab-pane
                                        v-for="tab in detailTabs"
                                        :key="tab.key"
                                        :name="tab.key"
                                    >
                                        <template #label>
                                            <!-- 详情 tab 标题：左侧 Key 名称可省略，右侧关闭按钮常驻显示。 -->
                                            <span
                                                class="detail-tab-label"
                                                :class="{'is-context-menu-active': isDetailTabContextMenuTarget(tab.key)}"
                                            >
                                                 <span class="detail-tab-title">{{ tab.label }}</span>
                                                 <button
                                                     class="detail-tab-close-btn"
                                                     type="button"
                                                     @click.stop="closeDetailTab(tab.key)"
                                                 >
                                                     <CloseSmall/>
                                                 </button>
                                             </span>
                                        </template>
                                    </el-tab-pane>
                                </el-tabs>
                            </div>
                        </template>

                        <!-- Key 详情 Tab 右键菜单：复用连接 Tab 的批量关闭菜单和交互风格。 -->
                        <PageNavbarCloseMenu
                            v-model:visible="detailTabContextMenuVisible"
                            :virtual-ref="detailTabContextMenuVirtualRef"
                            :can-close-other="canCloseOtherDetailTabs"
                            :can-close-left="canCloseLeftDetailTabs"
                            :can-close-right="canCloseRightDetailTabs"
                            @command="handleDetailTabCloseCommand"
                        />

                        <el-card shadow="never" class="content-right">
                            <!-- 已缓存详情内容：仅保留最近访问的 15 个面板，关闭或淘汰后立即卸载组件。 -->
                            <div
                                v-for="tab in cachedDetailTabs"
                                :key="tab.panelId || tab.key"
                                v-show="activeDetailTabKey === tab.key"
                                class="detail-tab-content"
                            >
                                <KeyDetailPanel
                                    :tab-id="tabId"
                                    :selected-key="tab"
                                    @close="closeDetailTab(tab.key)"
                                    @renamed="handleDetailKeyRenamed"
                                    @deleted="handleDetailKeyDeleted"
                                />
                            </div>

                            <!-- 空状态：保留在 el-card__body 内，未打开 Key 时展示。 -->
                            <el-empty v-if="detailTabs.length === 0" class="detail-empty" :description="t('pageInfo.selectKeyEmpty')"/>
                        </el-card>
                    </template>
                </ResizableSplitPane>
            </template>
        </div>
    </div>
</template>

<script setup>
/**
 * Key 浏览页面骨架组件。
 * 负责根据连接状态切换页面主体，并承载左侧 Key 列表、右侧 Key 详情与中间拖拽分割线。
 */
import {computed, nextTick, onActivated, onDeactivated, onUnmounted, ref, shallowRef, watch} from 'vue'
import {CloseSmall} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {useI18n} from '../i18n/index.js'
import {eventBus} from '../utils/eventBus.js'
import {normalizeKeySeparator} from '../utils/keyListTreeUtil.js'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import PageFailed from './PageFailed.vue'
import KeyListPanel from './KeyListPanel.vue'
import KeyDetailPanel from './KeyDetailPanel.vue'
import ResizableSplitPane from './drag/ResizableSplitPane.vue'
import PageNavbarCloseMenu from './dialog/PageNavbarCloseMenu.vue'

// Key 详情组件缓存上限：页签元数据可以继续保留，但同时挂载的详情实例最多为 15 个。
const KEY_DETAIL_CACHE_LIMIT = 15

// 国际化文案读取函数：驱动连接加载遮罩和右侧详情空状态文案。
const {t} = useI18n()

// 组件入参：使用 tabId 标识当前打开的连接页签，用于查找对应连接配置与子面板数据。
const props = defineProps({
    tabId: {
        type: String,
        required: true
    }
})

// 从连接配置 store 中提取当前所有已打开连接，供本组件按 tabId 定位当前连接状态。
const {openedConnectionConfigs} = storeToRefs(useConnectionConfigsStore())

// 当前标签页对应的连接配置，用于驱动页面状态与 db 选择。
const currOpenedConnectionConfig = computed(() =>
    openedConnectionConfigs.value.find((connection) => String(connection.id) === props.tabId) ?? null
)

// 当前页面是否处于连接中状态。
const isConnectionLoading = computed(() => {
    const status = currOpenedConnectionConfig.value?.status
    return status === 'connecting' || status === 'reconnecting'
})

// 当前页面是否处于失败或断开状态。
const isConnectionFailed = computed(() => {
    const status = currOpenedConnectionConfig.value?.status
    return status === 'disconnected' || status === 'error' || !currOpenedConnectionConfig.value
})

// 当前页面是否已经可以展示 Key 浏览内容。
const isConnectionReady = computed(() => currOpenedConnectionConfig.value?.status === 'connected')

// 连接中的遮罩文案，缺失连接信息时给出兜底提示。
const loadingText = computed(() => {
    const host = currOpenedConnectionConfig.value?.host
    const port = currOpenedConnectionConfig.value?.port
    const connectingText = t('pageInfo.connecting')
    return host && port ? `${host}:${port} ${connectingText}` : connectingText
})

// 当前连接选中的 db 索引，提供给左侧 Key 列表刷新使用。
const currentDbIndex = computed(() => currOpenedConnectionConfig.value?.db_index ?? 0)

// 当前 Key 层级分隔符：详情 tab 重命名后需要和左侧树形目录保持同一套分隔规则。
const currentKeySeparator = computed(() => normalizeKeySeparator(currOpenedConnectionConfig.value?.key_split))

// 左侧面板宽度百分比，拖拽时在限制范围内动态变化。
const leftWidth = ref(24)

// 右侧已打开的 Key 详情 tab 列表，左侧点击 Key 时追加或激活。
const detailTabs = ref([])

// 已挂载详情面板的实例 ID，按最近访问顺序排列，末尾为最近使用项。
const cachedDetailPanelIds = ref([])

// 左侧 Key 列表局部重命名补丁：详情侧重命名成功后，通知 KeyListPanel 原地替换已加载列表项。
const renamedKeyPatch = ref(null)

// 左侧 Key 列表局部删除补丁：详情侧删除成功后，通知 KeyListPanel 原地移除已加载列表项。
const deletedKeyPatch = ref(null)

// 左侧 Key 列表重置版本号：顶部刷新当前页时递增，驱动 KeyListPanel 清空搜索并重新扫描。
const keyListResetVersion = ref(0)

// 当前激活的 Key 详情 tab 名称，与 Element Plus tabs 的 v-model 绑定。
const activeDetailTabKey = ref('')

// 当前激活的 Key tab 对象，用于驱动左侧 Key 列表选中态。
const activeDetailTab = computed(() =>
    detailTabs.value.find((tab) => tab.key === activeDetailTabKey.value) ?? null
)

// 缓存中的详情 tab：只有这些项目会创建 KeyDetailPanel 组件实例。
const cachedDetailTabs = computed(() => {
    const cachedPanelIdSet = new Set(cachedDetailPanelIds.value)
    return detailTabs.value.filter((tab) => cachedPanelIdSet.has(tab.panelId))
})

// Key 详情 Tab 右键菜单状态：记录菜单目标和鼠标坐标定位对象，不改变当前激活 Key。
const detailTabContextMenuVisible = ref(false)
const detailTabContextMenuKey = ref('')
const detailTabContextMenuVirtualRef = shallowRef(null)

// 右键目标索引：批量关闭命令均以被右击的 Key Tab 为边界。
const detailTabContextMenuIndex = computed(() => detailTabs.value.findIndex(
    (tab) => tab.key === detailTabContextMenuKey.value
))
const canCloseOtherDetailTabs = computed(() => (
    detailTabContextMenuIndex.value >= 0 && detailTabs.value.length > 1
))
const canCloseLeftDetailTabs = computed(() => detailTabContextMenuIndex.value > 0)
const canCloseRightDetailTabs = computed(() => (
    detailTabContextMenuIndex.value >= 0
    && detailTabContextMenuIndex.value < detailTabs.value.length - 1
))

// 菜单关闭后清理目标和定位引用，使右键 Tab 自动恢复普通样式。
watch(detailTabContextMenuVisible, (visible) => {
    if (!visible) {
        detailTabContextMenuKey.value = ''
        detailTabContextMenuVirtualRef.value = null
    }
})

/**
 * 将指定详情面板加入最近使用缓存，并淘汰最久未访问的面板实例。
 * 被淘汰的 tab 元数据仍然保留，用户再次点击页签时会重新创建详情组件。
 *
 * @param {Object|null} tab - 需要缓存的 Key 详情 tab。
 */
const cacheDetailPanel = (tab) => {
    if (!tab?.panelId) {
        return
    }

    const nextPanelIds = cachedDetailPanelIds.value.filter((panelId) => panelId !== tab.panelId)
    nextPanelIds.push(tab.panelId)
    cachedDetailPanelIds.value = nextPanelIds.slice(-KEY_DETAIL_CACHE_LIMIT)
}

/**
 * 从详情缓存中移除指定面板，确保对应 KeyDetailPanel 立即卸载。
 *
 * @param {string} panelId - 详情面板实例 ID。
 */
const removeCachedDetailPanel = (panelId) => {
    cachedDetailPanelIds.value = cachedDetailPanelIds.value.filter((cachedPanelId) => (
        cachedPanelId !== panelId
    ))
}

/**
 * 按当前保留的 tab 清理详情缓存，用于批量关闭场景。
 *
 * @param {Array<Object>} tabs - 仍然保留的 Key 详情 tabs。
 */
const pruneDetailPanelCache = (tabs) => {
    const remainingPanelIdSet = new Set(tabs.map((tab) => tab.panelId))
    cachedDetailPanelIds.value = cachedDetailPanelIds.value.filter((panelId) => (
        remainingPanelIdSet.has(panelId)
    ))
}

/**
 * 激活指定详情 tab，并确保对应组件处于最近使用缓存中。
 *
 * @param {Object|null} tab - 需要激活的 Key 详情 tab。
 */
const activateDetailTab = (tab) => {
    if (!tab) {
        activeDetailTabKey.value = ''
        return
    }

    cacheDetailPanel(tab)
    activeDetailTabKey.value = tab.key
}

/**
 * 同步左侧列表点击后的 Key 选择结果。
 * 如果右侧已经打开该 Key，则直接激活；否则创建新的详情 tab。
 * @param {Object|null} key 左侧选中的 Key 数据
 */
const onSelectKey = (key) => {
    if (!key || key.isDirectory) {
        return
    }

    // 已打开的 Key 只需要激活，不重复创建 tab。
    let targetTab = detailTabs.value.find((tab) => tab.key === key.key)

    if (!targetTab) {
        targetTab = {
            ...key,
            // 详情面板实例 ID：Key 重命名会改变 tab.key，但组件实例需要保持稳定，避免重建后重新加载。
            panelId: `${key.key}-${Date.now()}`,
            label: key.displayKey || key.key
        }
        detailTabs.value.push(targetTab)
    }

    activateDetailTab(targetTab)
}

/**
 * 关闭指定 Key 详情 tab。
 * @param {string} tabKey 需要关闭的 Key 名称
 */
const closeDetailTab = (tabKey) => {
    const removeIndex = detailTabs.value.findIndex((tab) => tab.key === tabKey)

    if (removeIndex === -1) {
        return
    }

    const isActiveTab = activeDetailTabKey.value === tabKey
    const removedTab = detailTabs.value[removeIndex]

    // 先移除缓存实例并删除目标 tab，再根据相邻位置计算新的激活 tab。
    removeCachedDetailPanel(removedTab.panelId)
    detailTabs.value.splice(removeIndex, 1)

    if (!isActiveTab) {
        return
    }

    const nextActiveTab = detailTabs.value[removeIndex] || detailTabs.value[removeIndex - 1] || null
    activateDetailTab(nextActiveTab)
}

/**
 * 关闭当前连接页右侧已经打开的全部 Key 详情 tab。
 */
const closeAllDetailTabs = () => {
    detailTabContextMenuVisible.value = false
    cachedDetailPanelIds.value = []
    detailTabs.value = []
    activeDetailTabKey.value = ''
}

/**
 * 判断 Key 详情 Tab 是否为当前右键菜单目标。
 *
 * @param {string} tabKey - Key Tab 名称。
 * @returns {boolean} 是否保留右键时的悬浮样式。
 */
const isDetailTabContextMenuTarget = (tabKey) => (
    detailTabContextMenuVisible.value && detailTabContextMenuKey.value === tabKey
)

/**
 * 根据鼠标位置创建 Element Plus Popover 的虚拟触发对象。
 *
 * @param {MouseEvent} event - Key Tab 右键事件。
 * @returns {{getBoundingClientRect: Function}} 虚拟触发定位对象。
 */
const createDetailTabContextMenuVirtualRef = (event) => {
    const {clientX, clientY} = event

    return {
        getBoundingClientRect: () => ({
            width: 0,
            height: 0,
            top: clientY,
            right: clientX,
            bottom: clientY,
            left: clientX,
            x: clientX,
            y: clientY
        })
    }
}

/**
 * 打开 Key 详情 Tab 的右键关闭菜单，不切换当前激活 Tab。
 * 通过实际 Tab DOM 顺序定位数据，使标题、关闭按钮和标签留白区域都能触发。
 *
 * @param {MouseEvent} event - Key Tab 右键事件。
 */
const handleDetailTabsContextMenu = async (event) => {
    const tabElement = event.target.closest('.el-tabs__item')
    if (!tabElement) {
        return
    }

    const tabElements = Array.from(tabElement.parentElement?.querySelectorAll('.el-tabs__item') || [])
    const targetTab = detailTabs.value[tabElements.indexOf(tabElement)]
    if (!targetTab) {
        return
    }

    detailTabContextMenuVisible.value = false
    await nextTick()

    detailTabContextMenuKey.value = targetTab.key
    detailTabContextMenuVirtualRef.value = createDetailTabContextMenuVirtualRef(event)
    detailTabContextMenuVisible.value = true
}

/**
 * 执行以右键目标为边界的 Key 详情 Tab 批量关闭命令。
 * 当前激活 Tab 被关闭时，优先激活仍然保留的右键目标。
 *
 * @param {'closeOther'|'closeLeft'|'closeRight'|'closeAll'} command - 关闭命令。
 */
const handleDetailTabCloseCommand = (command) => {
    const targetIndex = detailTabContextMenuIndex.value
    const targetKey = detailTabContextMenuKey.value
    if (targetIndex < 0) {
        return
    }

    let remainingTabs = detailTabs.value
    switch (command) {
        case 'closeOther':
            remainingTabs = [detailTabs.value[targetIndex]]
            break
        case 'closeLeft':
            remainingTabs = detailTabs.value.slice(targetIndex)
            break
        case 'closeRight':
            remainingTabs = detailTabs.value.slice(0, targetIndex + 1)
            break
        case 'closeAll':
            remainingTabs = []
            break
        default:
            return
    }

    detailTabs.value = remainingTabs
    pruneDetailPanelCache(remainingTabs)

    if (!remainingTabs.some((tab) => tab.key === activeDetailTabKey.value)) {
        const nextActiveTab = remainingTabs.find((tab) => tab.key === targetKey) || remainingTabs[0] || null
        activateDetailTab(nextActiveTab)
    }
}

/**
 * 同步详情头部重命名后的 Key tab。
 * @param {{oldKey: string, newKey: string}} payload 重命名前后的 Key 名称
 */
const handleDetailKeyRenamed = ({oldKey, newKey}) => {
    const targetTab = detailTabs.value.find((tab) => tab.key === oldKey)

    if (!targetTab) {
        return
    }

    targetTab.key = newKey
    targetTab.label = newKey.split(currentKeySeparator.value).pop() || newKey
    targetTab.displayKey = targetTab.label
    activeDetailTabKey.value = newKey
    renamedKeyPatch.value = {
        oldKey,
        newKey,
        version: Date.now()
    }
}

/**
 * 同步详情头部删除后的 Key tab 和左侧列表。
 * 删除成功后不重新扫描列表，只通知 KeyListPanel 移除当前已加载结果中的目标 Key。
 * @param {{key: string}} payload 被删除的 Key 名称
 */
const handleDetailKeyDeleted = ({key}) => {
    if (!key) {
        return
    }

    deletedKeyPatch.value = {
        key,
        version: Date.now()
    }
    closeDetailTab(key)
}

/**
 * 响应左侧 Key 列表右键删除。
 * KeyListPanel 已经自行移除了左侧列表项，这里只负责关闭右侧对应详情 tab。
 * @param {{tabId: string|number, key: string}} payload 删除事件
 */
const handleKeyListKeyDeleted = ({tabId: deletedTabId, key}) => {
    if (String(deletedTabId) !== String(props.tabId) || !key) {
        return
    }

    closeDetailTab(key)
}

/**
 * 重置当前 PageInfo。
 * 顶部刷新当前连接时调用：关闭右侧详情 tabs，并让左侧 KeyListPanel 回到全量列表。
 * @param {{tabId: string|number}} payload 顶部刷新传入的连接页标识
 */
const handleResetPageInfo = (payload = {}) => {
    if (String(payload.tabId) !== props.tabId) {
        return
    }

    closeAllDetailTabs()
    renamedKeyPatch.value = null
    deletedKeyPatch.value = null
    keyListResetVersion.value += 1
}

let arePageEventsRegistered = false

/**
 * 注册当前活动连接页需要的跨组件事件。
 * KeepAlive 中只有活动页订阅，避免缓存页长期重复响应全局事件。
 */
const registerPageEvents = () => {
    if (arePageEventsRegistered) {
        return
    }

    eventBus.on('reset-page-info', handleResetPageInfo)
    eventBus.on('key-list-key-deleted', handleKeyListKeyDeleted)
    arePageEventsRegistered = true
}

/**
 * 释放当前连接页注册的跨组件事件。
 */
const unregisterPageEvents = () => {
    if (!arePageEventsRegistered) {
        return
    }

    eventBus.off('reset-page-info', handleResetPageInfo)
    eventBus.off('key-list-key-deleted', handleKeyListKeyDeleted)
    arePageEventsRegistered = false
}

onActivated(registerPageEvents)
onDeactivated(unregisterPageEvents)
onUnmounted(unregisterPageEvents)

// Element Plus tabs 直接切换 v-model 时，将新激活面板提升为最近使用项；已淘汰面板会在这里重新创建。
watch(activeDetailTabKey, (tabKey) => {
    if (!tabKey) {
        return
    }

    cacheDetailPanel(detailTabs.value.find((tab) => tab.key === tabKey) ?? null)
})

watch(currentDbIndex, () => {
    // 切换 DB 后清空详情 tab，避免显示上一个库里的 Key 详情。
    closeAllDetailTabs()
})
</script>

<style scoped>
/* 页面外层容器：提供统一内边距，和主内容区域保持呼吸感。 */
.page-info-panel {
    height: 100%;
    min-height: 0;
    padding: 15px;
    overflow: hidden;
    box-sizing: border-box;
}

/* 页面主体容器：限制内容溢出，避免加载遮罩与卡片区域相互影响。 */
.page-info-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    flex-direction: column;
}

/* 左右分栏主区域：由 ResizableSplitPane 管理拖拽布局。 */
.content-page {
    height: 100%;
}

/* 左右卡片面板：填满分栏 slot，让内部内容可以纵向撑满。 */
.content-left,
.content-right {
    display: flex;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    flex-direction: column;
    box-sizing: border-box;
}

/* Element Plus 卡片主体区：去掉默认留白，让子组件自行管理内部布局。 */
.content-left :deep(.el-card__body),
.content-right :deep(.el-card__body) {
    display: flex;
    flex: 1;
    overflow: hidden;
    padding: 0 !important;
    flex-direction: column;
}

/* 右侧 tab 边框色：light 模式背景是浅灰蓝渐变，使用更深蓝灰保证轮廓清晰。 */
.detail-tabs {
    --detail-tabs-border-color: #d3d3d3;
    --detail-tabs-bg-color: #ffffff;
}

/* dark 模式下回退到 Element Plus 默认边框，避免边框过亮。 */
html.dark .detail-tabs {
    --detail-tabs-border-color: var(--el-border-color-light);
    --detail-tabs-bg-color: var(--el-bg-color);
}

.detail-tabs:deep(.el-tabs__header) {
    border-bottom: none;
}

.detail-tabs:deep(.el-tabs__nav) {
    background-color: var(--detail-tabs-bg-color);
    border: 1px solid var(--detail-tabs-border-color);
    border-bottom: none;
}

/* Element Plus tabs 滚动箭头：做成紧凑的侧边按钮，保证大量 tab 时仍然清晰可点。 */
.detail-tabs:deep(.el-tabs__nav-prev),
.detail-tabs:deep(.el-tabs__nav-next) {
    display: flex;
    width: 22px;
    height: 40px;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-secondary);
    border-top: 1px solid var(--detail-tabs-border-color);
    background: color-mix(in srgb, var(--detail-tabs-bg-color) 88%, var(--detail-tabs-border-color));
    transition: color 0.16s ease, background 0.16s ease;
    z-index: 99;
}

/* 左侧滚动箭头：用右边线和 tab 列表区分。 */
.detail-tabs:deep(.el-tabs__nav-prev) {
    border-left: 1px solid var(--detail-tabs-border-color);
    border-right: 1px solid var(--detail-tabs-border-color);
    border-bottom: 1px solid var(--detail-tabs-border-color);
    border-top-left-radius: 4px;
}

/* 右侧滚动箭头：用左边线和 tab 列表区分。 */
.detail-tabs:deep(.el-tabs__nav-next) {
    border-right: 1px solid var(--detail-tabs-border-color);
    border-left: 1px solid var(--detail-tabs-border-color);
    border-bottom: 1px solid var(--detail-tabs-border-color);
    border-top-right-radius: 4px;
}

/* Element Plus tabs 滚动箭头悬浮态：使用主题色提示可操作。 */
.detail-tabs:deep(.el-tabs__nav-prev:hover),
.detail-tabs:deep(.el-tabs__nav-next:hover) {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 12%, var(--detail-tabs-bg-color));
}

/* Element Plus tabs 滚动图标：统一图标尺寸，避免默认图标偏小。 */
.detail-tabs:deep(.el-tabs__nav-prev .el-icon),
.detail-tabs:deep(.el-tabs__nav-next .el-icon) {
    font-size: 15px;
}

.detail-tabs:deep(.el-tabs__item) {
    border-bottom-color: var(--detail-tabs-border-color) !important;
    max-width: 220px;
}

/* 右侧激活 tab：覆盖 Element Plus card tabs 默认底边框颜色，改为当前主题色。 */
.detail-tabs:deep(.el-tabs__item.is-active) {
    border-bottom-color: var(--el-color-primary) !important;
}

/* 被右击的 Key Tab 在菜单显示期间保留悬浮样式，菜单关闭后自动恢复。 */
.detail-tabs:deep(.el-tabs__item:has(.detail-tab-label.is-context-menu-active):not(.is-active)) {
    color: var(--el-color-primary);
}

/* 详情 tab 标题：Key 名称和关闭按钮同排，长 Key 名称省略，关闭按钮常驻右侧。 */
.detail-tab-label {
    display: inline-flex;
    align-items: center;
    max-width: 190px;
    min-width: 0;
    gap: 0;
    vertical-align: middle;
}

.detail-tab-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.detail-tab-close-btn {
    flex: 0 0 auto;
    padding: 0;
    margin-left: 8px;
    border: none;
    border-radius: 50%;
    outline: none;
    background: transparent;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, color 0.15s ease;
}

.detail-tab-close-btn:hover {
    background: #ff0000;
    color: var(--el-color-white);
}

.detail-tab-close-btn:deep(.i-icon-close-small) {
    width: 15px;
    height: 15px;
    font-size: 15px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.detail-tab-close-btn svg {
    width: 15px;
    height: 15px;
    display: block;
}

/* 空状态：占据 tab 内容区域，避免无 tab 和有 tab 两种状态切换时高度抖动。 */
.detail-empty {
    flex: 1;
    min-height: 0;
}

/* 当前激活 tab 的详情内容区：独立于 el-tabs 渲染，避免 Element Plus pane 切换动画。 */
.detail-tab-content {
    display: flex;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    align-self: stretch;
    box-sizing: border-box;
}

/* KeyDetailPanel 根容器：固定占满 tab 内容区，避免详情内容首次出现时撑开布局。 */
.detail-tab-content :deep(.key-detail-panel) {
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
}
</style>
