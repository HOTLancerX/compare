'use client';

/**
 * CompareShared.tsx
 *
 * Shared hooks, color swatches, product header cards, and the swap dropdown.
 * All logic is specific to this project's data model:
 *   - Variants from _variate.variants (have .color hex, .options, .image)
 *   - selectedAttributes from _variate.selectedAttributes (have .displayStyle)
 *   - Product links use the `url` field returned by /api/compare (built from DB permalink prefix)
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { CompareProduct, CompareVariant } from './CompareTypes';
import { getDisplayPrice, fmtPrice, getProductImage } from './CompareTypes';

/* ------------------------------------------------------------------ */
/*  useGridState                                                        */
/*                                                                      */
/*  Desktop:  ≤4 cols → all shown; 5+ → pinned + 1 active slot        */
/*  Mobile:   2 cols → static grid; 3+ → react-slick (2 slides)       */
/* ------------------------------------------------------------------ */

export function useGridState(columns: CompareProduct[]) {
    const [activeIdx, setActiveIdx] = useState(1);
    const total = columns.length;
    const isDesktopSlider = total > 4;

    const desktopColumns  = isDesktopSlider ? [columns[0], columns[activeIdx]] : columns;
    const desktopGridCols = isDesktopSlider ? 2 : total;

    const goPrev = () => setActiveIdx(p => (p - 1 < 1 ? total - 1 : p - 1));
    const goNext = () => setActiveIdx(p => (p + 1 >= total ? 1 : p + 1));

    return { desktopColumns, desktopGridCols, isDesktopSlider, activeIdx, goPrev, goNext, mobileSlides: columns, total };
}

/* ------------------------------------------------------------------ */
/*  CompareColorSwatches                                                */
/*                                                                      */
/*  Picks the best attribute axis to show as color swatches:           */
/*   1. Attributes with displayStyle 'color' or 'color-text'          */
/*   2. Any attribute where at least one variant has a .color value    */
/*   3. First attribute (fallback — shows initial-letter circles)      */
/*                                                                      */
/*  Each swatch links to /product/[slug]?handle=[variantHandle]        */
/*  Max 6 swatches shown; overflow shown as "+N"                       */
/* ------------------------------------------------------------------ */

export function CompareColorSwatches({ product }: { product: CompareProduct }) {
    const variants = product.variants ?? [];
    if (variants.length === 0) return null;

    // Build attribute value map from variants
    const attrMap: Record<string, Set<string>> = {};
    for (const v of variants) {
        if (!v.options) continue;
        for (const [key, val] of Object.entries(v.options)) {
            if (!attrMap[key]) attrMap[key] = new Set();
            attrMap[key].add(val);
        }
    }
    const attrLabels = Object.keys(attrMap);
    if (attrLabels.length === 0) return null;

    // Helpers
    const getVariantForValue = (value: string): CompareVariant | undefined =>
        variants.find(v => v.options && Object.values(v.options).includes(value));

    const getColor = (value: string) => getVariantForValue(value)?.color;
    const getHandle = (value: string) => getVariantForValue(value)?.handle;

    // Sort labels by saved position
    const sortedLabels = [...attrLabels].sort((a, b) => {
        const posA = product.selectedAttributes?.find(s => s.label === a)?.position ?? 0;
        const posB = product.selectedAttributes?.find(s => s.label === b)?.position ?? 0;
        return posA - posB;
    });

    // Build ordered values for a label
    const getValues = (label: string): string[] => {
        const saved = product.selectedAttributes?.find(a => a.label === label);
        if (saved?.values?.length) {
            const kept  = saved.values.filter(v => attrMap[label]?.has(v));
            const extra = Array.from(attrMap[label] || []).filter(v => !kept.includes(v));
            return [...kept, ...extra];
        }
        return Array.from(attrMap[label] || []);
    };

    // Pick best axis
    let targetLabel =
        sortedLabels.find(l => {
            const s = product.selectedAttributes?.find(a => a.label === l);
            return s?.displayStyle === 'color' || s?.displayStyle === 'color-text';
        }) ??
        sortedLabels.find(l => getValues(l).some(v => !!getColor(v))) ??
        sortedLabels[0];

    if (!targetLabel) return null;

    const values = getValues(targetLabel);
    if (values.length === 0) return null;

    // Deduplicate by color hex (if available) or value
    const seen = new Set<string>();
    const swatches: { value: string; color?: string; handle?: string }[] = [];
    for (const value of values) {
        const color = getColor(value);
        const key   = color || value;
        if (seen.has(key)) continue;
        seen.add(key);
        swatches.push({ value, color, handle: getHandle(value) });
    }

    if (swatches.length === 0) return null;

    const MAX = 6;
    const visible  = swatches.slice(0, MAX);
    const overflow = swatches.length - MAX;

    return (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
            {visible.map(swatch => {
                const href = swatch.handle
                    ? `${product.url}?${encodeURIComponent(swatch.handle)}`
                    : product.url;
                return (
                    <Link
                        key={swatch.value}
                        href={href}
                        title={swatch.value}
                        className="relative flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow ring-1 ring-gray-300 hover:ring-main hover:scale-110 transition-transform shrink-0"
                        style={swatch.color ? { backgroundColor: swatch.color } : { backgroundColor: '#e5e7eb' }}
                    >
                        {!swatch.color && (
                            <span className="text-[9px] font-bold text-gray-500 leading-none select-none">
                                {swatch.value.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className="sr-only">{swatch.value}</span>
                    </Link>
                );
            })}
            {overflow > 0 && (
                <span className="text-xs text-gray-500 font-medium">+{overflow}</span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  ProductDropdown — swap any non-pinned column                       */
/* ------------------------------------------------------------------ */

interface ProductDropdownProps {
    selected: CompareProduct;
    options: CompareProduct[];
    pinned: CompareProduct;
    currentColumns: CompareProduct[];
    onSelect: (p: CompareProduct) => void;
}

export function ProductDropdown({ selected, options, pinned, currentColumns, onSelect }: ProductDropdownProps) {
    const [open, setOpen] = useState(false);

    // Only show products not already in another column (except the selected one)
    const available = options.filter(
        o => o.id !== pinned.id && (o.id === selected.id || !currentColumns.some(c => c.id === o.id))
    );

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-center gap-1 w-full text-sm font-medium text-gray-800 hover:text-main transition-colors border-b border-gray-300 pb-1"
            >
                <span className="truncate max-w-[130px] text-center">{selected.title}</span>
                <Icon icon="mdi:chevron-down" width="16" height="16" className="shrink-0 text-gray-500" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                        {available.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400 text-center">No other products</p>
                        ) : (
                            available.map(p => {
                                const img = getProductImage(p);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { onSelect(p); setOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${p.id === selected.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`}
                                    >
                                        {img ? (
                                            <Image src={img} alt={p.title} width={32} height={32}
                                                className="w-8 h-8 object-contain rounded border shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center shrink-0">
                                                <Icon icon="mdi:image-off" width="14" height="14" className="text-gray-300" />
                                            </div>
                                        )}
                                        <span className="truncate flex-1">{p.title}</span>
                                        {p.id === selected.id && (
                                            <Icon icon="mdi:check" width="14" height="14" className="ml-auto shrink-0 text-blue-600" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  ProductCard — Style 1 column header                                */
/* ------------------------------------------------------------------ */

interface ProductCardProps {
    col: CompareProduct;
    colIdx: number;
    columns: CompareProduct[];
    categoryProducts: CompareProduct[];
    currencySymbol: string;
    current: CompareProduct;
    swapColumn: (colIndex: number, newProduct: CompareProduct) => void;
    imageSize?: 'sm' | 'md';
}

export function ProductCard({ col, colIdx, columns, categoryProducts, currencySymbol, current, swapColumn, imageSize = 'md' }: ProductCardProps) {
    const imgSize  = imageSize === 'sm' ? 112 : 160;
    const imgClass = imageSize === 'sm' ? 'w-28 h-28 object-contain mx-auto' : 'w-32 h-32 md:w-40 md:h-40 object-contain mx-auto';
    const img      = getProductImage(col);
    const price    = getDisplayPrice(col);

    return (
        <div className="flex flex-col items-center px-3 py-4 gap-3">
            {colIdx === 0 ? (
                <div className="flex items-center gap-1 font-semibold text-sm text-gray-800 border-b-2 border-main pb-1 w-full justify-center">
                    <span className="truncate max-w-[140px] text-center">{col.title}</span>
                    <Icon icon="mdi:pin" width="14" height="14" className="text-main shrink-0" />
                </div>
            ) : (
                <ProductDropdown selected={col} options={categoryProducts} pinned={current}
                    currentColumns={columns} onSelect={p => swapColumn(colIdx, p)} />
            )}
            <Link href={col.url} className="block">
                {img ? (
                    <Image src={img} alt={col.title} width={imgSize} height={imgSize} className={imgClass} />
                ) : (
                    <div className={`${imageSize === 'sm' ? 'w-28 h-28' : 'w-32 h-32 md:w-40 md:h-40'} bg-gray-100 rounded-lg flex items-center justify-center mx-auto`}>
                        <Icon icon="mdi:image-off" width="40" height="40" className="text-gray-300" />
                    </div>
                )}
            </Link>
            <CompareColorSwatches product={col} />
            {price > 0 && (
                <span className="text-base font-bold text-main">
                    {currencySymbol} {fmtPrice(price)}
                </span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  ProductCard2 — Style 2 column header                               */
/* ------------------------------------------------------------------ */

export function ProductCard2({ col, colIdx, columns, categoryProducts, currencySymbol, current, swapColumn, imageSize = 'md' }: ProductCardProps) {
    const imgSize  = imageSize === 'sm' ? 112 : 176;
    const imgClass = imageSize === 'sm' ? 'w-28 h-28 object-contain mx-auto' : 'w-36 h-36 md:w-44 md:h-44 object-contain mx-auto';
    const img      = getProductImage(col);
    const price    = getDisplayPrice(col);

    return (
        <div className="flex flex-col items-center px-2 md:px-4 pt-2 md:pt-4 gap-3">
            {colIdx === 0 ? (
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 border-b-2 border-main pb-1 w-full justify-center">
                    <span className="truncate max-w-[150px] text-center">{col.title}</span>
                    <Icon icon="mdi:pin" width="13" height="13" className="text-main shrink-0" />
                </div>
            ) : (
                <ProductDropdown selected={col} options={categoryProducts} pinned={current}
                    currentColumns={columns} onSelect={p => swapColumn(colIdx, p)} />
            )}
            <Link href={col.url} className="block">
                {img ? (
                    <Image src={img} alt={col.title} width={imgSize} height={imgSize} className={imgClass} />
                ) : (
                    <div className={`${imageSize === 'sm' ? 'w-28 h-28' : 'w-36 h-36 md:w-44 md:h-44'} bg-gray-100 rounded-xl flex items-center justify-center mx-auto`}>
                        <Icon icon="mdi:image-off" width="44" height="44" className="text-gray-300" />
                    </div>
                )}
            </Link>
            <CompareColorSwatches product={col} />
            {price > 0 && (
                <span className="text-sm font-bold text-main">
                    {currencySymbol} {fmtPrice(price)}
                </span>
            )}
        </div>
    );
}
