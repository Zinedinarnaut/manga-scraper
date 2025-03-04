// src/routes/chapter.ts
import {RequestHandler, Router} from 'express';
import { getChapter } from '../controllers/mangaController';

const router = Router();

router.get('/:manga_id/:chapter_slug', getChapter as unknown as RequestHandler);

export default router;
