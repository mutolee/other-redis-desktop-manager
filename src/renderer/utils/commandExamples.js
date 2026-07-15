/**
 * Redis 命令示例列表。
 * 用于命令抽屉输入提示，只保留常用且适合提示的命令。
 * 已排除废弃命令和高危运维命令，避免自动提示引导用户执行破坏性操作。
 */
const COMMAND_EXAMPLES = [
    // 连接与服务信息
    'PING',
    'HELLO [protover]',
    'AUTH [username] password',
    'SELECT index',
    'INFO [section]',
    'DBSIZE',
    'TIME',
    'CLIENT INFO',
    'CLIENT LIST',
    'CLIENT SETNAME connection-name',
    'CLIENT GETNAME',
    'COMMAND INFO command-name',
    'CONFIG GET parameter',
    'SLOWLOG GET [count]',

    // Key 通用操作
    'SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]',
    'KEYS pattern',
    'TYPE key',
    'EXISTS key [key ...]',
    'DEL key [key ...]',
    'UNLINK key [key ...]',
    'COPY source destination [DB db] [REPLACE]',
    'RENAME key newkey',
    'RENAMENX key newkey',
    'EXPIRE key seconds [NX|XX|GT|LT]',
    'EXPIREAT key unix-time-seconds [NX|XX|GT|LT]',
    'EXPIRETIME key',
    'TTL key',
    'PTTL key',
    'PERSIST key',
    'RANDOMKEY',
    'DUMP key',
    'RESTORE key ttl serialized-value [REPLACE] [ABSTTL]',

    // String
    'GET key',
    'SET key value [NX|XX] [GET] [EX seconds|PX milliseconds|KEEPTTL]',
    'GETDEL key',
    'GETEX key [EX seconds|PX milliseconds|PERSIST]',
    'MGET key [key ...]',
    'MSET key value [key value ...]',
    'MSETNX key value [key value ...]',
    'SETNX key value',
    'SETEX key seconds value',
    'PSETEX key milliseconds value',
    'APPEND key value',
    'STRLEN key',
    'GETRANGE key start end',
    'SETRANGE key offset value',
    'INCR key',
    'DECR key',
    'INCRBY key increment',
    'DECRBY key decrement',
    'INCRBYFLOAT key increment',
    'GETBIT key offset',
    'SETBIT key offset value',
    'BITCOUNT key [start end]',
    'BITPOS key bit [start [end]]',

    // Hash
    'HSET key field value [field value ...]',
    'HGET key field',
    'HGETALL key',
    'HDEL key field [field ...]',
    'HEXISTS key field',
    'HKEYS key',
    'HVALS key',
    'HLEN key',
    'HSTRLEN key field',
    'HINCRBY key field increment',
    'HINCRBYFLOAT key field increment',
    'HMGET key field [field ...]',
    'HRANDFIELD key [count [WITHVALUES]]',
    'HSCAN key cursor [MATCH pattern] [COUNT count]',

    // List
    'LPUSH key element [element ...]',
    'RPUSH key element [element ...]',
    'LPOP key [count]',
    'RPOP key [count]',
    'LLEN key',
    'LRANGE key start stop',
    'LINDEX key index',
    'LSET key index element',
    'LTRIM key start stop',
    'LREM key count element',
    'LPUSHX key element [element ...]',
    'RPUSHX key element [element ...]',
    'LINSERT key BEFORE|AFTER pivot element',
    'LPOS key element [RANK rank] [COUNT num] [MAXLEN len]',
    'LMOVE source destination LEFT|RIGHT LEFT|RIGHT',

    // Set
    'SADD key member [member ...]',
    'SREM key member [member ...]',
    'SMEMBERS key',
    'SCARD key',
    'SISMEMBER key member',
    'SMISMEMBER key member [member ...]',
    'SINTER key [key ...]',
    'SUNION key [key ...]',
    'SDIFF key [key ...]',
    'SINTERSTORE destination key [key ...]',
    'SUNIONSTORE destination key [key ...]',
    'SDIFFSTORE destination key [key ...]',
    'SINTERCARD numkeys key [key ...] [LIMIT limit]',
    'SPOP key [count]',
    'SRANDMEMBER key [count]',
    'SMOVE source destination member',
    'SSCAN key cursor [MATCH pattern] [COUNT count]',

    // Sorted Set
    'ZADD key score member [score member ...]',
    'ZREM key member [member ...]',
    'ZRANGE key start stop [BYSCORE|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]',
    'ZCARD key',
    'ZSCORE key member',
    'ZMSCORE key member [member ...]',
    'ZRANK key member',
    'ZREVRANK key member',
    'ZINCRBY key increment member',
    'ZCOUNT key min max',
    'ZREMRANGEBYRANK key start stop',
    'ZREMRANGEBYSCORE key min max',
    'ZPOPMIN key [count]',
    'ZPOPMAX key [count]',
    'ZRANDMEMBER key [count [WITHSCORES]]',
    'ZINTER numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX] [WITHSCORES]',
    'ZUNION numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX] [WITHSCORES]',
    'ZDIFF numkeys key [key ...] [WITHSCORES]',
    'ZSCAN key cursor [MATCH pattern] [COUNT count]',

    // Stream
    'XADD key * field value [field value ...]',
    'XLEN key',
    'XRANGE key start end [COUNT count]',
    'XREVRANGE key end start [COUNT count]',
    'XREAD [COUNT count] [BLOCK milliseconds] STREAMS key [key ...] id [id ...]',
    'XDEL key id [id ...]',
    'XTRIM key MAXLEN|MINID [=|~] threshold [LIMIT count]',
    'XINFO STREAM key',
    'XINFO GROUPS key',
    'XINFO CONSUMERS key group',
    'XGROUP CREATE key group id [MKSTREAM]',
    'XGROUP DESTROY key group',
    'XGROUP DELCONSUMER key group consumer',
    'XREADGROUP GROUP group consumer [COUNT count] [BLOCK milliseconds] STREAMS key [key ...] id [id ...]',
    'XACK key group id [id ...]',
    'XPENDING key group [start end count [consumer]]',
    'XCLAIM key group consumer min-idle-time id [id ...]',

    // Geo
    'GEOADD key longitude latitude member [longitude latitude member ...]',
    'GEOPOS key member [member ...]',
    'GEODIST key member1 member2 [M|KM|FT|MI]',
    'GEOHASH key member [member ...]',
    'GEOSEARCH key FROMMEMBER member|FROMLONLAT longitude latitude BYRADIUS radius M|KM|FT|MI [ASC|DESC] [COUNT count]',
    'GEOSEARCHSTORE destination source FROMMEMBER member|FROMLONLAT longitude latitude BYRADIUS radius M|KM|FT|MI [ASC|DESC] [COUNT count]',

    // HyperLogLog
    'PFADD key element [element ...]',
    'PFCOUNT key [key ...]',
    'PFMERGE destkey sourcekey [sourcekey ...]',

    // Pub/Sub
    'PUBLISH channel message',
    'PUBSUB CHANNELS [pattern]',
    'PUBSUB NUMSUB channel [channel ...]',

    // 事务与脚本
    'MULTI',
    'EXEC',
    'DISCARD',
    'WATCH key [key ...]',
    'UNWATCH',
    'EVAL script numkeys key [key ...] arg [arg ...]',
    'EVALSHA sha1 numkeys key [key ...] arg [arg ...]',
    'SCRIPT LOAD script',
    'SCRIPT EXISTS sha1 [sha1 ...]',
    'SCRIPT FLUSH [ASYNC|SYNC]',

    // 复制与角色
    'ROLE',
    'REPLICAOF host port',
    'REPLICAOF NO ONE'
]

/**
 * 匹配命令示例。
 *
 * @param {string} command - 用户已经输入的命令前缀
 * @returns {{ matched: boolean, result?: string }} 匹配结果
 */
export const matchedExample = (command) => {
    const normalizedCommand = String(command || '').toLowerCase()
    const example = COMMAND_EXAMPLES.find((item) => {
        const normalizedExample = item.toLowerCase()

        return normalizedExample.startsWith(normalizedCommand)
            && normalizedCommand !== normalizedExample
    })

    return example ? {matched: true, result: example} : {matched: false}
}
