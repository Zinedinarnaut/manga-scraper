// src/scrapers/lhtranslationScraper.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URLSearchParams } from 'url';
import cloudscraper from 'cloudscraper';

const cs: any = cloudscraper; // cast to any

export interface LHTranslationInfo {
    title: string;
    cover_image: string;
    description: string;
    genres: string[];
    authors: string[];
    artists: string[];
    release: string;
    status: string;
    chapters: Array<{ chapterTitle: string; chapterUrl: string; releaseTime: string; chapterId?: string }>;
    totalChapters: number;
    url: string;
}

export async function scrapeLatestLHTranslation(): Promise<any[]> {
    const url = 'https://lhtranslation.net/home/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://lhtranslation.net/'
    };

    const response = await axios.get(url, { headers });
    const html = response.data;
    const $ = cheerio.load(html);
    let mangaEntries: any[] = [];

    $('div.page-listing-item').each((i, elem) => {
        const detail = $(elem).find('div.page-item-detail.manga');
        const title = detail.find('div.item-summary .post-title a').text().trim();
        const mangaUrl = detail.find('div.item-summary .post-title a').attr('href');
        const coverImage = $(elem).find('div.item-thumb a img').attr('data-src') ||
            $(elem).find('div.item-thumb a img').attr('src');
        const latestChapter = detail.find('div.list-chapter .chapter a.btn-link').first().text().trim();
        const releaseTime = $(elem).find('.item-summary .post-on')
            .text().replace(/\s+/g, ' ').trim();

        if (title) {
            mangaEntries.push({
                title,
                url: mangaUrl,
                cover_image: coverImage,
                latest_chapter: latestChapter,
                genres: "",
                release_time: releaseTime
            });
        }
    });
    console.log(`Scraped LHTranslation latest: ${mangaEntries.length} entries`);
    return mangaEntries;
}

export async function scrapeInfoLHTranslation(mangaUrl: string): Promise<LHTranslationInfo> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://lhtranslation.net/'
    };

    let html: string;
    try {
        html = await cs.get(mangaUrl, { headers, timeout: 60000 });
    } catch (e) {
        throw new Error(`Error fetching LHTranslation info: ${e}`);
    }
    const $ = cheerio.load(html);
    let info: LHTranslationInfo = {
        title: $('div.post-title h1').text().trim(),
        cover_image: $('div.summary_image a img').attr('data-src') ||
            $('div.summary_image a img').attr('src') || '',
        description: $('div.description-summary div.summary__content.show-more p').text().trim(),
        genres: [],
        authors: [],
        artists: [],
        release: $('div.post-content_item').filter((i, el) =>
            $(el).find("h5").text().includes("Release")
        ).find("div.summary-content").text().trim(),
        status: $('div.post-content_item').filter((i, el) =>
            $(el).find("h5").text().includes("Status")
        ).find("div.summary-content").text().trim(),
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
}

export async function scrapeChapterLHTranslationAJAX(chapterUrl: string): Promise<{ chapterTitle: string; chapterUrl: string; images: string[] }> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Referer': chapterUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    };

    const regex = /https:\/\/lhtranslation\.net\/manga\/([^\/]+)\/(chapter-[^\/]+)\//;
    const match = chapterUrl.match(regex);
    if (!match) {
        throw new Error("Could not parse manga/chapter slug from URL");
    }
    const mangaSlug = match[1];
    const chapterSlug = match[2];

    const ajaxUrl = "https://lhtranslation.net/wp-admin/admin-ajax.php";
    const payload = new URLSearchParams();
    payload.append("action", "wp_manga_get_chapter_images");
    payload.append("manga_id", mangaSlug);
    payload.append("chapter_id", chapterSlug);

    let ajaxResponse;
    try {
        ajaxResponse = await cs.post(ajaxUrl, {
            headers,
            data: payload.toString(),
            timeout: 30000
        });
    } catch (e) {
        throw new Error(`Error fetching AJAX data: ${e}`);
    }

    let data: any;
    try {
        data = typeof ajaxResponse === 'string' ? JSON.parse(ajaxResponse) : ajaxResponse.data || ajaxResponse;
    } catch (e) {
        throw new Error(`Error parsing AJAX JSON: ${e}`);
    }
    let images = data.images || data.data;
    if (!images || !Array.isArray(images)) {
        throw new Error("Chapter images not found");
    }
    images = images.map((img: string) => img.trim()).filter((img: string) => img.startsWith("http"));
    let chapterTitle = "";
    try {
        const pageResponse = await cs.get(chapterUrl, { headers, timeout: 30000 });
        const $ = cheerio.load(pageResponse);
        chapterTitle = $("h1#chapter-heading").text().trim() || $("h1").text().trim();
    } catch (e) {
        console.warn("Error fetching chapter title:", e);
    }
    return {
        chapterTitle,
        chapterUrl,
        images
    };
}
