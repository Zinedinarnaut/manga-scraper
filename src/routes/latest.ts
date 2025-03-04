import express from "express";
import { RequestHandler } from "express";
import { getLatest } from "../controllers/mangaController";

const router = express.Router();

// Force the type as RequestHandler
router.get("/", getLatest as unknown as RequestHandler);

export default router;
