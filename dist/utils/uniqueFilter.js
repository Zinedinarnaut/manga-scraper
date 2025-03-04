"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueFilter = uniqueFilter;
// src/utils/uniqueFilter.ts
function uniqueFilter(arr) {
    return [...new Set(arr.filter(Boolean))];
}
