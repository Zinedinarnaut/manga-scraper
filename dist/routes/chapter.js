"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/chapter.ts
const express_1 = require("express");
const mangaController_1 = require("../controllers/mangaController");
const router = (0, express_1.Router)();
router.get('/:manga_id/:chapter_slug', mangaController_1.getChapter);
exports.default = router;
