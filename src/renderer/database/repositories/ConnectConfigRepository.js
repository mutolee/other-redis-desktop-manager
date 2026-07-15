import {CONNECTION_CONFIG_TABLE_NAME, databaseConnection} from '../index.js'
import ConnectionConfigModel from '../models/ConnectionConfigModel.js'
import {useI18n} from '../../i18n/index.js'
import {normalizeConnectionConfigGroup, normalizeConnectionGroupName} from '../../utils/connectionGroupUtil.js'

/**
 * 判断字符串是否为空。
 *
 * @param {string} value - 待检查字符串
 * @returns {boolean} 是否为空字符串
 */
const isBlank = (value) => !value || value.trim() === ''

/**
 * 创建连接配置模型。
 *
 * @param {ConnectionConfigModel|Object} config - 连接配置模型实例或原始对象
 * @returns {ConnectionConfigModel} 连接配置模型
 */
const createModel = (config) => {
    return config instanceof ConnectionConfigModel
        ? config
        : new ConnectionConfigModel(normalizeConnectionConfigGroup(config))
}

/**
 * 验证连接配置模型。
 *
 * @param {ConnectionConfigModel} model - 连接配置模型
 * @param {Function} t - 国际化翻译函数
 */
const validateModel = (model, t) => {
    const validation = model.validate(t)

    if (!validation.valid) {
        throw new Error(t('database.connectionConfig.validationFailed', {
            value: validation.errors.join(', ')
        }))
    }
}

/**
 * Redis 连接配置数据仓库。
 * 负责 connection_configs 表的 CRUD、分组维护、搜索和最近活跃时间更新。
 */
class ConnectConfigRepository {
    constructor() {
        // 数据库表名：集中使用 index.js 导出的 schema 常量，避免表名散落。
        this.tableName = CONNECTION_CONFIG_TABLE_NAME
    }

    /**
     * 获取数据库表实例。
     *
     * @returns {Promise<Dexie.Table>} 连接配置表
     */
    async getTable() {
        const db = await databaseConnection.getDatabase()

        return db[this.tableName]
    }

    /**
     * 创建新的连接配置。
     *
     * @param {ConnectionConfigModel|Object} config - 连接配置模型实例或数据对象
     * @returns {Promise<ConnectionConfigModel>} 创建后的配置
     */
    async create(config) {
        const {t} = useI18n()
        const table = await this.getTable()
        const model = createModel(config)

        validateModel(model, t)

        // 同一分组内连接名称必须唯一。
        if (await this.existsByName(model.name, model.group_name)) {
            throw new Error(t('database.connectionConfig.duplicateNameInGroup', {
                group: model.group_name,
                name: model.name
            }))
        }

        const now = new Date().toISOString()
        const dataToSave = {
            ...model.modelToObject(),
            created_at: now,
            updated_at: now,
            last_active_at: ''
        }

        const id = await table.add(dataToSave)

        return await this.findById(id)
    }

    /**
     * 获取所有连接配置。
     *
     * @returns {Promise<ConnectionConfigModel[]>} 连接配置列表
     */
    async getAll() {
        const table = await this.getTable()

        // Dexie orderBy 只支持单字段，这里先按分组索引读取，再在内存中补充名称排序。
        const rows = await table.orderBy('group_name').toArray()

        rows.sort((a, b) => {
            if (a.group_name !== b.group_name) {
                return (a.group_name || '').localeCompare(b.group_name || '')
            }

            return (a.name || '').localeCompare(b.name || '')
        })

        return rows.map((row) => new ConnectionConfigModel(normalizeConnectionConfigGroup(row)))
    }

    /**
     * 根据 ID 查找连接配置。
     *
     * @param {number} id - 配置 ID
     * @returns {Promise<ConnectionConfigModel|null>} 连接配置
     */
    async findById(id) {
        const table = await this.getTable()
        const row = await table.get(id)

        return row ? new ConnectionConfigModel(normalizeConnectionConfigGroup(row)) : null
    }

    /**
     * 获取所有分组名称。
     *
     * @param {string} keyword - 搜索关键词，可选
     * @returns {Promise<string[]>} 分组名称列表
     */
    async findAllGroups(keyword) {
        const table = await this.getTable()
        const rows = await table.orderBy('group_name').toArray()
        const searchKeyword = keyword?.trim().toLowerCase()
        const groups = new Set()

        for (const row of rows) {
            const groupName = normalizeConnectionGroupName(row.group_name)

            if (!groupName) {
                continue
            }

            if (searchKeyword && !groupName.toLowerCase().includes(searchKeyword)) {
                continue
            }

            groups.add(groupName)
        }

        return Array.from(groups).sort()
    }

    /**
     * 更新连接配置。
     *
     * @param {number} id - 配置 ID
     * @param {ConnectionConfigModel|Object} config - 连接配置模型实例或更新对象
     * @returns {Promise<ConnectionConfigModel|null>} 更新后的配置
     */
    async update(id, config) {
        const {t} = useI18n()
        const table = await this.getTable()
        const model = createModel(config)

        validateModel(model, t)

        // 更新时排除当前记录自身，避免名称未变化时被误判重复。
        if (await this.existsByName(model.name, model.group_name, id)) {
            throw new Error(t('database.connectionConfig.duplicateNameInGroup', {
                group: model.group_name,
                name: model.name
            }))
        }

        const existing = await table.get(id)

        if (!existing) {
            return null
        }

        const dataToUpdate = {
            ...model.modelToObject(),
            created_at: existing.created_at,
            updated_at: new Date().toISOString(),
            last_active_at: existing.last_active_at
        }

        await table.update(id, dataToUpdate)

        return await this.findById(id)
    }

    /**
     * 删除连接配置。
     *
     * @param {number} id - 配置 ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    async delete(id) {
        const table = await this.getTable()

        await table.delete(id)

        return true
    }

    /**
     * 根据分组名称删除连接配置。
     *
     * @param {string} groupName - 分组名称
     * @returns {Promise<number>} 删除的记录数
     */
    async deleteByGroupName(groupName) {
        const normalizedGroupName = normalizeConnectionGroupName(groupName)

        if (isBlank(normalizedGroupName)) {
            return 0
        }

        const table = await this.getTable()
        const rows = await table
            .where('group_name')
            .equals(normalizedGroupName)
            .toArray()

        if (rows.length === 0) {
            return 0
        }

        // Dexie bulkDelete 只接收主键数组，这里先提取匹配记录 ID。
        const ids = rows.map((row) => row.id)

        await table.bulkDelete(ids)

        return ids.length
    }

    /**
     * 更新分组名称。
     *
     * @param {string} oldGroupName - 旧分组名称
     * @param {string} newGroupName - 新分组名称
     * @returns {Promise<number>} 更新的记录数
     */
    async updateGroupName(oldGroupName, newGroupName) {
        const {t} = useI18n()
        const normalizedOldGroupName = normalizeConnectionGroupName(oldGroupName)
        const normalizedNewGroupName = normalizeConnectionGroupName(newGroupName)

        if (isBlank(normalizedOldGroupName)) {
            throw new Error(t('database.connectionConfig.oldGroupNameRequired'))
        }

        if (isBlank(normalizedNewGroupName)) {
            throw new Error(t('database.connectionConfig.newGroupNameRequired'))
        }

        if (normalizedOldGroupName === normalizedNewGroupName) {
            return 0
        }

        const table = await this.getTable()
        const rows = await table
            .where('group_name')
            .equals(normalizedOldGroupName)
            .toArray()

        if (rows.length === 0) {
            return 0
        }

        const now = new Date().toISOString()
        const updateTasks = rows.map((row) => {
            // 重命名分组只改 group_name 和 updated_at，其他连接字段保持不变。
            return table.update(row.id, {
                group_name: normalizedNewGroupName,
                updated_at: now
            })
        })

        await Promise.all(updateTasks)

        return rows.length
    }

    /**
     * 更新最后活跃时间。
     *
     * @param {number} id - 配置 ID
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updateLastActiveTime(id) {
        const table = await this.getTable()

        await table.update(id, {
            last_active_at: new Date().toISOString()
        })

        return true
    }

    /**
     * 检查连接配置名称是否已存在。
     *
     * @param {string} name - 连接配置名称
     * @param {string} groupName - 分组名称
     * @param {number|null} excludeId - 排除的 ID，用于更新时跳过自身
     * @returns {Promise<boolean>} 是否存在同名配置
     */
    async existsByName(name, groupName, excludeId = null) {
        const table = await this.getTable()
        const normalizedGroupName = normalizeConnectionGroupName(groupName)

        try {
            const rows = await table
                .where('[name+group_name]')
                .equals([name, normalizedGroupName])
                .toArray()

            return this.hasMatchedName(rows, excludeId)
        } catch (error) {
            // 如果历史数据库缺少复合索引，降级为全表扫描，保证导入/编辑流程仍可工作。
            const rows = await table.toArray()
            const matches = rows.filter((row) => {
                return row.name === name && normalizeConnectionGroupName(row.group_name) === normalizedGroupName
            })

            return this.hasMatchedName(matches, excludeId)
        }
    }

    /**
     * 判断查询结果中是否存在未被排除的记录。
     *
     * @param {Array<Object>} rows - 查询结果
     * @param {number|null} excludeId - 排除 ID
     * @returns {boolean} 是否存在匹配项
     */
    hasMatchedName(rows, excludeId) {
        if (excludeId !== null) {
            return rows.some((row) => row.id !== excludeId)
        }

        return rows.length > 0
    }

    /**
     * 搜索连接配置。
     *
     * @param {string} keyword - 搜索关键词，匹配名称、主机和分组
     * @returns {Promise<ConnectionConfigModel[]>} 搜索结果
     */
    async search(keyword) {
        const table = await this.getTable()
        const searchPattern = keyword.toLowerCase()
        const rows = await table.toArray()

        const matches = rows.filter((row) => {
            const name = (row.name || '').toLowerCase()
            const host = (row.host || '').toLowerCase()
            const groupName = normalizeConnectionGroupName(row.group_name).toLowerCase()

            return name.includes(searchPattern)
                || host.includes(searchPattern)
                || groupName.includes(searchPattern)
        })

        // 搜索结果按最后活跃时间倒序展示，常用连接优先。
        matches.sort((a, b) => {
            const timeA = new Date(a.last_active_at || 0).getTime()
            const timeB = new Date(b.last_active_at || 0).getTime()

            return timeB - timeA
        })

        return matches.map((row) => new ConnectionConfigModel(normalizeConnectionConfigGroup(row)))
    }
}

// 连接配置仓库单例：renderer 内所有连接配置操作共享该实例。
export const connectConfigRepository = new ConnectConfigRepository()
