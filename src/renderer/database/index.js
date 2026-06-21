import Dexie from 'dexie'

// IndexedDB 数据库名称：当前应用所有 renderer 本地数据都挂在该库下。
const BASE_DATABASE_NAME = 'OtherRedisClientDB'

/**
 * 获取当前运行环境使用的 IndexedDB 数据库名称。
 *
 * 开发环境单独追加 _dev，避免调试数据污染正式包中的用户数据。
 *
 * @returns {string} 当前环境对应的 IndexedDB 数据库名称
 */
const getDatabaseName = () => {
    if (import.meta.env.DEV) {
        return `${BASE_DATABASE_NAME}_dev`
    }

    return BASE_DATABASE_NAME
}

const DATABASE_NAME = getDatabaseName()

// 连接配置表名：repository 层也会使用该名称访问表。
export const CONNECTION_CONFIG_TABLE_NAME = 'connection_configs'

// 数据库 schema：只声明实际使用的主键、排序字段和唯一性检查索引。
const DATABASE_SCHEMA = {
    [CONNECTION_CONFIG_TABLE_NAME]: '++id, group_name, [name+group_name]'
}

/**
 * IndexedDB 数据库连接管理器。
 * 使用 Dexie.js 管理数据库初始化、表结构声明和连接复用。
 */
class DatabaseConnection {
    constructor() {
        // Dexie 数据库实例：首次 getDatabase 时懒初始化。
        this.db = null

        // 数据库连接状态：避免每次 repository 调用都重复打开数据库。
        this.isConnected = false

        // 初始化 Promise：防止多个组件同时请求数据库时重复执行 initialize。
        this.initializePromise = null
    }

    /**
     * 初始化数据库连接。
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isConnected) {
            return
        }

        if (this.initializePromise) {
            return this.initializePromise
        }

        this.initializePromise = this.openDatabase()

        try {
            await this.initializePromise
        } finally {
            this.initializePromise = null
        }
    }

    /**
     * 创建并打开 Dexie 数据库。
     *
     * @returns {Promise<void>}
     */
    async openDatabase() {
        this.db = new Dexie(DATABASE_NAME)

        // Dexie version 用于声明 IndexedDB 表结构；后续升级 schema 时需要递增版本号。
        this.db.version(1).stores(DATABASE_SCHEMA)

        await this.db.open()
        this.isConnected = true
    }

    /**
     * 获取数据库实例。
     * 如果数据库尚未初始化，会先完成初始化再返回。
     *
     * @returns {Promise<Dexie>} Dexie 数据库实例
     */
    async getDatabase() {
        if (!this.isConnected) {
            await this.initialize()
        }

        return this.db
    }

    /**
     * 关闭数据库连接。
     * 应用退出或测试清理时可调用；Dexie close 本身是同步方法，这里保留 async 以统一调用形式。
     */
    async close() {
        if (!this.db || !this.isConnected) {
            return
        }

        this.db.close()
        this.db = null
        this.isConnected = false
    }
}

// 数据库连接单例：renderer 内所有 repository 共享同一个 Dexie 实例。
export const databaseConnection = new DatabaseConnection()
