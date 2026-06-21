/**
 * View Transition 主题切换工具。
 * 负责用 CSS View Transitions API 实现 Element Plus 官网风格的圆形主题切换动画。
 *
 * 设计目标：
 * - 变亮：亮色新画面从点击位置向外扩散。
 * - 变暗：暗色新画面已经在底层完成切换，旧的亮色画面从外向点击位置收缩，形成“暗色吞噬白色”的效果。
 * - 不支持 View Transitions API 时直接执行 changeFn，保证功能可用。
 *
 * 用法：
 *   applyThemeTransition(() => {
 *     store.setTheme('dark')
 *   }, clickEvent)
 *
 * @param {Function} changeFn - 同步变更主题 DOM 状态的回调，例如 setTheme('dark')
 * @param {MouseEvent|{clientX:number, clientY:number}} [clickEvent] - 动画圆心坐标来源
 */

// View Transition 基础 CSS 只需要注入一次，避免每次切换都重复创建 style。
let cssInjected = false

/**
 * 懒注入 View Transition 基础样式。
 * 禁用默认动画和 mix-blend-mode，避免浏览器默认淡入淡出干扰自定义 clipPath 动画。
 */
const injectVTCSS = () => {
    if (cssInjected) {
        return
    }

    cssInjected = true

    const style = document.createElement('style')
    style.textContent = `
::view-transition-old(root) { animation: none; mix-blend-mode: normal; }
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
`
    document.head.appendChild(style)

    // 方向覆盖 style 用于变暗时临时调整 old/new 截图层级。
    makeDirStyle()
}

// 当前切换方向需要的临时样式节点，复用同一个节点避免频繁创建 DOM。
let dirStyleEl = null

/**
 * 创建方向覆盖样式节点。
 */
const makeDirStyle = () => {
    if (dirStyleEl) {
        return
    }

    dirStyleEl = document.createElement('style')
    dirStyleEl.id = 'vt-dir-override'
    document.head.appendChild(dirStyleEl)
}

/**
 * 按点击坐标执行主题切换动画。
 *
 * @param {Function} changeFn - 同步修改主题 class / store 状态的函数
 * @param {MouseEvent|{clientX:number, clientY:number}} clickEvent - 点击事件或坐标对象
 */
export const applyThemeTransition = (changeFn, clickEvent) => {
    injectVTCSS()

    // 浏览器不支持 API、没有点击坐标时直接降级，避免主题切换失效。
    if (!document.startViewTransition || !clickEvent) {
        changeFn()
        return
    }

    const x = clickEvent.clientX
    const y = clickEvent.clientY

    // 坐标异常时不做动画，直接切换主题。
    if (typeof x !== 'number' || typeof y !== 'number') {
        changeFn()
        return
    }

    // 计算覆盖整个视口所需的圆半径，保证圆形裁剪能完整覆盖四角。
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    )

    if (!endRadius || endRadius <= 0) {
        changeFn()
        return
    }

    // startViewTransition 执行前记录旧主题，用于判断本次是变亮还是变暗。
    const wasDark = document.documentElement.classList.contains('dark')

    // changeFn 必须同步修改 DOM 状态，浏览器会自动捕获 old/new 两张 root 截图。
    const transition = document.startViewTransition(() => {
        changeFn()
    })

    transition.ready.then(() => {
        if (wasDark) {
            // 变亮：new(root) 是亮色新画面，让它从点击点向外扩散。
            // 此时不需要层级覆盖，清空上一次变暗可能留下的 z-index 规则。
            dirStyleEl.textContent = ''
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0 at ${x}px ${y}px)`,
                        `circle(${endRadius}px at ${x}px ${y}px)`
                    ]
                },
                {
                    duration: 750,
                    easing: 'ease-out',
                    fill: 'forwards',
                    pseudoElement: '::view-transition-new(root)'
                }
            )
        } else {
            // 变暗：new(root) 是已经切好的暗色画面，old(root) 是亮色旧画面。
            // 把 old 放到上层并逐渐缩小，底层暗色就会从四周向点击点“吞噬”亮色。
            dirStyleEl.textContent = `
::view-transition-old(root) { z-index: 2 !important; }
::view-transition-new(root) { z-index: 1 !important; }
`
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(${endRadius}px at ${x}px ${y}px)`,
                        `circle(0 at ${x}px ${y}px)`
                    ]
                },
                {
                    duration: 750,
                    easing: 'ease-out',
                    fill: 'forwards',
                    pseudoElement: '::view-transition-old(root)'
                }
            )
        }
    })

    // 用户快速切换、浏览器取消动画等场景不需要打断业务流程，吞掉 finished reject。
    transition.finished.catch(() => {
    })
}
