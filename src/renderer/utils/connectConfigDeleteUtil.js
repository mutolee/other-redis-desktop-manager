/**
 * 连接配置管理，提供连接配置的删除、批量删除等功能
 */
import {ElMessage, ElMessageBox} from "element-plus";
import {connectConfigRepository} from "../database/repositories/ConnectConfigRepository.js";

/**
 * 删除连接配置
 * @param connection - 连接配置
 * @returns {Promise<void>}
 */
export const handleDeleteConnectionConfig = async (connection) => {
    try {
        // 显示确认对话框
        await ElMessageBox.confirm(
            `<p style="margin: 15px 0">确定要删除连接 "${connection.name}" 吗？</p>`,
            '删除确认',
            {
                confirmButtonText: '删除',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--danger',
                dangerouslyUseHTMLString: true
            }
        )
        // 执行删除操作
        return await connectConfigRepository.delete(connection.id)
    } catch (error) {
        if (error === 'cancel') {
            // 用户取消删除
            return false
        }
        console.error('删除连接配置失败:', error)
        throw error
    }
}

/**
 * 删除分组
 * @param {Object|string} connectionGroup - 分组对象（包含group_name属性）或分组名称字符串
 * @returns {Promise<number|false>} 返回删除的记录数，如果用户取消则返回false
 */
export const handleDeleteFolder = async (connectionGroup) => {
    try {
        // 获取分组名称
        const groupName = typeof connectionGroup === 'string'
            ? connectionGroup
            : (connectionGroup?.group_name || '');

        if (!groupName || groupName.trim() === '') {
            ElMessage.warning('分组名称不能为空')
            return false
        }

        // 查询该分组下的连接配置数量
        const allConnections = await connectConfigRepository.getAll()
        const connectionCount = allConnections.filter(
            conn => conn.group_name === groupName
        ).length

        // 显示确认对话框
        await ElMessageBox.confirm(
            `<p style="margin: 15px 0">确定要删除分组 "${groupName}" 吗？</p>
             <p style="margin: 10px 0; color: #909399; font-size: 12px;">该分组下共有 ${connectionCount} 个连接，删除分组将同时删除这些连接。</p>`,
            '删除分组确认',
            {
                confirmButtonText: '删除',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--danger',
                dangerouslyUseHTMLString: true
            }
        )

        // 执行删除操作
        return await connectConfigRepository.deleteByGroupName(groupName)
    } catch (error) {
        if (error === 'cancel') {
            // 用户取消删除
            return false
        }
        console.error('删除分组失败:', error)
        throw error
    }
}