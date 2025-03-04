// src/controllers/mangaController.ts
import { Request, Response } from "express";
import { db } from "../config/db";
import { manga } from "../schema/manga";
import { eq } from "drizzle-orm";
import {
    scrapeLatestMangapark,
    scrapeInfoMangapark,
    scrapeChapterMangapark,
} from "../scrapers/mangaparkScraper";
import {
    scrapeLatestLHTranslation,
    scrapeInfoLHTranslation,
    scrapeChapterLHTranslationAJAX,

} from "../scrapers/lhtranslationScraper";

/**
 * Helper to remove duplicate strings from an array.
 */
function uniqueFilter(arr: string[]): string[] {
    return [...new Set(arr.filter(Boolean))];
}

/**
 * GET /latest endpoint
 */
export async function getLatest(req: Request, res: Response): Promise<Response> {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 10;
    const provider = ((req.query.provider as string) || "mangapark").toLowerCase();

    if (provider === "lhtranslation") {
        try {
            const mangaList = await scrapeLatestLHTranslation();
            const total = mangaList.length;
            const data = mangaList.slice((page - 1) * perPage, page * perPage);
            return res.json({ page, per_page: perPage, total, data });
        } catch (e) {
            console.error("Error scraping LHTranslation latest:", e);
            return res.status(500).json({ detail: "Error scraping LHTranslation latest" });
        }
    } else {
        try {
            // Query all manga entries from Turso using Drizzle.
            const allManga = await db.select().from(manga);
            const total = allManga.length;
            if (total === 0) {
                // If none exist, scrape from Mangapark and insert into the DB.
                const mangaList = await scrapeLatestMangapark();
                for (const m of mangaList) {
                    // Optionally filter duplicates here if necessary.
                    await db.insert(manga).values(m).run();
                }
                const newManga = await db.select().from(manga);
                const newTotal = newManga.length;
                const data = newManga.slice((page - 1) * perPage, page * perPage);
                return res.json({ page, per_page: perPage, total: newTotal, data });
            } else {
                const data = allManga.slice((page - 1) * perPage, page * perPage);
                return res.json({ page, per_page: perPage, total, data });
            }
        } catch (e) {
            console.error("DB error:", e);
            return res.status(500).json({ detail: "DB error" });
        }
    }
}

/**
 * GET /info endpoint
 */
export async function getInfo(req: Request, res: Response): Promise<Response> {
    const provider = ((req.query.provider as string) || "mangapark").toLowerCase();
    if (provider === "lhtranslation") {
        const mangaUrl = req.query.manga_url as string;
        if (!mangaUrl) {
            return res.status(400).json({ detail: "manga_url is required for LHTranslation provider" });
        }
        try {
            const infoData = await scrapeInfoLHTranslation(mangaUrl);
            return res.json(infoData);
        } catch (e) {
            console.error("Error scraping LHTranslation info:", e);
            return res.status(500).json({ detail: "Error scraping LHTranslation info" });
        }
    } else {
        const mangaId = req.query.manga_id as string;
        if (!mangaId) {
            return res.status(400).json({ detail: "manga_id is required for Mangapark provider" });
        }
        try {
            const result = await db.select().from(manga).where(eq(manga.id, Number(mangaId)));
            if (result.length === 0) {
                return res.status(404).json({ detail: "Manga not found" });
            }
            // Use the stored URL from DB to scrape info
            const infoData = await scrapeInfoMangapark(result[0].url);
            return res.json(infoData);
        } catch (e) {
            console.error("Error scraping Mangapark info:", e);
            return res.status(500).json({ detail: "Error scraping Mangapark info" });
        }
    }
}

/**
 * GET /chapter/:manga_id/:chapter_slug endpoint
 */
export async function getChapter(req: Request, res: Response): Promise<Response> {
    const mangaId = req.params.manga_id;
    const chapterSlug = req.params.chapter_slug;
    const provider = ((req.query.provider as string) || "").toLowerCase();
    try {
        const result = await db.select().from(manga).where(eq(manga.id, Number(mangaId)));
        if (result.length === 0) {
            return res.status(404).json({ detail: "Manga not found" });
        }
        const baseUrl = result[0].url.replace(/\/+$/, "");
        const fullChapterUrl = `${baseUrl}/${chapterSlug}`;
        let chapterData;
        if (provider === "lhtranslation") {
            chapterData = await scrapeChapterLHTranslationAJAX(fullChapterUrl);
        } else if (provider === "mangapark") {
            chapterData = await scrapeChapterMangapark(fullChapterUrl);
        } else {
            // Auto-detect based on baseUrl.
            if (baseUrl.includes("lhtranslation.net")) {
                chapterData = await scrapeChapterLHTranslationAJAX(fullChapterUrl);
            } else {
                chapterData = await scrapeChapterMangapark(fullChapterUrl);
            }
        }
        if (!chapterData.images || chapterData.images.length === 0) {
            return res.status(404).json({ detail: "Chapter images not found" });
        }
        return res.json(chapterData);
    } catch (e: any) {
        console.error("Error fetching chapter:", e);
        return res.status(500).json({ detail: e.detail || "Error fetching chapter" });
    }
}
