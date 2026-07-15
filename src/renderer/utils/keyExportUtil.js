/**
 * Key 导出文件工具。
 * 负责把 main 进程读取到的 Redis Key 完整数据包装成稳定 JSON 文件并保存。
 */

/**
 * 创建完整 Key 导出 Blob。
 * @param {{connectionName:string, dbIndex:number, exportResult:Object}} options 导出上下文
 * @returns {Blob} JSON 文件内容
 */
export const createKeyExportDataBlob = ({connectionName = '', dbIndex = 0, exportResult = {}} = {}) => {
    const keys = Array.isArray(exportResult.keys) ? exportResult.keys : []
    const failedKeys = Array.isArray(exportResult.failedKeys) ? exportResult.failedKeys : []
    const exportData = {
        format: 'other-redis-desktop-manager.key-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        connectionName,
        dbIndex,
        count: keys.length,
        failedCount: failedKeys.length,
        limits: exportResult.limits || {},
        keys,
        failedKeys
    }

    return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
    })
}

/**
 * 下载 Blob 文件。
 * @param {Blob} blob 文件内容
 * @param {string} fileName 文件名
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
 * 优先使用系统文件选择器保存文件，不支持时回退到浏览器下载。
 * @param {Blob} blob 文件内容
 * @param {string} fileName 文件名
 * @param {Function} translate 国际化函数
 * @returns {Promise<'saved'|'cancelled'|'fallback'>} 保存结果
 */
const saveWithFilePicker = async (blob, fileName, translate) => {
    if (!window.showSaveFilePicker) {
        return 'fallback'
    }

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: translate('keyList.exportSelection.jsonFileDescription'),
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
 * 保存完整 Key 导出文件。
 * @param {{connectionName:string, dbIndex:number, exportResult:Object}} options 导出上下文
 * @param {Function} translate 国际化函数
 * @returns {Promise<'saved'|'cancelled'|'fallback'>} 保存结果
 */
export const saveKeyExportData = async (options, translate) => {
    const blob = createKeyExportDataBlob(options)
    const fileName = `redis-keys-${Date.now()}.json`
    const saveResult = await saveWithFilePicker(blob, fileName, translate)

    if (saveResult === 'fallback') {
        downloadBlob(blob, fileName)
    }

    return saveResult
}
