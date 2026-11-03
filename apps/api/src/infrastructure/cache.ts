import { createHash } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';

const PREFIX = 'trackon:v1';
const pending = new Map<string, Promise<unknown>>();
let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;
let retryAfter = 0;

async function redisClient(): Promise<RedisClientType | null> {
    const url = process.env.REDIS_URL;
    if (!url || Date.now() < retryAfter) return null;
    if (client?.isReady) return client;
    if (connecting) return connecting;
    const candidate = createClient({
        url,
        disableOfflineQueue: true,
        socket: { connectTimeout: 1_500, reconnectStrategy: false },
    });
    candidate.on('error', () => undefined);
    connecting = candidate.connect()
        .then(() => {
            client = candidate as RedisClientType;
            return client;
        })
        .catch(() => {
            candidate.destroy();
            retryAfter = Date.now() + 5_000;
            return null;
        })
        .finally(() => { connecting = null; });
    return connecting;
}

function digest(value: string) {
    return createHash('sha256').update(value).digest('base64url');
}

async function version(namespace: string, redis: RedisClientType) {
    return await redis.get(`${PREFIX}:version:${namespace}`) ?? '1';
}

export async function cached<T>(namespace: string, identity: unknown, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const redis = await redisClient();
    if (!redis) return loader();
    const key = `${PREFIX}:cache:${namespace}:${await version(namespace, redis)}:${digest(JSON.stringify(identity))}`;
    try {
        const hit = await redis.get(key);
        if (hit !== null) return JSON.parse(hit) as T;
    } catch {
        return loader();
    }
    const current = pending.get(key) as Promise<T> | undefined;
    if (current) return current;
    const operation = loader().then(async value => {
        try { await redis.set(key, JSON.stringify(value), { EX: ttlSeconds }); }
        catch { /* Redis es una optimización; PostgreSQL sigue siendo la fuente de verdad. */ }
        return value;
    }).finally(() => pending.delete(key));
    pending.set(key, operation);
    return operation;
}

export async function invalidateCache(...namespaces: string[]) {
    const redis = await redisClient();
    if (!redis || namespaces.length === 0) return;
    try {
        const multi = redis.multi();
        for (const namespace of new Set(namespaces)) multi.incr(`${PREFIX}:version:${namespace}`);
        await multi.exec();
    } catch { /* La expiración por TTL limita cualquier dato obsoleto si Redis falla. */ }
}

export async function cacheStatus(): Promise<'connected' | 'disabled' | 'unavailable'> {
    if (!process.env.REDIS_URL) return 'disabled';
    const redis = await redisClient();
    if (!redis) return 'unavailable';
    try { return await redis.ping() === 'PONG' ? 'connected' : 'unavailable'; }
    catch { return 'unavailable'; }
}

export async function closeCache() {
    const redis = client;
    client = null;
    if (!redis?.isOpen) return;
    try { await redis.quit(); }
    catch { redis.destroy(); }
}
