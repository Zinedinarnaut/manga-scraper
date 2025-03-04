"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatest = getLatest;
exports.getInfo = getInfo;
exports.getChapter = getChapter;
const sqlite3_1 = __importDefault(require("sqlite3"));
const dbConfig_1 = require("../config/dbConfig");
const mangaparkScraper_1 = require("../scrapers/mangaparkScraper");
const lhtranslationScraper_1 = require("../scrapers/lhtranslationScraper");
const redis_1 = __importDefault(require("../config/redis"));
function getLatest(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = parseInt(req.query.page) || 1;
        const per_page = parseInt(req.query.per_page) || 10;
        const provider = (req.query.provider || 'mangapark').toLowerCase();
        // Check Redis cache first (using a key based on provider and page)
        const cacheKey = `latest:${provider}:page:${page}:per:${per_page}`;
        try {
            const cached = yield redis_1.default.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
        }
        catch (err) {
            console.error('Redis error:', err);
        }
        if (provider === 'lhtranslation') {
            try {
                const mangaList = yield (0, lhtranslationScraper_1.scrapeLatestLHTranslation)();
                const total = mangaList.length;
                const data = mangaList.slice((page - 1) * per_page, page * per_page);
                const result = { page, per_page, total, data };
                // Cache the result for 10 minutes
                yield redis_1.default.set(cacheKey, JSON.stringify(result), { EX: 600 });
                return res.json(result);
            }
            catch (e) {
                return res.status(500).json({ detail: "Error scraping LHTranslation latest" });
            }
        }
        else {
            // Mangapark: use your DB (this example uses sqlite3 directly)
            const db = new sqlite3_1.default.Database(dbConfig_1.DB_FILE);
            db.get("SELECT COUNT(*) AS count FROM manga", (err, row) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    db.close();
                    return res.status(500).json({ detail: "DB error" });
                }
                let total = row.count;
                if (total === 0) {
                    try {
                        const mangaList = yield (0, mangaparkScraper_1.scrapeLatestMangapark)();
                        // Save to DB (you might want to convert to Promises)
                        mangaList.forEach(manga => {
                            db.run("INSERT INTO manga (title, url, cover_image, latest_chapter, genres, release_time) VALUES (?, ?, ?, ?, ?, ?)", [manga.title, manga.url, manga.cover_image, manga.latest_chapter, manga.genres, manga.release_time]);
                        });
                        // Requery
                        db.get("SELECT COUNT(*) AS count FROM manga", (err2, row2) => {
                            total = row2.count;
                            db.all("SELECT id, title, url, cover_image, latest_chapter, genres, release_time FROM manga LIMIT ? OFFSET ?", [per_page, (page - 1) * per_page], (err3, rows) => __awaiter(this, void 0, void 0, function* () {
                                db.close();
                                if (err3)
                                    return res.status(500).json({ detail: "DB error" });
                                const result = { page, per_page, total, data: rows };
                                yield redis_1.default.set(cacheKey, JSON.stringify(result), { EX: 600 });
                                return res.json(result);
                            }));
                        });
                    }
                    catch (e) {
                        db.close();
                        return res.status(500).json({ detail: "Error scraping Mangapark latest" });
                    }
                }
                else {
                    db.all("SELECT id, title, url, cover_image, latest_chapter, genres, release_time FROM manga LIMIT ? OFFSET ?", [per_page, (page - 1) * per_page], (err4, rows) => __awaiter(this, void 0, void 0, function* () {
                        db.close();
                        if (err4)
                            return res.status(500).json({ detail: "DB error" });
                        const result = { page, per_page, total, data: rows };
                        yield redis_1.default.set(cacheKey, JSON.stringify(result), { EX: 600 });
                        return res.json(result);
                    }));
                }
            }));
        }
    });
}
function getInfo(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = (req.query.provider || 'mangapark').toLowerCase();
        if (provider === 'lhtranslation') {
            const manga_url = req.query.manga_url;
            if (!manga_url) {
                return res.status(400).json({ detail: "manga_url is required for LHTranslation provider" });
            }
            try {
                const infoData = yield (0, lhtranslationScraper_1.scrapeInfoLHTranslation)(manga_url);
                return res.json(infoData);
            }
            catch (e) {
                return res.status(500).json({ detail: e.detail || "Error scraping LHTranslation info" });
            }
        }
        else {
            const manga_id = req.query.manga_id;
            if (!manga_id) {
                return res.status(400).json({ detail: "manga_id is required for Mangapark provider" });
            }
            const db = new sqlite3_1.default.Database(dbConfig_1.DB_FILE);
            db.get("SELECT id, title, url, cover_image, latest_chapter, genres, release_time FROM manga WHERE id = ?", [manga_id], (err, row) => {
                db.close();
                if (err || !row) {
                    return res.status(404).json({ detail: "Manga not found" });
                }
                (0, mangaparkScraper_1.scrapeInfoMangapark)(row.url)
                    .then(infoData => res.json(infoData))
                    .catch(e => res.status(500).json({ detail: "Error scraping Mangapark info" }));
            });
        }
    });
}
function getChapter(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const manga_id = req.params.manga_id;
        const chapter_slug = req.params.chapter_slug;
        const provider = (req.query.provider || "").toLowerCase();
        const db = new sqlite3_1.default.Database(dbConfig_1.DB_FILE);
        db.get("SELECT url FROM manga WHERE id = ?", [manga_id], (err, row) => __awaiter(this, void 0, void 0, function* () {
            db.close();
            if (err || !row) {
                return res.status(404).json({ detail: "Manga not found" });
            }
            const base_url = row.url.replace(/\/+$/, "");
            const full_chapter_url = `${base_url}/${chapter_slug}`;
            try {
                let chapter_data;
                if (provider === "lhtranslation") {
                    chapter_data = yield (0, lhtranslationScraper_1.scrapeChapterLHTranslationAJAX)(full_chapter_url);
                }
                else if (provider === "mangapark") {
                    chapter_data = yield (0, mangaparkScraper_1.scrapeChapterMangapark)(full_chapter_url);
                }
                else {
                    // Auto-detect
                    if (base_url.includes("lhtranslation.net")) {
                        chapter_data = yield (0, lhtranslationScraper_1.scrapeChapterLHTranslationAJAX)(full_chapter_url);
                    }
                    else {
                        chapter_data = yield (0, mangaparkScraper_1.scrapeChapterMangapark)(full_chapter_url);
                    }
                }
                if (!chapter_data.images || chapter_data.images.length === 0) {
                    return res.status(404).json({ detail: "Chapter images not found" });
                }
                return res.json(chapter_data);
            }
            catch (e) {
                return res.status(500).json({ detail: e.detail || "Error fetching chapter" });
            }
        }));
    });
}
