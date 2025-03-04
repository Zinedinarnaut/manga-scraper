// src/utils/uniqueFilter.ts
export function uniqueFilter(arr: string[]): string[] {
    return [...new Set(arr.filter(Boolean))];
}
