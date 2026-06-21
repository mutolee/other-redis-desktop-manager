import {databaseConnection} from '../index.js';
import ConnectionConfigModel from '../models/ConnectionConfigModel.js';

/**
 * Redis连接配置数据仓库
 * 提供连接配置的CRUD操作
 */
class ConnectConfigRepository {
    constructor() {
        this.tableName = 'connection_configs';
    }

    /**
     * 获取数据库表实例
     * @returns {Promise<Dexie.Table>}
     */
    async getTable() {
        const db = await databaseConnection.getDatabase();
        return db[this.tableName];
    }

    /**
     * 创建新的连接配置
     * @param {ConnectionConfigModel|Object} config - 连接配置模型实例或数据对象
     * @returns {Promise<ConnectionConfigModel>} 创建后的配置（包含ID）
     */
    async create(config) {
        // 创建模型实例进行验证
        const model = config instanceof ConnectionConfigModel
            ? config
            : new ConnectionConfigModel(config);

        const validation = model.validate();
        if (!validation.valid) {
            throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
        }

        // 检查分组内名称是否已存在
        const existing = await this.existsByName(model.name, model.group_name);
        if (existing) {
            throw new Error(`分组 "${model.group_name}" 中已存在名称为 "${model.name}" 的连接配置`);
        }

        // 准备数据对象，IndexedDB 只能存储纯对象（plain object）
        const now = new Date().toISOString();
        const dataToSave = {
            ...model.modelToObject(),
            created_at: now,
            updated_at: now,
            last_active_at: ''
        };

        try {
            const table = await this.getTable();
            const id = await table.add(dataToSave);
            return await this.findById(id);
        } catch (error) {
            console.error('❌ 创建连接配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有连接配置
     * @returns {Promise<ConnectionConfigModel[]>}
     */
    async getAll() {
        try {
            const table = await this.getTable();
            // Dexie 的 orderBy 只支持单个字段，需要先按 group_name 排序，然后在内存中按 name 排序
            const rows = await table.orderBy('group_name').toArray();
            // 在内存中按 group_name 和 name 排序
            rows.sort((a, b) => {
                if (a.group_name !== b.group_name) {
                    return (a.group_name || '').localeCompare(b.group_name || '');
                }
                return (a.name || '').localeCompare(b.name || '');
            });
            return rows.map(row => new ConnectionConfigModel(row));
        } catch (error) {
            console.error('❌ 查询所有连接配置失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID查找连接配置
     * @param {number} id - 配置ID
     * @returns {Promise<ConnectionConfigModel|null>}
     */
    async findById(id) {
        try {
            const table = await this.getTable();
            const row = await table.get(id);
            return row ? new ConnectionConfigModel(row) : null;
        } catch (error) {
            console.error('❌ 查询连接配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有分组名称
     * @param {string} keyword - 搜索关键词（可选），如果提供则过滤分组名称
     * @returns {Promise<string[]>}
     */
    async findAllGroups(keyword) {
        try {
            const table = await this.getTable();
            let query = table.orderBy('group_name');

            if (keyword && keyword.trim() !== '') {
                const searchKeyword = keyword.trim().toLowerCase();
                const allRows = await query.toArray();
                const groups = new Set();
                allRows.forEach(row => {
                    if (row.group_name && row.group_name.toLowerCase().includes(searchKeyword)) {
                        groups.add(row.group_name);
                    }
                });
                return Array.from(groups).sort();
            } else {
                const allRows = await query.toArray();
                const groups = new Set(allRows.map(row => row.group_name));
                return Array.from(groups).sort();
            }
        } catch (error) {
            console.error('❌ 查询所有分组失败:', error);
            throw error;
        }
    }

    /**
     * 更新连接配置
     * @param {number} id - 配置ID
     * @param {ConnectionConfigModel|Object} config - 连接配置模型实例或更新数据对象
     * @returns {Promise<ConnectionConfigModel|null>}
     */
    async update(id, config) {
        // 创建模型实例进行验证
        const model = config instanceof ConnectionConfigModel
            ? config
            : new ConnectionConfigModel(config);

        const validation = model.validate();
        if (!validation.valid) {
            throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
        }

        // 检查分组内名称是否已存在, 排除当前记录
        if (await this.existsByName(model.name, model.group_name, id)) {
            throw new Error(`分组 "${model.group_name}" 中已存在名称为 "${model.name}" 的连接配置`);
        }

        try {
            const table = await this.getTable();
            // 获取现有记录以保留 created_at 和 last_active_at
            const existing = await table.get(id);
            if (!existing) {
                return null;
            }

            // 准备更新数据，保留时间戳字段
            const data = {
                ...model.modelToObject(),
                created_at: existing.created_at,
                updated_at: new Date().toISOString(),
                last_active_at: existing.last_active_at
            };

            await table.update(id, data);
            return await this.findById(id);
        } catch (error) {
            console.error('❌ 更新连接配置失败:', error);
            throw error;
        }
    }

    /**
     * 删除连接配置
     * @param {number} id - 配置ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    async delete(id) {
        try {
            const table = await this.getTable();
            await table.delete(id);
            return true;
        } catch (error) {
            console.error('❌ 删除连接配置失败:', error);
            throw error;
        }
    }

    /**
     * 根据分组名称删除连接配置
     * @param {string} groupName - 分组名称
     * @returns {Promise<number>} 删除的记录数
     */
    async deleteByGroupName(groupName) {
        if (!groupName || groupName.trim() === '') {
            return 0;
        }

        try {
            const table = await this.getTable();
            // 查询该分组下的所有连接配置
            const rows = await table
                .where('group_name')
                .equals(groupName)
                .toArray();

            if (rows.length === 0) {
                return 0;
            }

            // 获取所有匹配记录的ID
            const ids = rows.map(row => row.id);

            // 批量删除
            await table.bulkDelete(ids);
            return ids.length;
        } catch (error) {
            console.error('❌ 根据分组名称删除连接配置失败:', error);
            throw error;
        }
    }

    /**
     * 更新分组名称（重命名分组）
     * @param {string} oldGroupName - 旧的分组名称
     * @param {string} newGroupName - 新的分组名称
     * @returns {Promise<number>} 更新的记录数
     */
    async updateGroupName(oldGroupName, newGroupName) {
        if (!oldGroupName || oldGroupName.trim() === '') {
            throw new Error('旧分组名称不能为空');
        }
        if (!newGroupName || newGroupName.trim() === '') {
            throw new Error('新分组名称不能为空');
        }
        if (oldGroupName === newGroupName) {
            return 0;
        }

        try {
            const table = await this.getTable();
            // 查询该分组下的所有连接配置
            const rows = await table
                .where('group_name')
                .equals(oldGroupName)
                .toArray();

            if (rows.length === 0) {
                return 0;
            }

            // 批量更新分组名称
            const now = new Date().toISOString();
            const updatePromises = rows.map(row => {
                // 只更新 group_name 和 updated_at 字段
                return table.update(row.id, {
                    group_name: newGroupName,
                    updated_at: now
                });
            });

            await Promise.all(updatePromises);
            return rows.length;
        } catch (error) {
            console.error('❌ 更新分组名称失败:', error);
            throw error;
        }
    }

    /**
     * 更新最后活跃时间
     * @param {number} id - 配置ID
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updateLastActiveTime(id) {
        try {
            const table = await this.getTable();
            const now = new Date().toISOString();
            await table.update(id, {last_active_at: now});
            return true;
        } catch (error) {
            console.error('❌ 更新最后活跃时间失败:', error);
            throw error;
        }
    }

    /**
     * 检查连接配置名称是否已存在（在同一分组内）
     * @param {string} name - 连接配置名称
     * @param {string} groupName - 分组名称
     * @param {number} excludeId - 排除的ID（用于更新时检查）
     * @returns {Promise<boolean>}
     */
    async existsByName(name, groupName, excludeId = null) {
        try {
            const table = await this.getTable();
            const rows = await table
                .where('[name+group_name]')
                .equals([name, groupName])
                .toArray();

            if (excludeId !== null) {
                return rows.some(row => row.id !== excludeId);
            }
            return rows.length > 0;
        } catch (error) {
            // 如果索引不存在，使用全表扫描
            try {
                const allRows = await table.toArray();
                const matches = allRows.filter(row =>
                    row.name === name &&
                    row.group_name === groupName &&
                    (excludeId === null || row.id !== excludeId)
                );
                return matches.length > 0;
            } catch (fallbackError) {
                console.error('❌ 检查连接名称是否存在失败:', error);
                throw error;
            }
        }
    }

    /**
     * 搜索连接配置
     * @param {string} keyword - 搜索关键词（匹配名称、主机、分组）
     * @returns {Promise<ConnectionConfigModel[]>}
     */
    async search(keyword) {
        try {
            const table = await this.getTable();
            const searchPattern = keyword.toLowerCase();
            const allRows = await table.toArray();

            const matches = allRows.filter(row => {
                const name = (row.name || '').toLowerCase();
                const host = (row.host || '').toLowerCase();
                const groupName = (row.group_name || '').toLowerCase();
                return name.includes(searchPattern) ||
                    host.includes(searchPattern) ||
                    groupName.includes(searchPattern);
            });

            // 按最后活跃时间排序
            matches.sort((a, b) => {
                const timeA = new Date(a.last_active_at || 0).getTime();
                const timeB = new Date(b.last_active_at || 0).getTime();
                return timeB - timeA;
            });

            return matches.map(row => new ConnectionConfigModel(row));
        } catch (error) {
            console.error('❌ 搜索连接配置失败:', error);
            throw error;
        }
    }
}

// 创建单例实例
export const connectConfigRepository = new ConnectConfigRepository();