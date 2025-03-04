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
exports.scrapeInfoLHTranslation = scrapeInfoLHTranslation;
exports.scrapeChapterLHTranslationAJAX = scrapeChapterLHTranslationAJAX;
const cheerio_1 = __importDefault(require("cheerio"));
const cloudscraper_1 = __importDefault(require("cloudscraper"));
const url_1 = require("url");
function scrapeInfoLHTranslation(mangaUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/115.0.0.0 Safari/537.36',
            'Referer': 'https://lhtranslation.net/'
        };
        // Use cloudscraper to fetch the page
        let html;
        try {
            html = yield cloudscraper_1.default.get(mangaUrl, { headers, timeout: 60000 });
        }
        catch (e) {
            throw new Error(`Error fetching LHTranslation info: ${e}`);
        }
        const $ = cheerio_1.default.load(html);
        let info = {
            title: $('div.post-title h1').text().trim(),
            cover_image: $('div.summary_image a img').attr('data-src') ||
                $('div.summary_image a img').attr('src') || '',
            description: $('div.description-summary div.summary__content.show-more p').text().trim(),
            genres: [],
            authors: [],
            artists: [],
            release: $('div.post-content_item').filter((i, el) => $(el).find("h5").text().includes("Release")).find("div.summary-content").text().trim(),
            status: $('div.post-content_item').filter((i, el) => $(el).find("h5").text().includes("Status")).find("div.summary-content").text().trim(),
            chapters: [],
            totalChapters: 0,
            url: mangaUrl
        };
        $('div.summary-content div.genres-content a').each((i, el) => {
            info.genres.push($(el).text().trim());
        });
        $('div.summary-content div.author-content a').each((i, el) => {
            info.authors.push($(el).text().trim());
        });
        $('div.summary-content div.artist-content a').each((i, el) => {
            info.artists.push($(el).text().trim());
        });
        const chaptersContainer = $("#manga-chapters-holder");
        if (chaptersContainer.length) {
            chaptersContainer.find("ul.main.version-chap li.wp-manga-chapter").each((i, el) => {
                const chapterLink = $(el).find("a").first();
                const chapterTitle = chapterLink.text().trim();
                const chapterUrl = chapterLink.attr("href") || "";
                const chapterRelease = $(el).find("span.chapter-release-date i").text().trim();
                const downloadButton = $(el).find("a.btn-chapter-download");
                let numericChapterId = downloadButton.attr("data-chapter") || undefined;
                if (!numericChapterId && chapterUrl) {
                    const m = chapterUrl.match(/chapter-(\d+)/);
                    numericChapterId = m ? m[1] : undefined;
                }
                info.chapters.push({
                    chapterTitle,
                    chapterUrl,
                    releaseTime: chapterRelease,
                    chapterId: numericChapterId
                });
            });
        }
        info.totalChapters = info.chapters.length;
        return info;
    });
}
function scrapeChapterLHTranslationAJAX(chapterUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/115.0.0.0 Safari/537.36',
            'Referer': chapterUrl,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        };
        // Parse the manga slug and chapter slug from the URL.
        const regex = /https:\/\/lhtranslation\.net\/manga\/([^\/]+)\/(chapter-[^\/]+)\//;
        const match = chapterUrl.match(regex);
        if (!match) {
            throw new Error("Could not parse manga/chapter slug from URL");
        }
        const mangaSlug = match[1]; // e.g. "kuro-no-shoukanshi"
        const chapterSlug = match[2]; // e.g. "chapter-159"
        const ajaxUrl = "https://lhtranslation.net/wp-admin/admin-ajax.php";
        const payload = new url_1.URLSearchParams();
        payload.append("action", "wp_manga_get_chapter_images");
        payload.append("manga_id", mangaSlug);
        payload.append("chapter_id", chapterSlug);
        let ajaxResponse;
        try {
            ajaxResponse = yield cloudscraper_1.default.post(ajaxUrl, {
                headers,
                data: payload.toString(),
                timeout: 30000
            });
        }
        catch (e) {
            throw new Error(`Error fetching AJAX data: ${e}`);
        }
        let data;
        try {
            data = typeof ajaxResponse === 'string' ? JSON.parse(ajaxResponse) : ajaxResponse.data || ajaxResponse;
        }
        catch (e) {
            throw new Error(`Error parsing AJAX JSON: ${e}`);
        }
        let images = data.images || data.data;
        if (!images || !Array.isArray(images)) {
            throw new Error("Chapter images not found");
        }
        images = images.map((img) => img.trim()).filter((img) => img.startsWith("http"));
        let chapterTitle = "";
        try {
            const pageResponse = yield cloudscraper_1.default.get(chapterUrl, { headers, timeout: 30000 });
            const $ = cheerio_1.default.load(pageResponse);
            chapterTitle = $("h1#chapter-heading").text().trim() || $("h1").text().trim();
        }
        catch (e) {
            console.warn("Error fetching chapter title:", e);
        }
        return {
            chapterTitle,
            chapterUrl,
            images
        };
    });
}
