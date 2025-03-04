"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/latest.ts
const express_1 = require("express");
const mangaController_1 = require("../controllers/mangaController");
const router = (0, express_1.Router)();
router.get('/', mangaController_1.getLatest);
exports.default = router;
