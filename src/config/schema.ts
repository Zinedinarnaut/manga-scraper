// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const manga = sqliteTable("manga", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    cover_image: text("cover_image"),
    latest_chapter: text("latest_chapter"),
    genres: text("genres"),
    release_time: text("release_time"),
});
