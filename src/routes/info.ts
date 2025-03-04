// src/routes/info.ts
import { Router } from 'express';
import { RequestHandler } from "express";
import { getInfo } from '../controllers/mangaController';

const router = Router();

router.get('/', getInfo as unknown as RequestHandler);

export default router;
