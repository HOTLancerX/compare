/**
 * plugin/compare/lib/serverHooks.ts — Server-only compare data enricher.
 *
 * Auto-discovered by hook/serverDataHooks.ts via require.context.
 * Registers a product page enricher that adds compareProducts and
 * categoryProducts to pageData whenever the compare plugin is installed.
 *
 * No imports from product plugin. No manual wiring anywhere.
 * Just drop this file and it works.
 *
 * NEVER import from plugin/compare/index.ts or any client component.
 */

import { registerProductEnricher } from "@/hook/serverDataHooks";
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
    const images = [...new Set([...parseJson<string[]>(info.images, []), ...imgs])].filter(Boolean);

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

// ─── Register product enricher ────────────────────────────────────────────────

registerProductEnricher(async (_pageData, postData) => {
    const compareIdsRaw: string | undefined = postData?.info?._compare;
    const compareIds: string[] = compareIdsRaw
        ? parseJson<string[]>(compareIdsRaw, []).filter(Boolean)
        : [];

    if (!compareIds.length) return {};

    await connectDB();

    const productId  = String(postData?._id ?? "");
    const categoryId = postData?.category ? String(postData.category) : null;
    const productPrefix = await getProductPrefix();

    const compareOids = compareIds.flatMap(id => {
        try { return [new mongoose.Types.ObjectId(id)]; } catch { return []; }
    });

    const currentOid = productId && mongoose.Types.ObjectId.isValid(productId)
        ? new mongoose.Types.ObjectId(productId) : null;

    const [comparePosts, catPosts] = await Promise.all([
        compareOids.length
            ? Post.find({ _id: { $in: compareOids }, status: "published" }).lean() as Promise<any[]>
            : Promise.resolve([]),
        categoryId && currentOid
            ? Post.find({
                category: new mongoose.Types.ObjectId(categoryId),
                status:   "published",
                _id:      { $ne: currentOid },
            }).select("_id title slug").lean() as Promise<any[]>
            : Promise.resolve([]),
    ]);

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
});
