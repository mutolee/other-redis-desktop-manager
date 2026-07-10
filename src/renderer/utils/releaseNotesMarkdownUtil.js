/*
 * releaseNotesMarkdownUtil.js
 * 描述：提供 GitHub Release Notes 的轻量 Markdown 渲染能力，供更新弹窗展示版本说明。
 */

/**
 * 转义 Markdown 原始文本，确保渲染为 HTML 时不会执行外部传入的标签或脚本。
 *
 * @param {string} value - 原始文本
 * @returns {string} 转义后的 HTML 文本
 */
const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * 渲染行内 Markdown 语法。
 * 目前只支持更新说明常用的行内代码和粗体，避免为了弹窗展示引入完整 Markdown 依赖。
 *
 * @param {string} value - 已转义的单行文本
 * @returns {string} 行内 Markdown 转换后的 HTML
 */
const renderInlineMarkdown = (value) => value
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

/**
 * 将 GitHub Release Markdown 转成弹窗可展示的轻量 HTML。
 * 支持标题、列表和普通段落，覆盖当前更新说明的主要排版场景。
 *
 * @param {string} releaseNotes - GitHub Release body
 * @param {string} emptyText - Release Notes 为空时展示的兜底文案
 * @returns {string} 可安全渲染的 HTML 片段
 */
export const renderReleaseNotesMarkdown = (releaseNotes, emptyText = '') => {
    const normalizedNotes = String(releaseNotes || '').trim()

    if (!normalizedNotes) {
        return `<p>${escapeHtml(emptyText)}</p>`
    }

    const htmlParts = []
    let listItems = []

    /**
     * 收束连续列表项，保证遇到标题、段落或空行时生成完整 ul 结构。
     */
    const flushList = () => {
        if (listItems.length === 0) {
            return
        }

        htmlParts.push(`<ul>${listItems.join('')}</ul>`)
        listItems = []
    }

    for (const rawLine of normalizedNotes.split(/\r?\n/)) {
        const line = rawLine.trim()

        if (!line) {
            flushList()
            continue
        }

        if (line.startsWith('### ')) {
            flushList()
            htmlParts.push(`<h3>${renderInlineMarkdown(escapeHtml(line.slice(4)))}</h3>`)
            continue
        }

        if (line.startsWith('## ')) {
            flushList()
            htmlParts.push(`<h2>${renderInlineMarkdown(escapeHtml(line.slice(3)))}</h2>`)
            continue
        }

        if (line.startsWith('# ')) {
            flushList()
            htmlParts.push(`<h2>${renderInlineMarkdown(escapeHtml(line.slice(2)))}</h2>`)
            continue
        }

        if (/^[-*]\s+/.test(line)) {
            listItems.push(`<li>${renderInlineMarkdown(escapeHtml(line.replace(/^[-*]\s+/, '')))}</li>`)
            continue
        }

        flushList()
        htmlParts.push(`<p>${renderInlineMarkdown(escapeHtml(line))}</p>`)
    }

    flushList()
    return htmlParts.join('')
}