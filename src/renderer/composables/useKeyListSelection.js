/**
 * Key 列表选择模式组合逻辑。
 * 统一管理导出选择和批量删除选择，目录节点通过已加载子 Key 反推全选/半选状态。
 */
import {computed, ref, unref} from 'vue'
import {ElMessage} from 'element-plus'
import {
    getLoadedKeyNames,
    getRowSelectionState,
    getSelectableKeysByRow,
    selectAllLoadedKeys,
    toggleRowSelection
} from '../utils/keyExportSelectionUtil.js'

/**
 * 创建 Key 列表选择状态。
 * @param {{allScannedKeys: import('vue').Ref<Array>, currentKeySeparator: import('vue').Ref<string>, connectionId: import('vue').Ref<string>, t: Function}} options - 外部依赖。
 */
export const useKeyListSelection = (options) => {
    const {allScannedKeys, currentKeySeparator, connectionId, t} = options

    // Key 导出选择模式：进入后列表左侧展示 checkbox，选择集合只保存真实 Key。
    const exportSelectionMode = ref(false)

    // 当前导出选中的真实 Key 集合：目录节点不进入集合，目录状态由子 Key 反推。
    const selectedExportKeys = ref(new Set())

    // Key 批量删除选择模式：交互与导出选择一致，但提交按钮使用危险操作样式并要求二次确认。
    const batchDeleteSelectionMode = ref(false)

    // 当前批量删除选中的真实 Key 集合：目录节点通过已加载子 Key 反推全选/半选状态。
    const selectedBatchDeleteKeys = ref(new Set())

    // 当前导出选中数量：只统计真实 Key，不包含目录节点。
    const selectedExportCount = computed(() => selectedExportKeys.value.size)

    // 当前批量删除选中数量：只统计真实 Key，不包含目录节点。
    const selectedBatchDeleteCount = computed(() => selectedBatchDeleteKeys.value.size)

    // 当前是否处于列表选择模式：导出和批量删除都会让行左侧展示 checkbox。
    const isSelectionMode = computed(() => exportSelectionMode.value || batchDeleteSelectionMode.value)

    // 当前选择模式对应的 Key 集合：导出和批量删除共用行 checkbox 状态计算。
    const currentSelectedKeys = computed(() =>
        batchDeleteSelectionMode.value ? selectedBatchDeleteKeys.value : selectedExportKeys.value
    )

    /**
     * 确保当前连接可用，进入选择模式前统一提示。
     * @returns {boolean} 是否可继续操作
     */
    const ensureConnectionReady = () => {
        if (!unref(connectionId)) {
            ElMessage.warning(t('keyList.messages.connectFirst'))
            return false
        }

        return true
    }

    /**
     * 获取当前行在当前选择模式下的 checkbox 状态。
     * @param {Object} row 当前行
     * @returns {{checked:boolean, indeterminate:boolean, totalCount:number}}
     */
    const getSelectionState = (row) =>
        getRowSelectionState(row, allScannedKeys.value, currentSelectedKeys.value, currentKeySeparator.value)

    // 判断当前行是否已被当前选择模式选中。
    const isRowSelectionChecked = (row) => getSelectionState(row).checked

    // 判断当前目录行是否处于半选状态。
    const isRowSelectionIndeterminate = (row) => getSelectionState(row).indeterminate

    // 当前行没有可选真实 Key 时禁用选择框。
    const isRowSelectionDisabled = (row) => getSelectionState(row).totalCount === 0

    /**
     * 切换当前行覆盖的导出选择状态。
     * @param {Object} row 当前行
     */
    const toggleExportRow = (row) => {
        selectedExportKeys.value = toggleRowSelection(
            row,
            allScannedKeys.value,
            selectedExportKeys.value,
            currentKeySeparator.value
        )
    }

    /**
     * 切换当前行覆盖的批量删除选择状态。
     * @param {Object} row 当前行
     */
    const toggleBatchDeleteRow = (row) => {
        selectedBatchDeleteKeys.value = toggleRowSelection(
            row,
            allScannedKeys.value,
            selectedBatchDeleteKeys.value,
            currentKeySeparator.value
        )
    }

    /**
     * 根据当前选择模式切换行选择状态。
     * @param {Object} row 当前行
     */
    const toggleSelectionRow = (row) => {
        if (batchDeleteSelectionMode.value) {
            toggleBatchDeleteRow(row)
            return
        }

        toggleExportRow(row)
    }

    /**
     * 进入导出选择模式，可传入右键目标并预选对应 Key 范围。
     * @param {Object|null} presetRow 需要预选的 Key 或目录行
     */
    const enterExportSelectionMode = (presetRow = null) => {
        if (!ensureConnectionReady()) {
            return
        }

        exportSelectionMode.value = true
        batchDeleteSelectionMode.value = false
        selectedBatchDeleteKeys.value = new Set()
        selectedExportKeys.value = presetRow
            ? new Set(getSelectableKeysByRow(presetRow, allScannedKeys.value, currentKeySeparator.value))
            : new Set()
    }

    /**
     * 进入批量删除选择模式，可传入右键目标并预选对应 Key 范围。
     * @param {Object|null} presetRow 需要预选的 Key 或目录行
     */
    const enterBatchDeleteSelectionMode = (presetRow = null) => {
        if (!ensureConnectionReady()) {
            return
        }

        batchDeleteSelectionMode.value = true
        exportSelectionMode.value = false
        selectedExportKeys.value = new Set()
        selectedBatchDeleteKeys.value = presetRow
            ? new Set(getSelectableKeysByRow(presetRow, allScannedKeys.value, currentKeySeparator.value))
            : new Set()
    }

    /**
     * 全选当前已加载的真实 Key。
     */
    const handleSelectAllExportKeys = () => {
        selectedExportKeys.value = selectAllLoadedKeys(allScannedKeys.value)
    }

    /**
     * 全选当前已加载的真实 Key，用于批量删除。
     */
    const handleSelectAllBatchDeleteKeys = () => {
        selectedBatchDeleteKeys.value = selectAllLoadedKeys(allScannedKeys.value)
    }

    /**
     * 清空导出选择。
     */
    const handleClearExportSelection = () => {
        selectedExportKeys.value = new Set()
    }

    /**
     * 清空批量删除选择。
     */
    const handleClearBatchDeleteSelection = () => {
        selectedBatchDeleteKeys.value = new Set()
    }

    /**
     * 退出导出选择模式，并清空当前选择。
     */
    const exitExportSelectionMode = () => {
        exportSelectionMode.value = false
        selectedExportKeys.value = new Set()
    }

    /**
     * 退出批量删除选择模式，并清空当前选择。
     */
    const exitBatchDeleteSelectionMode = () => {
        batchDeleteSelectionMode.value = false
        selectedBatchDeleteKeys.value = new Set()
    }

    /**
     * 清空全部选择模式。
     */
    const resetSelections = () => {
        exportSelectionMode.value = false
        selectedExportKeys.value = new Set()
        batchDeleteSelectionMode.value = false
        selectedBatchDeleteKeys.value = new Set()
    }

    /**
     * 从所有选择集合中移除一批 Key。
     * @param {string[]|Set<string>} keys 待移除 Key
     */
    const removeSelectedKeys = (keys = []) => {
        const deletedKeySet = keys instanceof Set ? keys : new Set(keys)
        selectedExportKeys.value = new Set([...selectedExportKeys.value].filter((key) => !deletedKeySet.has(key)))
        selectedBatchDeleteKeys.value = new Set([...selectedBatchDeleteKeys.value].filter((key) => !deletedKeySet.has(key)))
    }

    /**
     * 已加载列表变化后，剔除不再存在的选择项。
     */
    const pruneSelectionsByLoadedKeys = () => {
        const loadedKeySet = new Set(getLoadedKeyNames(allScannedKeys.value))
        selectedExportKeys.value = new Set([...selectedExportKeys.value].filter((key) => loadedKeySet.has(key)))
        selectedBatchDeleteKeys.value = new Set([...selectedBatchDeleteKeys.value].filter((key) => loadedKeySet.has(key)))
    }

    return {
        exportSelectionMode,
        selectedExportKeys,
        batchDeleteSelectionMode,
        selectedBatchDeleteKeys,
        selectedExportCount,
        selectedBatchDeleteCount,
        isSelectionMode,
        isRowSelectionChecked,
        isRowSelectionIndeterminate,
        isRowSelectionDisabled,
        toggleSelectionRow,
        enterExportSelectionMode,
        enterBatchDeleteSelectionMode,
        handleSelectAllExportKeys,
        handleSelectAllBatchDeleteKeys,
        handleClearExportSelection,
        handleClearBatchDeleteSelection,
        exitExportSelectionMode,
        exitBatchDeleteSelectionMode,
        resetSelections,
        removeSelectedKeys,
        pruneSelectionsByLoadedKeys
    }
}
