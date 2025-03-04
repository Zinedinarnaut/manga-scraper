import zod from "zod";

const envSchema = zod.object({
    TURSO_DATABASE_URL: zod.string(),
    TURSO_AUTH_TOKEN: zod.string(),
    REDIS_URL: zod.string(),
    PORT: zod.string(),
});

export const env = envSchema.parse(process.env);
