// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import latestRoutes from './routes/latest';
import infoRoutes from './routes/info';
import chapterRoutes from './routes/chapter';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use('/latest', latestRoutes);
app.use('/info', infoRoutes);
app.use('/chapter', chapterRoutes);

// Image proxy endpoint
import axios from 'axios';
app.get('/image-proxy', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
        res.status(400).json({ detail: "Image URL is required" });
        return;
    }
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://mangapark.io/'
    };
    try {
        const response = await axios.get(imageUrl, { headers, responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        response.data.pipe(res);
    } catch (e) {
        res.status(500).json({ detail: "Image not found" });
    }
}));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
