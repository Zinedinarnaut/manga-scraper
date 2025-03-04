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
// src/index.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const latest_1 = __importDefault(require("./routes/latest"));
const info_1 = __importDefault(require("./routes/info"));
const chapter_1 = __importDefault(require("./routes/chapter"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
// Mount routes
app.use('/latest', latest_1.default);
app.use('/info', info_1.default);
app.use('/chapter', chapter_1.default);
// Image proxy endpoint
const axios_1 = __importDefault(require("axios"));
app.get('/image-proxy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ detail: "Image URL is required" });
    }
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://mangapark.io/'
    };
    try {
        const response = yield axios_1.default.get(imageUrl, { headers, responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        response.data.pipe(res);
    }
    catch (e) {
        res.status(500).json({ detail: "Image not found" });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
