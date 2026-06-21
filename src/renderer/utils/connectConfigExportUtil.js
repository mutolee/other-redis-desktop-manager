import {ElMessage} from "element-plus";

/**
 * 切换单个配置的选中状态
 */
export const toggleItemSelection = (selectedIds, itemId) => {
    if (selectedIds.has(itemId)) {
        selectedIds.delete(itemId)
    } else {
        selectedIds.add(itemId)
    }
}

/**
 * 判断分组是否全选
 */
export const isGroupSelected = (selectedIds, group) => {
    if (!group.children || group.children.length === 0) {
        return false
    }
    return group.children.every(item => selectedIds.has(item.id))
}

/**
 * 判断分组是否部分选中
 */
export const isGroupIndeterminate = (selectedIds, group) => {
    if (!group.children || group.children.length === 0) {
        return false
    }
    const selectedCount = group.children.filter(item => selectedIds.has(item.id)).length
    return selectedCount > 0 && selectedCount < group.children.length
}

/**
 * 切换分组选中状态
 */
export const toggleGroupSelection = (selectedIds, group) => {
    if (!group.children || group.children.length === 0) {
        return
    }
    const isAllSelected = isGroupSelected(selectedIds, group)
    if (isAllSelected) {
        // 取消全选该分组
        group.children.forEach(item => {
            selectedIds.delete(item.id)
        })
    } else {
        // 全选该分组
        group.children.forEach(item => {
            selectedIds.add(item.id)
        })
    }
}

/**
 * 全选所有配置
 */
export const handleSelectAll = (connectionConfigs, selectedIds) => {
    connectionConfigs.forEach(config => {
        selectedIds.add(config.id)
    })
    ElMessage.success(`已选中 ${selectedIds.size} 个配置`)
}

/**
 * 取消全选
 */
export const handleSelectNone = (selectedIds) => {
    selectedIds.clear()
    ElMessage.info('已取消全选')
}

/**
 * 导出选中的配置
 */
export const handleExportSelected = async (connectionConfigs, selectedIds) => {
    if (selectedIds.size === 0) {
        ElMessage.warning('请至少选择一个配置进行导出')
        return
    }

    try {
        // 获取选中的配置数据
        const selectedConfigs = connectionConfigs.filter(config =>
            selectedIds.has(config.id)
        )

        // 转换为纯对象（移除id，因为导入时会重新生成）
        const exportData = selectedConfigs.map(config => {
            const {id, ...rest} = config
            return rest
        })

        // 创建JSON字符串
        const jsonString = JSON.stringify(exportData, null, 2)

        // 创建 Blob
        const blob = new Blob([jsonString], {type: 'application/json'})
        const fileName = `redis-connections-${new Date().getTime()}.json`

        // 优先使用 File System Access API（如果支持）
        if (window.showSaveFilePicker) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'JSON文件',
                        accept: {
                            'application/json': ['.json']
                        }
                    }]
                })

                // 写入文件
                const writable = await fileHandle.createWritable()
                await writable.write(blob)
                await writable.close()
                selectedIds.clear()

                // 文件保存成功后提示
                ElMessage.success(`成功导出 ${selectedConfigs.length} 个配置`)
                return
            } catch (saveError) {
                // 如果用户取消保存，不显示错误
                if (saveError.name === 'AbortError') {
                    return
                }
                // 其他错误，回退到下载方式
                console.warn('File System Access API 失败，使用下载方式:', saveError)
            }
        }

        // 回退到传统的下载方式
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()

        // 等待一小段时间确保下载已开始，然后清理并提示
        setTimeout(() => {
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            selectedIds.clear()

            ElMessage.success(`成功导出 ${selectedConfigs.length} 个配置`)
        }, 100)

    } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败: ' + (error.message || '未知错误'))
    }
}