// src/config/redis.ts
import { createClient } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.connect().then(() => {
    console.log('Connected to Redis');
});

export default client;
