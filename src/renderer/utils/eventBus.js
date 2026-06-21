import mitt from 'mitt'

/**
 * Renderer 进程事件总线。
 * 用于低频跨组件事件，例如打开弹窗、刷新连接列表、切换侧边栏等。
 */
export const eventBus = mitt()
