/**
 * plugin/compare/lib/serverHooks.ts — Server-only compare data helper.
 *
 * Exports fetchCompareData() which is called by plugin/product/lib/serverHooks.ts
 * when building pageData for product pages.
 *
 * NOT registered as a standalone serverDataHook — the product hook merges
 * this data into its own response so there is a single pageData object.
 *
 * NEVER import from plugin/compare/index.ts or any client component.
 */

import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Permalink from "@/models/permalink";
import mongoose from "mongoose";
import type { CompareProduct } from "../ui/CompareTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string | undefined, fallback: T): T {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
}

async function getProductPrefix(): Promise<string> {
    const doc = await Permalink.findOne({ contentType: "product" }).lean() as any;
    return ((doc?.prefix as string) ?? "product").trim().replace(/^\/+|\/+$/g, "") || "product";
}

function toCompareProduct(post: any, info: Record<string, string>, productPrefix: string): CompareProduct {
    const variate       = parseJson<Record<string, any>>(info._variate, {});
    const priceType     = (variate.priceType ?? "single") as string;
    const sellingPrice  = parseFloat(variate.sellingprice ?? "0") || 0;
    const regularPrice  = parseFloat(variate.regularprice ?? "0") || 0;
    const variants: any[] = variate.variants ?? [];

    const imgs: string[] = [];
    for (const v of variants) {
        if (v.image)           imgs.push(v.image);
        if (v.gallery?.length) imgs.push(...v.gallery);
    }
    const defaultImages = parseJson<string[]>(info.images, []);
    const images = [...new Set([...defaultImages, ...imgs])].filter(Boolean);

    return {
        id:    String(post._id),
        slug:  post.slug ?? "",
        title: post.title ?? "",
        url:   `/${productPrefix}/${post.slug ?? ""}`,
        images,
        sellingPrice,
        regularPrice,
        priceType,
        specifications: parseJson<any[]>(info._specifications, []),
        variants: variants.map((v: any) => ({
            id: v.id, handle: v.handle, color: v.color,
            options: v.options, image: v.image, gallery: v.gallery,
        })),
        selectedAttributes: (variate.selectedAttributes ?? []).map((a: any) => ({
            label: a.label, displayStyle: a.displayStyle,
            position: a.position, values: a.values,
        })),
    };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ComparePageData {
    compareProducts:  CompareProduct[];
    categoryProducts: CompareProduct[];
}

/**
 * Fetch compare products and category products for a product page.
 * Called server-side by product/lib/serverHooks.ts.
 *
 * @param compareIds - product IDs from the _compare field
 * @param categoryId - the product's category ObjectId string (for swap dropdown)
 * @param currentId  - the current product's _id (excluded from category results)
 */
export async function fetchCompareData(
    compareIds: string[],
    categoryId: string | null,
    currentId:  string
): Promise<ComparePageData> {
    if (!compareIds.length) {
        return { compareProducts: [], categoryProducts: [] };
    }

    await connectDB();

    const productPrefix = await getProductPrefix();

    // ── Fetch compare products ────────────────────────────────────────────────
    const compareOids = compareIds.flatMap(id => {
        try { return [new mongoose.Types.ObjectId(id)]; } catch { return []; }
    });

    const currentOid = mongoose.Types.ObjectId.isValid(currentId)
        ? new mongoose.Types.ObjectId(currentId) : null;

    const [comparePosts, catPosts] = await Promise.all([
        compareOids.length
            ? Post.find({ _id: { $in: compareOids }, status: "published" }).lean() as Promise<any[]>
            : Promise.resolve([]),
        categoryId && currentOid
            ? Post.find({
                category: new mongoose.Types.ObjectId(categoryId),
                status: "published",
                _id: { $ne: currentOid },
            }).select("_id title slug").lean() as Promise<any[]>
            : Promise.resolve([]),
    ]);

    // ── Batch-fetch all post infos ────────────────────────────────────────────
    const allIds = [
        ...comparePosts.map((p: any) => p._id),
        ...catPosts.map((p: any) => p._id),
    ];

    const allInfoRecords = allIds.length
        ? (await PostInfo.find({ postId: { $in: allIds } }).lean() as any[])
        : [];

    const infoByPost: Record<string, Record<string, string>> = {};
    for (const r of allInfoRecords) {
        const key = String(r.postId);
        if (!infoByPost[key]) infoByPost[key] = {};
        infoByPost[key][r.name] = r.value;
    }

    const compareProducts = compareOids
        .map(oid => comparePosts.find((p: any) => String(p._id) === String(oid)))
        .filter(Boolean)
        .map((p: any) => toCompareProduct(p, infoByPost[String(p._id)] ?? {}, productPrefix));

    const categoryProducts = catPosts
        .map((p: any) => toCompareProduct(p, infoByPost[String(p._id)] ?? {}, productPrefix));

    return { compareProducts, categoryProducts };
}
