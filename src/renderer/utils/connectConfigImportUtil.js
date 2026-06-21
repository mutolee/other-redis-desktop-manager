/**
 * 连接配置导入工具。
 * 负责读取 JSON 文件、校验基础格式、处理重名连接并刷新连接列表。
 */
import { ElMessage } from 'element-plus'
import { connectConfigRepository } from '../database/repositories/ConnectConfigRepository.js'
import { eventBus } from './eventBus.js'
import { resolveConnectionGroupName } from './connectionGroupUtil.js'
import { useI18n } from '../i18n/index.js'

// 导入错误最多直接展示的条数，避免一次性刷屏。
const MAX_VISIBLE_IMPORT_ERRORS = 5

/**
 * 处理文件选择。
 *
 * @param {Event} event - 文件选择事件
 * @param {boolean} searchModeState - 当前是否处于搜索模式
 */
export const handleImportFileSelect = async (event, searchModeState) => {
    // 国际化文案读取函数：导入过程中的校验、错误和结果提示需要跟随当前语言。
    const { t } = useI18n()
    const file = event.target.files[0]

    if (!file) {
        return
    }

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        ElMessage.error(t('utils.connectConfigImport.messages.selectJsonFile'))
        return
    }

    try {
        const fileContent = await readFileAsText(file, t)
        const importData = parseImportJson(fileContent, t)

        if (!Array.isArray(importData)) {
            ElMessage.error(t('utils.connectConfigImport.messages.arrayRequired'))
            return
        }

        if (importData.length === 0) {
            ElMessage.warning(t('utils.connectConfigImport.messages.emptyFile'))
            return
        }

        await batchImportConnections(importData, searchModeState, t)
    } catch (error) {
        ElMessage.error(t('utils.connectConfigImport.messages.importFail', {
            value: error.message || t('common.unknownError')
        }))
    } finally {
        // 清空 input value，允许用户重复选择同一个文件重新导入。
        event.target.value = ''
    }
}

/**
 * 读取文件内容为文本。
 *
 * @param {File} file - 待读取文件
 * @param {Function} t - 国际化翻译函数
 * @returns {Promise<string>} 文件文本内容
 */
const readFileAsText = (file, t) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => reject(new Error(t('utils.connectConfigImport.messages.readFail')))
        reader.readAsText(file)
    })
}

/**
 * 解析导入 JSON。
 *
 * @param {string} fileContent - 文件文本内容
 * @param {Function} t - 国际化翻译函数
 * @returns {unknown} JSON 解析结果
 */
const parseImportJson = (fileContent, t) => {
    try {
        return JSON.parse(fileContent)
    } catch (error) {
        throw new Error(t('utils.connectConfigImport.messages.invalidJson'))
    }
}

/**
 * 为重名连接生成新的名称。
 *
 * @param {string} baseName - 原连接名称
 * @param {string} groupName - 分组名称
 * @param {Function} t - 国际化翻译函数
 * @returns {Promise<string>} 不重复的新名称
 */
const createUniqueImportName = async (baseName, groupName, t) => {
    let retryCount = 0
    const safeBaseName = baseName || t('utils.connectConfigImport.unnamedConnection')
    const importSuffix = t('utils.connectConfigImport.importNameSuffix')
    let newName = `${safeBaseName}_${importSuffix}_${Date.now()}`

    while (await connectConfigRepository.existsByName(newName, groupName)) {
        retryCount += 1
        newName = `${safeBaseName}_${importSuffix}_${Date.now()}_${retryCount}`
    }

    return newName
}

/**
 * 批量导入连接配置。
 *
 * @param {Array<Object>} importData - 导入数据
 * @param {boolean} searchModeState - 当前是否处于搜索模式
 * @param {Function} t - 国际化翻译函数
 */
const batchImportConnections = async (importData, searchModeState, t) => {
    let successCount = 0
    let renameCount = 0
    const errors = []

    for (let index = 0; index < importData.length; index += 1) {
        const config = importData[index]

        try {
            // 移除数据库生成字段，导入时重新创建。
            const { id, created_at, updated_at, last_active_at, ...configData } = config
            const groupName = resolveConnectionGroupName(configData.group_name)
            configData.group_name = groupName
            const existing = await connectConfigRepository.existsByName(configData.name || '', groupName)

            if (existing) {
                configData.name = await createUniqueImportName(configData.name, groupName, t)
                renameCount += 1
            }

            await connectConfigRepository.create(configData)
            successCount += 1
        } catch (error) {
            errors.push(t('utils.connectConfigImport.messages.itemImportFail', {
                index: index + 1,
                value: error.message || t('common.unknownError')
            }))
        }
    }

    showImportResult(successCount, renameCount, errors, t)

    if (successCount > 0) {
        eventBus.emit(searchModeState ? 'search-connection' : 'load-connection')
    }
}

/**
 * 展示导入结果。
 *
 * @param {number} successCount - 成功数量
 * @param {number} renameCount - 重命名数量
 * @param {string[]} errors - 错误信息列表
 * @param {Function} t - 国际化翻译函数
 */
const showImportResult = (successCount, renameCount, errors, t) => {
    if (successCount > 0) {
        let message = t('utils.connectConfigImport.messages.importSuccess', { value: successCount })

        if (renameCount > 0) {
            message += t('utils.connectConfigImport.messages.renameSummary', { value: renameCount })
        }

        if (errors.length > 0) {
            message += t('utils.connectConfigImport.messages.failSummary', { value: errors.length })
        }

        ElMessage.success(message)
    } else {
        ElMessage.warning(t('utils.connectConfigImport.messages.noSuccess'))
    }

    errors.slice(0, MAX_VISIBLE_IMPORT_ERRORS).forEach((errorMessage) => {
        ElMessage.warning(errorMessage)
    })

    if (errors.length > MAX_VISIBLE_IMPORT_ERRORS) {
        ElMessage.warning(t('utils.connectConfigImport.messages.moreErrors', {
            value: errors.length - MAX_VISIBLE_IMPORT_ERRORS
        }))
    }
}
