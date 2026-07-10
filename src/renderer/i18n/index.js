/**
 * 渲染进程轻量国际化入口。
 * 当前先覆盖系统设置页和 Element Plus 组件语言，后续业务页面可继续向 messages 中补充 key。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { useUserSettingsStore } from '../stores/modules/userSettingsStore.js'

// Element Plus 语言包映射：通过 el-config-provider 动态切换内置组件文案。
const ELEMENT_PLUS_LOCALES = {
    'zh-CN': zhCn,
    'en-US': en
}

// 应用文案字典：按模块分组，避免组件里散落硬编码翻译。
const MESSAGES = {
    'zh-CN': {
        common: {
            cancel: '取消',
            confirm: '确定',
            reset: '重置为默认值',
            unknownError: '未知错误'
        },
        router: {
            splash: {
                title: '启动中...',
                description: 'Redis 客户端管理工具'
            },
            main: {
                title: '首页',
                description: 'Redis 客户端管理工具'
            }
        },
        stores: {
            connectionConfigs: {
                ungrouped: '未分组'
            }
        },
        utils: {
            connectConfigImport: {
                unnamedConnection: '未命名连接',
                importNameSuffix: '导入',
                messages: {
                    selectJsonFile: '请选择 JSON 格式的文件',
                    arrayRequired: '导入文件格式错误：数据必须是数组格式',
                    emptyFile: '导入文件为空',
                    importFail: '导入失败: {value}',
                    readFail: '文件读取失败',
                    invalidJson: 'JSON 文件格式错误，请检查文件内容',
                    itemImportFail: '第 {index} 条配置导入失败: {value}',
                    importSuccess: '成功导入 {value} 个连接配置',
                    renameSummary: '，{value} 个已重命名',
                    failSummary: '，{value} 个导入失败',
                    noSuccess: '没有成功导入任何配置',
                    moreErrors: '还有 {value} 个错误未展示'
                }
            }
        },
        database: {
            connectionConfig: {
                validationFailed: '数据验证失败: {value}',
                duplicateNameInGroup: '分组 "{group}" 中已存在名称为 "{name}" 的连接配置',
                oldGroupNameRequired: '旧分组名称不能为空',
                newGroupNameRequired: '新分组名称不能为空',
                validation: {
                    groupNameRequired: '分组名称不能为空',
                    nameRequired: '连接名称不能为空',
                    hostRequired: '主机地址不能为空',
                    portRange: '端口号必须在 1-65535 之间',
                    sshHostRequired: '启用 SSH 隧道时，SSH 主机地址不能为空',
                    sshPortRange: 'SSH 端口号必须在 1-65535 之间',
                    sshUsernameRequired: '启用 SSH 隧道时，SSH 用户名不能为空',
                    sentinelMasterRequired: '启用哨兵模式时，主节点名称不能为空'
                }
            }
        },
        time: {
            invalid: '无效时间',
            neverConnected: '从未连接',
            justNow: '刚刚',
            minutesAgo: '{value}分钟前',
            hoursAgo: '{value}小时前',
            yesterday: '昨天',
            daysAgo: '{value}天前',
            weeksAgo: '{value}周前',
            monthsAgo: '{value}个月前'
        },
        settings: {
            title: '应用设置',
            tabs: {
                general: '常规',
                appearance: '外观',
                connection: '连接',
                other: '其他'
            },
            generalTitle: '常规设置',
            generalDesc: '配置应用的基本选项',
            language: '界面语言',
            languageDesc: '选择应用的显示语言',
            appearanceTitle: '外观设置',
            appearanceDesc: '自定义应用的外观和主题',
            theme: '主题模式',
            themeDesc: '选择浅色或深色主题',
            themeLight: '浅色',
            themeDark: '深色',
            color: '主题色',
            colorDesc: '选择应用的主色调',
            colors: {
                default: '默认',
                pink: '优雅粉',
                purple: '商务紫',
                orange: '活力橙',
                green: '清新绿',
                business: '商务黑',
                cyan: '靛青蓝',
                brown: '咖啡棕',
                blue: '科技蓝'
            },
            sidebarCollapse: '侧边栏折叠',
            sidebarCollapseDesc: '启动时默认折叠侧边栏',
            closePrompt: '关闭时提示',
            closePromptDesc: '关闭应用时是否显示确认提示',
            closeToTray: '关闭时最小化到托盘',
            closeToTrayDesc: '关闭窗口时最小化到系统托盘，而不是退出应用',
            connectionTitle: '连接设置',
            connectionDesc: '配置 Redis 连接的默认行为',
            connectTimeout: '连接超时',
            connectTimeoutDesc: '建立连接的最大等待时间',
            commandTimeout: '命令超时',
            commandTimeoutDesc: '单条 Redis 命令的最大执行时间',
            scanCount: '扫描数量',
            scanCountDesc: 'Key 列表每次 SCAN 的默认数量',
            otherTitle: '其他设置',
            otherDesc: '配置应用的其他选项',
            resetSettings: '重置设置',
            resetSettingsDesc: '将所有设置恢复为默认值',
            developerMode: '开发者模式',
            developerModeDesc: '开启开发者模式，显示更多调试信息。',
            developerShortcut: '快捷键：Ctrl/Command + Shift + I',
            versionInfo: '版本信息',
            versionCheck: '版本检查',
            update: {
                foundTitle: '发现新版本',
                foundMessage: '当前版本：V{current}\n最新版本：V{latest}',
                releaseNotesTitle: '更新内容：',
                noReleaseNotes: '该版本暂无更新说明。',
                updateNow: '去更新',
                noUpdate: '当前已是最新版本：V{value}',
                checkFail: '检查更新失败',
                openReleaseFail: '打开 Release 页面失败'
            },
            resetConfirmMessage: '确定要重置所有设置为默认值吗？此操作不可撤销。',
            resetConfirmTitle: '确认重置',
            resetSuccess: '设置已重置为默认值'
        },
        welcome: {
            title: '欢迎使用 Redis 客户端',
            description: '请从左侧选择一个连接，或创建新的连接开始使用',
            actions: {
                createTitle: '创建新连接',
                createDesc: '添加新的 Redis 数据库连接',
                importTitle: '导入连接',
                importDesc: '从文件导入连接配置',
                settingsTitle: '应用设置',
                settingsDesc: '配置应用偏好和选项'
            },
            recentTitle: '最近连接',
            recentEmpty: '还没有连接过 Redis 数据库',
            tipsTitle: '使用提示',
            tips: {
                connect: '点击左侧连接名称可以快速连接到 Redis 服务器',
                folders: '使用文件夹可以更好地组织和管理您的连接',
                sslCluster: '支持 SSL 加密连接和 Redis 集群模式'
            }
        },
        connectionDialog: {
            createTitle: '创建新连接',
            editTitle: '编辑连接',
            copySuffix: '副本',
            tipTitle: '提示',
            tabs: {
                basic: '基础信息',
                ssh: 'SSH隧道',
                ssl: 'SSL/TLS',
                cluster: '集群模式'
            },
            sections: {
                basic: '基础连接信息',
                ssh: 'SSH隧道配置',
                ssl: 'SSL/TLS加密配置',
                cluster: '集群模式配置'
            },
            fields: {
                groupName: '分组名称',
                connectionName: '连接名称',
                host: '主机地址',
                port: '端口',
                username: '用户名',
                password: '密码',
                keySeparator: '键分隔符',
                sshHost: 'SSH主机',
                sshUsername: 'SSH用户名',
                sshPort: 'SSH端口',
                authType: '认证方式',
                sshPassword: 'SSH密码',
                privateKeyPath: '私钥路径',
                privateKeyPassword: '私钥密码',
                caCert: 'CA证书',
                clientCert: '客户端证书',
                clientKey: '客户端私钥',
                masterName: '主节点名称',
                masterPassword: '主节点密码'
            },
            placeholders: {
                groupName: '请输入分组名称',
                connectionName: '请输入连接名称',
                username: '可选，Redis ACL用户名',
                password: '可选，Redis密码',
                sshHost: 'SSH服务器地址',
                sshUsername: 'SSH用户名',
                sshPassword: 'SSH密码',
                privateKeyPath: '私钥文件路径',
                privateKeyPassword: '私钥密码（可选）',
                caCert: 'CA证书文件路径',
                clientCert: '客户端证书文件路径',
                clientKey: '客户端私钥文件路径',
                masterName: '哨兵主节点名称',
                masterPassword: '哨兵主节点密码'
            },
            options: {
                enableSsh: '启用SSH隧道',
                enableSsl: '启用SSL/TLS加密',
                enableSentinel: '启用哨兵模式',
                enableCluster: '启用集群模式',
                passwordAuth: '密码认证',
                privateKeyAuth: '私钥认证'
            },
            tips: {
                sshUnavailable: 'SSH隧道功能暂未实现，功能开发ing，强行使用无效！',
                sslUnavailable: 'SSL/TLS加密连接暂未实现，功能开发ing，强行使用无效！',
                clusterUnavailable: '集群模式配置暂未实现，功能开发ing，强行使用无效！',
                sentinelMasterPassword: '哨兵主节点的密码，如果为空，将使用基本信息中的密码。'
            },
            actions: {
                test: '测试连接',
                create: '创建连接',
                update: '更新连接'
            },
            messages: {
                createSuccess: '连接配置创建成功',
                createFail: '创建连接配置失败: ',
                updateSuccess: '连接配置更新成功',
                updateFail: '更新连接配置失败: ',
                missingId: '连接配置ID不存在',
                testing: '正在测试连接...',
                testSuccess: '测试连接成功',
                testFail: '测试连接失败: ',
                connectionError: '连接错误',
                unknownError: '未知错误'
            },
            validation: {
                groupNameRequired: '请输入分组名称',
                connectionNameRequired: '请输入连接名称',
                hostRequired: '请输入主机地址',
                portRequired: '请输入端口号',
                portRange: '端口号必须在1-65535之间',
                sshHostRequired: '请输入SSH主机地址',
                sshPortRequired: '请输入SSH端口号',
                sshPortRange: 'SSH端口号必须在1-65535之间',
                sshUsernameRequired: '请输入SSH用户名',
                sentinelMasterRequired: '请输入哨兵主节点名称'
            }
        },
        redisInfo: {
            title: 'Redis 详情',
            currentConnection: '当前连接',
            refresh: '刷新',
            fetchFail: '获取 Redis 详情失败: ',
            unknownError: '未知错误',
            overview: {
                version: 'Redis 版本',
                mode: '运行模式',
                uptime: '运行时间',
                clients: '已连接客户端',
                uptimeDays: '{value} 天'
            },
            sections: {
                status: '状态信息',
                memory: '内存信息',
                cpu: 'CPU 信息',
                keyspace: 'Keyspace',
                infoAll: 'INFO 全量信息'
            },
            status: {
                role: '角色',
                processId: '进程 ID',
                port: '端口',
                configFile: '配置文件',
                system: '系统',
                arch: '架构',
                eventLoop: '事件循环',
                clusterStatus: '集群状态',
                enabled: '已启用',
                disabled: '未启用'
            },
            memory: {
                used: '已用内存',
                peak: '峰值内存',
                rss: 'RSS 内存',
                max: '最大内存',
                fragmentation: '内存碎片率',
                policy: '内存策略',
                unlimited: '未限制',
                free: '剩余'
            },
            cpu: {
                usage: '当前 CPU 使用率',
                system: '累计系统 CPU',
                user: '累计用户 CPU',
                childSystem: '子进程累计系统 CPU',
                childUser: '子进程累计用户 CPU',
                usageRate: '使用率'
            },
            table: {
                searchPlaceholder: '搜索 Section / Key / Value',
                empty: '暂无 INFO 数据',
                section: 'Section',
                key: 'Key',
                value: 'Value'
            }
        },
        commandDrawer: {
            actions: {
                toTop: '回到顶部',
                toBottom: '回到底部'
            },
            aria: {
                executing: '命令执行中',
                connecting: '连接进行中'
            },
            messages: {
                connecting: '正在连接命令面板：{value} ...',
                connected: '命令面板连接成功，当前数据库 DB {value}。',
                disconnected: '命令面板连接已断开。',
                noConnection: '当前没有可用连接',
                noConnectionDetail: '当前没有可用连接，请先打开一个 Redis 连接。',
                connectFirst: '请先连接数据库',
                connectionNotReady: '当前连接未就绪，请先建立连接后再执行命令。',
                emptyCommand: '命令为空，请输入后再执行。',
                commandFail: '命令执行失败',
                commandException: '命令执行异常',
                dbSwitched: '已切换到数据库 DB {value}',
                dbSwitchFail: '切换数据库失败：{value}'
            }
        },
        dialogs: {
            addKey: {
                title: '添加 Key',
                keyName: 'Key 名称',
                keyNamePlaceholder: '请输入 Key 名称',
                keyType: 'Key 类型',
                ttl: '过期时间',
                ttlTip: '秒，-1 表示永不过期',
                stringValuePlaceholder: '请输入 String 初始值',
                fieldPlaceholder: '请输入 Field',
                fieldValuePlaceholder: '请输入 Field 对应的 Value',
                writeDirection: '写入方向',
                rightPush: '右侧 RPUSH',
                leftPush: '左侧 LPUSH',
                listValuePlaceholder: '请输入 List 初始元素',
                setMemberPlaceholder: '请输入 Set 初始成员',
                zsetMemberPlaceholder: '请输入 ZSet 初始成员',
                messageId: '消息 ID',
                autoMessageIdPlaceholder: '留空则自动生成（*）',
                randomGenerate: '随机生成',
                fieldsJsonPlaceholder: '请输入 JSON 对象，例如：{"key1":"value1","key2":"value2"}',
                create: '创建',
                messages: {
                    fieldsJsonInvalid: 'Fields 必须是合法 JSON 对象，例如 {"key1":"value1"}',
                    fieldsMustObject: 'Fields 必须是 JSON 对象，不能是数组或基础值',
                    emptyFieldName: 'Fields 中不能包含空字段名',
                    keyNameRequired: '请输入 Key 名称',
                    hashFieldRequired: '请输入 Hash Field',
                    listValueRequired: '请输入 List 初始元素',
                    setMemberRequired: '请输入 Set 初始成员',
                    zsetMemberRequired: '请输入 ZSet 初始成员',
                    streamFieldRequired: '请至少输入一个 Stream Field',
                    commandFail: '{value} 执行失败',
                    keyExists: 'Key 已存在，请更换名称',
                    createSuccess: 'Key 创建成功',
                    createFail: 'Key 创建失败'
                }
            },
            closeConfirm: {
                title: '关闭确认',
                message: '您点击了关闭按钮，您想要:',
                hideToTray: '最小化到托盘',
                quit: '退出',
                neverTipsAgain: '不再提示'
            },
            deleteConfig: {
                connectionTitle: '删除确认',
                connectionMessage: '确定要删除连接 "{value}" 吗？',
                groupTitle: '删除分组确认',
                groupMessage: '确定要删除分组 "{value}" 吗？',
                groupDescription: '该分组下共有 {value} 个连接，删除分组将同时删除这些连接。',
                groupNameRequired: '分组名称不能为空',
                delete: '删除'
            },
            contextMenu: {
                renameGroup: '重命名分组',
                deleteGroup: '删除分组',
                addConnection: '添加连接',
                editConnection: '编辑连接',
                deleteConnection: '删除连接',
                openCommand: '打开命令行',
                moveToGroup: '移动到其他分组',
                copyConnection: '复制连接',
                executeAction: '执行操作: {value}'
            },
            moveConnection: {
                title: '移动到其他分组',
                connectionName: '连接名称',
                currentGroup: '当前分组',
                targetGroup: '目标分组',
                targetPlaceholder: '请选择或输入目标分组名称',
                validation: {
                    targetRequired: '请选择目标分组'
                },
                messages: {
                    idMissing: '连接配置 ID 不存在',
                    sameGroup: '目标分组与当前分组相同',
                    connectionMissing: '连接配置不存在',
                    moveSuccess: '连接配置移动成功',
                    moveFail: '移动连接配置失败: {value}'
                }
            },
            renameGroup: {
                title: '重命名分组',
                currentName: '当前名称',
                newName: '新名称',
                newNamePlaceholder: '请输入新的分组名称',
                validation: {
                    nameRequired: '请输入分组名称',
                    nameLength: '分组名称长度在 1 到 25 个字符'
                },
                messages: {
                    sameName: '新分组名称与当前名称相同',
                    nameExists: '分组名称 "{value}" 已存在',
                    renameSuccess: '分组重命名成功，已更新 {value} 个连接配置',
                    renameFail: '重命名分组失败: {value}'
                }
            }
        },
        splash: {
            versionLoading: '加载中...',
            startupFailed: '应用启动失败...',
            loadingSteps: {
                initializing: '正在初始化应用组件',
                loadingUi: '正在加载用户界面',
                preparingConnection: '正在准备数据库连接',
                completed: '启动完成'
            }
        },
        titleBar: {
            settings: '设置',
            reload: '重新加载窗体',
            switchToLight: '切换到浅色模式',
            switchToDark: '切换到暗黑模式',
            minimize: '最小化',
            maximizeRestore: '最大化/还原',
            close: '关闭'
        },
        sideBarEmpty: {
            title: '还没有任何连接信息',
            description: '点击下方按钮创建第一个连接',
            create: '创建连接',
            import: '导入连接'
        },
        sideBarAction: {
            create: '新建连接',
            search: '搜索连接',
            import: '导入连接',
            export: '导出连接',
            cancelExport: '取消导出',
            searchPlaceholder: '搜索连接...'
        },
        sideBarFooter: {
            openSource: '开源地址'
        },
        pageNavbar: {
            closeOther: '关闭其他',
            closeLeft: '关闭左边',
            closeRight: '关闭右边',
            closeAll: '关闭全部'
        },
        pageInfo: {
            connecting: '连接中...',
            selectKeyEmpty: '从左侧选择一个 Key'
        },
        pageHeader: {
            more: '更多',
            tooltips: {
                refresh: '刷新当前连接信息',
                command: '打开命令行',
                connectionCount: '连接数量',
                cpuUsage: 'CPU使用率',
                memoryUsage: '内存使用量',
                totalKeys: '总Key数量',
                redisInfo: '查看更多Redis信息'
            },
            messages: {
                switchDbSuccess: '已切换到数据库 {value}',
                switchDbFail: '切换数据库失败',
                updateDbIndexFail: '更新数据库索引失败',
                connectFirst: '请先连接数据库',
                fetchServerInfoFail: '获取服务器信息失败'
            }
        },
        pageFailed: {
            title: '连接失败',
            description: '无法连接到 Redis 服务器，请检查连接配置是否正确',
            tips: {
                serviceLabel: '检查事项：',
                serviceText: '确认 Redis 服务是否正常运行',
                networkLabel: '网络连接：',
                networkText: '检查主机地址和端口是否正确',
                securityLabel: '安全设置：',
                securityText: '确认密码和认证信息是否正确'
            },
            actions: {
                edit: '编辑连接',
                reconnect: '重新连接'
            }
        },
        keyList: {
            searchPlaceholder: '搜索 Key...',
            exactSearch: '精准搜索',
            addKey: '添加 Key',
            listView: '列表视图',
            treeView: '树形视图',
            noMatchedKeys: '未找到匹配的 Key',
            noData: '暂无数据',
            loadMore: '加载更多',
            loadAll: '加载全部',
            messages: {
                connectFirst: '请先连接数据库',
                loadFail: '加载 Key 列表失败',
                loadAllFail: '加载全部 Key 失败'
            }
        },
        keyDetail: {
            empty: {
                selectKey: '从左侧选择一个 Key',
                missingKey: '当前 Key 不存在，可能已过期、被删除，或列表尚未刷新'
            },
            tooltips: {
                submitKeyName: '提交 Key 名称修改',
                refresh: '刷新数据',
                copyCommand: '复制命令',
                deleteKey: '删除 Key',
                closeDetail: '关闭详情',
                submitTtl: '提交 TTL 修改'
            },
            actions: {
                close: '关闭',
                delete: '删除'
            },
            confirm: {
                renameTitle: '确认重命名',
                renameMessage: '确定将 Key 重命名为 "{value}" 吗？',
                deleteTitle: '确认删除',
                deleteMessage: '确定删除 Key "{value}" 吗？'
            },
            messages: {
                fetchFail: '获取 Key 详情失败',
                checkKeyFail: '确认 Key 状态失败',
                keyMissing: '当前 Key 不存在，可能已过期或被删除',
                renameFail: '重命名 Key 失败',
                targetExists: '目标 Key 已存在，请更换名称',
                renameSuccess: '重命名成功',
                ttlFail: '修改 TTL 失败',
                ttlNotChanged: 'TTL 未修改，当前 Key 可能已过期或 TTL 状态已变化',
                ttlSuccess: 'TTL 修改成功',
                commandCopied: '命令已复制',
                copyCommandFail: '复制命令失败',
                deleteFail: '删除 Key 失败',
                deleteSuccess: '删除成功'
            }
        },
        keyDetailPanels: {
            common: {
                add: '添加',
                edit: '编辑',
                save: '保存',
                action: '操作',
                view: '查看',
                delete: '删除',
                copy: '复制',
                copyCommand: '复制',
                refresh: '刷新',
                loadMore: '加载更多',
                loadAll: '加载全部',
                valuePlaceholder: '请输入 Value',
                memberPlaceholder: '请输入 Member',
                viewMemberTitle: '查看成员',
                labels: {
                    key: 'Key',
                    field: 'Field',
                    fields: 'Fields',
                    value: 'Value',
                    member: 'Member',
                    score: 'Score',
                    index: 'Index',
                    rank: 'Rank',
                    size: 'Size',
                    ttl: 'TTL',
                    pending: 'Pending'
                },
                messages: {
                    commandFail: '{value} 执行失败',
                    commandCopied: '命令已复制',
                    copyCommandFail: '复制命令失败',
                    contentCopied: '内容已复制',
                    copyContentFail: '复制内容失败',
                    loadMoreFail: '加载更多失败',
                    loadAllFail: '加载全部失败',
                    memberExists: 'Member 已存在，请更换内容',
                    memberUnchanged: 'Member 未变化',
                    memberUpdated: '成员已更新',
                    memberAdded: '成员已添加',
                    memberMissing: 'Member 不存在或已被删除',
                    memberDeleted: '成员已删除',
                    saveSuccess: '保存成功'
                }
            },
            string: {
                messages: {
                    saveFail: '保存 String 失败'
                }
            },
            hash: {
                searchPlaceholder: '搜索 Field 或 Value',
                fieldPlaceholder: '请输入 Key',
                addTitle: '添加 Hash 字段',
                editTitle: '编辑 Hash 字段',
                viewTitle: '查看字段',
                deleteTitle: '删除 Hash 字段',
                confirmDelete: '确认删除 Field「{value}」吗？',
                messages: {
                    fieldExists: 'Field 已存在，请更换名称',
                    fieldUpdated: '字段已更新',
                    fieldAdded: '字段已添加',
                    fieldMissing: 'Field 不存在或已被删除',
                    fieldDeleted: '字段已删除',
                    saveFail: '保存 Hash 字段失败',
                    deleteFail: '删除 Hash 字段失败',
                    loadFail: '加载 Hash 数据失败'
                }
            },
            list: {
                searchPlaceholder: '搜索 Value',
                direction: '方向',
                leftPush: '左侧 LPUSH',
                rightPush: '右侧 RPUSH',
                addTitle: '添加 List 元素',
                editTitle: '编辑 List 元素',
                viewTitle: '查看元素',
                deleteTitle: '删除 List 元素',
                confirmDelete: '确认删除第 {value} 项吗？',
                messages: {
                    itemUpdated: '元素已更新',
                    itemAdded: '元素已添加',
                    itemMissing: '元素不存在或已被删除',
                    itemDeleted: '元素已删除',
                    saveFail: '保存 List 元素失败',
                    deleteFail: '删除 List 元素失败',
                    loadFail: '加载 List 数据失败'
                }
            },
            set: {
                searchPlaceholder: '搜索 Value',
                emptyMatched: '暂无匹配 Value',
                addTitle: '添加 Set 成员',
                editTitle: '编辑 Set 成员',
                deleteTitle: '删除 Set 成员',
                confirmDelete: '确认删除 Member「{value}」吗？',
                messages: {
                    saveFail: '保存 Set 成员失败',
                    deleteFail: '删除 Set 成员失败',
                    loadFail: '加载 Set 数据失败'
                }
            },
            zset: {
                searchPlaceholder: '搜索 Score 或 Member',
                addTitle: '添加 ZSet 成员',
                editTitle: '编辑 ZSet 成员',
                deleteTitle: '删除 ZSet 成员',
                confirmDelete: '确认删除 Member「{value}」吗？',
                messages: {
                    saveFail: '保存 ZSet 成员失败',
                    deleteFail: '删除 ZSet 成员失败',
                    loadFail: '加载 ZSet 数据失败'
                }
            },
            stream: {
                minId: '最小 ID',
                maxId: '最大 ID',
                messageId: '消息 ID',
                addEntryTitle: '添加 Stream Entry',
                viewEntryTitle: '查看 Stream Entry',
                autoMessageIdPlaceholder: '留空则自动生成（*）',
                randomGenerate: '随机生成',
                fieldsJsonPlaceholder: '请输入 JSON 对象，例如：{"key1":"value1","key2":"value2"}',
                groupsAndConsumers: '消费组与消费者',
                consumerGroups: 'Consumer Groups',
                groupName: 'Group 名称',
                groupSearchPlaceholder: '搜索 Group Name...',
                expand: '展开',
                consumers: '消费者',
                pending: '待处理',
                lastDeliveredId: 'Last Delivered ID',
                groupLabel: 'Group: {value}',
                consumersCount: 'Consumers: {value}',
                totalPending: 'Total Pending: {value}',
                consumerName: 'Consumer Name',
                consumerLabel: 'Consumer: {value}',
                idleTime: 'Idle Time',
                deleteTitle: '删除 Stream Entry',
                confirmDelete: '确认删除 Entry「{value}」吗？',
                empty: {
                    noMatchedGroups: '未找到匹配的 Consumer Group',
                    noGroups: '当前 Stream 暂无 Consumer Group',
                    noConsumers: 'Group {value} 暂无 Consumer',
                    selectGroup: '请选择 Consumer Group'
                },
                messages: {
                    fieldsJsonInvalid: 'Fields 必须是合法 JSON 对象，例如 {"key1":"value1"}',
                    fieldsMustObject: 'Fields 必须是 JSON 对象，不能是数组或基础值',
                    emptyFieldName: 'Fields 中不能包含空字段名',
                    fieldRequired: '请至少输入一个 Stream Field',
                    loadFail: '加载 Stream 数据失败',
                    queryFail: '查询 Stream 数据失败',
                    loadGroupsFail: '加载 Stream 消费组失败',
                    loadConsumersFail: '加载 Stream 消费者失败',
                    entryAdded: 'Entry 已添加',
                    addEntryFail: '添加 Stream Entry 失败',
                    entryMissing: 'Entry 不存在或已被删除',
                    entryDeleted: 'Entry 已删除',
                    deleteEntryFail: '删除 Stream Entry 失败'
                }
            },
            unsupported: {
                empty: '当前类型暂未支持可视化查看',
                keyName: 'Key 名称',
                redisType: 'Redis 类型',
                currentStatus: '当前状态',
                commandHint: '可先在命令面板确认类型：',
                supportStatus: '连接正常，Key 已识别；只是当前版本还没有为该类型提供专用详情页。',
                descriptions: {
                    redisJson: '该 Key 看起来来自 RedisJSON，后续需要使用 JSON.GET / JSON.SET 等模块命令单独适配。',
                    timeSeries: '该 Key 看起来来自 RedisTimeSeries，时间序列数据需要按时间范围和采样规则单独展示。',
                    redisBloom: '该 Key 看起来来自 RedisBloom 系列模块，当前暂未接入对应的统计和查询命令。',
                    redisSearch: '该 Key 看起来与 RediSearch 模块相关，索引和文档结构需要单独的详情视图。',
                    default: '该类型不是当前已适配的基础 Redis 类型，软件已识别到它，但暂时不会尝试读取内容。'
                }
            }
        },
        sideBar: {
            messages: {
                exportModeSelectDisabled: '导出模式下无法选择连接',
                openConnectionFail: '打开连接失败',
                deleteConnectionSuccess: '连接配置删除成功',
                deleteConnectionFail: '删除连接配置失败',
                deleteGroupSuccess: '分组删除成功',
                deleteGroupFail: '删除分组失败',
                unknownError: '未知错误'
            }
        },
        sideBarMenu: {
            loadingConnections: '正在加载连接...',
            selectAll: '全选',
            selectNone: '取消全选',
            exportSelected: '导出选中 ({value})',
            messages: {
                selectedCount: '已选中 {value} 个配置',
                cleared: '已取消全选',
                exportEmpty: '请至少选择一个配置进行导出',
                exportSuccess: '成功导出 {value} 个配置',
                exportFail: '导出失败',
                unknownError: '未知错误',
                jsonFileDescription: 'JSON 文件'
            }
        }
    },
    'en-US': {
        common: {
            cancel: 'Cancel',
            confirm: 'OK',
            reset: 'Reset to Defaults',
            unknownError: 'Unknown error'
        },
        router: {
            splash: {
                title: 'Starting...',
                description: 'Redis client management tool'
            },
            main: {
                title: 'Home',
                description: 'Redis client management tool'
            }
        },
        stores: {
            connectionConfigs: {
                ungrouped: 'Ungrouped'
            }
        },
        utils: {
            connectConfigImport: {
                unnamedConnection: 'Unnamed Connection',
                importNameSuffix: 'Import',
                messages: {
                    selectJsonFile: 'Select a JSON file',
                    arrayRequired: 'Invalid import file format: data must be an array',
                    emptyFile: 'Import file is empty',
                    importFail: 'Import failed: {value}',
                    readFail: 'Failed to read file',
                    invalidJson: 'Invalid JSON file. Check the file content.',
                    itemImportFail: 'Failed to import profile #{index}: {value}',
                    importSuccess: 'Imported {value} connection profiles',
                    renameSummary: ', {value} renamed',
                    failSummary: ', {value} failed',
                    noSuccess: 'No profiles were imported',
                    moreErrors: '{value} more errors were not shown'
                }
            }
        },
        database: {
            connectionConfig: {
                validationFailed: 'Data validation failed: {value}',
                duplicateNameInGroup: 'A connection profile named "{name}" already exists in group "{group}"',
                oldGroupNameRequired: 'Old group name is required',
                newGroupNameRequired: 'New group name is required',
                validation: {
                    groupNameRequired: 'Group name is required',
                    nameRequired: 'Connection name is required',
                    hostRequired: 'Host is required',
                    portRange: 'Port must be between 1 and 65535',
                    sshHostRequired: 'SSH host is required when SSH tunnel is enabled',
                    sshPortRange: 'SSH port must be between 1 and 65535',
                    sshUsernameRequired: 'SSH username is required when SSH tunnel is enabled',
                    sentinelMasterRequired: 'Master name is required when Sentinel mode is enabled'
                }
            }
        },
        time: {
            invalid: 'Invalid time',
            neverConnected: 'Never connected',
            justNow: 'Just now',
            minutesAgo: '{value} min ago',
            hoursAgo: '{value} hr ago',
            yesterday: 'Yesterday',
            daysAgo: '{value} days ago',
            weeksAgo: '{value} weeks ago',
            monthsAgo: '{value} months ago'
        },
        settings: {
            title: 'Settings',
            tabs: {
                general: 'General',
                appearance: 'Appearance',
                connection: 'Connection',
                other: 'Other'
            },
            generalTitle: 'General Settings',
            generalDesc: 'Configure basic application options',
            language: 'Language',
            languageDesc: 'Choose the display language',
            appearanceTitle: 'Appearance',
            appearanceDesc: 'Customize the app appearance and theme',
            theme: 'Theme',
            themeDesc: 'Choose light or dark mode',
            themeLight: 'Light',
            themeDark: 'Dark',
            color: 'Theme Color',
            colorDesc: 'Choose the primary color',
            colors: {
                default: 'Default',
                pink: 'Elegant Pink',
                purple: 'Business Purple',
                orange: 'Vibrant Orange',
                green: 'Fresh Green',
                business: 'Business Black',
                cyan: 'Indigo Cyan',
                brown: 'Coffee Brown',
                blue: 'Tech Blue'
            },
            sidebarCollapse: 'Collapse Sidebar',
            sidebarCollapseDesc: 'Collapse the sidebar by default on startup',
            closePrompt: 'Confirm on Close',
            closePromptDesc: 'Show a confirmation dialog when closing the app',
            closeToTray: 'Minimize to Tray on Close',
            closeToTrayDesc: 'Minimize the window to the system tray instead of quitting',
            connectionTitle: 'Connection Settings',
            connectionDesc: 'Configure default Redis connection behavior',
            connectTimeout: 'Connect Timeout',
            connectTimeoutDesc: 'Maximum wait time for establishing a connection',
            commandTimeout: 'Command Timeout',
            commandTimeoutDesc: 'Maximum execution time for a Redis command',
            scanCount: 'Scan Count',
            scanCountDesc: 'Default SCAN count for the key list',
            otherTitle: 'Other Settings',
            otherDesc: 'Configure other application options',
            resetSettings: 'Reset Settings',
            resetSettingsDesc: 'Restore all settings to default values',
            developerMode: 'Developer Mode',
            developerModeDesc: 'Enable developer mode to show more debugging options.',
            developerShortcut: 'Shortcut: Ctrl/Command + Shift + I',
            versionInfo: 'Version',
            versionCheck: 'Check for Updates',
            update: {
                foundTitle: 'Update Available',
                foundMessage: 'Current version: V{current}\nLatest version: V{latest}',
                releaseNotesTitle: 'Release notes:',
                noReleaseNotes: 'No release notes for this version.',
                updateNow: 'Update',
                noUpdate: 'You are already on the latest version: V{value}',
                checkFail: 'Failed to check for updates',
                openReleaseFail: 'Failed to open the Release page'
            },
            resetConfirmMessage: 'Reset all settings to defaults? This action cannot be undone.',
            resetConfirmTitle: 'Confirm Reset',
            resetSuccess: 'Settings have been reset'
        },
        welcome: {
            title: 'Welcome to Redis Client',
            description: 'Select a connection from the sidebar or create a new one to get started',
            actions: {
                createTitle: 'Create Connection',
                createDesc: 'Add a new Redis database connection',
                importTitle: 'Import Connections',
                importDesc: 'Import connection profiles from a file',
                settingsTitle: 'Settings',
                settingsDesc: 'Configure application preferences and options'
            },
            recentTitle: 'Recent Connections',
            recentEmpty: 'No Redis database has been connected yet',
            tipsTitle: 'Tips',
            tips: {
                connect: 'Click a connection name in the sidebar to connect to a Redis server',
                folders: 'Use folders to organize and manage your connections',
                sslCluster: 'SSL connections and Redis Cluster mode are supported'
            }
        },
        connectionDialog: {
            createTitle: 'Create Connection',
            editTitle: 'Edit Connection',
            copySuffix: 'Copy',
            tipTitle: 'Tip',
            tabs: {
                basic: 'Basic',
                ssh: 'SSH Tunnel',
                ssl: 'SSL/TLS',
                cluster: 'Cluster'
            },
            sections: {
                basic: 'Basic Connection',
                ssh: 'SSH Tunnel',
                ssl: 'SSL/TLS Encryption',
                cluster: 'Cluster Mode'
            },
            fields: {
                groupName: 'Group',
                connectionName: 'Name',
                host: 'Host',
                port: 'Port',
                username: 'Username',
                password: 'Password',
                keySeparator: 'Key Separator',
                sshHost: 'SSH Host',
                sshUsername: 'SSH Username',
                sshPort: 'SSH Port',
                authType: 'Auth Type',
                sshPassword: 'SSH Password',
                privateKeyPath: 'Private Key Path',
                privateKeyPassword: 'Private Key Password',
                caCert: 'CA Certificate',
                clientCert: 'Client Certificate',
                clientKey: 'Client Private Key',
                masterName: 'Master Name',
                masterPassword: 'Master Password'
            },
            placeholders: {
                groupName: 'Enter group name',
                connectionName: 'Enter connection name',
                username: 'Optional Redis ACL username',
                password: 'Optional Redis password',
                sshHost: 'SSH server address',
                sshUsername: 'SSH username',
                sshPassword: 'SSH password',
                privateKeyPath: 'Private key file path',
                privateKeyPassword: 'Private key password (optional)',
                caCert: 'CA certificate file path',
                clientCert: 'Client certificate file path',
                clientKey: 'Client private key file path',
                masterName: 'Sentinel master name',
                masterPassword: 'Sentinel master password'
            },
            options: {
                enableSsh: 'Enable SSH Tunnel',
                enableSsl: 'Enable SSL/TLS',
                enableSentinel: 'Enable Sentinel Mode',
                enableCluster: 'Enable Cluster Mode',
                passwordAuth: 'Password',
                privateKeyAuth: 'Private Key'
            },
            tips: {
                sshUnavailable: 'SSH tunnel is not implemented yet. Enabling it will not take effect.',
                sslUnavailable: 'SSL/TLS connection is not implemented yet. Enabling it will not take effect.',
                clusterUnavailable: 'Cluster mode is not implemented yet. Enabling it will not take effect.',
                sentinelMasterPassword: 'Password of the Sentinel master node. If empty, the password from Basic will be used.'
            },
            actions: {
                test: 'Test Connection',
                create: 'Create',
                update: 'Update'
            },
            messages: {
                createSuccess: 'Connection profile created',
                createFail: 'Failed to create connection profile: ',
                updateSuccess: 'Connection profile updated',
                updateFail: 'Failed to update connection profile: ',
                missingId: 'Connection profile ID is missing',
                testing: 'Testing connection...',
                testSuccess: 'Connection test succeeded',
                testFail: 'Connection test failed: ',
                connectionError: 'Connection error',
                unknownError: 'Unknown error'
            },
            validation: {
                groupNameRequired: 'Enter group name',
                connectionNameRequired: 'Enter connection name',
                hostRequired: 'Enter host address',
                portRequired: 'Enter port',
                portRange: 'Port must be between 1 and 65535',
                sshHostRequired: 'Enter SSH host address',
                sshPortRequired: 'Enter SSH port',
                sshPortRange: 'SSH port must be between 1 and 65535',
                sshUsernameRequired: 'Enter SSH username',
                sentinelMasterRequired: 'Enter Sentinel master name'
            }
        },
        redisInfo: {
            title: 'Redis Details',
            currentConnection: 'Current Connection',
            refresh: 'Refresh',
            fetchFail: 'Failed to load Redis details: ',
            unknownError: 'Unknown error',
            overview: {
                version: 'Redis Version',
                mode: 'Mode',
                uptime: 'Uptime',
                clients: 'Connected Clients',
                uptimeDays: '{value} days'
            },
            sections: {
                status: 'Status',
                memory: 'Memory',
                cpu: 'CPU',
                keyspace: 'Keyspace',
                infoAll: 'Full INFO'
            },
            status: {
                role: 'Role',
                processId: 'Process ID',
                port: 'Port',
                configFile: 'Config File',
                system: 'System',
                arch: 'Architecture',
                eventLoop: 'Event Loop',
                clusterStatus: 'Cluster Status',
                enabled: 'Enabled',
                disabled: 'Disabled'
            },
            memory: {
                used: 'Used Memory',
                peak: 'Peak Memory',
                rss: 'RSS Memory',
                max: 'Max Memory',
                fragmentation: 'Fragmentation Ratio',
                policy: 'Memory Policy',
                unlimited: 'Unlimited',
                free: 'Free'
            },
            cpu: {
                usage: 'Current CPU Usage',
                system: 'Total System CPU',
                user: 'Total User CPU',
                childSystem: 'Child Total System CPU',
                childUser: 'Child Total User CPU',
                usageRate: 'Usage'
            },
            table: {
                searchPlaceholder: 'Search Section / Key / Value',
                empty: 'No INFO data',
                section: 'Section',
                key: 'Key',
                value: 'Value'
            }
        },
        commandDrawer: {
            actions: {
                toTop: 'Back to Top',
                toBottom: 'Back to Bottom'
            },
            aria: {
                executing: 'Command executing',
                connecting: 'Connecting'
            },
            messages: {
                connecting: 'Connecting command panel: {value} ...',
                connected: 'Command panel connected. Current database: DB {value}.',
                disconnected: 'Command panel disconnected.',
                noConnection: 'No available connection',
                noConnectionDetail: 'No available connection. Open a Redis connection first.',
                connectFirst: 'Connect to the database first',
                connectionNotReady: 'The current connection is not ready. Connect before executing commands.',
                emptyCommand: 'Command is empty. Enter a command before executing.',
                commandFail: 'Command execution failed',
                commandException: 'Command execution error',
                dbSwitched: 'Switched to DB {value}',
                dbSwitchFail: 'Failed to switch database: {value}'
            }
        },
        dialogs: {
            addKey: {
                title: 'Add Key',
                keyName: 'Key Name',
                keyNamePlaceholder: 'Enter Key name',
                keyType: 'Key Type',
                ttl: 'TTL',
                ttlTip: 'Seconds. -1 means never expire',
                stringValuePlaceholder: 'Enter initial String value',
                fieldPlaceholder: 'Enter Field',
                fieldValuePlaceholder: 'Enter Value for the Field',
                writeDirection: 'Direction',
                rightPush: 'Right RPUSH',
                leftPush: 'Left LPUSH',
                listValuePlaceholder: 'Enter initial List element',
                setMemberPlaceholder: 'Enter initial Set member',
                zsetMemberPlaceholder: 'Enter initial ZSet member',
                messageId: 'Message ID',
                autoMessageIdPlaceholder: 'Leave empty to auto-generate (*)',
                randomGenerate: 'Generate',
                fieldsJsonPlaceholder: 'Enter a JSON object, for example: {"key1":"value1","key2":"value2"}',
                create: 'Create',
                messages: {
                    fieldsJsonInvalid: 'Fields must be a valid JSON object, for example {"key1":"value1"}',
                    fieldsMustObject: 'Fields must be a JSON object, not an array or primitive value',
                    emptyFieldName: 'Fields cannot contain an empty field name',
                    keyNameRequired: 'Enter Key name',
                    hashFieldRequired: 'Enter Hash Field',
                    listValueRequired: 'Enter initial List element',
                    setMemberRequired: 'Enter initial Set member',
                    zsetMemberRequired: 'Enter initial ZSet member',
                    streamFieldRequired: 'Enter at least one Stream Field',
                    commandFail: '{value} execution failed',
                    keyExists: 'Key already exists. Use another name.',
                    createSuccess: 'Key created',
                    createFail: 'Failed to create Key'
                }
            },
            closeConfirm: {
                title: 'Close Confirmation',
                message: 'You clicked the close button. What would you like to do?',
                hideToTray: 'Minimize to Tray',
                quit: 'Quit',
                neverTipsAgain: 'Do not show again'
            },
            deleteConfig: {
                connectionTitle: 'Delete Confirmation',
                connectionMessage: 'Are you sure you want to delete connection "{value}"?',
                groupTitle: 'Delete Group Confirmation',
                groupMessage: 'Are you sure you want to delete group "{value}"?',
                groupDescription: 'This group contains {value} connections. Deleting the group will also delete these connections.',
                groupNameRequired: 'Group name is required',
                delete: 'Delete'
            },
            contextMenu: {
                renameGroup: 'Rename Group',
                deleteGroup: 'Delete Group',
                addConnection: 'Add Connection',
                editConnection: 'Edit Connection',
                deleteConnection: 'Delete Connection',
                openCommand: 'Open Command Line',
                moveToGroup: 'Move to Group',
                copyConnection: 'Copy Connection',
                executeAction: 'Execute action: {value}'
            },
            moveConnection: {
                title: 'Move to Group',
                connectionName: 'Connection Name',
                currentGroup: 'Current Group',
                targetGroup: 'Target Group',
                targetPlaceholder: 'Select or enter target group name',
                validation: {
                    targetRequired: 'Select target group'
                },
                messages: {
                    idMissing: 'Connection profile ID does not exist',
                    sameGroup: 'Target group is the same as current group',
                    connectionMissing: 'Connection profile does not exist',
                    moveSuccess: 'Connection profile moved',
                    moveFail: 'Failed to move connection profile: {value}'
                }
            },
            renameGroup: {
                title: 'Rename Group',
                currentName: 'Current Name',
                newName: 'New Name',
                newNamePlaceholder: 'Enter new group name',
                validation: {
                    nameRequired: 'Enter group name',
                    nameLength: 'Group name length must be between 1 and 25 characters'
                },
                messages: {
                    sameName: 'New group name is the same as current name',
                    nameExists: 'Group name "{value}" already exists',
                    renameSuccess: 'Group renamed. {value} connection profiles updated.',
                    renameFail: 'Failed to rename group: {value}'
                }
            }
        },
        splash: {
            versionLoading: 'Loading...',
            startupFailed: 'Application startup failed...',
            loadingSteps: {
                initializing: 'Initializing application components',
                loadingUi: 'Loading user interface',
                preparingConnection: 'Preparing database connection',
                completed: 'Startup complete'
            }
        },
        titleBar: {
            settings: 'Settings',
            reload: 'Reload Window',
            switchToLight: 'Switch to Light Mode',
            switchToDark: 'Switch to Dark Mode',
            minimize: 'Minimize',
            maximizeRestore: 'Maximize / Restore',
            close: 'Close'
        },
        sideBarEmpty: {
            title: 'No connections yet',
            description: 'Click the button below to create your first connection',
            create: 'Create Connection',
            import: 'Import Connections'
        },
        sideBarAction: {
            create: 'New Connection',
            search: 'Search Connections',
            import: 'Import Connections',
            export: 'Export Connections',
            cancelExport: 'Cancel Export',
            searchPlaceholder: 'Search connections...'
        },
        sideBarFooter: {
            openSource: 'Open Source'
        },
        pageNavbar: {
            closeOther: 'Close Others',
            closeLeft: 'Close Left',
            closeRight: 'Close Right',
            closeAll: 'Close All'
        },
        pageInfo: {
            connecting: 'Connecting...',
            selectKeyEmpty: 'Select a Key from the left'
        },
        pageHeader: {
            more: 'More',
            tooltips: {
                refresh: 'Refresh current connection info',
                command: 'Open Command Line',
                connectionCount: 'Connection Count',
                cpuUsage: 'CPU Usage',
                memoryUsage: 'Memory Usage',
                totalKeys: 'Total Keys',
                redisInfo: 'View more Redis info'
            },
            messages: {
                switchDbSuccess: 'Switched to {value}',
                switchDbFail: 'Failed to switch database',
                updateDbIndexFail: 'Failed to update database index',
                connectFirst: 'Connect to the database first',
                fetchServerInfoFail: 'Failed to fetch server info'
            }
        },
        pageFailed: {
            title: 'Connection Failed',
            description: 'Unable to connect to the Redis server. Check whether the connection profile is correct.',
            tips: {
                serviceLabel: 'Checklist:',
                serviceText: 'Confirm that the Redis service is running',
                networkLabel: 'Network:',
                networkText: 'Check whether the host and port are correct',
                securityLabel: 'Security:',
                securityText: 'Confirm that the password and authentication info are correct'
            },
            actions: {
                edit: 'Edit Connection',
                reconnect: 'Reconnect'
            }
        },
        keyList: {
            searchPlaceholder: 'Search Key...',
            exactSearch: 'Exact Search',
            addKey: 'Add Key',
            listView: 'List View',
            treeView: 'Tree View',
            noMatchedKeys: 'No matching Keys found',
            noData: 'No data',
            loadMore: 'Load More',
            loadAll: 'Load All',
            messages: {
                connectFirst: 'Connect to the database first',
                loadFail: 'Failed to load Key list',
                loadAllFail: 'Failed to load all Keys'
            }
        },
        keyDetail: {
            empty: {
                selectKey: 'Select a Key from the left',
                missingKey: 'The current Key does not exist. It may have expired, been deleted, or the list has not been refreshed.'
            },
            tooltips: {
                submitKeyName: 'Submit Key name change',
                refresh: 'Refresh data',
                copyCommand: 'Copy command',
                deleteKey: 'Delete Key',
                closeDetail: 'Close detail',
                submitTtl: 'Submit TTL change'
            },
            actions: {
                close: 'Close',
                delete: 'Delete'
            },
            confirm: {
                renameTitle: 'Confirm Rename',
                renameMessage: 'Rename Key to "{value}"?',
                deleteTitle: 'Confirm Delete',
                deleteMessage: 'Delete Key "{value}"?'
            },
            messages: {
                fetchFail: 'Failed to fetch Key detail',
                checkKeyFail: 'Failed to check Key status',
                keyMissing: 'The current Key does not exist. It may have expired or been deleted.',
                renameFail: 'Failed to rename Key',
                targetExists: 'Target Key already exists. Choose another name.',
                renameSuccess: 'Key renamed',
                ttlFail: 'Failed to update TTL',
                ttlNotChanged: 'TTL was not changed. The current Key may have expired or its TTL may have changed.',
                ttlSuccess: 'TTL updated',
                commandCopied: 'Command copied',
                copyCommandFail: 'Failed to copy command',
                deleteFail: 'Failed to delete Key',
                deleteSuccess: 'Key deleted'
            }
        },
        keyDetailPanels: {
            common: {
                add: 'Add',
                edit: 'Edit',
                save: 'Save',
                action: 'Action',
                view: 'View',
                delete: 'Delete',
                copy: 'Copy',
                copyCommand: 'Copy',
                refresh: 'Refresh',
                loadMore: 'Load More',
                loadAll: 'Load All',
                valuePlaceholder: 'Enter Value',
                memberPlaceholder: 'Enter Member',
                viewMemberTitle: 'View Member',
                labels: {
                    key: 'Key',
                    field: 'Field',
                    fields: 'Fields',
                    value: 'Value',
                    member: 'Member',
                    score: 'Score',
                    index: 'Index',
                    rank: 'Rank',
                    size: 'Size',
                    ttl: 'TTL',
                    pending: 'Pending'
                },
                messages: {
                    commandFail: '{value} execution failed',
                    commandCopied: 'Command copied',
                    copyCommandFail: 'Failed to copy command',
                    contentCopied: 'Content copied',
                    copyContentFail: 'Failed to copy content',
                    loadMoreFail: 'Failed to load more',
                    loadAllFail: 'Failed to load all',
                    memberExists: 'Member already exists. Use another value.',
                    memberUnchanged: 'Member is unchanged',
                    memberUpdated: 'Member updated',
                    memberAdded: 'Member added',
                    memberMissing: 'Member does not exist or has been deleted',
                    memberDeleted: 'Member deleted',
                    saveSuccess: 'Saved'
                }
            },
            string: {
                messages: {
                    saveFail: 'Failed to save String'
                }
            },
            hash: {
                searchPlaceholder: 'Search Field or Value',
                fieldPlaceholder: 'Enter Key',
                addTitle: 'Add Hash Field',
                editTitle: 'Edit Hash Field',
                viewTitle: 'View Field',
                deleteTitle: 'Delete Hash Field',
                confirmDelete: 'Delete Field "{value}"?',
                messages: {
                    fieldExists: 'Field already exists. Use another name.',
                    fieldUpdated: 'Field updated',
                    fieldAdded: 'Field added',
                    fieldMissing: 'Field does not exist or has been deleted',
                    fieldDeleted: 'Field deleted',
                    saveFail: 'Failed to save Hash field',
                    deleteFail: 'Failed to delete Hash field',
                    loadFail: 'Failed to load Hash data'
                }
            },
            list: {
                searchPlaceholder: 'Search Value',
                direction: 'Direction',
                leftPush: 'Left LPUSH',
                rightPush: 'Right RPUSH',
                addTitle: 'Add List Item',
                editTitle: 'Edit List Item',
                viewTitle: 'View Item',
                deleteTitle: 'Delete List Item',
                confirmDelete: 'Delete item #{value}?',
                messages: {
                    itemUpdated: 'Item updated',
                    itemAdded: 'Item added',
                    itemMissing: 'Item does not exist or has been deleted',
                    itemDeleted: 'Item deleted',
                    saveFail: 'Failed to save List item',
                    deleteFail: 'Failed to delete List item',
                    loadFail: 'Failed to load List data'
                }
            },
            set: {
                searchPlaceholder: 'Search Value',
                emptyMatched: 'No matching Value',
                addTitle: 'Add Set Member',
                editTitle: 'Edit Set Member',
                deleteTitle: 'Delete Set Member',
                confirmDelete: 'Delete Member "{value}"?',
                messages: {
                    saveFail: 'Failed to save Set member',
                    deleteFail: 'Failed to delete Set member',
                    loadFail: 'Failed to load Set data'
                }
            },
            zset: {
                searchPlaceholder: 'Search Score or Member',
                addTitle: 'Add ZSet Member',
                editTitle: 'Edit ZSet Member',
                deleteTitle: 'Delete ZSet Member',
                confirmDelete: 'Delete Member "{value}"?',
                messages: {
                    saveFail: 'Failed to save ZSet member',
                    deleteFail: 'Failed to delete ZSet member',
                    loadFail: 'Failed to load ZSet data'
                }
            },
            stream: {
                minId: 'Min ID',
                maxId: 'Max ID',
                messageId: 'Message ID',
                addEntryTitle: 'Add Stream Entry',
                viewEntryTitle: 'View Stream Entry',
                autoMessageIdPlaceholder: 'Leave empty to auto-generate (*)',
                randomGenerate: 'Generate',
                fieldsJsonPlaceholder: 'Enter a JSON object, for example: {"key1":"value1","key2":"value2"}',
                groupsAndConsumers: 'Groups & Consumers',
                consumerGroups: 'Consumer Groups',
                groupName: 'Group Name',
                groupSearchPlaceholder: 'Search Group Name...',
                expand: 'Expand',
                consumers: 'Consumers',
                pending: 'Pending',
                lastDeliveredId: 'Last Delivered ID',
                groupLabel: 'Group: {value}',
                consumersCount: 'Consumers: {value}',
                totalPending: 'Total Pending: {value}',
                consumerName: 'Consumer Name',
                consumerLabel: 'Consumer: {value}',
                idleTime: 'Idle Time',
                deleteTitle: 'Delete Stream Entry',
                confirmDelete: 'Delete Entry "{value}"?',
                empty: {
                    noMatchedGroups: 'No matching Consumer Group found',
                    noGroups: 'No Consumer Groups in this Stream',
                    noConsumers: 'Group {value} has no Consumers',
                    selectGroup: 'Select a Consumer Group'
                },
                messages: {
                    fieldsJsonInvalid: 'Fields must be a valid JSON object, for example {"key1":"value1"}',
                    fieldsMustObject: 'Fields must be a JSON object, not an array or primitive value',
                    emptyFieldName: 'Fields cannot contain an empty field name',
                    fieldRequired: 'Enter at least one Stream Field',
                    loadFail: 'Failed to load Stream data',
                    queryFail: 'Failed to query Stream data',
                    loadGroupsFail: 'Failed to load Stream consumer groups',
                    loadConsumersFail: 'Failed to load Stream consumers',
                    entryAdded: 'Entry added',
                    addEntryFail: 'Failed to add Stream Entry',
                    entryMissing: 'Entry does not exist or has been deleted',
                    entryDeleted: 'Entry deleted',
                    deleteEntryFail: 'Failed to delete Stream Entry'
                }
            },
            unsupported: {
                empty: 'Visual view is not supported for this type yet',
                keyName: 'Key Name',
                redisType: 'Redis Type',
                currentStatus: 'Current Status',
                commandHint: 'Confirm the type in the command panel first:',
                supportStatus: 'Connection is normal and the Key has been recognized. This version does not provide a dedicated detail page for this type yet.',
                descriptions: {
                    redisJson: 'This Key appears to come from RedisJSON. It needs a dedicated adapter using module commands such as JSON.GET / JSON.SET.',
                    timeSeries: 'This Key appears to come from RedisTimeSeries. Time series data needs to be displayed by time range and sampling rules.',
                    redisBloom: 'This Key appears to come from a RedisBloom module. Related statistics and query commands are not integrated yet.',
                    redisSearch: 'This Key appears to be related to RediSearch. Index and document structures need a dedicated detail view.',
                    default: 'This type is not one of the currently supported basic Redis types. The app recognized it, but will not try to read its content yet.'
                }
            }
        },
        sideBar: {
            messages: {
                exportModeSelectDisabled: 'Cannot select a connection in export mode',
                openConnectionFail: 'Failed to open connection',
                deleteConnectionSuccess: 'Connection profile deleted',
                deleteConnectionFail: 'Failed to delete connection profile',
                deleteGroupSuccess: 'Group deleted',
                deleteGroupFail: 'Failed to delete group',
                unknownError: 'Unknown error'
            }
        },
        sideBarMenu: {
            loadingConnections: 'Loading connections...',
            selectAll: 'Select All',
            selectNone: 'Clear',
            exportSelected: 'Export ({value})',
            messages: {
                selectedCount: '{value} profiles selected',
                cleared: 'Selection cleared',
                exportEmpty: 'Select at least one profile to export',
                exportSuccess: '{value} profiles exported',
                exportFail: 'Export failed',
                unknownError: 'Unknown error',
                jsonFileDescription: 'JSON file'
            }
        }
    }
}

/**
 * 按点路径读取字典值。
 * @param {Object} source - 当前语言字典
 * @param {string} key - 点路径 key
 * @returns {string|undefined} 命中的文案
 */
const readMessage = (source, key) => {
    return String(key).split('.').reduce((current, segment) => {
        return current && Object.prototype.hasOwnProperty.call(current, segment)
            ? current[segment]
            : undefined
    }, source)
}

/**
 * 替换文案中的命名占位符。
 * @param {string} message - 原始文案，如 "{value} items"
 * @param {Object} params - 占位符参数
 * @returns {string} 替换后的文案
 */
const formatMessage = (message, params = {}) => {
    if (!params || typeof params !== 'object') {
        return String(message)
    }

    return String(message).replace(/\{(\w+)}/g, (matched, name) => (
        Object.prototype.hasOwnProperty.call(params, name)
            ? String(params[name])
            : matched
    ))
}

/**
 * 使用国际化能力。
 * @returns {{language: import('vue').Ref<string>, elementLocale: import('vue').ComputedRef<Object>, t: Function}}
 */
export const useI18n = () => {
    const { language } = storeToRefs(useUserSettingsStore())

    // Element Plus 语言包：未知语言兜底为中文。
    const elementLocale = computed(() => ELEMENT_PLUS_LOCALES[language.value] || zhCn)

    /**
     * 读取当前语言文案，缺失时回退中文，再缺失时返回 fallback/key。
     * @param {string} key - 文案 key
     * @param {Object|string} [paramsOrFallback] - 插值参数，或旧用法中的兜底文案
     * @param {string} [fallback] - 兜底文案
     * @returns {string} 当前语言文案
     */
    const t = (key, paramsOrFallback = {}, fallback = '') => {
        const currentMessages = MESSAGES[language.value] || MESSAGES['zh-CN']
        const fallbackMessages = MESSAGES['zh-CN']
        const params = paramsOrFallback && typeof paramsOrFallback === 'object' ? paramsOrFallback : {}
        const fallbackText = typeof paramsOrFallback === 'string' ? paramsOrFallback : fallback

        const message = readMessage(currentMessages, key)
            ?? readMessage(fallbackMessages, key)
            ?? fallbackText
            ?? key

        return formatMessage(message, params)
    }

    return {
        language,
        elementLocale,
        t
    }
}
