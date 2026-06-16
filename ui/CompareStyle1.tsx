'use client';

/**
 * CompareStyle1.tsx — Horizontal table layout.
 *
 * Desktop: label column (200px) + product columns side by side.
 *   ≤4 products: all shown.
 *   5+ products: pinned column + 1 active slot with prev/next arrows.
 *
 * Mobile:
 *   2 products: static 2-col grid.
 *   3+ products: react-slick slider, 2 slides at a time.
 *
 * Spec rows are grouped under collapsible section headers (box titles).
 * When there are no specifications, only the product header row is shown.
 */

import Image from 'next/image';
import { Icon } from '@iconify/react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import type { StyleProps } from './CompareTypes';
import { getFieldValue } from './CompareTypes';
import { useGridState, ProductCard } from './CompareShared';

export default function CompareStyle1({
    columns, fieldMatrix, categoryProducts, currencySymbol, current, swapColumn,
}: StyleProps) {
    const {
        desktopColumns, desktopGridCols, isDesktopSlider,
        activeIdx, goPrev, goNext, mobileSlides, total,
    } = useGridState(columns);

    const desktopColIndices = isDesktopSlider
        ? [0, activeIdx]
        : columns.map((_, i) => i);

    // Group field rows by box title for section headers
    const groups: { boxTitle: string; rows: typeof fieldMatrix }[] = [];
    for (const row of fieldMatrix) {
        const last = groups[groups.length - 1];
        if (last?.boxTitle === row.boxTitle) last.rows.push(row);
        else groups.push({ boxTitle: row.boxTitle, rows: [row] });
    }

    const slickSettings = {
        dots: false, infinite: false, speed: 300,
        slidesToShow: 2, slidesToScroll: 1,
        arrows: false, swipeToSlide: true,
    };

    const colTemplate = `200px repeat(${desktopGridCols}, minmax(160px, 1fr))`;

    return (
        <section className="my-10">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                Compare {current.title.split(' ').slice(0, 4).join(' ')} models
            </h2>

            {/* ── DESKTOP ── */}
            <div className="hidden md:block overflow-x-auto">
                <div className="min-w-max">

                    {/* Header row */}
                    <div className="grid border-b" style={{ gridTemplateColumns: colTemplate }}>
                        <div className="flex items-center justify-center p-4">
                            {isDesktopSlider && (
                                <div className="flex gap-2">
                                    <button type="button" onClick={goPrev} aria-label="Previous"
                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                                        <Icon icon="mdi:chevron-left" width="18" height="18" />
                                    </button>
                                    <button type="button" onClick={goNext} aria-label="Next"
                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                                        <Icon icon="mdi:chevron-right" width="18" height="18" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {desktopColumns.map((col, i) => (
                            <ProductCard key={col.id} col={col} colIdx={desktopColIndices[i]}
                                columns={columns} categoryProducts={categoryProducts}
                                currencySymbol={currencySymbol} current={current} swapColumn={swapColumn} />
                        ))}
                    </div>

                    {/* Spec rows */}
                    {groups.map(group => (
                        <div key={group.boxTitle}>
                            {/* Box title row */}
                            <div className="grid bg-gray-50 border-b border-t" style={{ gridTemplateColumns: colTemplate }}>
                                <div className="px-4 py-2 font-semibold text-gray-700 text-sm flex items-center gap-2">
                                    <Icon icon="mdi:folder-open" width="16" height="16" className="text-main shrink-0" />
                                    {group.boxTitle}
                                </div>
                                {desktopColumns.map(col => <div key={col.id} />)}
                            </div>

                            {/* Field rows */}
                            {group.rows.map((row, rowIdx) => (
                                <div key={`${row.boxTitle}||${row.fieldTitle}`}
                                    className={`grid border-b ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                    style={{ gridTemplateColumns: colTemplate }}>
                                    <div className="px-4 py-3 flex flex-col gap-1 justify-center">
                                        {row.image && (
                                            <Image src={row.image} alt={row.fieldTitle}
                                                width={32} height={32} className="w-8 h-8 object-contain" />
                                        )}
                                        <span className="text-sm font-medium text-gray-600">{row.fieldTitle}</span>
                                    </div>
                                    {desktopColumns.map(col => {
                                        const val = getFieldValue(col, row.boxTitle, row.fieldTitle);
                                        return (
                                            <div key={col.id} className="px-4 py-3 text-sm text-gray-700 text-center flex items-center justify-center">
                                                {val === '—'
                                                    ? <span className="text-gray-300 text-lg">—</span>
                                                    : <span>{val}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── MOBILE ── */}
            <div className="md:hidden">
                {total === 2 ? (
                    <div>
                        <div className="grid grid-cols-2 border-b">
                            {columns.map((col, i) => (
                                <ProductCard key={col.id} col={col} colIdx={i}
                                    columns={columns} categoryProducts={categoryProducts}
                                    currencySymbol={currencySymbol} current={current}
                                    swapColumn={swapColumn} imageSize="sm" />
                            ))}
                        </div>
                        {groups.map(group => (
                            <div key={group.boxTitle}>
                                <div className="grid grid-cols-2 bg-gray-50 border-b border-t">
                                    <div className="col-span-2 px-3 py-2 font-semibold text-gray-700 text-xs flex items-center gap-1">
                                        <Icon icon="mdi:folder-open" width="13" height="13" className="text-main shrink-0" />
                                        {group.boxTitle}
                                    </div>
                                </div>
                                {group.rows.map((row, rowIdx) => (
                                    <div key={`${row.boxTitle}||${row.fieldTitle}`}
                                        className={`border-b ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <div className="px-3 py-2 flex items-center gap-1 border-b border-gray-100">
                                            {row.image && (
                                                <Image src={row.image} alt={row.fieldTitle}
                                                    width={20} height={20} className="w-5 h-5 object-contain" />
                                            )}
                                            <span className="text-xs font-medium text-gray-500">{row.fieldTitle}</span>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            {columns.map(col => {
                                                const val = getFieldValue(col, row.boxTitle, row.fieldTitle);
                                                return (
                                                    <div key={col.id} className="px-3 py-2 text-xs text-gray-700 text-center flex items-center justify-center">
                                                        {val === '—' ? <span className="text-gray-300">—</span> : <span>{val}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="border-b">
                            <Slider {...slickSettings}>
                                {mobileSlides.map((col, i) => (
                                    <div key={col.id}>
                                        <ProductCard col={col} colIdx={i}
                                            columns={columns} categoryProducts={categoryProducts}
                                            currencySymbol={currencySymbol} current={current}
                                            swapColumn={swapColumn} imageSize="sm" />
                                    </div>
                                ))}
                            </Slider>
                        </div>
                        {groups.map(group => (
                            <div key={group.boxTitle}>
                                <div className="bg-gray-50 border-b border-t px-3 py-2 font-semibold text-gray-700 text-xs flex items-center gap-1">
                                    <Icon icon="mdi:folder-open" width="13" height="13" className="text-main shrink-0" />
                                    {group.boxTitle}
                                </div>
                                {group.rows.map((row, rowIdx) => (
                                    <div key={`${row.boxTitle}||${row.fieldTitle}`}
                                        className={`border-b ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <div className="px-3 py-2 flex items-center gap-1 border-b border-gray-100">
                                            {row.image && (
                                                <Image src={row.image} alt={row.fieldTitle}
                                                    width={20} height={20} className="w-5 h-5 object-contain" />
                                            )}
                                            <span className="text-xs font-medium text-gray-500">{row.fieldTitle}</span>
                                        </div>
                                        <Slider {...slickSettings}>
                                            {mobileSlides.map(col => {
                                                const val = getFieldValue(col, row.boxTitle, row.fieldTitle);
                                                return (
                                                    <div key={col.id} className="px-3 py-2 text-xs text-gray-700 text-center">
                                                        {val === '—' ? <span className="text-gray-300">—</span> : <span>{val}</span>}
                                                    </div>
                                                );
                                            })}
                                        </Slider>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
