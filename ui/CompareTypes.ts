/* ------------------------------------------------------------------ */
/*  CompareTypes.ts — shared types & pure helpers for the Compare UI  */
/*                                                                      */
/*  All shapes mirror exactly what /api/compare returns, which in turn  */
/*  mirrors the _variate and _specifications blobs written by the       */
/*  product plugin's admin form components (Variate.tsx, PostSpec...).  */
/* ------------------------------------------------------------------ */

// ── Specification types (from _specifications blob) ───────────────────────────

export interface SpecField {
    title: string;
    description: string;
    image?: string;
}

export interface SpecBox {
    title: string;
    fields: SpecField[];
}

// ── Variant shape (from _variate.variants) ────────────────────────────────────

export interface CompareVariant {
    id?: string;
    handle?: string;
    color?: string;
    options?: Record<string, string>;
    image?: string;
    gallery?: string[];
    price?: string;
    quantity?: string;
}

// ── SelectedAttribute shape (from _variate.selectedAttributes) ────────────────

export interface CompareSelectedAttribute {
    label: string;
    displayStyle?: string;
    position?: number;
    values?: string[];
}

// ── Core product shape returned by /api/compare ───────────────────────────────

export interface CompareProduct {
    id: string;
    slug: string;
    title: string;
    /** Full URL path built from the DB permalink prefix, e.g. /product/my-slug */
    url: string;
    images?: string[];
    sellingPrice?: number;
    regularPrice?: number;
    priceType?: string;
    specifications?: SpecBox[];
    variants?: CompareVariant[];
    selectedAttributes?: CompareSelectedAttribute[];
}

// ── Component props ───────────────────────────────────────────────────────────

export interface CompareProps {
    /** The current (active) product — always pinned as column 0 */
    current: CompareProduct;
    /** Products pre-selected in the admin compare field */
    compareProducts: CompareProduct[];
    /** All products in the same category — used for the swap dropdown */
    categoryProducts: CompareProduct[];
    currencySymbol?: string;
    /** 1 = horizontal table (default), 2 = stacked card (Apple style) */
    style?: number;
}

export interface StyleProps {
    columns: CompareProduct[];
    fieldMatrix: FieldRow[];
    categoryProducts: CompareProduct[];
    currencySymbol: string;
    current: CompareProduct;
    swapColumn: (colIndex: number, newProduct: CompareProduct) => void;
}

export interface FieldRow {
    boxTitle: string;
    fieldTitle: string;
    image?: string;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Collect every unique spec field across all products in order.
 * Returns an empty array when no products have specifications filled in.
 */
export function buildFieldMatrix(products: CompareProduct[]): FieldRow[] {
    const seen = new Set<string>();
    const rows: FieldRow[] = [];
    for (const p of products) {
        for (const box of p.specifications ?? []) {
            for (const field of box.fields ?? []) {
                if (!field.description?.trim()) continue; // skip empty fields
                const key = `${box.title}||${field.title}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    rows.push({ boxTitle: box.title, fieldTitle: field.title, image: field.image });
                }
            }
        }
    }
    return rows;
}

/**
 * Look up a spec field value for a product. Returns '—' when not found.
 */
export function getFieldValue(product: CompareProduct, boxTitle: string, fieldTitle: string): string {
    for (const box of product.specifications ?? []) {
        if (box.title === boxTitle) {
            const field = box.fields?.find(f => f.title === fieldTitle);
            if (field?.description?.trim()) return field.description;
        }
    }
    return '—';
}

/**
 * Get the display price for a product.
 * For single price type: sellingPrice || regularPrice.
 * For variant type: 0 (variant prices shown individually).
 */
export function getDisplayPrice(p: CompareProduct): number {
    if (!p.priceType || p.priceType === 'single') {
        return p.sellingPrice || p.regularPrice || 0;
    }
    return 0;
}

/**
 * Format a price number as a locale string.
 */
export function fmtPrice(n: number): string {
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Get the first image of a product (variant images first, then product images).
 */
export function getProductImage(p: CompareProduct): string | undefined {
    // Prefer first variant image
    for (const v of p.variants ?? []) {
        if (v.image) return v.image;
    }
    return p.images?.[0];
}
