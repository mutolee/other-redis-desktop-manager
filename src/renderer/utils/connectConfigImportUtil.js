import {ElMessage} from "element-plus";
import {connectConfigRepository} from "../database/repositories/ConnectConfigRepository.js";
import {eventBus} from "./eventBus.js";

/**
 * 处理文件选择
 */
export const handleImportFileSelect = async (event, searchModeState) => {
    const file = event.target.files[0]
    if (!file) {
        return
    }

    // 验证文件类型
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        ElMessage.error('请选择 JSON 格式的文件')
        return
    }

    try {
        // 读取文件内容
        const fileContent = await readFileAsText(file)

        // 解析JSON
        let importData
        try {
            importData = JSON.parse(fileContent)
        } catch (parseError) {
            ElMessage.error('JSON 文件格式错误，请检查文件内容')
            return
        }

        // 验证数据格式
        if (!Array.isArray(importData)) {
            ElMessage.error('导入文件格式错误：数据必须是数组格式')
            return
        }

        if (importData.length === 0) {
            ElMessage.warning('导入文件为空')
            return
        }

        // 批量导入连接配置
        await batchImportConnections(importData, searchModeState)

    } catch (error) {
        console.error('导入失败:', error)
        ElMessage.error('导入失败: ' + (error.message || '未知错误'))
    }
}

/**
 * 读取文件内容为文本
 */
const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(new Error('文件读取失败'))
        reader.readAsText(file)
    })
}

/**
 * 批量导入连接配置
 */
const batchImportConnections = async (importData, searchModeState) => {
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    const errors = []

    // 逐个导入连接配置
    for (let i = 0; i < importData.length; i++) {
        const config = importData[i]

        try {
            // 移除id字段（如果存在），因为导入时会重新生成
            const {id, created_at, updated_at, last_active_at, ...configData} = config

            // 检查分组内是否已存在同名连接配置
            const existing = await connectConfigRepository.existsByName(
                configData.name || '',
                configData.group_name || '默认分组'
            )

            if (existing) {
                // 如果已存在，尝试重命名
                let newName = `${configData.name}_导入_${Date.now()}`
                let retryCount = 0

                // 确保新名称不重复
                while (await connectConfigRepository.existsByName(newName, configData.group_name || '默认分组')) {
                    retryCount++
                    newName = `${configData.name}_导入_${Date.now()}_${retryCount}`
                }

                configData.name = newName
                skipCount++
            }

            // 创建连接配置
            await connectConfigRepository.create(configData)
            successCount++

        } catch (error) {
            errorCount++
            const errorMsg = `第 ${i + 1} 条配置导入失败: ${error.message || '未知错误'}`
            errors.push(errorMsg)
            console.error(errorMsg, config)
        }
    }

    // 显示导入结果
    if (successCount > 0) {
        let message = `成功导入 ${successCount} 个连接配置`
        if (skipCount > 0) {
            message += `，${skipCount} 个已重命名`
        }
        if (errorCount > 0) {
            message += `，${errorCount} 个导入失败`
        }
        ElMessage.success(message)
    } else {
        ElMessage.warning('没有成功导入任何配置')
    }

    // 如果有错误，显示详细信息
    if (errors.length > 0) {
        console.error('导入错误详情:', errors)
        if (errors.length <= 5) {
            errors.forEach(err => ElMessage.warning(err))
        } else {
            ElMessage.warning(`还有 ${errors.length - 5} 个错误，请查看控制台`)
        }
    }

    // 刷新连接列表
    if (successCount > 0) {
        if (searchModeState) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }
    }
}