/**
 * Key 导入文件读取工具。
 * 负责选择并解析 Other Redis Desktop Manager 导出的 Key JSON 文件。
 */

/**
 * 使用隐藏 input 选择 JSON 文件。
 * @returns {Promise<File|null>} 用户选择的文件
 */
const pickFileWithInput = () => new Promise((resolve) => {
    const input = document.createElement('input')

    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'
    document.body.appendChild(input)

    const cleanup = () => {
        if (document.body.contains(input)) {
            document.body.removeChild(input)
        }
    }

    input.addEventListener('change', () => {
        const file = input.files?.[0] || null
        cleanup()
        resolve(file)
    }, {once: true})
    input.addEventListener('cancel', () => {
        cleanup()
        resolve(null)
    }, {once: true})

    input.click()
})

/**
 * 选择导入文件。
 * @returns {Promise<File|null>} 用户选择的文件
 */
const pickImportFile = async () => {
    if (!window.showOpenFilePicker) {
        return await pickFileWithInput()
    }

    try {
        const [fileHandle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
                description: 'JSON file',
                accept: {
                    'application/json': ['.json']
                }
            }]
        })

        return await fileHandle.getFile()
    } catch (error) {
        return error.name === 'AbortError' ? null : Promise.reject(error)
    }
}

/**
 * 读取并解析 Key 导入文件。
 * @returns {Promise<Object|null>} 解析后的导入数据，用户取消时返回 null
 */
export const readKeyImportFile = async () => {
    const file = await pickImportFile()

    if (!file) {
        return null
    }

    return JSON.parse(await file.text())
}
