import axios from 'axios';
import * as cheerio from 'cheerio';
import { uniqueFilter } from '../utils/uniqueFilter';
import cloudscraper from "cloudscraper";
import {chromium} from "playwright";

export interface MangaparkManga {
    title: string;
    url: string;
    cover_image: string;
    latest_chapter: string;
    genres: string;
    release_time: string;
}

/**
 * Scrapes the latest manga entries from Mangapark.
 */
export async function scrapeLatestMangapark(): Promise<MangaparkManga[]> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://mangapark.io/'
    };

    const url = 'https://mangapark.io/latest';
    const response = await axios.get(url, { headers });
    const html: string = response.data;
    const $ = cheerio.load(html);
    let mangaEntries: MangaparkManga[] = [];

    $('div.flex.border-b.border-b-base-200.pb-3').each((i, elem) => {
        const title = $(elem).find('h3.font-bold a').text().trim();
        if (!title) return; // Skip empty titles

        const relativeUrl = $(elem).find('h3.font-bold a').attr('href');
        const fullUrl = relativeUrl ? `https://mangapark.io${relativeUrl}` : '';
        const coverImage = $(elem).find('img').attr('src') || '';
        const latestChapter = $(elem).find('a.link-hover.link-primary.visited\\:link-accent').text().trim();

        // Collect and filter genres
        let genres: string[] = [];
        $(elem).find('div.flex.flex-wrap.text-xs.opacity-70 span').each((i, el) => {
            const genre = $(el).text().trim();
            if (genre) genres.push(genre);
        });
        genres = uniqueFilter(genres);
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

    // Remove duplicate manga entries by title
    const uniqueManga: MangaparkManga[] = [];
    const seenTitles = new Set<string>();
    for (const entry of mangaEntries) {
        if (!seenTitles.has(entry.title)) {
            seenTitles.add(entry.title);
            uniqueManga.push(entry);
        }
    }

    console.log(`Scraped Mangapark latest: ${uniqueManga.length} entries`);
    return uniqueManga;
}

/**
 * Scrapes detailed manga info from a Mangapark info page.
 */
export async function scrapeInfoMangapark(infoUrl: string): Promise<any> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://mangapark.io/'
    };

    const response = await axios.get(infoUrl, { headers });
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract title based on provided selectors
    const title = $('h3.text-lg.md\\:text-2xl.font-bold a').first().text().trim();
    const cover_image = $('img.not-prose.shadow-md').attr('src') || '';

    // Combine all paragraphs for the description
    let description = '';
    $('.limit-html.prose .limit-html-p').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) {
            description += txt + '\n';
        }
    });
    description = description.trim();

    // Extract genres from the element containing "Genres:"
    let genresText = '';
    $('div.flex.items-center.flex-wrap').each((i, el) => {
        if ($(el).text().includes("Genres:")) {
            genresText = $(el).text().replace("Genres:", "").trim();
            return false; // exit loop
        }
    });
    let genres = genresText.split(',').map(s => s.trim()).filter(s => s);
    genres = uniqueFilter(genres);

    // Extract release time and status
    const releaseTime = $('time[q-id="54"]').first().text().trim() || '';
    let status = '';
    $('div.flex.flex-col').each((i, el) => {
        if ($(el).text().includes("MPark Upload Status:")) {
            status = $(el).find('span.font-bold.uppercase').first().text().trim();
            return false;
        }
    });

    // Extract chapters from the chapter list container
    let chapters: any[] = [];
    $('div[data-name="chapter-list"] div').each((i, el) => {
        const chapterLink = $(el).find('a.link-hover');
        if (chapterLink.length > 0) {
            const chapterTitle = chapterLink.text().trim();
            let chapterUrl = chapterLink.attr('href') || '';
            if (chapterUrl && !chapterUrl.startsWith('http')) {
                const urlObj = new URL(infoUrl);
                chapterUrl = urlObj.origin + chapterUrl;
            }
            const chapterRelease = $(el).find('time').text().trim();
            // Avoid duplicate chapter titles
            if (!chapters.some(ch => ch.chapterTitle === chapterTitle)) {
                chapters.push({ chapterTitle, chapterUrl, releaseTime: chapterRelease });
            }
        }
    });

    return {
        title,
        cover_image,
        description,
        genres,
        release: releaseTime,
        status,
        chapters,
        totalChapters: chapters.length,
        url: infoUrl
    };
}

/**
 * Scrapes a Mangapark chapter page for its images.
 */
export interface ChapterData {
    chapterTitle: string;
    chapterUrl: string;
    images: string[];
}

export async function scrapeChapterMangapark(chapterUrl: string): Promise<ChapterData> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    try {
        const response = await page.goto(chapterUrl, { waitUntil: 'networkidle', timeout: 30000 });
        if (!response || !response.ok()) {
            throw new Error(`Failed to load page, status: ${response?.status()}`);
        }

        // Scroll down to trigger lazy loading; increase scroll wait if needed.
        await page.evaluate(() => {
            return new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 200;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        // Wait an extra few seconds for images to load
        await page.waitForTimeout(5000);

        // Try to extract the chapter title
        let chapterTitle = "";
        try {
            chapterTitle = await page.$eval("h6.text-lg.space-x-2 a", el => el.textContent?.trim() || "");
        } catch {}
        if (!chapterTitle) {
            try {
                chapterTitle = await page.$eval("h1", el => el.textContent?.trim() || "");
            } catch {}
        }
        if (!chapterTitle) {
            chapterTitle = "Untitled Chapter";
        }

        // Method 1: Extract from all <img> tags
        const imgUrls = await page.$$eval("img", imgs =>
            imgs
                .map(img => (img.getAttribute("src") || img.getAttribute("data-src") || "").trim())
                .filter(src => src.startsWith("http"))
        );

        // Method 2: Extract from inline styles on elements with data-name="image-show"
        const bgUrls = await page.$$eval("div[data-name='image-show']", (elements) => {
            const urls: string[] = [];
            elements.forEach((el) => {
                const style = el.getAttribute("style");
                if (style) {
                    const match = style.match(/background-image:\s*url\(["']?(https:\/\/s\d+\.[^)"']+\.(?:jpg|jpeg|png))["']?\)/i);
                    if (match && match[1]) {
                        urls.push(match[1].trim());
                    }
                }
                // Also check if a child <img> exists in this container
                const img = el.querySelector("img");
                if (img) {
                    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
                    if (src.trim().startsWith("http")) {
                        urls.push(src.trim());
                    }
                }
            });
            return urls;
        });

        // Combine the two methods and deduplicate
        let images = Array.from(new Set([...imgUrls, ...bgUrls]));

        // Method 3: Fallback – use regex on full HTML content if no images found
        if (images.length === 0) {
            const fullHTML = await page.content();
            const regex = /https:\/\/s\d+\.[^"\s]+\.(?:jpg|jpeg|png)/gi;
            const matches = fullHTML.match(regex);
            if (matches) {
                images = Array.from(new Set(matches.map(src => src.trim())));
            }
        }

        await browser.close();

        if (images.length === 0) {
            throw new Error("Chapter images not found");
        }

        return { chapterTitle, chapterUrl, images };
    } catch (error: any) {
        await browser.close();
        throw { detail: `Error fetching chapter: ${error.message || error}` };
    }
}
