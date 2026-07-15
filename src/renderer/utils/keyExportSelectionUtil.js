/**
 * Key 导出选择工具。
 * 只保存真实 Key 的选择状态，目录节点通过其子 Key 反推全选和半选状态。
 */

/**
 * 获取当前已加载的真实 Key 名称列表。
 * @param {Array<{key:string}>} flatKeys 已扫描到的扁平 Key 列表
 * @returns {string[]} Key 名称列表
 */
export const getLoadedKeyNames = (flatKeys = []) =>
    flatKeys
        .map((item) => item?.key)
        .filter(Boolean)

/**
 * 获取目录节点下已加载的真实 Key。
 * @param {{key:string,isDirectory:boolean}} row 当前行
 * @param {Array<{key:string}>} flatKeys 已扫描到的扁平 Key 列表
 * @param {string} keySeparator 当前连接 Key 分隔符
 * @returns {string[]} 当前行覆盖的真实 Key 名称
 */
export const getSelectableKeysByRow = (row, flatKeys = [], keySeparator = ':') => {
    if (!row?.key) {
        return []
    }

    if (!row.isDirectory) {
        return [row.key]
    }

    const directoryPrefix = `${row.key}${keySeparator}`

    return getLoadedKeyNames(flatKeys).filter((key) => key.startsWith(directoryPrefix))
}

/**
 * 计算目录或 Key 行的 checkbox 状态。
 * @param {Object} row 当前行
 * @param {Array<{key:string}>} flatKeys 已扫描到的扁平 Key 列表
 * @param {Set<string>} selectedKeys 已选择 Key 集合
 * @param {string} keySeparator 当前连接 Key 分隔符
 * @returns {{checked:boolean, indeterminate:boolean, selectedCount:number, totalCount:number}}
 */
export const getRowSelectionState = (row, flatKeys, selectedKeys, keySeparator = ':') => {
    const selectableKeys = getSelectableKeysByRow(row, flatKeys, keySeparator)
    const selectedCount = selectableKeys.filter((key) => selectedKeys.has(key)).length
    const totalCount = selectableKeys.length

    return {
        checked: totalCount > 0 && selectedCount === totalCount,
        indeterminate: selectedCount > 0 && selectedCount < totalCount,
        selectedCount,
        totalCount
    }
}

/**
 * 切换当前行覆盖的 Key 选择状态。
 * @param {Object} row 当前行
 * @param {Array<{key:string}>} flatKeys 已扫描到的扁平 Key 列表
 * @param {Set<string>} selectedKeys 已选择 Key 集合
 * @param {string} keySeparator 当前连接 Key 分隔符
 * @returns {Set<string>} 新的选择集合
 */
export const toggleRowSelection = (row, flatKeys, selectedKeys, keySeparator = ':') => {
    const selectableKeys = getSelectableKeysByRow(row, flatKeys, keySeparator)
    const nextSelectedKeys = new Set(selectedKeys)
    const shouldSelect = selectableKeys.some((key) => !nextSelectedKeys.has(key))

    for (const key of selectableKeys) {
        if (shouldSelect) {
            nextSelectedKeys.add(key)
        } else {
            nextSelectedKeys.delete(key)
        }
    }

    return nextSelectedKeys
}

/**
 * 全选当前已加载的真实 Key。
 * @param {Array<{key:string}>} flatKeys 已扫描到的扁平 Key 列表
 * @returns {Set<string>} 新的选择集合
 */
export const selectAllLoadedKeys = (flatKeys = []) => new Set(getLoadedKeyNames(flatKeys))

/**
 * 根据选择集合生成导出清单行。
 * @param {Array<{key:string,type:string}>} flatKeys 已扫描到的扁平 Key 列表
 * @param {Set<string>} selectedKeys 已选择 Key 集合
 * @returns {Array<{key:string,type:string}>} 选中的 Key 元信息
 */
export const getSelectedKeyRows = (flatKeys = [], selectedKeys = new Set()) =>
    flatKeys
        .filter((item) => selectedKeys.has(item.key))
        .map((item) => ({
            key: item.key,
            type: item.type || 'unknown'
        }))
