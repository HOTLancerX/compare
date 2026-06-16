'use client';

/**
 * CompareStyle2.tsx — Stacked card layout (Apple-style).
 *
 * Each spec field gets its own full-width row.
 * Per cell: [icon] [field title] [value] — centered, no box grouping headers.
 *
 * Desktop: ≤4 products all shown; 5+ → pinned + 1 active slot.
 * Mobile: 2 → static grid; 3+ → react-slick slider.
 */

import Image from 'next/image';
import { Icon } from '@iconify/react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import type { StyleProps } from './CompareTypes';
import { getFieldValue } from './CompareTypes';
import { useGridState, ProductCard2 } from './CompareShared';

export default function CompareStyle2({
    columns, fieldMatrix, categoryProducts, currencySymbol, current, swapColumn,
}: StyleProps) {
    const {
        desktopColumns, desktopGridCols, isDesktopSlider,
        activeIdx, goPrev, goNext, mobileSlides, total,
    } = useGridState(columns);

    const desktopColIndices = isDesktopSlider
        ? [0, activeIdx]
        : columns.map((_, i) => i);

    const gridCols = `repeat(${desktopGridCols}, minmax(140px, 1fr))`;

    const slickSettings = {
        dots: false, infinite: false, speed: 300,
        slidesToShow: 2, slidesToScroll: 1,
        arrows: false, swipeToSlide: true,
    };

    return (
        <section className="my-10">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Compare {current.title.split(' ').slice(0, 4).join(' ')} models
            </h2>

            {/* ── DESKTOP ── */}
            <div className="hidden md:block">
                {/* Product header row */}
                <div className="border-b pb-6 mb-2 relative">
                    {isDesktopSlider && (
                        <div className="flex justify-between items-center absolute inset-y-0 -left-5 -right-5 pointer-events-none">
                            <button type="button" onClick={goPrev} aria-label="Previous"
                                className="pointer-events-auto w-9 h-9 rounded-full border border-gray-300 bg-white shadow flex items-center justify-center hover:bg-gray-100 transition-colors">
                                <Icon icon="mdi:chevron-left" width="20" height="20" />
                            </button>
                            <button type="button" onClick={goNext} aria-label="Next"
                                className="pointer-events-auto w-9 h-9 rounded-full border border-gray-300 bg-white shadow flex items-center justify-center hover:bg-gray-100 transition-colors">
                                <Icon icon="mdi:chevron-right" width="20" height="20" />
                            </button>
                        </div>
                    )}
                    <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                        {desktopColumns.map((col, i) => (
                            <ProductCard2 key={col.id} col={col} colIdx={desktopColIndices[i]}
                                columns={columns} categoryProducts={categoryProducts}
                                currencySymbol={currencySymbol} current={current} swapColumn={swapColumn} />
                        ))}
                    </div>
                </div>

                {/* Spec rows */}
                {fieldMatrix.map((row, rowIdx) => (
                    <div key={`${row.boxTitle}||${row.fieldTitle}`}
                        className={`grid border-b last:border-b-0 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                        style={{ gridTemplateColumns: gridCols }}>
                        {desktopColumns.map(col => {
                            const val = getFieldValue(col, row.boxTitle, row.fieldTitle);
                            return (
                                <div key={col.id} className="flex flex-col items-center text-center px-4 py-5 gap-2">
                                    {row.image && (
                                        <Image src={row.image} alt={row.fieldTitle}
                                            width={36} height={36} className="w-9 h-9 object-contain" />
                                    )}
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">
                                        {row.fieldTitle}
                                    </span>
                                    <span className={`text-sm leading-snug ${val === '—' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {val}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* ── MOBILE ── */}
            <div className="md:hidden">
                {total === 2 ? (
                    <div>
                        <div className="grid grid-cols-2 border-b pb-4 mb-2">
                            {columns.map((col, i) => (
                                <ProductCard2 key={col.id} col={col} colIdx={i}
                                    columns={columns} categoryProducts={categoryProducts}
                                    currencySymbol={currencySymbol} current={current}
                                    swapColumn={swapColumn} imageSize="sm" />
                            ))}
                        </div>
                        {fieldMatrix.map((row, rowIdx) => (
                            <div key={`${row.boxTitle}||${row.fieldTitle}`}
                                className={`grid grid-cols-2 border-b last:border-b-0 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                {columns.map(col => {
                                    const val = getFieldValue(col, row.boxTitle, row.fieldTitle);
                                    return (
                                        <div key={col.id} className="flex flex-col items-center text-center p-3 gap-1">
                                            {row.image && (
                                                <Image src={row.image} alt={row.fieldTitle}
                                                    width={24} height={24} className="w-6 h-6 object-contain" />
                                            )}
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">
                                                {row.fieldTitle}
                                            </span>
                                            <span className={`text-xs leading-snug ${val === '—' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {val}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="border-b pb-4 mb-2">
                            <Slider {...slickSettings}>
                                {mobileSlides.map((col, i) => (
                                    <div key={col.id}>
                                        <ProductCard2 col={col} colIdx={i}
                                            columns={columns} categoryProducts={categoryProducts}
                                            currencySymbol={currencySymbol} current={current}
                                            swapColumn={swapColumn} imageSize="sm" />
                                    </div>
                                ))}
                            </Slider>
                        </div>
                        {fieldMatrix.map((row, rowIdx) => (
                            <div key={`${row.boxTitle}||${row.fieldTitle}`}
                                className={`border-b last:border-b-0 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                <Slider {...slickSettings}>
                                    {mobileSlides.map(col => {
                                        const val = getFieldValue(col, row.boxTitle, row.fieldTitle);
                                        return (
                                            <div key={col.id} className="flex flex-col items-center text-center px-3 py-4 gap-1">
                                                {row.image && (
                                                    <Image src={row.image} alt={row.fieldTitle}
                                                        width={24} height={24} className="w-6 h-6 object-contain" />
                                                )}
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">
                                                    {row.fieldTitle}
                                                </span>
                                                <span className={`text-xs leading-snug ${val === '—' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {val}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </Slider>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
