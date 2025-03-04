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
exports.scrapeLatestMangapark = scrapeLatestMangapark;
// src/scrapers/mangaparkScraper.ts
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const uniqueFilter_1 = require("../utils/uniqueFilter");
function scrapeLatestMangapark() {
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://mangapark.io/'
        };
        const url = 'https://mangapark.io/latest';
        const response = yield axios_1.default.get(url, { headers });
        const html = response.data;
        const $ = cheerio_1.default.load(html);
        let mangaEntries = [];
        $('div.flex.border-b.border-b-base-200.pb-3').each((i, elem) => {
            const title = $(elem).find('h3.font-bold a').text().trim();
            if (!title)
                return; // skip if title is empty
            const relativeUrl = $(elem).find('h3.font-bold a').attr('href');
            const fullUrl = relativeUrl ? "https://mangapark.io" + relativeUrl : "";
            const coverImage = $(elem).find('img').attr('src') || '';
            const latestChapter = $(elem).find('a.link-hover.link-primary.visited\\:link-accent').text().trim();
            let genres = [];
            $(elem).find('div.flex.flex-wrap.text-xs.opacity-70 span').each((i, el) => {
                const genre = $(el).text().trim();
                if (genre)
                    genres.push(genre);
            });
            genres = (0, uniqueFilter_1.uniqueFilter)(genres);
            const genresStr = genres.join(', ');
            const releaseTime = $(elem).find('time').text().trim();
            mangaEntries.push({
                title,
                url: fullUrl,
                cover_image: coverImage,
                latest_chapter: latestChapter,
                genres: genresStr,
                release_time: releaseTime
            });
        });
        // Remove duplicate entries by title.
        const uniqueManga = [];
        const seenTitles = new Set();
        mangaEntries.forEach(entry => {
            if (!seenTitles.has(entry.title)) {
                seenTitles.add(entry.title);
                uniqueManga.push(entry);
            }
        });
        console.log(`Scraped Mangapark latest: ${uniqueManga.length} entries`);
        return uniqueManga;
    });
}
// Similarly, implement scrapeInfoMangapark and scrapeChapterMangapark…
