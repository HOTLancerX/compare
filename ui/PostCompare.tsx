"use client";

/**
 * PostCompare.tsx — Compare product selector.
 *
 * FieldProps-compatible component registered on "post.form".
 * Reads ctx?.categoryId and ctx?.postId to auto-load products from the
 * same category. Allows selecting any number of products to compare.
 * The current product is never shown in the list.
 *
 * Value stored in postinfos as JSON array of product _id strings:
 *   name = "_compare"   value = '["id1","id2",...]'
 *
 * API used: GET /post?type=product   (express server via xFetch)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { FieldProps } from "@/hook";
import { xFetch } from "@/lib/express";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Product {
    id: string;
    title: string;
    slug: string;
    category: string | null;
    image: string;
}

function parseIds(raw: string): string[] {
    if (!raw) return [];
    try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter(Boolean) : [];
    } catch {
        return [];
    }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PostCompare({ value, onChange, ctx }: FieldProps) {
    const categoryId   = (ctx?.categoryId   as string)   ?? "";
    const categoryPath = (ctx?.categoryPath as string[]) ?? [];

    const currentId = (ctx?.postId as string) ?? "";

    const [all, setAll]                 = useState<Product[]>([]);
    const [catProducts, setCatProducts] = useState<Product[]>([]);
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>(() => parseIds(value));
    const [debugLog, setDebugLog]       = useState<string[]>([]);

    const initialised    = useRef(false);
    const lastCategoryId = useRef("");

    // Restore from saved value on mount
    useEffect(() => {
        if (initialised.current) return;
        initialised.current = true;
        setSelectedIds(parseIds(value));
    }, [value]);

    // Flush helper
    const flush = useCallback((ids: string[]) => {
        onChange(JSON.stringify(ids));
    }, [onChange]);

    // Fetch category products when categoryId changes
    useEffect(() => {
        const url = `/post?type=product&category=${encodeURIComponent(categoryId)}`;
        setDebugLog(prev => [...prev.slice(-4), `[effect] categoryId="${categoryId}" url="${url}"`]);
        if (!categoryId) { setCatProducts([]); return; }
        setLoading(true);
        xFetch(url, { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                const posts: any[] = data.posts ?? [];
                setDebugLog(prev => [...prev.slice(-4), `[fetch ok] posts=${posts.length} url=${url}`]);
                setCatProducts(
                    posts
                        .filter((p) => String(p._id) !== currentId)
                        .map((p) => ({
                            id: String(p._id),
                            title: p.title ?? "",
                            slug: p.slug ?? "",
                            category: p.category ? String(p.category) : null,
                            image: "",
                        }))
                );
            })
            .catch((err) => {
                setDebugLog(prev => [...prev.slice(-4), `[fetch error] ${err}`]);
                setCatProducts([]);
            })
            .finally(() => setLoading(false));
    }, [categoryId, categoryPath.join(","), currentId]);

    // Reset selected ids when category changes (after mount)
    useEffect(() => {
        if (!initialised.current) return;
        if (lastCategoryId.current !== categoryId) {
            lastCategoryId.current = categoryId;
            setSelectedIds([]);
            flush([]);
        }
    }, [categoryId, flush]);

    // Fetch all products (for search) — deferred until search is used
    const [allFetched, setAllFetched] = useState(false);
    const fetchAll = useCallback(() => {
        if (allFetched) return;
        setAllFetched(true);
        xFetch("/post?type=product", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                const posts: any[] = data.posts ?? [];
                setAll(
                    posts
                        .filter((p) => String(p._id) !== currentId)
                        .map((p) => ({
                            id: String(p._id),
                            title: p.title ?? "",
                            slug: p.slug ?? "",
                            category: p.category ? String(p.category) : null,
                            image: "",
                        }))
                );
            })
            .catch(() => setAll([]));
    }, [allFetched, currentId]);

    // Toggle a product
    const toggle = (id: string) => {
        const next = selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id];
        setSelectedIds(next);
        flush(next);
    };

    const remove = (id: string) => {
        const next = selectedIds.filter((x) => x !== id);
        setSelectedIds(next);
        flush(next);
    };

    // Derived lists
    const q = search.trim().toLowerCase();

    // When searching: search across all products
    const searchFiltered = q
        ? all.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
        : null;

    const displayList = searchFiltered ?? catProducts;

    // Selected product objects (from all known)
    const knownProducts = [...catProducts, ...all];
    const seen = new Set<string>();
    const deduped = knownProducts.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    const selectedProducts = selectedIds
        .map((id) => deduped.find((p) => p.id === id))
        .filter(Boolean) as Product[];

    // ── No category selected ────────────────────────────────────────────────
    if (!categoryId) {
        return (
            <div className="border rounded-lg p-6 bg-gray-50 text-center">
                <Icon icon="mdi:information-outline" width="40" height="40" className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Select a product category to load comparable products.</p>
                {/* DEBUG */}
                <pre className="mt-2 text-left text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {`ctx.categoryId="${categoryId}" ctx.postId="${currentId}"\nraw ctx: ${JSON.stringify(ctx)}`}
                </pre>
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-3">

            {/* DEBUG */}
            <pre className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 overflow-auto whitespace-pre-wrap">
                {`categoryId="${categoryId}" currentId="${currentId}" catProducts=${catProducts.length} loading=${loading}\n`}
                {debugLog.join("\n")}
            </pre>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon icon="mdi:compare" width="20" height="20" className="text-indigo-500" />
                    <span className="text-sm font-semibold">Compare Products</span>
                </div>
                {selectedIds.length > 0 && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {selectedIds.length} selected
                    </span>
                )}
            </div>

            {/* Selected chips */}
            {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedProducts.map((p) => (
                        <span
                            key={p.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-xs font-medium"
                        >
                            {p.title}
                            <button
                                type="button"
                                onClick={() => remove(p.id)}
                                className="ml-0.5 hover:text-red-600 transition-colors"
                            >
                                <Icon icon="mdi:close" width="11" height="11" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Icon
                    icon="mdi:magnify"
                    width="16" height="16"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { fetchAll(); setSearch(e.target.value); }}
                    placeholder="Search all products…"
                    className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none transition focus:border-indigo-500"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <Icon icon="mdi:close" width="14" height="14" />
                    </button>
                )}
            </div>

            {/* Product list */}
            {loading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                    <Icon icon="mdi:loading" width="18" height="18" className="animate-spin" />
                    Loading products…
                </div>
            ) : displayList.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400">
                    {q ? "No products match your search." : "No other products in this category."}
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto divide-y">
                        {displayList.map((product) => {
                            const isSelected = selectedIds.includes(product.id);
                            return (
                                <label
                                    key={product.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                        isSelected
                                            ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                                            : "hover:bg-gray-50"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggle(product.id)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                    />
                                    <div className="w-8 h-8 rounded border bg-gray-100 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:cart-large-bold" width="14" height="14" className="text-gray-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm truncate ${isSelected ? "font-medium text-indigo-800" : "text-gray-800"}`}>
                                            {product.title}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{product.slug}</p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer hint */}
            {!q && catProducts.length > 0 && !loading && (
                <p className="text-xs text-gray-400">
                    Showing {catProducts.length} product{catProducts.length !== 1 ? "s" : ""} from the same category.
                    {all.length > catProducts.length && ` Use search to find products from other categories.`}
                </p>
            )}
            {q && searchFiltered !== null && !loading && (
                <p className="text-xs text-gray-400">
                    {searchFiltered.length} result{searchFiltered.length !== 1 ? "s" : ""} across all products.
                </p>
            )}
        </div>
    );
}
