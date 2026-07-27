export default {
        common: {
            cancel: '取消',
            confirm: '确定',
            reset: '重置为默认值',
            unknownError: '未知错误'
        },
        valueFormats: {
            label: '展示格式',
            text: 'Text/UTF-8',
            json: 'JSON',
            hex: 'Hex',
            binary: 'Binary',
            javaSerialization: 'Java Serialization',
            phpSerialize: 'PHP Serialize',
            pickle: 'Pickle',
            messagePack: 'MessagePack',
            gzip: 'Gzip',
            zlibDeflate: 'Zlib/Deflate',
            brotli: 'Brotli',
            messages: {
                parseFail: '当前格式解析失败，已显示原始内容：{value}'
            }
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
            developerShortcut: '快捷键：{value}',
            versionInfo: '版本信息',
            versionCheck: '更新检查',
            update: {
                foundTitle: '发现新版本',
                foundMessage: '当前版本：V{current}\n最新版本：V{latest}',
                currentVersion: '当前版本',
                latestVersion: '最新版本',
                releaseNotesTitle: '更新内容：',
                noReleaseNotes: '该版本暂无更新说明。',
                newBadge: 'new',
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
                closeBeforeEdit: '该连接已打开，请先关闭连接页签后再编辑',
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
                sourceConnectionClosed: '原连接已关闭，命令面板已同步关闭。',
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
            commandHistory: 'Redis 命令执行记录',
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
            searchPlaceholder: 'Enter 键 进行搜索 Key ...',
            exactSearch: '精准搜索',
            addKey: '添加 Key',
            refreshKeyList: '刷新 Key 列表',
            initialLoading: '正在加载 Key 列表...',
            searchLoading: '正在搜索 Key...',
            searchResultLabel: '搜索结果：',
            listView: '列表视图',
            treeView: '树形视图',
            noMatchedKeys: '未找到匹配的 Key',
            noMatchedKeysYet: '当前扫描范围内未找到匹配的 Key，请点击“加载更多”继续搜索',
            noData: '暂无数据',
            loadMore: '加载更多',
            loadAll: '加载全部',
            stopLoading: '停止加载',
            exportSelection: {
                selectAll: '全选',
                clearSelection: '取消全选',
                exportSelected: '导出选中({value})',
                exit: '关闭',
                loading: '正在导出 Key...',
                limitTooltip: '导出限制及规则：\n单次最多导出 50000 个 Key\nString 超过 50MB 会截断\nHash/List/Set/ZSet/Stream 超过 100000 条会截断\n仅导出当前已选择的 Key',
                jsonFileDescription: 'JSON 文件',
                messages: {
                    empty: '请先选择需要导出的 Key',
                    success: '已导出 {value} 个 Key',
                    successWithIssues: '已导出 {value} 个 Key，失败 {failed} 个，截断 {truncated} 个',
                    fail: '导出 Key 失败'
                }
            },
            batchDeleteSelection: {
                selectAll: '全选',
                clearSelection: '取消全选',
                close: '关闭',
                deleteSelected: '删除选中({value})',
                loading: '正在删除 Key...',
                confirm: {
                    title: '确认批量删除 Key',
                    message: '确定要删除选中的 {value} 个 Key 吗？此操作不可撤销。',
                    confirmButton: '确认删除'
                },
                messages: {
                    empty: '请先选择需要删除的 Key',
                    success: '已删除 {value} 个 Key',
                    fail: '批量删除 Key 失败'
                }
            },
            import: {
                loading: '正在导入 Key...',
                confirm: {
                    title: '确认导入 Key',
                    message: '将导入 {value} 个 Key，同名 Key 会被覆盖；其中 {truncated} 个 Key 来自截断导出，只会恢复文件中的部分数据。是否继续？',
                    confirmButton: '确认导入'
                },
                messages: {
                    invalidFile: '导入文件格式不正确',
                    success: '导入完成：成功 {imported} 个，跳过 {skipped} 个，失败 {failed} 个',
                    fail: '导入 Key 失败'
                }
            },
            operations: {
                closeAllOpenedKeys: '关闭所有打开的 Key',
                closeConnection: '关闭连接',
                memoryAnalysis: '内存分析',
                slowQuery: '慢查询',
                exportKeys: '导出 Key',
                importKeys: '导入 Key',
                selectDeleteKeys: '批量删除 Key',
                deleteAllKeys: '删除所有 Key',
                confirm: {
                    deleteAllTitle: '确认删除所有 Key',
                    deleteAllMessage: '确定要删除当前 DB {value} 中的所有 Key 吗？此操作不可撤销。',
                    deleteAllConfirm: '确认删除'
                },
                messages: {
                    pending: '该功能暂未实现',
                    deleteAllSuccess: '已删除当前 DB 中的所有 Key',
                    deleteAllFail: '删除所有 Key 失败',
                    batchDeleteDisabledInExport: '导出模式中不能使用批量删除 Key'
                }
            },
            contextMenu: {
                copyKey: '复制 Key',
                exportKey: '导出 Key',
                batchDeleteKeys: '批量删除 Key',
                deleteKey: '删除 Key',
                exportKeys: '导出 Key',
                memoryAnalysis: '内存分析',
                loadDirectoryKeys: '只加载目录 Key',
                deleteDirectoryKeys: '删除目录 Key',
                confirm: {
                    deleteKeyTitle: '确认删除 Key',
                    deleteKeyMessage: '确定要删除 Key “{value}” 吗？此操作不可撤销。',
                    deleteKeyConfirm: '确认删除'
                },
                messages: {
                    pending: '该功能暂未实现',
                    copySuccess: 'Key 已复制',
                    copyFail: '复制 Key 失败',
                    deleteSuccess: 'Key 已删除',
                    deleteFail: '删除 Key 失败'
                }
            },
            messages: {
                connectFirst: '请先连接数据库',
                busy: 'Key 正在导入或导出，请稍后再操作',
                loadFail: '加载 Key 列表失败',
                loadAllFail: '加载全部 Key 失败'
            }
        },
        memoryAnalysis: {
            title: '内存分析',
            currentConnection: '当前连接',
            refresh: '刷新',
            limitTip: '最多分析 {value} 个 Key，按内存占用从大到小排序',
            empty: '暂无内存分析数据',
            summary: {
                scanned: '已分析 Key',
                totalMemory: '总占用',
                status: '扫描状态',
                scanning: '扫描中',
                failed: '扫描失败',
                completed: '已完成',
                reachedLimit: '达到上限'
            },
            table: {
                key: 'Key',
                memory: '占用大小'
            },
            messages: {
                loadFail: '内存分析失败'
            }
        },
        slowQuery: {
            title: '慢查询',
            currentConnection: '当前连接',
            instanceTip: '慢查询日志是 Redis 实例级记录，不区分具体 DB',
            refresh: '刷新',
            reset: '清空日志',
            countOption: '最近 {value} 条',
            empty: '暂无慢查询日志',
            copyCommand: '复制命令',
            thresholdDisabled: '已禁用',
            thresholdAll: '记录全部',
            summary: {
                total: '日志总数',
                threshold: '慢查询阈值',
                maxLen: '最大长度',
                loaded: '已加载'
            },
            table: {
                id: 'ID',
                time: '执行时间',
                duration: '耗时',
                command: '命令',
                client: '客户端',
                actions: '操作'
            },
            confirm: {
                resetTitle: '清空慢查询日志',
                resetMessage: '确认清空当前 Redis 实例的慢查询日志吗？该操作不可恢复。',
                resetConfirm: '确认清空'
            },
            messages: {
                loadFail: '慢查询日志加载失败',
                resetSuccess: '慢查询日志已清空',
                resetFail: '慢查询日志清空失败',
                copySuccess: '命令已复制',
                copyFail: '复制命令失败'
            }
        },
        commandHistory: {
            title: 'Redis 命令执行记录',
            searchPlaceholder: '搜索连接、命令、参数或错误信息',
            empty: '暂无 Redis 命令执行记录',
            limitTip: '仅保留最近 {value} 条记录，关闭应用后清空',
            actions: {
                search: '搜索',
                refresh: '刷新',
                clear: '清空日志'
            },
            filters: {
                connection: '全部连接',
                source: '全部来源',
                status: '全部状态'
            },
            status: {
                success: '成功',
                error: '失败',
                timeout: '超时'
            },
            sources: {
                rendererCommand: '渲染进程命令',
                commandPanel: '命令面板',
                keyList: 'Key 列表',
                keyDetail: 'Key 详情',
                memoryAnalysis: '内存分析',
                directoryPreview: '目录预览',
                batchDelete: '批量删除',
                keyExport: '导出 Key',
                keyImport: '导入 Key',
                slowLog: '慢查询',
                serverInfo: '服务器信息',
                databaseSelector: '数据库切换',
                connectionTest: '连接测试'
            },
            pipelineOmitted: '省略 {value} 条子命令',
            table: {
                time: '时间',
                connection: '连接',
                db: 'DB',
                source: '来源',
                command: '命令',
                args: '参数',
                duration: '耗时',
                status: '状态'
            },
            confirm: {
                clearTitle: '清空命令记录',
                clearMessage: '确认清空当前保存的所有 Redis 命令执行记录吗？该操作不可恢复。',
                clearConfirm: '确认清空'
            },
            messages: {
                loadFail: '命令记录加载失败',
                clearSuccess: '已清空 {value} 条命令记录',
                clearFail: '命令记录清空失败'
            }
        },
        deleteDirectoryKeys: {
            title: '删除目录 Key',
            currentConnection: '当前连接',
            refresh: '刷新',
            empty: '该目录下暂无 Key',
            deleteButton: '删除目录 Key',
            limitWarning: '当前目录 Key 数量超过 {value} 条预览上限，为避免只删除部分数据，请缩小目录范围后再删除。',
            footerTip: '将删除 {value} 个 Key',
            summary: {
                directory: '目录',
                keyCount: 'Key 数量',
                status: '扫描状态',
                scanning: '扫描中',
                failed: '扫描失败',
                completed: '已完成',
                reachedLimit: '达到上限'
            },
            table: {
                key: 'Key'
            },
            confirm: {
                title: '确认删除目录 Key',
                message: '确认删除目录“{directory}”下的 {count} 个 Key 吗？该操作不可恢复。',
                confirmButton: '确认删除'
            },
            messages: {
                loadFail: '目录 Key 加载失败',
                deleteSuccess: '已删除 {value} 个 Key',
                deleteFail: '目录 Key 删除失败'
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
                stopLoading: '停止加载',
                loadLimitReached: '为保证页面流畅，最多展示 {value} 条数据',
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
                loadFull: '加载完整内容',
                previewNotice: '当前仅展示前 {loaded}，完整 Value 大小为 {total}。解析和复制内容均基于当前预览。',
                confirmLoadFull: {
                    title: '加载超大 String',
                    message: '完整 Value 大小为 {value}，加载后会占用较多内存，并可能使页面短暂卡顿。是否继续？',
                    confirmButton: '继续加载'
                },
                messages: {
                    saveFail: '保存 String 失败',
                    loadFullFail: '加载完整 String 失败',
                    loadFullSuccess: '完整内容已加载',
                    loadFullBeforeEdit: '请先加载完整内容后再编辑',
                    loadFullBeforeCopy: '请先加载完整内容后再复制 SET 命令'
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
                valueFormatTip: '所选格式会应用于当前 Entry 的所有 Field Value，Field 名称不会参与解析；解析失败的 Value 将保留原始内容。',
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
                loadConnectionFail: '加载连接列表失败',
                searchConnectionFail: '搜索连接失败',
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
    }
