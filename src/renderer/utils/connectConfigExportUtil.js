/**
 * 连接配置导出工具。
 * 封装批量选择、分组选择和 JSON 文件导出逻辑。
 */
import { ElMessage } from 'element-plus'

// 默认文案函数：工具函数被非 Vue 场景复用时，使用英文兜底避免界面语言混杂。
const defaultTranslate = (key, fallback = '') => fallback || key

/**
 * 切换单个连接配置的选中状态。
 *
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {number} itemId - 连接配置 ID
 */
export const toggleItemSelection = (selectedIds, itemId) => {
    if (selectedIds.has(itemId)) {
        selectedIds.delete(itemId)
        return
    }

    selectedIds.add(itemId)
}

/**
 * 判断分组是否全选。
 *
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {Object} group - 连接分组
 * @returns {boolean} 是否全选
 */
export const isGroupSelected = (selectedIds, group) => {
    if (!group.children || group.children.length === 0) {
        return false
    }

    return group.children.every((item) => selectedIds.has(item.id))
}

/**
 * 判断分组是否部分选中。
 *
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {Object} group - 连接分组
 * @returns {boolean} 是否部分选中
 */
export const isGroupIndeterminate = (selectedIds, group) => {
    if (!group.children || group.children.length === 0) {
        return false
    }

    const selectedCount = group.children.filter((item) => selectedIds.has(item.id)).length

    return selectedCount > 0 && selectedCount < group.children.length
}

/**
 * 切换整个分组的选中状态。
 *
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {Object} group - 连接分组
 */
export const toggleGroupSelection = (selectedIds, group) => {
    if (!group.children || group.children.length === 0) {
        return
    }

    const isAllSelected = isGroupSelected(selectedIds, group)

    for (const item of group.children) {
        if (isAllSelected) {
            selectedIds.delete(item.id)
        } else {
            selectedIds.add(item.id)
        }
    }
}

/**
 * 全选所有连接配置。
 *
 * @param {Array<Object>} connectionConfigs - 连接配置列表
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {Function} [translate] - 国际化文案读取函数
 */
export const handleSelectAll = (connectionConfigs, selectedIds, translate = defaultTranslate) => {
    connectionConfigs.forEach((config) => {
        selectedIds.add(config.id)
    })

    ElMessage.success(translate('sideBarMenu.messages.selectedCount', '{value} profiles selected').replace('{value}', selectedIds.size))
}

/**
 * 取消全选。
 *
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {Function} [translate] - 国际化文案读取函数
 */
export const handleSelectNone = (selectedIds, translate = defaultTranslate) => {
    selectedIds.clear()
    ElMessage.info(translate('sideBarMenu.messages.cleared', 'Selection cleared'))
}

/**
 * 创建导出数据。
 *
 * @param {Array<Object>} selectedConfigs - 选中的连接配置
 * @returns {Blob} JSON Blob
 */
const createExportBlob = (selectedConfigs) => {
    const exportData = selectedConfigs.map((config) => {
        // 导出时移除 id，导入时由 IndexedDB 重新生成。
        const { id, ...rest } = config
        return rest
    })

    return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
    })
}

/**
 * 通过浏览器下载能力保存文件。
 *
 * @param {Blob} blob - 文件内容
 * @param {string} fileName - 文件名
 */
const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()

    setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, 100)
}

/**
 * 尝试使用 File System Access API 保存文件。
 *
 * @param {Blob} blob - 文件内容
 * @param {string} fileName - 文件名
 * @returns {Promise<'saved'|'cancelled'|'fallback'>} 保存结果
 */
const saveWithFilePicker = async (blob, fileName, translate = defaultTranslate) => {
    if (!window.showSaveFilePicker) {
        return 'fallback'
    }

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: translate('sideBarMenu.messages.jsonFileDescription', 'JSON file'),
                accept: {
                    'application/json': ['.json']
                }
            }]
        })
        const writable = await fileHandle.createWritable()

        await writable.write(blob)
        await writable.close()

        return 'saved'
    } catch (error) {
        return error.name === 'AbortError' ? 'cancelled' : 'fallback'
    }
}

/**
 * 导出选中的连接配置。
 *
 * @param {Array<Object>} connectionConfigs - 全量连接配置
 * @param {Set<number>} selectedIds - 当前选中 ID 集合
 * @param {Function} [translate] - 国际化文案读取函数
 */
export const handleExportSelected = async (connectionConfigs, selectedIds, translate = defaultTranslate) => {
    if (selectedIds.size === 0) {
        ElMessage.warning(translate('sideBarMenu.messages.exportEmpty', 'Select at least one profile to export'))
        return
    }

    try {
        const selectedConfigs = connectionConfigs.filter((config) => selectedIds.has(config.id))
        const blob = createExportBlob(selectedConfigs)
        const fileName = `redis-connections-${Date.now()}.json`
        const saveResult = await saveWithFilePicker(blob, fileName, translate)

        if (saveResult === 'cancelled') {
            return
        }

        if (saveResult === 'fallback') {
            downloadBlob(blob, fileName)
        }

        selectedIds.clear()
        ElMessage.success(translate('sideBarMenu.messages.exportSuccess', '{value} profiles exported').replace('{value}', selectedConfigs.length))
    } catch (error) {
        const errorMessage = error.message || translate('sideBarMenu.messages.unknownError', 'Unknown error')
        ElMessage.error(`${translate('sideBarMenu.messages.exportFail', 'Export failed')}: ${errorMessage}`)
    }
}
