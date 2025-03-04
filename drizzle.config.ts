import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { env } from "./src/utils/env";

export default defineConfig({
    out: "./drizzle",
    schema: "./src/config/schema.ts",
    dialect: "turso",
    dbCredentials: {
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    },
});
