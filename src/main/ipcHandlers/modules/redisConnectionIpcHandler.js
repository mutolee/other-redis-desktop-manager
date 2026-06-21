import {ipcMain} from 'electron'
// import Redis from 'ioredis' // 暂时注释，等实现真正功能时再启用
import {getMainWindow} from "../../windows/mainWindow.js";

/**
 * Redis 连接管理器
 * 管理所有活跃的 Redis 连接
 */
class RedisConnectionManager {
    constructor() {
        // 存储所有活跃的连接，key 为连接配置 ID
        this.connections = new Map();
    }

    /**
     * 测试连接
     * @param {Object} config - 连接配置对象
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection(config) {
        try {
            // TODO: 实现真正的连接测试逻辑
            // const redis = new Redis({
            //     host: config.host,
            //     port: config.port,
            //     password: config.password,
            //     db: config.db_index || 0,
            //     connectTimeout: 30000,
            //     lazyConnect: true
            // });
            // await redis.connect();
            // await redis.ping();
            // await redis.quit();

            // 模拟测试成功
            return {
                success: true,
                message: '连接测试成功',
                latency: Math.floor(Math.random() * 10 * 5000) + 10 // 模拟延迟
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || '连接测试失败'
            };
        }
    }

    /**
     * 创建 Redis 连接
     * 如果连接已存在，会自动关闭旧连接并创建新连接
     * 连接状态变化通过事件通知渲染进程，不返回结果
     * @param {string} connectionId - 连接配置 ID
     * @param {Object} config - 连接配置对象
     * @returns {Promise<void>}
     */
    async createConnection(connectionId, config) {
        try {
            // 检查连接是否已存在，如果存在则先清理旧连接
            const existingConnection = this.connections.get(connectionId);

            if (existingConnection) {
                console.log(`检测到已存在的连接 [${connectionId}], 状态: ${existingConnection.status}，将关闭旧连接并创建新连接`);

                // TODO: 实现真正的清理逻辑
                // if (existingConnection.redis) {
                //     // 移除所有事件监听器，防止：
                //     // 1. 内存泄漏
                //     // 2. 关闭后的连接对象继续触发事件回调，导致状态更新混乱
                //     existingConnection.redis.removeAllListeners();
                //     // 关闭旧连接
                //     try {
                //         await existingConnection.redis.quit();
                //     } catch (err) {
                //         // 如果连接已经断开，忽略错误
                //         console.warn(`关闭旧连接时出错 [${connectionId}]:`, err.message);
                //     }
                // }

                // 从 Map 中移除旧连接
                this.connections.delete(connectionId);
            }

            // 标记是否是重新连接
            const isReconnect = !!existingConnection;

            // TODO: 实现真正的 Redis 连接逻辑
            // const redis = new Redis({
            //     host: config.host,
            //     port: config.port,
            //     password: config.password,
            //     db: config.db_index || 0,
            //     retryStrategy: (times) => {
            //         // 重试策略
            //         if (times > 3) {
            //             this.updateConnectionStatus(connectionId, 'error', '连接重试次数超限', new Error('重试次数超限'));
            //             return null; // 停止重试
            //         }
            //         return Math.min(times * 200, 2000);
            //     },
            //     maxRetriesPerRequest: 3,
            //     // ... 其他配置
            // });

            // 设置事件监听器
            // redis.on('connect', () => {
            //     // TCP 连接已建立，但还不能执行命令
            //     this.updateConnectionStatus(connectionId, 'connecting', 'TCP连接已建立');
            // });

            // redis.on('ready', () => {
            //     // Redis 连接完全就绪，可以执行命令了（这才是真正的连接成功）
            //     const message = isReconnect ? '重新连接成功' : '连接成功';
            //     this.updateConnectionStatus(connectionId, 'connected', message);
            // });

            // redis.on('error', (error) => {
            //     console.error(`Redis连接错误 [${connectionId}]:`, error);
            //     this.updateConnectionStatus(connectionId, 'error', '连接发生错误', error);
            // });

            // redis.on('close', () => {
            //     console.log(`Redis连接关闭 [${connectionId}]`);
            //     this.updateConnectionStatus(connectionId, 'disconnected', '连接已关闭');
            // });

            // redis.on('end', () => {
            //     console.log(`Redis连接结束 [${connectionId}]`);
            //     this.updateConnectionStatus(connectionId, 'disconnected', '连接已结束');
            // });

            // redis.on('reconnecting', (delay) => {
            //     console.log(`Redis正在重连 [${connectionId}], 延迟: ${delay}ms`);
            //     this.updateConnectionStatus(connectionId, 'reconnecting', `正在重连，延迟 ${delay}ms`);
            // });

            // 模拟异步连接过程（实际连接是异步的）
            // 1. 先创建连接对象（模拟 connect 事件）
            const mockConnection = {
                id: connectionId,
                config: config,
                status: 'connecting', // 初始状态为连接中
                connectedAt: null,
                lastStatusChange: new Date().toISOString(),
                // redis: redis // 实际连接对象
            };
            this.connections.set(connectionId, mockConnection);

            // 通知连接中状态
            this.updateConnectionStatus(connectionId, 'connecting', '正在连接...');

            // 2. 模拟网络延迟，等待连接建立（模拟 ready 事件前的等待）
            // 随机延迟 50-500ms，模拟真实的网络连接延迟
            const delay = Math.floor(Math.random() * 10 * 500) + 50;
            await new Promise(resolve => setTimeout(resolve, delay));

            // 3. 模拟连接可能失败（50% 概率失败）
            if (Math.random() < 0.5) {
                const error = new Error('连接超时或服务器拒绝连接');
                error.code = 'ECONNREFUSED';
                throw error;
            }

            // 4. 连接就绪，更新状态（模拟 ready 事件）
            mockConnection.status = 'connected';
            mockConnection.connectedAt = new Date().toISOString();
            mockConnection.lastStatusChange = new Date().toISOString();

            // 通知连接成功（等待状态更新完成）
            const message = isReconnect ? '重新连接成功' : '连接成功';
            this.updateConnectionStatus(connectionId, 'connected', message);
        } catch (error) {
            // 不抛出错误，错误信息已通过事件通知
            console.error('❌ 创建连接失败:', error);
            // 通知连接失败
            this.updateConnectionStatus(connectionId, 'error', '连接失败', error);
        }
    }

    /**
     * 关闭指定连接
     * @param {string} connectionId - 连接配置 ID
     * @returns {Promise<Object>} 关闭结果
     */
    async closeConnection(connectionId) {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                return {
                    success: false,
                    error: '连接不存在'
                };
            }

            // TODO: 实现真正的关闭逻辑
            // if (connection.redis) {
            //     // 移除所有事件监听器，防止：
            //     // 1. 内存泄漏
            //     // 2. 关闭后的连接对象继续触发事件回调，导致状态更新混乱
            //     connection.redis.removeAllListeners();
            //     // 关闭连接
            //     try {
            //         await connection.redis.quit();
            //     } catch (err) {
            //         // 如果连接已经断开，忽略错误
            //         console.warn(`关闭连接时出错 [${connectionId}]:`, err.message);
            //     }
            // }

            // 更新状态并通知
            this.updateConnectionStatus(connectionId, 'disconnected', '连接已关闭');

            this.connections.delete(connectionId);

            return {
                success: true,
                message: '连接已关闭'
            };
        } catch (error) {
            this.updateConnectionStatus(connectionId, 'error', '关闭连接失败', error);
            return {
                success: false,
                error: error.message || '关闭连接失败'
            };
        }
    }

    /**
     * 执行 Redis 命令
     * @param {string} connectionId - 连接配置 ID
     * @param {string} command - Redis 命令
     * @param {Array} args - 命令参数
     * @returns {Promise<Object>} 执行结果
     */
    async executeCommand(connectionId, command, args = []) {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                return {
                    success: false,
                    error: '连接不存在，请先建立连接'
                };
            }

            // 检查连接状态
            if (connection.status !== 'connected') {
                return {
                    success: false,
                    error: `连接状态异常: ${connection.status}`
                };
            }

            // TODO: 实现真正的命令执行逻辑
            // try {
            //     const result = await connection.redis.call(command, ...args);
            //     return {
            //         success: true,
            //         data: {
            //             command: command,
            //             args: args,
            //             result: result,
            //             timestamp: new Date().toISOString()
            //         }
            //     };
            // } catch (error) {
            //     // 检查是否是连接错误
            //     if (error.message.includes('Connection') || 
            //         error.message.includes('ECONNREFUSED') ||
            //         error.message.includes('ETIMEDOUT') ||
            //         error.message.includes('ENOTFOUND')) {
            //         this.updateConnectionStatus(connectionId, 'disconnected', '连接已断开', error);
            //     }
            //     throw error;
            // }

            // 模拟命令执行结果
            const mockResult = {
                command: command,
                args: args,
                result: `模拟执行: ${command} ${args.join(' ')}`,
                timestamp: new Date().toISOString()
            };

            return {
                success: true,
                data: mockResult
            };
        } catch (error) {
            // 检查是否是连接错误
            const isConnectionError = error.message && (
                error.message.includes('Connection') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('disconnected')
            );

            if (isConnectionError) {
                this.updateConnectionStatus(connectionId, 'disconnected', '连接已断开', error);
            }

            return {
                success: false,
                error: error.message || '命令执行失败'
            };
        }
    }

    /**
     * 切换数据库
     * @param {string} connectionId - 连接配置 ID
     * @param {number} dbIndex - 数据库索引
     * @returns {Promise<Object>} 切换结果
     */
    async selectDatabase(connectionId, dbIndex) {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection || connection.status !== 'connected') {
                return {
                    success: false,
                    error: '连接不存在'
                };
            }

            // TODO: 实现真正的数据库切换逻辑
            // await connection.redis.select(dbIndex);
            // connection.config.db_index = dbIndex;

            connection.config.db_index = dbIndex;

            return {
                success: true,
                message: `已切换到数据库 ${dbIndex}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || '切换数据库失败'
            };
        }
    }

    /**
     * 向渲染进程发送连接状态变化事件
     * @param {string} connectionId - 连接配置 ID
     * @param {string} status - 连接状态 ('connected', 'disconnected', 'error', 'reconnecting', 'connecting')
     * @param {string} message - 状态消息
     * @param {Error} error - 错误对象（如果有）
     */
    notifyConnectionStatusChange(connectionId, status, message, error = null) {
        const mainWindow = getMainWindow();
        if (mainWindow && mainWindow.win && mainWindow.win.webContents) {
            mainWindow.win.webContents.send('redis:connection-status-changed', {
                connectionId,
                status,
                message,
                error: error ? {
                    message: error.message,
                    code: error.code || null
                } : null,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 更新连接状态
     * @param {string} connectionId - 连接配置 ID
     * @param {string} status - 新状态（connected, disconnected, error, reconnecting, connecting）
     * @param {string} message - 状态消息
     * @param {Error} error - 错误对象（如果有）
     */
    updateConnectionStatus(connectionId, status, message, error = null) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.status = status;
            connection.lastStatusChange = new Date().toISOString();
            if (error) {
                connection.lastError = {
                    message: error.message,
                    code: error.code || null,
                    timestamp: new Date().toISOString()
                };
            }
        }
        // 通知渲染进程
        this.notifyConnectionStatusChange(connectionId, status, message, error);
    }
}

// 创建全局连接管理器实例
const connectionManager = new RedisConnectionManager();

/**
 * 注册 Redis 连接管理相关的 IPC 处理函数
 * 提供 Redis 连接、命令执行等功能
 */
export default () => {

    /**
     * 测试连接
     * @param {Object} config - 连接配置对象
     * @returns {Promise<Object>} 测试结果
     */
    ipcMain.handle('redis:testConnection', async (event, config) => {
        return await connectionManager.testConnection(config);
    });

    /**
     * 创建连接
     * 如果连接已存在，会自动关闭旧连接并创建新连接
     * 连接状态变化通过事件通知渲染进程，不返回结果
     * @param {string} connectionId - 连接配置 ID
     * @param {Object} config - 连接配置对象
     * @returns {Promise<void>}
     */
    ipcMain.handle('redis:connect', async (event, connectionId, config) => {
        await connectionManager.createConnection(connectionId, config);
    });

    /**
     * 关闭连接
     * @param {string} connectionId - 连接配置 ID
     * @returns {Promise<Object>} 关闭结果
     */
    ipcMain.handle('redis:disconnect', async (event, connectionId) => {
        return await connectionManager.closeConnection(connectionId);
    });

    /**
     * 执行 Redis 命令
     * @param {string} connectionId - 连接配置 ID
     * @param {string} command - Redis 命令
     * @param {Array} args - 命令参数
     * @returns {Promise<Object>} 执行结果
     */
    ipcMain.handle('redis:execute-command', async (event, connectionId, command, args = []) => {
        return await connectionManager.executeCommand(connectionId, command, args);
    });

    /**
     * 切换数据库
     * @param {string} connectionId - 连接配置 ID
     * @param {number} dbIndex - 数据库索引
     * @returns {Promise<Object>} 切换结果
     */
    ipcMain.handle('redis:select-database', async (event, connectionId, dbIndex) => {
        return await connectionManager.selectDatabase(connectionId, dbIndex);
    });
}