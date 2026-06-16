'use client';

/**
 * Compare.tsx — Self-contained product comparison table.
 *
 * Layout: header row (image + title + price) then spec rows grouped by box.
 * Each spec row: field name | col-0 value | col-1 value | ...
 * Fully responsive via overflow-x-auto on the wrapper.
 * No external slider needed.
 */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { CompareProduct, CompareProps } from './CompareTypes';
import { getDisplayPrice, fmtPrice, getProductImage } from './CompareTypes';

export default function Compare({
    current,
    compareProducts,
    categoryProducts,
    currencySymbol = '$',
}: CompareProps) {
    const [columns, setColumns] = useState<CompareProduct[]>([current, ...compareProducts]);

    useEffect(() => {
        setColumns(prev => [current, ...prev.slice(1)]);
    }, [current.id]);

    if (columns.length < 2) return null;

    const swapColumn = (colIndex: number, newProduct: CompareProduct) =>
        setColumns(prev => prev.map((col, i) => (i === colIndex ? newProduct : col)));

    // Collect unique spec rows (skip fields with no description)
    const seen = new Set<string>();
    const specRows: { boxTitle: string; fieldTitle: string }[] = [];
    for (const col of columns) {
        for (const box of col.specifications ?? []) {
            for (const field of box.fields ?? []) {
                if (!field.description?.trim()) continue;
                const key = `${box.title}||${field.title}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    specRows.push({ boxTitle: box.title, fieldTitle: field.title });
                }
            }
        }
    }

    const getVal = (col: CompareProduct, boxTitle: string, fieldTitle: string): string => {
        for (const box of col.specifications ?? []) {
            if (box.title !== boxTitle) continue;
            const f = box.fields?.find(f => f.title === fieldTitle);
            if (f?.description?.trim()) return f.description;
        }
        return '—';
    };

    // Group spec rows by box title
    const groups: { boxTitle: string; rows: typeof specRows }[] = [];
    for (const row of specRows) {
        const last = groups[groups.length - 1];
        if (last?.boxTitle === row.boxTitle) last.rows.push(row);
        else groups.push({ boxTitle: row.boxTitle, rows: [row] });
    }

    return (
        <section className="my-8 bg-white rounded-2xl overflow-hidden border border-gray-200">
            {/* Section title */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Compare products</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${columns.length * 180 + 160}px` }}>

                    {/* ── Product header row ── */}
                    <thead>
                        <tr className="border-b border-gray-200">
                            {/* Field label column header — empty */}
                            <th className="w-40 min-w-[160px] px-4 py-3 bg-gray-50" />

                            {columns.map((col, colIdx) => {
                                const img      = getProductImage(col);
                                const price    = getDisplayPrice(col);
                                const isPinned = colIdx === 0;

                                return (
                                    <th key={col.id}
                                        className="px-4 py-4 align-top text-center font-normal border-l border-gray-100"
                                        style={{ minWidth: '160px' }}>
                                        <div className="flex flex-col items-center gap-2">

                                            {/* Image */}
                                            <Link href={col.url} className="block">
                                                {img ? (
                                                    <Image src={img} alt={col.title}
                                                        width={96} height={96}
                                                        className="w-20 h-20 md:w-24 md:h-24 object-contain mx-auto rounded-lg border border-gray-100 bg-gray-50" />
                                                ) : (
                                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                                                        <Icon icon="mdi:image-off" width="28" height="28" className="text-gray-300" />
                                                    </div>
                                                )}
                                            </Link>

                                            {/* Title */}
                                            {isPinned ? (
                                                <div className="flex items-center gap-1 justify-center flex-wrap">
                                                    <Link href={col.url}
                                                        className="text-sm font-semibold text-gray-900 hover:text-main transition-colors text-center">
                                                        {col.title}
                                                    </Link>
                                                    <Icon icon="mdi:pin" width="12" height="12" className="text-main shrink-0" />
                                                </div>
                                            ) : (
                                                <ProductSwap
                                                    selected={col}
                                                    options={categoryProducts}
                                                    pinned={current}
                                                    currentColumns={columns}
                                                    onSelect={p => swapColumn(colIdx, p)}
                                                />
                                            )}

                                            {/* Price */}
                                            {price > 0 && (
                                                <span className="text-sm font-bold text-main">
                                                    {currencySymbol} {fmtPrice(price)}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    {/* ── Spec rows ── */}
                    {groups.length > 0 && (
                        <tbody>
                            {groups.map(group => (
                                <React.Fragment key={group.boxTitle}>
                                    {/* Box section header */}
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td colSpan={columns.length + 1}
                                            className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {group.boxTitle}
                                        </td>
                                    </tr>

                                    {/* Field rows */}
                                    {group.rows.map((row, ri) => (
                                        <tr key={`${row.boxTitle}||${row.fieldTitle}`}
                                            className={`border-t border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>

                                            {/* Field name label */}
                                            <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50/80 border-r border-gray-100 align-top w-40 min-w-[160px]">
                                                {row.fieldTitle}
                                            </td>

                                            {/* Values per column */}
                                            {columns.map(col => {
                                                const val = getVal(col, row.boxTitle, row.fieldTitle);
                                                return (
                                                    <td key={col.id}
                                                        className="px-4 py-3 text-sm text-center border-l border-gray-100 align-top">
                                                        {val === '—'
                                                            ? <span className="text-gray-300 select-none">—</span>
                                                            : <span className="text-gray-700">{val}</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    )}
                </table>

                {groups.length === 0 && (
                    <p className="px-6 py-6 text-sm text-gray-400 text-center">
                        No specifications available for comparison.
                    </p>
                )}
            </div>
        </section>
    );
}

/* ── Swap dropdown ───────────────────────────────────────────────────────────── */

function ProductSwap({
    selected, options, pinned, currentColumns, onSelect,
}: {
    selected: CompareProduct;
    options: CompareProduct[];
    pinned: CompareProduct;
    currentColumns: CompareProduct[];
    onSelect: (p: CompareProduct) => void;
}) {
    const [open, setOpen] = useState(false);

    const available = options.filter(o =>
        o.id !== pinned.id &&
        (o.id === selected.id || !currentColumns.some(c => c.id === o.id))
    );

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-main transition-colors text-center">
                <span className="line-clamp-2 max-w-[130px]">{selected.title}</span>
                <Icon icon="mdi:chevron-down" width="14" height="14" className="shrink-0 text-gray-400 mt-0.5" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                        {available.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400 text-center">No other products</p>
                        ) : (
                            <div className="py-1">
                                {available.map(p => {
                                    const img = getProductImage(p);
                                    return (
                                        <button key={p.id} type="button"
                                            onClick={() => { onSelect(p); setOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${p.id === selected.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                                            {img ? (
                                                <Image src={img} alt={p.title} width={32} height={32}
                                                    className="w-8 h-8 object-contain rounded border border-gray-100 shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-100 rounded border border-gray-100 flex items-center justify-center shrink-0">
                                                    <Icon icon="mdi:image-off" width="14" height="14" className="text-gray-300" />
                                                </div>
                                            )}
                                            <span className="truncate flex-1">{p.title}</span>
                                            {p.id === selected.id && (
                                                <Icon icon="mdi:check" width="14" height="14" className="text-blue-600 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
