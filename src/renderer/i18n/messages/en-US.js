export default {
        common: {
            cancel: 'Cancel',
            confirm: 'OK',
            reset: 'Reset to Defaults',
            unknownError: 'Unknown error'
        },
        valueFormats: {
            label: 'Format',
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
                parseFail: 'Failed to parse this format. Showing raw value: {value}'
            }
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
                currentVersion: 'Current Version',
                latestVersion: 'Latest Version',
                releaseNotesTitle: 'Release notes:',
                noReleaseNotes: 'No release notes for this version.',
                newBadge: 'new',
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
            searchPlaceholder: 'Press Enter to search Key...',
            exactSearch: 'Exact Search',
            addKey: 'Add Key',
            refreshKeyList: 'Refresh Key List',
            searchLoading: 'Searching Keys...',
            searchResultLabel: 'Search results:',
            listView: 'List View',
            treeView: 'Tree View',
            noMatchedKeys: 'No matching Keys found',
            noData: 'No data',
            loadMore: 'Load More',
            loadAll: 'Load All',
            exportSelection: {
                selectAll: 'Select All',
                clearSelection: 'Clear',
                exportSelected: 'Export ({value})',
                exit: 'Close',
                loading: 'Exporting Keys...',
                limitTooltip: 'Export limits and rules:\nUp to 50,000 Keys per export\nString values over 50MB are truncated\nHash/List/Set/ZSet/Stream values over 100,000 items are truncated\nOnly selected Keys are exported',
                jsonFileDescription: 'JSON file',
                messages: {
                    empty: 'Select at least one Key to export',
                    success: '{value} Keys exported',
                    successWithIssues: '{value} Keys exported, {failed} failed, {truncated} truncated.',
                    fail: 'Failed to export Keys'
                }
            },
            batchDeleteSelection: {
                selectAll: 'Select All',
                clearSelection: 'Clear',
                close: 'Close',
                deleteSelected: 'Delete ({value})',
                loading: 'Deleting Keys...',
                confirm: {
                    title: 'Confirm Batch Delete',
                    message: 'Delete the selected {value} Keys? This action cannot be undone.',
                    confirmButton: 'Delete'
                },
                messages: {
                    empty: 'Select at least one Key to delete',
                    success: '{value} Keys deleted',
                    fail: 'Failed to batch delete Keys'
                }
            },
            import: {
                loading: 'Importing Keys...',
                confirm: {
                    title: 'Confirm Key Import',
                    message: 'Import {value} Keys. Existing Keys with the same names will be overwritten. {truncated} Keys were exported with truncated data and only the data in the file will be restored. Continue?',
                    confirmButton: 'Import'
                },
                messages: {
                    invalidFile: 'Invalid import file format',
                    success: 'Import completed: {imported} imported, {skipped} skipped, {failed} failed',
                    fail: 'Failed to import Keys'
                }
            },
            operations: {
                closeAllOpenedKeys: 'Close All Opened Keys',
                closeConnection: 'Close Connection',
                memoryAnalysis: 'Memory Analysis',
                slowQuery: 'Slow Query',
                exportKeys: 'Export Keys',
                importKeys: 'Import Keys',
                selectDeleteKeys: 'Batch Delete Keys',
                deleteAllKeys: 'Delete All Keys',
                confirm: {
                    deleteAllTitle: 'Confirm Delete All Keys',
                    deleteAllMessage: 'Delete all Keys in current DB {value}? This action cannot be undone.',
                    deleteAllConfirm: 'Delete'
                },
                messages: {
                    pending: 'This feature is not implemented yet',
                    deleteAllSuccess: 'All Keys in the current DB have been deleted',
                    deleteAllFail: 'Failed to delete all Keys',
                    batchDeleteDisabledInExport: 'Batch Delete Keys cannot be used in export mode'
                }
            },
            contextMenu: {
                copyKey: 'Copy Key',
                exportKey: 'Export Key',
                batchDeleteKeys: 'Batch Delete Keys',
                deleteKey: 'Delete Key',
                exportKeys: 'Export Keys',
                memoryAnalysis: 'Memory Analysis',
                loadDirectoryKeys: 'Load Directory Keys Only',
                deleteDirectoryKeys: 'Delete Directory Keys',
                confirm: {
                    deleteKeyTitle: 'Confirm Delete Key',
                    deleteKeyMessage: 'Delete Key "{value}"? This action cannot be undone.',
                    deleteKeyConfirm: 'Delete'
                },
                messages: {
                    pending: 'This feature is not implemented yet',
                    copySuccess: 'Key copied',
                    copyFail: 'Failed to copy Key',
                    deleteSuccess: 'Key deleted',
                    deleteFail: 'Failed to delete Key'
                }
            },
            messages: {
                connectFirst: 'Connect to the database first',
                busy: 'Keys are being imported or exported. Try again later.',
                loadFail: 'Failed to load Key list',
                loadAllFail: 'Failed to load all Keys'
            }
        },
        memoryAnalysis: {
            title: 'Memory Analysis',
            currentConnection: 'Current Connection',
            refresh: 'Refresh',
            limitTip: 'Analyze up to {value} Keys, sorted by memory usage descending',
            empty: 'No memory analysis data',
            summary: {
                scanned: 'Analyzed Keys',
                totalMemory: 'Total Memory',
                status: 'Scan Status',
                completed: 'Completed',
                reachedLimit: 'Limit Reached'
            },
            table: {
                key: 'Key',
                memory: 'Memory'
            },
            messages: {
                loadFail: 'Memory analysis failed'
            }
        },
        slowQuery: {
            title: 'Slow Query',
            currentConnection: 'Current Connection',
            instanceTip: 'Slow log is recorded at Redis instance level and is not separated by DB',
            refresh: 'Refresh',
            reset: 'Clear Log',
            countOption: 'Latest {value}',
            empty: 'No slow query logs',
            copyCommand: 'Copy command',
            thresholdDisabled: 'Disabled',
            thresholdAll: 'Log all',
            summary: {
                total: 'Total Logs',
                threshold: 'Threshold',
                maxLen: 'Max Length',
                loaded: 'Loaded'
            },
            table: {
                id: 'ID',
                time: 'Time',
                duration: 'Duration',
                command: 'Command',
                client: 'Client',
                actions: 'Actions'
            },
            confirm: {
                resetTitle: 'Clear Slow Query Logs',
                resetMessage: 'Clear slow query logs for the current Redis instance? This cannot be undone.',
                resetConfirm: 'Clear'
            },
            messages: {
                loadFail: 'Failed to load slow query logs',
                resetSuccess: 'Slow query logs cleared',
                resetFail: 'Failed to clear slow query logs',
                copySuccess: 'Command copied',
                copyFail: 'Failed to copy command'
            }
        },
        deleteDirectoryKeys: {
            title: 'Delete Directory Keys',
            currentConnection: 'Current Connection',
            refresh: 'Refresh',
            empty: 'No Keys in this directory',
            deleteButton: 'Delete Directory Keys',
            limitWarning: 'This directory has more than {value} Keys in the preview limit. Narrow the directory range before deleting to avoid deleting only part of the data.',
            footerTip: '{value} Keys will be deleted',
            summary: {
                directory: 'Directory',
                keyCount: 'Key Count',
                status: 'Scan Status',
                completed: 'Completed',
                reachedLimit: 'Limit Reached'
            },
            table: {
                key: 'Key'
            },
            confirm: {
                title: 'Confirm Directory Key Deletion',
                message: 'Delete {count} Keys under directory "{directory}"? This cannot be undone.',
                confirmButton: 'Delete'
            },
            messages: {
                loadFail: 'Failed to load directory Keys',
                deleteSuccess: '{value} Keys deleted',
                deleteFail: 'Failed to delete directory Keys'
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
                valueFormatTip: 'The selected format is applied to every Field Value in this Entry. Field names are not parsed, and values that fail to parse keep their raw content.',
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
