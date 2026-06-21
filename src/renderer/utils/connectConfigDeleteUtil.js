/**
 * 连接配置删除工具。
 * 封装删除确认弹窗和 repository 删除调用，供侧边栏菜单复用。
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { connectConfigRepository } from '../database/repositories/ConnectConfigRepository.js'
import { useI18n } from '../i18n/index.js'

/**
 * 判断用户是否取消了 Element Plus 确认弹窗。
 *
 * @param {unknown} error - 弹窗 reject 原因
 * @returns {boolean} 是否为用户取消
 */
const isCancelAction = (error) => error === 'cancel' || error === 'close'

/**
 * 转义插入 HTML 确认框的动态文本。
 *
 * @param {unknown} value - 待展示的动态内容
 * @returns {string} 转义后的安全文本
 */
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * 删除单个连接配置。
 *
 * @param {Object} connection - 连接配置
 * @returns {Promise<boolean>} 删除是否成功
 */
export const handleDeleteConnectionConfig = async (connection) => {
    // 国际化文案读取函数：在方法执行时读取，避免工具模块加载早于 Pinia 初始化。
    const { t } = useI18n()

    try {
        const connectionName = escapeHtml(connection?.name || '')

        await ElMessageBox.confirm(
            `<p style="margin: 15px 0">${t('dialogs.deleteConfig.connectionMessage', { value: connectionName })}</p>`,
            t('dialogs.deleteConfig.connectionTitle'),
            {
                confirmButtonText: t('dialogs.deleteConfig.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger',
                dangerouslyUseHTMLString: true
            }
        )

        return await connectConfigRepository.delete(connection.id)
    } catch (error) {
        if (isCancelAction(error)) {
            return false
        }

        ElMessage.error(error.message || t('sideBar.messages.deleteConnectionFail'))
        throw error
    }
}

/**
 * 删除分组及其下所有连接配置。
 *
 * @param {Object|string} connectionGroup - 分组对象或分组名称
 * @returns {Promise<number|false>} 删除数量，用户取消时返回 false
 */
export const handleDeleteFolder = async (connectionGroup) => {
    // 国际化文案读取函数：分组删除确认和错误提示需要跟随当前语言。
    const { t } = useI18n()

    const groupName = typeof connectionGroup === 'string'
        ? connectionGroup
        : (connectionGroup?.group_name || '')

    if (!groupName || groupName.trim() === '') {
        ElMessage.warning(t('dialogs.deleteConfig.groupNameRequired'))
        return false
    }

    try {
        const allConnections = await connectConfigRepository.getAll()
        const connectionCount = allConnections.filter((conn) => conn.group_name === groupName).length
        const safeGroupName = escapeHtml(groupName)

        await ElMessageBox.confirm(
            `<p style="margin: 15px 0">${t('dialogs.deleteConfig.groupMessage', { value: safeGroupName })}</p>
             <p style="margin: 10px 0; color: #909399; font-size: 12px;">${t('dialogs.deleteConfig.groupDescription', { value: connectionCount })}</p>`,
            t('dialogs.deleteConfig.groupTitle'),
            {
                confirmButtonText: t('dialogs.deleteConfig.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger',
                dangerouslyUseHTMLString: true
            }
        )

        return await connectConfigRepository.deleteByGroupName(groupName)
    } catch (error) {
        if (isCancelAction(error)) {
            return false
        }

        ElMessage.error(error.message || t('sideBar.messages.deleteGroupFail'))
        throw error
    }
}
