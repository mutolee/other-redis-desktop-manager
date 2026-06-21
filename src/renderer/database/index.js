import Dexie from 'dexie';

/**
 * IndexedDB数据库连接管理器
 * 使用Dexie.js库提供高性能的IndexedDB操作
 */
class DatabaseConnection {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    /**
     * 初始化数据库连接
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // 数据库名称
            const dbName = 'OtherRedisClientDB';

            // 创建 Dexie 数据库实例
            this.db = new Dexie(dbName);

            // 定义数据库表结构
            // 只定义实际使用的索引：主键、用于排序/查询的字段
            this.db.version(1).stores({
                // 连接配置表
                // ++id: 自增主键（必须）
                // group_name: 用于按分组排序
                // [name+group_name]: 复合索引，用于检查名称+分组的唯一性
                connection_configs: '++id, group_name, [name+group_name]',
            });

            // 打开数据库连接
            await this.db.open();
            this.isConnected = true;
            console.log('✅ Database connected successfully:', dbName);
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    /**
     * 获取数据库实例
     * 如果数据库未初始化，会自动初始化
     * @returns {Promise<Dexie>}
     */
    async getDatabase() {
        if (!this.isConnected) {
            await this.initialize();
        }
        return this.db;
    }

    /**
     * 关闭数据库连接
     */
    async close() {
        if (this.db && this.isConnected) {
            try {
                await this.db.close();
                this.db = null;
                this.isConnected = false;
                console.log('✅ Database connection closed');
            } catch (error) {
                console.error('❌ Failed to close database:', error);
            }
        }
    }
}

// 创建数据库连接管理器实例
export const databaseConnection = new DatabaseConnection();